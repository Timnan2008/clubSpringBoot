const { _electron: electron } = require("playwright-core");
const assert = require("node:assert/strict"),
  path = require("node:path"),
  fs = require("node:fs");
(async () => {
  fs.mkdirSync("qa", { recursive: true });
  const app = await electron.launch({
    args: [process.env.CLUB_APP_ROOT || path.join(__dirname, "..")],
    env: { ...process.env, CLUB_QA: "1" },
  });
  const errors = [],
    documents = [];
  try {
    const page = await app.firstWindow();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (r.isNavigationRequest()) documents.push(r.url());
    });
    await page.locator(".club-card").first().waitFor({ timeout: 60000 });
    const catalog = await page.evaluate(() => window.clubDesktop.read("clubs"));
    assert.ok(catalog.ok && catalog.data.length > 0);
    assert.equal(await page.evaluate(() => typeof window.clubDesktop.openPage), "undefined");
    assert.equal(await page.evaluate(() => typeof window.require), "undefined");
    assert.equal(
      (await page.evaluate(() => window.clubDesktop.read("https://attacker.test"))).ok,
      false,
    );
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".club-card img")].every((i) => i.complete),
    );
    await page.screenshot({ path: "qa/home-1440.png" });
    const security = await app.evaluate(({ BrowserWindow }) => {
      const p = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
      return { node: p.nodeIntegration, isolation: p.contextIsolation, sandbox: p.sandbox };
    });
    assert.deepEqual(security, { node: false, isolation: true, sandbox: true });
    for (const [name, category] of [
      ["创造类社团", "creativity"],
      ["活动类社团", "activity"],
      ["服务类社团", "service"],
      ["学术类社团", "study"],
    ]) {
      await page.getByRole("button", { name, exact: true }).click();
      await page.getByRole("heading", { name, exact: true }).waitFor();
      assert.equal(
        await page.locator(".club-card").count(),
        catalog.data.filter((c) => c.clubClass === category).length,
      );
    }
    await page.getByRole("button", { name: "发现社团", exact: true }).click();
    await page.screenshot({ path: "qa/discover.png" });
    await page.getByRole("textbox", { name: "搜索社团", exact: true }).fill("编程");
    assert.equal(await page.locator(".club-card").count(), 1);
    await page.locator(".club-card").click();
    await page.getByRole("heading", { name: "关于这个社团", exact: true }).waitFor();
    await page.locator(".leader-grid").count();
    await page.screenshot({ path: "qa/club-detail.png" });
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await page.getByRole("dialog").waitFor();
    await page.screenshot({ path: "qa/login.png" });
    assert.equal(await page.locator("iframe,webview").count(), 0);
    assert.equal(
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length),
      1,
    );
    assert.ok(page.url().startsWith("file://"));
    await page.getByRole("button", { name: "注册", exact: true }).click();
    await page.getByText("新账号注册暂未开放，请联系学校管理员。", { exact: true }).waitFor();
    assert.equal(await page.getByRole("dialog").locator("input").count(), 0);
    await page.screenshot({ path: "qa/register.png" });
    await page.getByRole("button", { name: "登录", exact: true }).last().click();
    await page.getByRole("button", { name: "忘记密码？", exact: true }).click();
    await page.getByRole("button", { name: "发送验证码", exact: true }).waitFor();
    await page.getByRole("button", { name: "关闭", exact: true }).click();
    for (const name of ["校园墙", "站内私信", "活动日程", "羽毛球场预约"]) {
      await page.getByRole("button", { name, exact: true }).click();
      await page.getByText("登录后使用校园服务", { exact: true }).waitFor();
    }
    assert.equal(await page.getByRole("button", { name: "青源智造", exact: true }).count(), 0);
    await page.getByRole("button", { name: "设置", exact: true }).click();
    await page.screenshot({ path: "qa/settings.png" });
    await page.getByRole("switch", { name: "紧凑模式" }).click();
    assert.ok(await page.locator(".app.compact").count());
    await page.getByRole("switch", { name: "紧凑模式" }).click();
    await page.getByRole("button", { name: "首页", exact: true }).click();
    for (const [w, h] of [
      [1280, 720],
      [1000, 740],
    ]) {
      await app.evaluate(
        ({ BrowserWindow }, [w, h]) => BrowserWindow.getAllWindows()[0].setSize(w, h),
        [w, h],
      );
      await page.waitForTimeout(250);
      assert.equal(
        await page.locator(".content").evaluate((e) => e.scrollWidth <= e.clientWidth),
        true,
      );
      await page.screenshot({ path: `qa/home-${w}.png` });
    }
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 940));
    await page.waitForTimeout(250);
    // The following in-memory fixtures test private UI without writing to real school accounts.
    const crypto = require("node:crypto");
    const keys = async () => {
      const k = await crypto.webcrypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveBits"],
      );
      const publicKey = Buffer.from(
        await crypto.webcrypto.subtle.exportKey("spki", k.publicKey),
      ).toString("base64");
      return {
        ready: true,
        publicKey,
        privateKey: Buffer.from(
          await crypto.webcrypto.subtle.exportKey("pkcs8", k.privateKey),
        ).toString("base64"),
        fingerprint: crypto
          .createHash("sha256")
          .update(Buffer.from(publicKey, "base64"))
          .digest("hex"),
      };
    };
    await page.evaluate(async () => {
      for (const entry of await indexedDB.databases())
        if (entry.name.startsWith("qpwfl-desktop-keys-"))
          await new Promise((resolve, reject) => {
            const r = indexedDB.deleteDatabase(entry.name);
            r.onsuccess = resolve;
            r.onerror = () => reject(r.error);
          });
    });
    const fixtureKeys = { own: await keys(), peerKey: await keys() };
    await app.evaluate(async ({ ipcMain }, { own, peerKey }) => {
      const me = {
          id: "a".repeat(64),
          name: "测试同学",
          nameEn: "Test Student",
          role: "president",
        },
        peer = { id: "b".repeat(64), name: "测试伙伴" };
      let signed = false;
      global.__clubFixture = {
        writes: [],
        messages: [],
        events: [],
        bookings: [],
        posts: [],
        requests: [{ id: "request-test", name: "申请同学", note: "想加入编程社" }],
        members: [{ id: me.id, name: me.name, role: "president" }],
      };
      const f = global.__clubFixture;
      ipcMain.removeHandler("club:read");
      ipcMain.removeHandler("club:write");
      ipcMain.handle("club:read", (_e, key, a = {}) => {
        const result = (data) => ({ ok: true, data });
        if (key === "me")
          return signed ? result({ account: me }) : { ok: false, auth: true, message: "请登录" };
        if (!signed && !["clubs", "announcements", "club"].includes(key))
          return { ok: false, auth: true, message: "请登录" };
        switch (key) {
          case "clubs":
            return result([
              { id: 1, clubName: "编程社", clubClass: "study", sortDescription: "测试社团资料" },
            ]);
          case "club":
            return result({
              id: 1,
              clubName: "编程社",
              clubDescription: "这是一份测试用的社团介绍。",
              president: "测试社长",
              teacher: "测试老师",
              clubClass: "study",
            });
          case "announcements":
            return result([]);
          case "mine":
            return result([]);
          case "calendar":
            return result({ events: f.events });
          case "inbox":
            return result([{ account: peer, preview: "加密私信", unread: 0 }]);
          case "notifications":
            return result({ items: [], unread: 0 });
          case "social":
            return result({ canPost: true });
          case "posts":
            return result({ items: f.posts, next: false });
          case "replies":
            return result([]);
          case "join":
            return result({ status: f.join ? "pending" : "none" });
          case "workspace":
            return result({ clubs: [{ id: 1, name: "编程社" }] });
          case "clubWorkspace":
            return result({ documents: [], activities: f.events });
          case "members":
            return result(f.members);
          case "requests":
            return result(f.requests);
          case "users":
            return result([peer]);
          case "key":
            return result(a.id === me.id ? own : peerKey);
          case "recovery":
            return result(own);
          case "conversation":
            return result({ account: peer, messages: f.messages, messagingAllowed: true });
          case "booking":
            return result({
              calendar: {
                policy: { settings: { slotMinutes: 20, weeklyLimit: 3, rulesVersion: 1 } },
                courts: [{ id: 1, name: "三楼一号场地" }],
                dates: ["2026-11-20"],
                times: ["11:30"],
                cells: [
                  {
                    courtId: 1,
                    start: Date.parse("2026-11-20T11:30:00+08:00") / 1000,
                    end: Date.parse("2026-11-20T11:50:00+08:00") / 1000,
                    canBook: true,
                  },
                ],
                studentOpen: true,
              },
            });
          case "bookings":
            return result(f.bookings);
          default:
            return result([]);
        }
      });
      ipcMain.handle("club:write", (_e, key, a = {}) => {
        f.writes.push({ key, ...a });
        const b = a.body || {};
        switch (key) {
          case "login":
            signed = true;
            return { ok: true, data: { signedIn: true } };
          case "calendarAdd":
            f.events.push({ ...b, id: "test-event" });
            break;
          case "calendarEdit":
            f.events = f.events.map((e) => (e.id === a.id ? { ...e, ...b } : e));
            break;
          case "calendarDelete":
            f.events = f.events.filter((e) => e.id !== a.id);
            break;
          case "post":
            f.posts.push({
              ...b,
              id: "test-post",
              author: me,
              createdAt: "2026-11-17T20:00:00",
              likes: 0,
              replies: 0,
            });
            break;
          case "like":
            f.posts[0].liked = b.liked;
            f.posts[0].likes = b.liked ? 1 : 0;
            break;
          case "message":
            f.messages.push({
              id: "test-message",
              sender: me.id,
              recipient: peer.id,
              text: b.text,
              read: false,
              createdAt: "2026-11-17T20:00:00",
            });
            break;
          case "booking":
            f.bookings.push({ ...b, id: 1, courtName: "三楼一号场地", status: "confirmed" });
            break;
          case "bookingCancel":
            f.bookings = [];
            break;
          case "join":
            f.join = true;
            break;
          case "joinReview":
            f.requests = [];
            break;
          case "clubEvent":
            f.events.push({ ...b, id: "club-test", status: "scheduled" });
            break;
        }
        return { ok: true, data: { status: "confirmed" } };
      });
    }, fixtureKeys);
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await page.getByRole("textbox", { name: "邮箱", exact: true }).fill("test@example.com");
    await page.locator("input[name=password]").fill("FixtureOnly123!");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "登录", exact: true })
      .last()
      .click();
    await page.getByRole("dialog").waitFor({ state: "detached" });
    await page.getByText("晚上好，测试同学", { exact: false }).count();
    await page.getByRole("button", { name: "刷新数据" }).click();
    await page.getByRole("button", { name: "打开个人资料" }).waitFor();
    await page.getByRole("button", { name: "学术类社团", exact: true }).click();
    await page.locator(".club-card").first().click();
    await page.getByRole("button", { name: "申请加入", exact: true }).click();
    await page.getByRole("textbox", { name: "想对社团说的话" }).fill("希望一起写代码");
    await page.getByRole("button", { name: "提交申请" }).click();
    await page.getByRole("button", { name: "申请已提交", exact: true }).waitFor();
    await page.getByRole("button", { name: "活动日程", exact: true }).click();
    await page.getByRole("button", { name: "添加个人日程" }).click();
    await page.getByRole("textbox", { name: "名称", exact: true }).fill("测试日程");
    await page.locator("input[name=start]").fill("2026-11-20T16:00");
    await page.locator("input[name=end]").fill("2026-11-20T17:00");
    await page.getByRole("button", { name: "创建活动", exact: true }).last().click();
    await page.getByRole("dialog").waitFor({ state: "detached" });
    await page.locator(".event-list-row").waitFor();
    await page.screenshot({ path: "qa/calendar-fixture.png" });
    await page.locator(".event-list-row").click();
    await page.getByRole("button", { name: "修改日程", exact: true }).click();
    await page.getByRole("textbox", { name: "名称", exact: true }).fill("已修改的日程");
    await page.getByRole("button", { name: "保存日程", exact: true }).click();
    await page.locator(".event-list-row").filter({ hasText: "已修改的日程" }).click();
    await page.getByRole("button", { name: "删除日程", exact: true }).click();
    await page.getByRole("button", { name: "确认删除", exact: true }).click();
    await page.getByText("这段时间没有日程", { exact: true }).waitFor();
    await page.getByRole("button", { name: "羽毛球场预约", exact: true }).click();
    await page.getByRole("button", { name: "预约", exact: true }).click();
    await page.getByRole("checkbox", { name: "我已阅读并同意预约须知" }).check();
    await page.getByRole("button", { name: "提交预约", exact: true }).click();
    await page.getByRole("dialog").waitFor({ state: "detached" });
    await page.getByRole("button", { name: "我的预约", exact: true }).click();
    await page.locator(".booking-row").waitFor();
    await page.screenshot({ path: "qa/booking-fixture.png" });
    await page.getByRole("button", { name: "取消预约", exact: true }).click();
    await page.getByRole("button", { name: "确认取消", exact: true }).click();
    await page.getByText("还没有预约记录", { exact: true }).waitFor();
    await page.getByRole("button", { name: "打开个人资料" }).click();
    await page.getByRole("button", { name: "保存资料", exact: true }).click();
    await page.getByRole("button", { name: "校园墙", exact: true }).click();
    await page.getByRole("button", { name: "发布动态", exact: true }).click();
    await page.getByRole("textbox", { name: "这一刻，想分享什么？" }).fill("校园墙测试内容");
    await page.getByRole("dialog").getByRole("button", { name: "发布动态", exact: true }).click();
    await page.locator(".post-card").waitFor();
    await page.getByRole("button", { name: "0", exact: true }).click();
    await page.getByRole("button", { name: "1", exact: true }).waitFor();
    await page.screenshot({ path: "qa/wall-fixture.png" });
    await page.getByRole("button", { name: "我的社团", exact: true }).click();
    await page.locator("nav").getByRole("button", { name: "社团工作台", exact: true }).click();
    await page.getByRole("button", { name: "成员", exact: true }).click();
    await page.getByText("测试同学", { exact: true }).last().waitFor();
    await page.getByRole("button", { name: "入社申请", exact: true }).click();
    await page.getByRole("button", { name: "通过", exact: true }).click();
    await page.getByText("暂时没有待处理申请", { exact: true }).waitFor();
    await page.getByRole("button", { name: "站内私信", exact: true }).click();
    await page.locator(".conversation").filter({ hasText: "测试伙伴" }).click();
    await page.getByPlaceholder("说点什么…").waitFor();
    await page.getByPlaceholder("说点什么…").fill("你好，校园伙伴");
    await page.getByRole("button", { name: "发送消息", exact: true }).click();
    await page.getByText("你好，校园伙伴", { exact: true }).waitFor();
    await page.screenshot({ path: "qa/chat-fixture.png" });
    const writes = await app.evaluate(() => global.__clubFixture.writes);
    const message = writes.find((w) => w.key === "message");
    assert.ok(message.body.text.startsWith("e2ee:v1:"));
    assert.ok(!message.body.text.includes("你好，校园伙伴"));
    assert.ok(
      ["login", "join", "calendarAdd", "post", "like", "joinReview", "message"].every((key) =>
        writes.some((w) => w.key === key),
      ),
    );
    assert.equal(
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length),
      1,
    );
    assert.ok(page.url().startsWith("file://"));
    assert.equal(documents.filter((u) => /^https?:/.test(u)).length, 0);
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      "qa/smoke-result.json",
      JSON.stringify(
        {
          passed: true,
          livePublicClubs: catalog.data.length,
          rendererErrors: errors,
          remoteDocumentNavigations: 0,
          windows: 1,
          privateFlows: "in-memory fixtures, no real account writes",
          checkedWrites: writes.map((w) => w.key),
          security,
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS: native Electron pages, live public clubs:",
      catalog.data.length,
      "; private form fixtures; encrypted chat; no remote windows.",
    );
  } catch (e) {
    for (const p of app.windows()) {
      await p.screenshot({ path: "qa/failure.png" }).catch(() => {});
      console.error("Window:", p.url(), (await p.locator("body").innerText()).slice(-2200));
    }
    throw e;
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
