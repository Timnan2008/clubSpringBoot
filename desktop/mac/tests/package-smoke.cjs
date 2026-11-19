const { _electron: electron } = require("playwright-core");
const path = require("node:path"),
  assert = require("node:assert/strict");
(async () => {
  const app = await electron.launch({
    executablePath: path.resolve("release/mac-arm64/青浦世外社团.app/Contents/MacOS/青浦世外社团"),
    args: ["--user-data-dir=" + path.resolve(".local/package-qa-profile")],
  });
  try {
    const page = await app.firstWindow();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.locator(".club-card").first().waitFor({ timeout: 60000 });
    assert.equal((await page.evaluate(() => window.clubDesktop.info())).version, "1.2.4");
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await page.getByRole("dialog").waitFor();
    assert.equal(
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length),
      1,
    );
    assert.ok(page.url().startsWith("file://"));
    await page.screenshot({ path: "qa/package-login.png" });
    assert.deepEqual(errors, []);
    console.log("PASS: packaged 1.2.4 App, live campus data, local login form, single window.");
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
