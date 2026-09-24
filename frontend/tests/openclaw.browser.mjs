import { build } from "esbuild";
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const bundle = await build({
  entryPoints: ["frontend/openclaw.jsx"],
  bundle: true,
  write: false,
  outdir: "fixture",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"development"' },
});
const assets = Object.fromEntries(
  bundle.outputFiles.map((f) => [path.basename(f.path), f.contents]),
);
let bootstrapStatus = 200;
const requests = [];
const server = createServer((req, res) => {
  requests.push({ url: req.url, method: req.method });
  if (req.url === "/api/openclaw/bootstrap") {
    res.writeHead(bootstrapStatus, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        connected: false,
        account: {
          id: "fixture",
          name: "测试社长",
          nameEn: "Test President",
          role: "president",
          position: "vice_president",
        },
      }),
    );
    return;
  }
  if (req.url.startsWith("/api/")) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end("{}");
    return;
  }
  const name = req.url.split("?")[0].slice(1);
  if (assets[name]) {
    res.setHeader("Content-Type", name.endsWith("css") ? "text/css" : "text/javascript");
    res.end(assets[name]);
    return;
  }
  if (name.includes(".")) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader("Content-Type", "text/html");
  res.end(
    '<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/openclaw.css"><body class="openclaw-page"><div id="openclaw-root"></div><script src="/openclaw.js"></script></body></html>',
  );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = `http://127.0.0.1:${server.address().port}`;
const screenshots = path.resolve("../../work/qa/openclaw");
await mkdir(screenshots, { recursive: true });
try {
  await page.goto(base);
  await page.getByRole("heading", { name: /有什么想一起完成/ }).waitFor();
  await page.screenshot({ path: path.join(screenshots, "desktop-welcome.png") });
  await page.getByRole("button", { name: /策划一场活动/ }).click();
  const draft = page.getByRole("textbox", { name: "消息", exact: true });
  const original = await draft.inputValue();
  assert.ok(original.includes("见面会"));
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  await page.getByText("文字和附件已保留在当前页面", { exact: false }).waitFor();
  assert.equal(await draft.inputValue(), original);
  await page.locator('input[type="file"]').setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("private local attachment"),
  });
  assert.equal(await page.locator(".prompt-bar__chip").count(), 1);
  await draft.fill("/pl");
  await draft.press("Enter");
  assert.match(await draft.inputValue(), /活动/);
  await draft.fill("中文输入中");
  await draft.evaluate((el) =>
    el.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", isComposing: true, bubbles: true }),
    ),
  );
  assert.equal(await draft.inputValue(), "中文输入中");
  assert.equal(await draft.inputValue(), "中文输入中");
  await page.screenshot({ path: path.join(screenshots, "desktop-thread.png") });
  assert.equal(
    requests.filter((r) => r.method !== "GET").length,
    0,
    "UI-only mode must not send data or execute tasks",
  );
  await page.getByRole("button", { name: "新对话", exact: true }).click();
  assert.equal(await draft.inputValue(), "");
  await page.getByRole("button", { name: "中文输入中" }).click();
  assert.equal(await draft.inputValue(), "中文输入中");
  assert.equal(await page.locator(".prompt-bar__chip").count(), 1);
  await page.getByRole("button", { name: "新对话", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(screenshots, "mobile-welcome.png") });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.getByRole("button", { name: "对话菜单", exact: true }).click();
  await page.locator(".openclaw-sidebar[data-open]").waitFor();
  await page.getByRole("button", { name: "关闭对话菜单", exact: true }).click();
  await page.getByRole("button", { name: "对话菜单", exact: true }).click();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(screenshots, "mobile-thread.png") });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(base + "/?lang=en");
  await page.getByRole("heading", { name: /What shall we work on/ }).waitFor();
  for (const status of [401, 403, 500]) {
    bootstrapStatus = status;
    await page.goto(base + "/?lang=zh");
    await page.locator(".openclaw-gate").waitFor();
    await page
      .getByText(
        status === 401
          ? "请先登录校园账号。"
          : status === 403
            ? "此入口仅向社长、副社长、老师和管理员开放。"
            : "暂时无法加载，请重试。",
        { exact: true },
      )
      .waitFor();
    assert.equal(await page.locator("textarea").count(), 0);
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: permissions UI, offline sends, local attachments, slash commands, IME, animation stop/replay, tasks, mobile, English, reduced motion, no writes.",
  );
  console.log("Screenshots: " + screenshots);
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
