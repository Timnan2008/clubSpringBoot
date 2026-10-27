import { startArtifactsPreview } from "../dev/agent-artifacts-preview.mjs";
import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const preview = await startArtifactsPreview();
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 1360, height: 900 },
  reducedMotion: "reduce",
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(preview.url);
  await page.getByText("Word 文档 · 18 KB", { exact: true }).waitFor();
  assert.equal(await page.locator(".agent-approval-card[data-status=approved]").count(), 1);
  await mkdir("/tmp/agent-artifacts-qa", { recursive: true });
  await page.screenshot({ path: "/tmp/agent-artifacts-qa/desktop.png" });
  const draft = page.getByRole("textbox", { name: "消息", exact: true });
  const send = async () => {
    await draft.fill("添加迎新日程");
    await page.getByRole("button", { name: "发送消息", exact: true }).click();
    await page.locator(".agent-approval-card[data-status=pending]").waitFor();
  };
  await send();
  await page.screenshot({ path: "/tmp/agent-artifacts-qa/pending.png" });
  await page
    .locator(".agent-approval-card[data-status=pending]")
    .getByRole("button", { name: "批准", exact: true })
    .click();
  await page
    .getByText("操作已批准。这是本地界面演示，不会修改真实日历。", { exact: true })
    .waitFor();
  assert.equal(await page.locator(".agent-approval-card[data-status=approved]").count(), 2);
  await page.waitForTimeout(650);
  await page.reload();
  await page.locator(".agent-approval-card[data-status=approved]").nth(1).waitFor();
  await send();
  await page
    .locator(".agent-approval-card[data-status=pending]")
    .getByRole("button", { name: "拒绝", exact: true })
    .click();
  await page.locator(".agent-approval-card[data-status=denied]").waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/agent-artifacts-qa/mobile.png" });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page
    .getByRole("button", { name: "删除文件 Codecraft-Welcome-Plan.docx", exact: true })
    .click();
  assert.equal(
    preview.requests.filter((r) => r.method === "DELETE").length,
    0,
    "Delete must still require manual confirmation",
  );
  await page.getByRole("button", { name: "取消", exact: true }).click();
  preview.failApproval();
  await send();
  await page
    .locator(".agent-approval-card[data-status=pending]")
    .getByRole("button", { name: "批准", exact: true })
    .click();
  await page.getByText("批准结果未提交成功，请重试。", { exact: true }).waitFor();
  assert.equal(
    await page.locator(".agent-approval-card[data-status=approved]").count(),
    2,
    "Failed approval must not display Approved",
  );
  preview.expireApproval();
  await send();
  await page
    .locator(".agent-approval-card[data-status=pending]")
    .getByRole("button", { name: "批准", exact: true })
    .click();
  await page.getByText("批准结果未提交成功，请重试。", { exact: true }).waitFor();
  assert.equal(
    await page.locator(".agent-approval-card[data-status=approved]").count(),
    2,
    "Expired 200/ok:false approval is not approved",
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    "PASS: approval, denial, reload, HTTP failure, real HEAD size, manual deletion, mobile layout",
  );
} finally {
  await browser.close();
  await new Promise((r) => preview.server.close(r));
}
