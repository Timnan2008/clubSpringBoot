import { startArtifactsPreview } from "../dev/agent-artifacts-preview.mjs";
import { chromium } from "playwright-core";
import assert from "node:assert/strict";
const fixture = await startArtifactsPreview(0, { background: true });
const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const context = await browser.newContext({ reducedMotion: "reduce" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const send = async (text) => {
  await page.getByRole("textbox", { name: "消息", exact: true }).fill(text);
  await page.getByRole("button", { name: "发送消息", exact: true }).click();
  await page.getByRole("button", { name: "停止回复", exact: true }).waitFor();
  await page.getByText("正在后台核对资料", { exact: true }).last().waitFor();
};
try {
  await page.goto(fixture.url);
  await send("后台计划书");
  const id = [...fixture.jobs.keys()][0];
  await page.goto(new URL("/other", fixture.url).href);
  await page.getByRole("heading", { name: "校园墙" }).waitFor();
  fixture.completeBackground(id);
  await page.goto(fixture.url);
  await page.getByText("后台已完成计划书", { exact: true }).waitFor();
  assert.equal(fixture.requests.filter((r) => r.path.endsWith("/stop")).length, 0);
  console.log(
    "PASS navigation away, server completion, return restores result without cancellation",
  );
  fixture.setMode("background-approval");
  await send("等待批准计划书");
  await page.locator(".agent-approval-card[data-status=pending]").waitFor();
  await page.goto(new URL("/other", fixture.url).href);
  assert.equal(fixture.jobs.get(id).awaiting, true);
  await page.goto(fixture.url);
  await page.locator(".agent-approval-card[data-status=pending]").waitFor();
  await page
    .locator(".agent-approval-card[data-status=pending]")
    .getByRole("button", { name: "批准", exact: true })
    .click();
  await page.getByText("已按批准保存计划书", { exact: true }).waitFor();
  console.log("PASS pending approval survives leaving and can be approved after return");
  fixture.setMode("stall");
  await send("离线后继续");
  await context.setOffline(true);
  fixture.completeBackground(id, "断网期间完成，恢复后同步");
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.getByText("断网期间完成，恢复后同步", { exact: true }).waitFor();
  console.log("PASS reconnect restores server result");
  await send("手动停止");
  await page.getByRole("button", { name: "停止回复", exact: true }).click();
  await page.getByRole("button", { name: "停止回复", exact: true }).waitFor({ state: "hidden" });
  assert.equal(fixture.requests.filter((r) => r.path.endsWith("/stop")).length, 1);
  assert.equal(fixture.jobs.get(id).working, false);
  await page.getByRole("button", { name: "新对话", exact: true }).click();
  await send("并行任务甲");
  const first = [...fixture.jobs.values()].find((entry) => entry.title === "并行任务甲");
  await page.getByRole("button", { name: "新对话", exact: true }).click();
  await send("并行任务乙");
  const second = [...fixture.jobs.values()].find((entry) => entry.title === "并行任务乙");
  assert.equal(first.working, true);
  assert.equal(second.working, true);
  fixture.completeBackground(first.id, "甲的后台结果");
  await page.locator('button[title="并行任务甲"]').click();
  await page.getByText("甲的后台结果", { exact: true }).waitFor();
  assert.equal(second.working, true);
  assert.equal(fixture.requests.filter((r) => r.path.endsWith("/stop")).length, 1);
  console.log("PASS switching conversations and concurrent jobs stay independent");
  assert.deepEqual(errors, []);
  console.log("PASS explicit stop only, no browser errors");
} finally {
  await browser.close();
  fixture.server.closeAllConnections();
  fixture.server.close();
}
