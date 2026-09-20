import { build } from "esbuild";
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import path from "node:path";
import assert from "node:assert/strict";
const result = await build({
  entryPoints: [path.join(import.meta.dirname, "feedback.fixture.jsx")],
  bundle: true,
  write: false,
  outdir: "fixture",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"development"' },
});
const files = Object.fromEntries(
  result.outputFiles.map((f) => [path.basename(f.path), f.contents]),
);
const data = {
  terms: [{ id: "term-1", name: "2026—2027 学年第一学期", start: "2026-09-01", end: "2027-01-31" }],
  reports: [],
  attendance: [],
  candidates: [],
};
const writes = [];
let fail = false;
const server = createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    res.setHeader("Content-Type", "application/json");
    if (req.method === "PUT") {
      let body = "";
      req.on("data", (v) => (body += v));
      req.on("end", () => {
        const d = JSON.parse(body);
        writes.push(d);
        setTimeout(() => {
          if (fail) {
            res.statusCode = 500;
            res.end(JSON.stringify({ message: "网络暂时不可用，请重试" }));
          } else {
            data.reports = [d];
            res.end(JSON.stringify(d));
          }
        }, 100);
      });
      return;
    }
    res.end(JSON.stringify(data));
    return;
  }
  const name = req.url.split("?")[0].slice(1);
  if (files[name]) {
    res.setHeader("Content-Type", name.endsWith(".css") ? "text/css" : "text/javascript");
    res.end(files[name]);
    return;
  }
  res.setHeader("Content-Type", "text/html");
  res.end(
    '<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/feedback.fixture.css"><body class="workspace-page"><div id="root"></div><script src="/feedback.fixture.js"></script></body></html>',
  );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByRole("button", { name: "填写 / 查看", exact: true }).click();
  const editor = page.locator(".feedback-editor");
  await editor.waitFor();
  assert.match(await editor.textContent(), /机器人搭建/);
  await page.getByRole("button", { name: "提交记录", exact: false }).click();
  assert.equal(writes.length, 0);
  assert.equal(await page.locator("textarea[aria-invalid=true]").count(), 3);
  assert.equal(
    await page
      .locator("textarea")
      .first()
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await page
    .getByLabel("活动过程与实际开展情况", { exact: false })
    .fill("小组分工完成机器人搭建，展示作品并交流。");
  await page.getByRole("button", { name: "保存草稿", exact: true }).click();
  await page.waitForFunction(() =>
    document.querySelector(".feedback-actions")?.textContent.includes("草稿已保存"),
  );
  assert.equal(writes.at(-1).status, "draft");
  assert.equal(await editor.count(), 1);
  await page
    .getByLabel("社员反应与反馈", { exact: false })
    .fill("社员积极参与，希望增加调试和展示时间。");
  await page
    .getByLabel("问题、改进与下次安排", { exact: false })
    .fill("下次提前准备器材，每组指定一名记录员。");
  await page.getByRole("button", { name: "返回列表", exact: true }).click();
  await page.getByRole("button", { name: "继续填写", exact: true }).click();
  assert.equal(await page.locator(".feedback-leave").count(), 0);
  await page.getByRole("radio", { name: "未举行", exact: true }).click();
  assert.equal(await page.locator("textarea").count(), 0);
  await page.getByRole("radio", { name: "已举行", exact: true }).click();
  assert.match(await page.getByLabel("社员反应与反馈", { exact: false }).inputValue(), /积极参与/);
  await page.screenshot({ path: "/tmp/feedback-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/feedback-mobile.png", fullPage: true });
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "mobile overflow",
  );
  fail = true;
  await page.getByRole("button", { name: "提交记录", exact: false }).click();
  await page.getByRole("alert").filter({ hasText: "网络暂时不可用" }).waitFor();
  assert.equal(await editor.count(), 1);
  assert.match(await page.getByLabel("社员反应与反馈", { exact: false }).inputValue(), /积极参与/);
  fail = false;
  await page.getByRole("button", { name: "提交记录", exact: false }).click();
  await editor.waitFor({ state: "detached" });
  assert.equal(writes.at(-1).status, "submitted");
  assert.equal(writes.at(-1).kind, "feedback");
  assert.equal(writes.at(-1).activity, "activity-1");
  await page.getByRole("button", { name: "填写 / 查看", exact: true }).click();
  await page.getByRole("radio", { name: "未举行", exact: true }).click();
  await page.getByRole("button", { name: "确认未举行", exact: false }).click();
  await editor.waitFor({ state: "detached" });
  assert.equal(writes.at(-1).status, "not_held");
  assert.deepEqual(errors, []);
  console.log(
    "Feedback passed: inline validation, partial draft save stays open, unsaved back prompt, held/not-held content retention, failed submit preserves data, submitted/not-held API payloads, 390px layout.",
  );
} finally {
  await browser.close();
  server.close();
}
