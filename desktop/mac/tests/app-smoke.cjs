const { _electron: electron } = require("playwright-core");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
(async () => {
  const app = await electron.launch({
    args: [path.join(__dirname, "..")],
    env: { ...process.env, CLUB_QA: "1" },
  });
  const errors = [];
  try {
    const page = await app.firstWindow();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.getByText("校园服务已连接", { exact: true }).waitFor({ timeout: 60000 });
    await page.locator(".club-card").first().waitFor();
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".club-card img")].every((image) => image.complete),
    );
    await page.screenshot({ path: "qa/home-1440.png" });
    assert.ok((await page.locator(".club-card").count()) > 0);
    assert.equal(await page.evaluate(() => typeof window.require), "undefined");
    assert.equal(await page.evaluate(() => typeof window.clubDesktop.read), "function");
    assert.equal(
      await page.evaluate(async () => {
        try {
          await window.clubDesktop.read("/api/user/all");
          return false;
        } catch {
          return true;
        }
      }),
      true,
    );
    const security = await app.evaluate(({ BrowserWindow }) => {
      const p = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
      return { node: p.nodeIntegration, isolation: p.contextIsolation, sandbox: p.sandbox };
    });
    assert.deepEqual(security, { node: false, isolation: true, sandbox: true });
    const catalog = await page.evaluate(() => window.clubDesktop.read("clubs"));
    assert.ok(catalog.ok && catalog.data.length > 0);
    await page.getByRole("button", { name: "发现社团", exact: true }).click();
    await page.screenshot({ path: "qa/discover.png" });
    await page.getByPlaceholder("搜索社团名称、关键词").fill("编程");
    assert.equal(await page.locator(".club-card").count(), 1);
    await page.locator(".club-card").first().click();
    await page.getByRole("dialog").waitFor();
    await page.getByRole("button", { name: "关闭", exact: true }).click();
    await page.getByRole("button", { name: "我的社团", exact: true }).click();
    await page.getByText("你的校园生活，从登录开始", { exact: true }).waitFor();
    for (const name of ["活动日程", "消息"]) {
      await page.getByRole("button", { name, exact: true }).click();
      await page.getByText("你的校园生活，从登录开始", { exact: true }).waitFor();
    }
    await page.getByRole("button", { name: "设置", exact: true }).click();
    await page.screenshot({ path: "qa/settings.png" });
    await page.getByRole("switch", { name: "紧凑模式" }).click();
    assert.equal(await page.locator(".app").evaluate((e) => e.classList.contains("compact")), true);
    await page.getByRole("switch", { name: "紧凑模式" }).click();
    await page.getByRole("button", { name: "首页", exact: true }).click();
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1280, 720));
    await page.waitForTimeout(300);
    assert.equal(
      await page.evaluate(
        () =>
          document.querySelector(".content").scrollWidth <=
          document.querySelector(".content").clientWidth,
      ),
      true,
    );
    await page.screenshot({ path: "qa/home-1280.png" });
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1000, 740));
    await page.waitForTimeout(300);
    assert.equal(
      await page.locator(".sidebar").evaluate((e) => e.getBoundingClientRect().width),
      77,
    );
    await page.screenshot({ path: "qa/home-1000.png" });
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 940));
    await page.waitForFunction(() => window.innerWidth === 1440);
    const [service] = await Promise.all([
      app.waitForEvent("window", { timeout: 30000 }),
      page.getByRole("button", { name: "登录", exact: true }).click(),
    ]);
    await service.waitForLoadState("domcontentloaded");
    assert.ok(service.url().startsWith("https://qpwflhsclub.com/"));
    assert.equal(await service.evaluate(() => typeof window.clubDesktop), "undefined");
    await service.close();
    await page.keyboard.press("Meta+k");
    await page.getByPlaceholder("搜索社团、你的日程或公告…").fill("编程");
    assert.equal(await page.locator(".search-result").count(), 1);
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "detached" });
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      "qa/smoke-result.json",
      JSON.stringify(
        {
          passed: true,
          publicClubs: catalog.data.length,
          rendererErrors: errors,
          security,
          checks: [
            "live API",
            "search",
            "club drawer",
            "guest isolation",
            "settings",
            "1280 layout",
            "1000 collapsed sidebar",
            "remote login window isolation",
          ],
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS: real Electron integration, live public data, search, dialogs, responsive layout, isolated login. Clubs:",
      catalog.data.length,
    );
  } catch (error) {
    console.error("Smoke check failed:", error.message);
    for (const win of app.windows())
      console.error("Window:", win.url(), (await win.locator("body").innerText()).slice(-1600));
    throw error;
  } finally {
    await app.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
