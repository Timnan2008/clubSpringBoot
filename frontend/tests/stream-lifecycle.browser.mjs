import { startArtifactsPreview } from "../dev/agent-artifacts-preview.mjs";
import { chromium } from "playwright-core";
import assert from "node:assert/strict";
const fixture = await startArtifactsPreview();
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
try {
  for (const mode of ["done-open", "disconnect", "stall", "approval"]) {
    fixture.setMode(mode);
    const page = await browser.newPage({ reducedMotion: "reduce" });
    await page.clock.install();
    await page.goto(fixture.url);
    await page.getByRole("textbox", { name: "消息", exact: true }).fill("核对资料");
    await page.getByRole("button", { name: "发送消息", exact: true }).click();
    if (mode === "approval") {
      await page.locator(".agent-approval-card[data-status=pending]").waitFor();
      await page.clock.fastForward(91000);
    } else if (mode === "stall") {
      await page.getByText("正在核对资料", { exact: true }).last().waitFor();
      await page.clock.fastForward(181000);
    }
    await page.getByRole("button", { name: "停止回复", exact: true }).waitFor({ state: "hidden" });
    assert.equal(await page.locator(".thought-line[data-working]").count(), 0, mode);
    assert.equal(await page.locator('.status-mark[data-status="running"]').count(), 0, mode);
    assert.equal(await page.locator(".agent-approval-card[data-status=pending]").count(), 0, mode);
    if (mode === "done-open") await page.getByText("已经完成", { exact: true }).waitFor();
    if (mode === "stall" || mode === "approval") await page.getByText(/等待响应已超时/).waitFor();
    await page.close();
    console.log("PASS stream lifecycle:", mode);
  }
} finally {
  await browser.close();
  fixture.server.closeAllConnections();
  fixture.server.close();
}
