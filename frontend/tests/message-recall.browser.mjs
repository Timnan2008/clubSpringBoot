import { build } from "esbuild";
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import assert from "node:assert/strict";
const result = await build({
  stdin: {
    contents: `import React from 'react';import {createRoot} from 'react-dom/client';import MessageRecallMenu from './frontend/MessageRecallMenu';window.recalls=0;createRoot(document.getElementById('root')).render(<><MessageRecallMenu className="social-message own" canRecall onRecall={()=>window.recalls++}><p>我的消息</p></MessageRecallMenu><MessageRecallMenu className="social-message" canRecall={false}><p>对方的消息</p></MessageRecallMenu></>);`,
    resolveDir: process.cwd(),
    loader: "jsx",
  },
  bundle: true,
  write: false,
  outfile: "fixture.js",
  jsx: "automatic",
});
const assets = Object.fromEntries(
  result.outputFiles.map((f) => [f.path.split("/").at(-1), f.contents]),
);
const server = createServer((req, res) => {
  const file = assets[req.url.slice(1)];
  res.setHeader(
    "Content-Type",
    req.url.endsWith(".js")
      ? "text/javascript"
      : req.url.endsWith(".css")
        ? "text/css"
        : "text/html",
  );
  res.end(
    file ||
      '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="fixture.css"><div id="root"></div><script src="fixture.js"></script>',
  );
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
try {
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByText("我的消息", { exact: true }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "撤回", exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.recalls), 0);
  await page.getByRole("menuitem", { name: "撤回", exact: true }).click();
  assert.equal(await page.evaluate(() => window.recalls), 1);
  await page.getByText("对方的消息", { exact: true }).click({ button: "right" });
  assert.equal(await page.getByRole("menu").count(), 0);
  await page.getByRole("button", { name: "消息操作", exact: true }).click();
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("menu").count(), 0);
  await page.locator(".own").focus();
  await page.keyboard.press("Shift+F10");
  await page.getByRole("menuitem", { name: "撤回" }).waitFor();
  const rect = await page.getByRole("menu").boundingBox();
  assert.ok(rect.x >= 0 && rect.x + rect.width <= 390);
  assert.equal(await page.getByText("Hold to recall").count(), 0);
  console.log(
    "PASS right-click, explicit recall, ownership, touch menu, Escape, keyboard, viewport bounds",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
