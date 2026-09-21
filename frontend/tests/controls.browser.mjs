import { build } from "esbuild";
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const root = path.resolve(import.meta.dirname, "../..");
const out = process.env.CONTROL_SCREENSHOT_DIR || "/tmp/club-controls-qa";
await mkdir(out, { recursive: true });
const bundle = await build({
  entryPoints: [
    path.join(import.meta.dirname, "controls.fixture.jsx"),
    path.join(root, "frontend/calendar.jsx"),
  ],
  bundle: true,
  write: false,
  outdir: "fixture",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"development"' },
});
const files = Object.fromEntries(
  bundle.outputFiles.map((f) => [path.basename(f.path), f.contents]),
);
const operations = {
  terms: [{ id: "term1", name: "2026—2027 学年第一学期", start: "2026-09-01", end: "2027-01-31" }],
  reports: [],
  attendance: [],
  candidates: [],
};
const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(new Date());
let entries = [
  {
    id: "qa-task",
    kind: "memo",
    title: "整理社团活动记录",
    start: today + "T12:00",
    end: today + "T12:30",
    description: "",
    location: "",
    completed: false,
    reminderMinutes: -1,
  },
];
let rejectSave = false;
const server = createServer((req, res) => {
  if (req.url === "/api/campus-social/me") {
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        account: { id: "fixture", name: "测试用户", role: "student" },
        canPost: true,
      }),
    );
    return;
  }
  if (req.url.startsWith("/api/campus-social/calendar")) {
    res.setHeader("Content-Type", "application/json");
    if (req.method === "GET") {
      res.end(
        JSON.stringify({
          account: { id: "fixture", name: "测试用户", role: "student" },
          token: "fixture",
          clubs: [],
          events: entries,
        }),
      );
      return;
    }
    let body = "";
    req.on("data", (s) => (body += s));
    req.on("end", () => {
      if (rejectSave) {
        res.statusCode = 500;
        res.end(JSON.stringify({ message: "保存失败，请重试" }));
        return;
      }
      const updated = JSON.parse(body || "{}");
      if (req.method === "DELETE") {
        entries = [];
        res.end("{}");
      } else {
        entries = [updated];
        res.end(JSON.stringify(updated));
      }
    });
    return;
  }
  if (req.url.startsWith("/api/campus-social/notifications")) {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ items: [], unread: 0 }));
    return;
  }
  if (req.url.startsWith("/api/")) {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(operations));
    return;
  }
  const name = req.url.slice(1).split("?")[0];
  if (files[name]) {
    res.setHeader("Content-Type", name.endsWith(".css") ? "text/css" : "text/javascript");
    res.end(files[name]);
    return;
  }
  if (req.url.startsWith("/calendar")) {
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<!doctype html><html lang="zh"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/calendar.css"><body class="calendar-page"><div id="personal-calendar"></div><script src="/calendar.js"></script></body></html>',
    );
    return;
  }
  res.setHeader("Content-Type", "text/html");
  res.end(
    '<!doctype html><html lang="zh"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/controls.fixture.css"><body class="workspace-page"><div id="root"></div><script src="/controls.fixture.js"></script></body></html>',
  );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => {
    errors.push(e.message);
    console.error(e.message);
  });
  await page.goto("http://127.0.0.1:" + server.address().port);
  const select = page.getByRole("combobox", { name: "筛选" });
  await select.click();
  await page.getByRole("option", { name: "日", exact: true }).click();
  assert.equal(await page.evaluate(() => window.fixture.option), "day");
  assert.equal(await page.evaluate(() => window.picks), 1);
  await select.press("ArrowDown");
  await select.press("End");
  await select.press("Enter");
  assert.equal(await page.evaluate(() => window.fixture.option), "list");
  await select.click();
  await page.getByRole("heading", { name: "界面交互预览" }).click();
  assert.equal(await select.getAttribute("aria-expanded"), "false");
  await page.getByRole("radio", { name: "日", exact: true }).click();
  assert.equal(await page.evaluate(() => window.fixture.view), "day");
  await page.getByRole("radio", { name: "日", exact: true }).press("ArrowRight");
  assert.equal(await page.evaluate(() => window.fixture.view), "week");
  await page.getByRole("radio", { name: "列表", exact: true }).focus();
  await page.keyboard.press("Space");
  assert.equal(await page.evaluate(() => window.fixture.view), "list");
  await page.waitForTimeout(450);
  const from = await page.getByRole("radio", { name: "列表", exact: true }).boundingBox();
  const to = await page.getByRole("radio", { name: "日", exact: true }).boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();
  assert.equal(await page.evaluate(() => window.fixture.view), "day");
  const check = page.getByRole("checkbox");
  await check.click();
  assert.equal(await check.getAttribute("aria-checked"), "true");
  const like = page.locator(".pulse-heart");
  await page.evaluate(() => (window.failLike = true));
  await like.click();
  await page.waitForTimeout(180);
  assert.equal(await page.evaluate(() => window.fixture.likes), 4);
  await page.evaluate(() => (window.failLike = false));
  await like.click();
  await page.waitForTimeout(180);
  assert.equal(await like.getAttribute("aria-pressed"), "true");
  const hold = page.locator(".hold-button");
  await hold.click();
  await page.waitForTimeout(550);
  assert.equal(await page.evaluate(() => window.holds || 0), 0);
  await hold.focus();
  await page.keyboard.down("Space");
  await page.waitForTimeout(180);
  await page.keyboard.up("Space");
  await page.waitForTimeout(550);
  assert.equal(await page.evaluate(() => window.holds || 0), 0);
  const box = await hold.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x - 30, box.y);
  await page.waitForTimeout(600);
  await page.mouse.up();
  assert.equal(await page.evaluate(() => window.holds || 0), 0);
  await hold.focus();
  await page.keyboard.down("Space");
  await page.waitForTimeout(530);
  assert.equal(await hold.getAttribute("data-phase"), "pending");
  await page.keyboard.up("Space");
  await page.waitForTimeout(280);
  assert.equal(await hold.getAttribute("data-phase"), "idle");
  await page.getByRole("alert").waitFor();
  await hold.focus();
  await page.keyboard.down("Space");
  await page.waitForTimeout(800);
  await page.keyboard.up("Space");
  assert.equal(await hold.getAttribute("data-phase"), "done");
  assert.equal(await page.evaluate(() => window.holds), 2);
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(out, "desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "开始填写", exact: true }).first().click();
  await page.screenshot({ path: path.join(out, "materials-editor-desktop.png"), fullPage: true });
  await page.getByRole("button", { name: "返回列表", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(100);
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "Mobile overflow",
  );
  await page.screenshot({ path: path.join(out, "mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "开始填写", exact: true }).first().click();
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "Materials editor mobile overflow",
  );
  await page.screenshot({ path: path.join(out, "materials-editor-mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "返回列表", exact: true }).click();
  await page.evaluate(() => document.body.classList.add("social-network-theme"));
  await select.scrollIntoViewIfNeeded();
  await select.click();
  await page.screenshot({ path: path.join(out, "dark-select.png") });
  await select.press("Escape");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await check.click();
  await like.click();
  await page.waitForTimeout(250);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("http://127.0.0.1:" + server.address().port + "/calendar");
  await page.getByRole("radio", { name: "列表", exact: true }).click();
  const task = page.getByRole("checkbox", { name: "标记完成：整理社团活动记录" });
  await task.waitFor();
  await task.click();
  await page.waitForTimeout(250);
  assert.equal(await task.getAttribute("aria-checked"), "true");
  rejectSave = true;
  await task.click();
  await page.waitForTimeout(250);
  assert.equal(await task.getAttribute("aria-checked"), "true");
  rejectSave = false;
  await page.screenshot({ path: path.join(out, "calendar-mobile.png"), fullPage: true });
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "Calendar mobile overflow",
  );
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.getByRole("radio", { name: "周", exact: true }).click();
  await page.screenshot({ path: path.join(out, "calendar-desktop.png"), fullPage: true });
  await page.getByRole("radio", { name: "列表", exact: true }).click();
  await page.locator(".cal-list-entry").click();
  await page.getByRole("button", { name: "详细设置", exact: true }).click();
  await page.getByRole("combobox", { name: "类型", exact: true }).click();
  await page.getByRole("option", { name: "备忘", exact: true }).click();
  await page.getByRole("combobox", { name: "提醒", exact: true }).click();
  await page.getByRole("option", { name: "提前一天", exact: true }).click();
  assert.equal(
    await page.getByRole("combobox", { name: "提醒", exact: true }).getAttribute("aria-expanded"),
    "false",
  );
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(out, "calendar-editor.png") });
  await page.goto("http://127.0.0.1:" + server.address().port + "/?post=1");
  const postLike = page.locator(".social-post .pulse-heart");
  await page.evaluate(() => (window.failLike = true));
  await postLike.click();
  await page.waitForTimeout(200);
  assert.equal(await postLike.getAttribute("aria-pressed"), "false");
  await page.evaluate(() => (window.failLike = false));
  await postLike.click();
  await page.waitForTimeout(200);
  assert.equal(await postLike.getAttribute("aria-pressed"), "true");
  assert.equal(await postLike.evaluate((e) => getComputedStyle(e).color), "rgb(241, 63, 120)");
  await page.getByRole("button", { name: /帖子操作/ }).click();
  await page.getByRole("button", { name: "删除帖子", exact: true }).click();
  assert.equal(await page.locator(".social-confirm .hold-button").count(), 1);
  await page.waitForTimeout(650);
  await page.setViewportSize({ width: 390, height: 844 });
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "Post mobile overflow",
  );
  await page.screenshot({ path: path.join(out, "post-mobile.png"), fullPage: true });
  const touch = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const touchPage = await touch.newPage();
  await touchPage.goto("http://127.0.0.1:" + server.address().port);
  await touchPage.getByRole("combobox", { name: "筛选" }).tap();
  await touchPage.getByRole("option", { name: "日", exact: true }).tap();
  assert.equal(await touchPage.evaluate(() => window.picks), 1);
  assert.equal(
    await touchPage.getByRole("combobox", { name: "筛选" }).getAttribute("aria-expanded"),
    "false",
  );
  await touchPage.getByRole("radio", { name: "列表", exact: true }).tap();
  assert.equal(await touchPage.evaluate(() => window.fixture.view), "list");
  await touch.close();
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      passed: true,
      checks: [
        "select single callback, keyboard and outside dismiss",
        "segment pointer, drag, keyboard and touch",
        "checkbox",
        "failed like preserves count",
        "hold tap, early release, drift cancellation",
        "hold pending, error retry and success",
        "390px layout",
        "dark theme",
        "reduced motion",
        "calendar completion persistence and failed save",
        "calendar selects inside dialog labels",
        "semester form desktop/mobile",
        "post likes and delete confirmation",
      ],
      screenshots: out,
    }),
  );
} finally {
  await browser.close();
  server.close();
}
