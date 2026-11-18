const { _electron: electron } = require("playwright-core");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const qa = path.resolve(__dirname, "../qa/refinement");
fs.mkdirSync(qa, { recursive: true });
(async () => {
  const app = await electron.launch({
    executablePath: require("electron"),
    args: [path.resolve(__dirname, "..")],
    env: {
      ...process.env,
      CLUB_QA: "1",
      CLUB_DESKTOP_USER_DATA: path.resolve(__dirname, "../.local/interface-qa-profile"),
    },
  });
  const page = await app.firstWindow(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const nav = (name) => page.locator("nav").getByRole("button", { name, exact: true });
  const button = (name) => page.getByRole("button", { name, exact: true });
  const shot = async (name) => {
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(qa, name + ".png"), scale: "css" });
  };
  try {
    await page.getByText("校园服务已连接", { exact: true }).waitFor({ timeout: 60000 });
    await page.evaluate(() => window.clubDesktop.resetAppearance());
    await page.reload();
    await page.locator(".club-card").first().waitFor();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await app.evaluate(({ BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows()[0];
      w.show();
      w.focus();
    });
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 940));
    await shot("home-light");
    const card = page.locator(".club-card").first();
    await card.hover({ position: { x: 100, y: 80 } });
    await page.waitForTimeout(250);
    assert.ok(
      Number(await card.locator(".card-pixels").evaluate((e) => getComputedStyle(e).opacity)) > 0,
    );
    await shot("home-pointer");
    await card.focus();
    await page.keyboard.press("Enter");
    await page.locator(".club-hero").waitFor();
    await page.locator(".loading-state").waitFor({ state: "hidden" });
    await shot("club-detail");
    await nav("发现社团").click();
    await shot("discover-light");
    await page.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k");
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await nav("设置").click();
    await button("深色外观").click();
    await button("微光背景").click();
    await shot("settings-dark");
    await nav("首页").click();
    await shot("home-dark");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator(".club-card").first().hover();
    assert.equal(
      await page
        .locator(".card-pixels")
        .first()
        .evaluate((e) => getComputedStyle(e).display),
      "none",
    );
    assert.equal(
      await page.locator(".content").evaluate((e) => getComputedStyle(e).animationName),
      "none",
    );
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await nav("设置").click();
    await button("恢复默认外观").click();
    await nav("首页").click();
    for (const width of [1280, 1000]) {
      await app.evaluate(
        ({ BrowserWindow }, w) => BrowserWindow.getAllWindows()[0].setSize(w, 820),
        width,
      );
      await page.waitForTimeout(250);
      assert.ok(await page.locator(".content").evaluate((e) => e.scrollWidth <= e.clientWidth));
      assert.ok(await nav("发现社团").isVisible());
      await shot("home-" + width);
    }
    await button("登录").click();
    await page.getByRole("dialog").waitFor();
    await shot("login");
    assert.equal(await page.locator("iframe,webview").count(), 0);
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(qa, "result.json"),
      JSON.stringify(
        {
          passed: true,
          publicData: true,
          keyboardNavigation: true,
          pointerFeedback: true,
          reducedMotion: true,
          widths: [1440, 1280, 1000],
          rendererErrors: errors,
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS: interface; live club data, keyboard and pointer, reduced motion, three sizes, light/dark, local login.",
    );
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
