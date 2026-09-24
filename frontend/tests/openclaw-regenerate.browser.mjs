import { build } from "esbuild";
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import path from "node:path";
import { mkdir, readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const bundle = await build({
  entryPoints: ["frontend/openclaw.jsx"],
  bundle: true,
  write: false,
  outdir: "fixture",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
});
const assets = Object.fromEntries(
  bundle.outputFiles.map((file) => [path.basename(file.path), file.contents]),
);
const requests = [];
const answers = [
  "EARLIER_REPLY",
  "OLD_REPLY_SENTINEL",
  "LATER_REPLY",
  "REPLACEMENT_REPLY",
  "FOLLOWUP_REPLY",
];
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/campus-social/me") {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end("{}");
    return;
  }
  if (url.pathname === "/api/openclaw/chat") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    requests.push(JSON.parse(raw));
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    res.end(`data: ${JSON.stringify({ delta: answers[requests.length - 1] })}\n\ndata: [DONE]\n\n`);
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify(
        url.pathname === "/api/openclaw/bootstrap"
          ? {
              connected: true,
              token: "fixture",
              account: { id: "fixture", name: "测试老师", role: "teacher" },
            }
          : url.pathname === "/api/openclaw/history"
            ? { saved: true, resetAt: 1234, updatedAt: 1234, history: [] }
            : { items: [], unread: 0 },
      ),
    );
    return;
  }
  if (url.pathname === "/other%20photo/WFL-crest.svg") {
    res.setHeader("Content-Type", "image/svg+xml");
    res.end(await readFile("src/main/resources/static/other photo/WFL-crest.svg"));
    return;
  }
  const name = url.pathname.slice(1);
  if (assets[name]) {
    res.setHeader("Content-Type", name.endsWith("css") ? "text/css" : "text/javascript");
    res.end(assets[name]);
    return;
  }
  if (name.includes(".")) {
    res.writeHead(204);
    res.end();
    return;
  }
  res.setHeader("Content-Type", "text/html");
  res.end(
    '<!doctype html><html lang="zh"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/openclaw.css"><body class="openclaw-page"><div id="openclaw-root"></div><script src="/openclaw.js"></script></body></html>',
  );
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
    console.error(error.message);
  });
  await page.addInitScript(() =>
    localStorage.setItem(
      "openclaw-chats:fixture",
      JSON.stringify({
        updatedAt: 9999999999999,
        history: [
          {
            id: "11111111-1111-1111-1111-111111111111",
            title: "DELETED_CHAT",
            messages: [{ role: "user", content: "DELETED_CHAT" }],
          },
        ],
      }),
    ),
  );
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await mkdir("/tmp/club-motion-qa", { recursive: true });
  page.on("console", (msg) => {
    if (msg.type() === "error" && /WebGL|shader|THREE/.test(msg.text())) errors.push(msg.text());
  });
  await page.locator('.openclaw-ballpit canvas[data-ready="true"]').waitFor();
  await page.waitForFunction(
    () => document.querySelector(".text-type__content")?.textContent === "有什么想一起完成？",
  );
  await page.waitForTimeout(1800);
  assert.equal(
    await page.locator(".card-nav").evaluate((el) => getComputedStyle(el).backdropFilter),
    "blur(22px) saturate(1.35)",
  );
  await page.screenshot({ path: "/tmp/club-motion-qa/agent-desktop.png" });
  const timing = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const deltas = [];
        let previous = performance.now();
        const tick = (now) => {
          deltas.push(now - previous);
          previous = now;
          if (deltas.length < 90) requestAnimationFrame(tick);
          else
            resolve({
              fps: Math.round(1000 / (deltas.reduce((a, b) => a + b, 0) / deltas.length)),
              p95: [...deltas].sort((a, b) => a - b)[85],
            });
        };
        requestAnimationFrame(tick);
      }),
  );
  console.log("Welcome frame timing", timing);
  const input = page.getByRole("textbox", { name: "消息", exact: true });
  const send = async (text, reply) => {
    await input.fill(text);
    await page.getByRole("button", { name: "发送消息", exact: true }).click();
    await page.getByText(reply, { exact: true }).waitFor();
  };
  await send("我的社团是 OpenSTEAM", "EARLIER_REPLY");
  assert.equal(
    await page.locator('.openclaw-ballpit canvas[data-exiting="true"]').count(),
    1,
    "First send releases balls before unmount",
  );
  assert.equal(
    await page.locator(".openclaw-user-message[data-enter]").count(),
    1,
    "Sent message animates",
  );
  await page.waitForTimeout(160);
  await page.screenshot({ path: "/tmp/club-motion-qa/first-send-falling.png" });
  await page.waitForTimeout(650);
  assert.equal(
    await page.locator('.openclaw-ballpit canvas[data-exiting="true"]').count(),
    1,
    "Slower fall remains visible past the first 800 ms",
  );
  await page.screenshot({ path: "/tmp/club-motion-qa/first-send-slow-fall.png" });
  await page.locator(".openclaw-ballpit").waitFor({ state: "detached", timeout: 6500 });
  await page
    .locator(".openclaw-user-message[data-enter]")
    .waitFor({ state: "detached", timeout: 1500 });
  await page.getByRole("button", { name: "重新编辑", exact: true }).click();
  const editor = page.getByRole("textbox", { name: "重新编辑", exact: true });
  assert.ok(
    (await page.locator(".openclaw-edit-card").boundingBox()).height < 130,
    "Short edit card is compact",
  );
  assert.ok((await page.locator(".openclaw-edit-card").boundingBox()).width <= 520);
  await page.screenshot({ path: "/tmp/club-motion-qa/compact-editor.png" });
  await editor.fill("长内容需要内部滚动。\n".repeat(35));
  assert.ok(
    await editor.evaluate(
      (el) =>
        el.scrollHeight > el.clientHeight &&
        el.clientHeight <= 160 &&
        getComputedStyle(el).resize === "none",
    ),
  );
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await send("写一份介绍", "OLD_REPLY_SENTINEL");
  await send("把它翻译成英文", "LATER_REPLY");
  await page.getByRole("button", { name: "重新回答", exact: true }).nth(1).click();
  await page.getByText("REPLACEMENT_REPLY", { exact: true }).waitFor();
  assert.equal(requests[3].text, "写一份介绍");
  assert.ok(requests.every((request) => request.resetAt === 1234));
  assert.ok(!JSON.stringify(requests).includes("DELETED_CHAT"));
  assert.deepEqual(requests[3].history, [
    { role: "user", content: "我的社团是 OpenSTEAM" },
    { role: "assistant", content: "EARLIER_REPLY" },
  ]);
  assert.equal(await page.getByText("OLD_REPLY_SENTINEL", { exact: true }).count(), 0);
  assert.equal(await page.getByText("LATER_REPLY", { exact: true }).count(), 0);
  await send("继续润色", "FOLLOWUP_REPLY");
  assert.ok(JSON.stringify(requests[4].history).includes("REPLACEMENT_REPLY"));
  assert.ok(!JSON.stringify(requests[4].history).includes("OLD_REPLY_SENTINEL"));
  assert.ok(!JSON.stringify(requests[4].history).includes("LATER_REPLY"));
  await page.getByRole("button", { name: "新对话", exact: true }).click();
  await page.locator('.openclaw-ballpit canvas[data-ready="true"]').waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(2000);
  await input.fill("测试输入不被球体拦截");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: "/tmp/club-motion-qa/agent-mobile.png" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator(".openclaw-ballpit").waitFor({ state: "detached" });
  assert.equal(await page.locator(".text-type__content").textContent(), "有什么想一起完成？");
  assert.deepEqual(errors, []);
  console.log(
    "Regeneration browser check passed: retained earlier turns, discarded answer/later branch, follow-up uses replacement.",
  );
} finally {
  await browser.close();
  server.close();
}
