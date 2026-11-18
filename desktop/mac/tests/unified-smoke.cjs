const { _electron: electron } = require("playwright-core");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "../.."),
  qa = path.resolve(__dirname, "../qa/unified"),
  profile = path.resolve(__dirname, "../.local/unified-qa-profile");
fs.mkdirSync(qa, { recursive: true });
const launch = () =>
  electron.launch({
    executablePath: require("electron"),
    args: [root],
    env: {
      ...process.env,
      CLUB_QA: "1",
      CLUB_QA_PLATFORM: "win32",
      CLUB_DESKTOP_USER_DATA: profile,
    },
  });
(async () => {
  let app = await launch(),
    page = await app.firstWindow();
  const errors = [];
  const bind = () => page.on("pageerror", (e) => errors.push(e.message));
  bind();
  const button = (name) => page.getByRole("button", { name, exact: true });
  const nav = (name) => page.locator("nav").getByRole("button", { name, exact: true });
  const shot = async (name) => {
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(qa, name + ".png"), scale: "css" });
  };
  const connected = () =>
    page.getByText("校园服务已连接", { exact: true }).waitFor({ timeout: 60000 });
  try {
    await connected();
    await page.evaluate(() => window.clubDesktop.resetAppearance());
    await page.reload();
    await connected();
    await button("最小化窗口").waitFor();
    assert.equal((await page.evaluate(() => window.clubDesktop.info())).platform, "win32");
    assert.equal(await page.locator("webview,iframe").count(), 0);
    await shot("windows-light-home");
    await nav("设置").click();
    await button("浅色外观").waitFor();
    await shot("windows-light-settings");
    await button("深色外观").click();
    await button("晴空蓝").click();
    await button("海岸背景").click();
    await page.getByRole("slider", { name: "背景浓度" }).focus();
    await page.keyboard.press("End");
    await page.getByRole("slider", { name: "背景模糊" }).focus();
    await page.keyboard.press("End");
    await button("16号文字").click();
    await page.waitForFunction(
      () =>
        document.documentElement.dataset.theme === "dark" &&
        document.documentElement.style.getPropertyValue("--font-scale") > 1,
    );
    assert.ok(
      (
        await page.locator(".app-background").evaluate((e) => getComputedStyle(e).backgroundImage)
      ).includes("linear-gradient"),
    );
    assert.ok(
      await page
        .getByRole("heading", { name: "设置", exact: true })
        .evaluate((e) => parseFloat(getComputedStyle(e).fontSize) > 30),
    );
    await shot("windows-dark-settings");
    const original = path.join(qa, "import-source.png");
    fs.copyFileSync(path.resolve(__dirname, "../assets/icon.png"), original);
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] });
    }, original);
    await button("选择图片").click();
    await page.waitForFunction(
      async () => (await window.clubDesktop.appearance()).background === "custom",
    );
    fs.unlinkSync(original);
    assert.ok(
      (await page.evaluate(() => window.clubDesktop.appearance())).backgroundImage.startsWith(
        "data:image/png;base64,",
      ),
    );
    await button("玫瑰粉").click();
    await page.waitForFunction(
      async () => (await window.clubDesktop.appearance()).accent === "#bc4d78",
    );
    await app.close();
    app = await launch();
    page = await app.firstWindow();
    bind();
    await connected();
    await page.waitForFunction(() => document.documentElement.dataset.theme === "dark");
    const saved = await page.evaluate(() => window.clubDesktop.appearance());
    assert.equal(saved.background, "custom");
    assert.equal(saved.fontSize, 16);
    assert.equal(saved.accent, "#bc4d78");
    assert.ok(saved.backgroundImage);
    await nav("设置").click();
    await button("恢复默认外观").click();
    await page.waitForFunction(
      async () => (await window.clubDesktop.appearance()).backgroundImage === "",
    );
    assert.equal((await page.evaluate(() => window.clubDesktop.appearance())).mode, "light");
    await button("跟随系统外观").click();
    await page.waitForFunction(
      async () => (await window.clubDesktop.appearance()).mode === "system",
    );
    assert.equal(await app.evaluate(({ nativeTheme }) => nativeTheme.themeSource), "system");
    await button("浅色外观").click();
    for (const w of [1440, 1280, 1000]) {
      await app.evaluate(
        ({ BrowserWindow }, w) => BrowserWindow.getAllWindows()[0].setSize(w, 820),
        w,
      );
      await page.waitForTimeout(200);
      assert.equal(
        await page.locator(".content").evaluate((e) => e.scrollWidth <= e.clientWidth),
        true,
      );
      await shot("settings-" + w);
    }
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 940));
    // In-memory fixtures exercise staff actions without writing to real school accounts.
    await app.evaluate(({ ipcMain }) => {
      const f = (global.__unified = {
        role: "admin",
        writes: [],
        words: [{ word: "示例词条", source: "打包" }],
        suggestions: [
          { id: 1, title: "测试建议", context: "内存检查资料", name: "测试同学", pass: false },
        ],
        accounts: [
          {
            id: 1,
            username: "测试同学",
            usernameEn: "Test Student",
            email: "test@example.invalid",
            userRight: 0,
          },
        ],
      });
      ipcMain.removeHandler("club:read");
      ipcMain.removeHandler("club:write");
      ipcMain.handle("club:read", (_e, key) => ({
        ok: true,
        data:
          {
            me: { account: { id: "a".repeat(64), name: "测试管理员", role: f.role } },
            clubs: [{ id: 1, clubName: "编程社", clubClass: "study" }],
            mine: [],
            announcements: [],
            inbox: [],
            calendar: { events: [] },
            notifications: { items: [], unread: 0 },
            staffAccounts: f.accounts,
            staffClubs: [{ id: 1, clubName: "编程社" }],
            moderationWords: { words: f.words },
            moderationStrikes: { accounts: [] },
            suggestions: f.suggestions,
          }[key] || [],
      }));
      ipcMain.handle("club:write", (_e, key, a = {}) => {
        f.writes.push({ key, ...a });
        if (key === "accountRole") f.accounts[0].userRight = a.body.newRole;
        if (key === "moderationAdd") f.words.push({ word: a.body.word, source: "本机" });
        if (key === "moderationDelete") f.words = f.words.filter((x) => x.word !== a.word);
        if (key === "suggestionPass") f.suggestions[0].pass = true;
        return { ok: true, data: {} };
      });
    });
    await button("刷新数据").click();
    await nav("账号管理").waitFor();
    await nav("账号管理").click();
    await button("管理").click();
    await page.getByLabel("账号身份", { exact: true }).selectOption("2");
    await button("修改身份").click();
    await page
      .getByRole("dialog")
      .last()
      .getByRole("button", { name: "确认", exact: true })
      .click();
    await page.getByRole("cell", { name: "教师", exact: true }).waitFor();
    await nav("添加社团").click();
    for (const [name, value] of Object.entries({
      clubName: "检查社",
      clubNameEn: "Test Club",
      president: "测试同学",
      presidentEn: "Test Student",
      teacher: "测试老师",
      teacherEn: "Test Teacher",
      sortDescription: "测试简介",
      clubItem: "编程",
      clubDescription: "内存检查资料",
    }))
      await page.locator(`[name="${name}"]`).fill(value);
    await button("创建社团").click();
    await page.getByText("检查社已创建", { exact: true }).waitFor();
    await nav("内容审核").click();
    await page.getByRole("textbox", { name: "新增词条", exact: true }).fill("测试补充词");
    await button("添加词条").click();
    await button("移除").click();
    await page.getByRole("dialog").getByRole("button", { name: "确认", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await nav("建议管理").click();
    await button("通过").click();
    await page.getByRole("dialog").getByRole("button", { name: "确认", exact: true }).click();
    await page.getByRole("article").getByText("已通过", { exact: true }).waitFor();
    const keys = await app.evaluate(() => global.__unified.writes.map((x) => x.key));
    for (const key of [
      "accountRole",
      "clubAdd",
      "moderationAdd",
      "moderationDelete",
      "suggestionPass",
    ])
      assert.ok(keys.includes(key), key);
    await app.evaluate(() => (global.__unified.role = "teacher"));
    await button("刷新数据").click();
    await page.waitForFunction(
      () => ![...document.querySelectorAll("nav button")].some((e) => e.textContent === "添加社团"),
    );
    await nav("内容审核").click();
    await page.getByText("教师可查看记录，修改由管理员操作。", { exact: true }).waitFor();
    assert.equal(await button("添加词条").count(), 0);
    await button("最大化窗口").click();
    await button("还原窗口").click();
    assert.equal(await page.locator("iframe,webview").count(), 0);
    assert.equal(
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length),
      1,
    );
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(qa, "result.json"),
      JSON.stringify(
        {
          passed: true,
          platform:
            process.platform === "win32"
              ? "Native Windows Electron"
              : "Windows controls on macOS Electron; Windows machine not available",
          themes: ["light", "dark", "system"],
          appearancePersistence: true,
          customImagePersistence: true,
          adminWrites: keys,
          rendererErrors: errors,
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS: shared Windows entry; all appearance controls; restart/image persistence; three window sizes; staff actions and permissions; local UI.",
    );
  } catch (e) {
    console.error(await page.locator("body").innerText());
    throw e;
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
