const { _electron: electron } = require("playwright-core");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const qa = path.resolve(__dirname, "../qa/layout"),
  profile = path.resolve(__dirname, "../.local/layout-qa-profile");
fs.mkdirSync(qa, { recursive: true });
async function keys() {
  const key = await crypto.webcrypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const publicKey = Buffer.from(
    await crypto.webcrypto.subtle.exportKey("spki", key.publicKey),
  ).toString("base64");
  return {
    ready: true,
    publicKey,
    privateKey: Buffer.from(
      await crypto.webcrypto.subtle.exportKey("pkcs8", key.privateKey),
    ).toString("base64"),
    fingerprint: crypto.createHash("sha256").update(Buffer.from(publicKey, "base64")).digest("hex"),
  };
}
(async () => {
  const app = await electron.launch({
    executablePath: require("electron"),
    args: [path.resolve(__dirname, "..")],
    env: { ...process.env, CLUB_QA: "1", CLUB_DESKTOP_USER_DATA: profile },
  });
  const page = await app.firstWindow(),
    errors = [],
    checks = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const nav = (name) => page.locator("nav").getByRole("button", { name, exact: true });
  const button = (name) => page.getByRole("button", { name, exact: true });
  const shot = async (name) => {
    await page.waitForTimeout(220);
    await page.screenshot({ path: path.join(qa, name + ".png"), scale: "css" });
  };
  const fits = async () =>
    assert.ok(
      await page.locator(".content").evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
      "content fits horizontally",
    );
  try {
    await page.locator(".club-card").first().waitFor({ timeout: 60000 });
    await page.evaluate(() => window.clubDesktop.resetAppearance());
    // Replace both IPC routes before signing in; every private read/write stays in memory.
    await app.evaluate(
      ({ ipcMain }, { own, peerKey }) => {
        const me = { id: own.fingerprint, name: "测试同学", role: "president", clubName: "编程社" },
          peer = {
            id: peerKey.fingerprint,
            name: "校园伙伴",
            role: "admin",
            badges: ["male-bestie"],
          },
          vice = {
            name: "测试副社长",
            role: "president",
            position: "vice_president",
            clubName: "校园阅读与交流社",
          };
        const month = new Date().toISOString().slice(0, 7);
        const long = [
          "大家好，周五一起分享最近的校园生活。",
          "活动地点：图书馆二楼\n活动时间：周五下午",
          ...Array.from(
            { length: 12 },
            (_, i) => `第 ${i + 1} 项安排：交流阅读、整理社团活动记录，与伙伴一起准备本周的展示。`,
          ),
          "全文结束：期待在校园里见面。",
        ].join("\n\n\n\n");
        const posts = [
          {
            id: "long",
            author: me,
            text: long,
            likes: 1,
            replies: 3,
            createdAt: "2026-11-18T16:20:00",
          },
          {
            id: "short",
            author: peer,
            text: "今天的社团活动很充实。\n感谢大家一起完成准备！",
            likes: 0,
            replies: 0,
            createdAt: "2026-11-18T17:30:00",
          },
          {
            id: "safe",
            author: {
              name: "很长的社团名称与同学姓名用于检查窄窗口排版",
              role: "teacher",
              badges: ["teacher-day-2026"],
            },
            clubName: "校园阅读与交流社",
            text: "<img src=x onerror=alert(1)>\n保留原文，不执行 HTML。",
            likes: 0,
            replies: 0,
            createdAt: "2026-11-18T18:00:00",
          },
          {
            id: "vice",
            author: vice,
            text: "本周社团阅读交流照常进行。",
            createdAt: "2026-11-18T18:00:00",
          },
          {
            id: "anonymous",
            anonymous: true,
            author: {
              name: "不应公开的姓名",
              role: "admin",
              badges: ["teacher-day-2026", "male-bestie"],
            },
            text: "匿名内容",
            createdAt: "2026-11-18T18:00:00",
          },
          {
            id: "unknown",
            author: { name: "未提供身份的同学", role: "future-role", badges: ["unknown-badge"] },
            text: "没有身份资料时不猜测头衔。",
            createdAt: "2026-11-18T18:00:00",
          },
          {
            id: "student",
            author: { name: "普通同学", role: "student" },
            text: "欢迎加入校园交流。",
            createdAt: "2026-11-18T18:00:00",
          },
        ];
        const events = [
          {
            id: "e1",
            kind: "personal",
            title: "社团活动与资料整理交流会",
            start: `${month}-19T15:30:00`,
            end: `${month}-19T16:30:00`,
            location: "图书馆",
          },
        ];
        global.__layoutFixture = { next: false, writes: [], requests: [] };
        const f = global.__layoutFixture,
          ok = (data) => ({ ok: true, data });
        ipcMain.removeHandler("club:read");
        ipcMain.removeHandler("club:write");
        ipcMain.handle("club:read", (_e, key, a = {}) => {
          f.requests.push({ key, ...a });
          switch (key) {
            case "me":
              return ok({ account: me });
            case "clubs":
              return ok([
                {
                  id: 1,
                  clubName: "编程社",
                  clubClass: "study",
                  sortDescription: "一起交流和创造",
                },
              ]);
            case "announcements":
            case "mine":
              return ok([]);
            case "calendar":
              return ok({ events });
            case "inbox":
              return ok([{ account: peer, preview: "周五见！", unread: 0 }]);
            case "notifications":
              return ok({ items: [], unread: 0 });
            case "social":
              return ok({ canPost: true });
            case "posts":
              return ok({
                items: a.keyword ? [] : a.page > 1 ? [posts[1]] : posts,
                next: f.next && a.page === 1,
              });
            case "replies":
              return ok([
                { id: "reply", author: peer, text: "期待见面！", createdAt: "2026-11-18T18:01:00" },
                {
                  id: "vice-reply",
                  author: vice,
                  text: "活动准备好了。",
                  createdAt: "2026-11-18T18:02:00",
                },
                {
                  id: "anon-reply",
                  author: { role: "anonymous", name: "匿名楼主", badges: ["male-bestie"] },
                  text: "谢谢大家。",
                  createdAt: "2026-11-18T18:03:00",
                },
              ]);
            case "recovery":
              return ok(own);
            case "key":
              return ok(a.id === me.id ? own : peerKey);
            case "conversation":
              return ok({
                messagingAllowed: true,
                messages: Array.from({ length: 24 }, (_, i) => ({
                  id: `m${i}`,
                  sender: i % 2 ? me.id : peer.id,
                  recipient: i % 2 ? peer.id : me.id,
                  text: i === 23 ? "周五见！" : "活动资料准备好了，之后一起核对。",
                  createdAt: "2026-11-18T18:00:00",
                  read: true,
                })),
              });
            default:
              return ok([]);
          }
        });
        ipcMain.handle("club:write", (_e, key) => {
          f.writes.push(key);
          return ok({});
        });
      },
      { own: await keys(), peerKey: await keys() },
    );
    await page.reload();
    await button("打开个人资料").waitFor();
    await nav("校园墙").click();
    await page.locator(".post-card").first().waitFor();
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 940));
    const card = page.locator(".post-card").first();
    await button("展开全文").waitFor();
    const identities = page.locator(".post-card .author-identity");
    assert.equal(await identities.nth(0).locator(".author-role").textContent(), "编程社 · 社长");
    assert.equal(
      await identities.nth(1).locator(".author-admin-badge").textContent(),
      "超级管理员",
    );
    assert.equal(await identities.nth(1).locator(".author-exclusive-badge").count(), 1);
    assert.equal(await identities.nth(2).locator(".author-role").textContent(), "教师");
    assert.equal(await identities.nth(2).locator(".author-holiday-badge").count(), 1);
    assert.equal(
      await identities.nth(3).locator(".author-role").textContent(),
      "校园阅读与交流社 · 副社长",
    );
    assert.equal(await identities.nth(4).textContent(), "匿名同学");
    assert.equal(await identities.nth(5).textContent(), "未提供身份的同学");
    assert.equal(await identities.nth(6).locator(".author-role").textContent(), "学生");
    assert.equal(await page.getByText("不应公开的姓名", { exact: true }).count(), 0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(
      await page
        .locator(".author-admin-badge")
        .evaluate((e) => getComputedStyle(e, "::before").animationName),
      "none",
    );
    const before = await card.boundingBox();
    assert.ok(before.height < 410, `long preview height: ${before.height}`);
    assert.equal(await page.locator(".post-card img").count(), 0);
    assert.equal(await page.locator(".pagination").count(), 0);
    await button("展开全文").click();
    assert.equal(await button("收起全文").getAttribute("aria-expanded"), "true");
    assert.ok((await card.boundingBox()).height > before.height + 100);
    assert.ok(await card.getByText("全文结束：期待在校园里见面。", { exact: true }).isVisible());
    await button("收起全文").click();
    assert.equal(await button("展开全文").getAttribute("aria-expanded"), "false");
    for (const theme of ["light", "dark"]) {
      await nav("设置").click();
      await button(theme === "light" ? "浅色外观" : "深色外观").click();
      for (const [width, height] of [
        [1440, 940],
        [1280, 820],
        [1000, 720],
      ]) {
        await app.evaluate(
          ({ BrowserWindow }, size) => BrowserWindow.getAllWindows()[0].setSize(...size),
          [width, height],
        );
        await nav("校园墙").click();
        await page.locator(".post-card").first().waitFor();
        await fits();
        // The toolbar also contains refresh/moderation actions. Check the named primary action.
        const publishRight = await button("发布动态").evaluate(
          (e) => e.getBoundingClientRect().right,
        );
        const geometry = await page.locator(".wall-page").evaluate((e, actionRight) => {
          const rect = (s) => e.querySelector(s).getBoundingClientRect();
          const h = rect(".page-heading"),
            s = rect(".wall-search"),
            p = rect(".wall-posts");
          return {
            left: Math.max(h.left, s.left, p.left) - Math.min(h.left, s.left, p.left),
            right: Math.abs(actionRight - p.right),
            title: parseFloat(getComputedStyle(e.querySelector("h1")).fontSize),
          };
        }, publishRight);
        assert.ok(
          geometry.left < 1 && geometry.right < 1 && geometry.title <= 30,
          JSON.stringify(geometry),
        );
        await shot(`wall-${theme}-${width}`);
        await nav("站内私信").click();
        await page.locator(".conversation").click();
        await page.getByPlaceholder("说点什么…").waitFor();
        const chat = await page.evaluate(() => {
          const r = (s) => document.querySelector(s).getBoundingClientRect();
          const main = document.querySelector(".content"),
            history = document.querySelector(".chat-history");
          const c = r(".chat-compose"),
            t = r(".chat-compose textarea"),
            b = r(".chat-compose .button");
          const bubble = document.querySelector(".message-line.own .message-bubble"),
            style = getComputedStyle(bubble);
          return {
            bottom: c.bottom,
            visibleBottom: main.getBoundingClientRect().bottom,
            sameRow: b.left > t.right,
            scrolls: history.scrollHeight > history.clientHeight,
            outerScroll: main.scrollHeight > main.clientHeight + 1,
            color: getComputedStyle(bubble.querySelector("p")).color,
            background: style.backgroundColor,
          };
        });
        assert.ok(
          chat.bottom <= chat.visibleBottom && chat.sameRow && chat.scrolls && !chat.outerScroll,
          JSON.stringify(chat),
        );
        const luminance = (value) =>
          value
            .match(/[\d.]+/g)
            .slice(0, 3)
            .map((v) => {
              const c = Number(v) / 255;
              return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            })
            .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
        const foreground = luminance(chat.color),
          bubbleBackground = luminance(chat.background);
        assert.ok(
          (Math.max(foreground, bubbleBackground) + 0.05) /
            (Math.min(foreground, bubbleBackground) + 0.05) >=
            4.5,
          "own bubble text contrast",
        );
        await fits();
        await shot(`chat-${theme}-${width}`);
        await nav("活动日程").click();
        await page.locator(".calendar-day.today").waitFor();
        await fits();
        const background = await page
          .locator(".calendar-day.blank")
          .first()
          .evaluate((e) => ({
            actual: getComputedStyle(e).backgroundColor,
            expected: getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(),
          }));
        assert.ok(!background.actual.includes("rgba"), JSON.stringify(background));
        await shot(`calendar-${theme}-${width}`);
        checks.push({ theme, width, height, geometry, chat });
      }
    }
    await nav("设置").click();
    await button("16号文字").click();
    await fits();
    await shot("settings-large");
    await nav("校园墙").click();
    await page.locator(".post-card").first().waitFor();
    await fits();
    await shot("wall-large");
    await page.getByRole("textbox", { name: "搜索校园墙" }).fill("  无匹配内容  ");
    await page.locator(".wall-search").getByRole("button", { name: "搜索", exact: true }).click();
    await page.getByText("没有找到动态", { exact: true }).waitFor();
    await button("清除搜索").click();
    await page.locator(".post-card").first().waitFor();
    assert.equal(await page.getByRole("textbox", { name: "搜索校园墙" }).inputValue(), "");
    await button("3 条回复").click();
    await page.getByText("期待见面！", { exact: true }).waitFor();
    assert.equal(await page.getByRole("dialog").locator(".post-paragraphs p").count(), 15);
    assert.equal(await page.getByRole("dialog").locator(".author-admin-badge").count(), 1);
    assert.equal(
      await page
        .getByRole("dialog")
        .getByText("校园阅读与交流社 · 副社长", { exact: true })
        .count(),
      1,
    );
    assert.equal(
      await page
        .getByRole("dialog")
        .locator(".reply")
        .last()
        .locator(".author-identity")
        .textContent(),
      "匿名楼主",
    );
    await page.getByRole("dialog").locator(".reply").last().scrollIntoViewIfNeeded();
    await shot("author-replies");
    await button("关闭").click();
    await app.evaluate(() => {
      global.__layoutFixture.next = true;
    });
    await nav("首页").click();
    await nav("校园墙").click();
    await button("下一页").click();
    await page.getByText("第 2 页", { exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelectorAll(".post-card").length === 1);
    assert.ok(await button("下一页").isDisabled());
    await button("上一页").click();
    await page.getByText("第 1 页", { exact: true }).waitFor();
    const fixture = await app.evaluate(() => global.__layoutFixture);
    assert.ok(
      fixture.requests.some((r) => r.key === "posts" && r.keyword === "无匹配内容" && r.page === 1),
    );
    assert.ok(
      fixture.writes.every((key) => key === "keyRecovery"),
      JSON.stringify(fixture.writes),
    );
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(qa, "result.json"),
      JSON.stringify(
        {
          passed: true,
          checks,
          scenarios: [
            "website roles, admin crown and assigned badges in posts and replies",
            "anonymous identity privacy and unknown-role fallback",
            "paragraphs and safe text",
            "long post expand/collapse",
            "empty search and reset",
            "reply reading",
            "pagination",
            "fixed composer and independent chat scroll",
            "light/dark and 16px text",
          ],
          privateData: "in-memory fixtures only",
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS: wall alignment, paragraphs, long posts, search, pagination, chat scrolling, calendar and large text across six theme/size combinations.",
    );
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
