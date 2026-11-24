import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright-core";

const repo = path.resolve(import.meta.dirname, "../..");
const resources = path.join(repo, "src/main/resources");
const { outputFiles } = await build({
  entryPoints: [path.join(repo, "frontend/desktop/desktop-entry.jsx")],
  bundle: true,
  format: "esm",
  write: false,
  outdir: "fixture",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
});
const assets = new Map(outputFiles.map((file) => [path.basename(file.path), file.contents]));
const pageTemplate = await readFile(
  path.join(resources, "templates/page/desktop-dashboard.html"),
  "utf8",
);
const crest = await readFile(path.join(resources, "static/other photo/WFL-crest.svg"));
const frameTemplate = await readFile(
  path.join(resources, "templates/fragments/desktop-frame.html"),
  "utf8",
);
const notices = frameTemplate.match(
  /<template th:fragment="announcements"[^>]*>[\s\S]*?<\/template>/,
)?.[0];
assert.ok(notices, "Missing announcement data fragment");
const html = pageTemplate
  .replace(
    /<template th:replace="~\{fragments\/desktop-frame :: announcements\}"><\/template>/,
    notices,
  )
  .replace(/(data-notice="platform-release"[^>]*>)[^<]*/, "$1【版本更新】测试工作台公告")
  .replace(/(data-notice="account-access"[^>]*>)[^<]*/, "$1【功能开放】社团报名入口已开放")
  .replace(/(data-notice="club-editing"[^>]*>)[^<]*/, "$1【权限说明】负责人可以编辑社团资料");

const browserPath =
  process.env.CHROME_BIN ||
  [
    ...[process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA]
      .filter(Boolean)
      .flatMap((base) => [
        path.join(base, "Google/Chrome/Application/chrome.exe"),
        path.join(base, "Microsoft/Edge/Application/msedge.exe"),
      ]),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    chromium.executablePath(),
  ].find(existsSync);
assert.ok(browserPath, "Install Chrome or set CHROME_BIN to a Chromium-based browser executable.");

const clubs = [
  {
    id: 31,
    clubName: "校园摄影社",
    clubNameEn: "Photography",
    sortDescription: "记录真实的校园日常。",
    greatClub: true,
    clubItem: "/missing-cover.png",
  },
  {
    id: 35,
    clubName: "青浦辩论社",
    clubNameEn: "Debate",
    sortDescription: "从不同角度讨论校园话题。",
    greatClub: true,
  },
  {
    id: 28,
    clubName: "科创社",
    clubNameEn: "STEAM",
    sortDescription: "动手设计与创造。",
    greatClub: false,
  },
  {
    id: 42,
    clubName: "运动社",
    clubNameEn: "Sport",
    sortDescription: "一起参加校园体育活动。",
    greatClub: false,
  },
];
const memberships = clubs.slice(0, 2).map(({ id, clubName, clubNameEn }) => ({
  id,
  name: clubName,
  nameEn: clubNameEn,
  role: "社员",
}));
const event = (id, title, start, end, kind = "club", completed = false) => ({
  id,
  title,
  start,
  end,
  kind,
  completed,
  location: "社团活动室",
  description: "现有日历中的活动说明",
  reminderMinutes: 15,
  clubId: kind === "club" ? 31 : null,
  clubName: kind === "club" ? "校园摄影社" : "",
  clubNameEn: kind === "club" ? "Photography" : "",
});
const events = [
  event("club:31:ended", "往期报名说明会", "2026-11-16T15:00", "2026-11-16T17:00"),
  event("club:31:soon", "校园采风日程", "2026-11-17T17:00", "2026-11-17T18:00"),
  event("club:31:later", "校园影像交流会", "2026-11-23T15:00", "2026-11-23T17:00"),
  event("work-open", "未完成的个人事项", "2026-11-12T17:00", "2026-11-12T18:00", "homework"),
  event("work-done", "已完成的个人事项", "2026-11-28T17:00", "2026-11-28T18:00", "homework", true),
];
const token = "browser-fixture-token";
const calendarQueries = [];
let catalogFailure;
const catalogGate = new Promise((resolve) => {
  catalogFailure = resolve;
});
let catalogCalls = 0;
const joins = [];
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const role =
    /(?:^|; )qa-role=(student|guest|manager)(?:;|$)/.exec(req.headers.cookie || "")?.[1] ||
    "manager";
  const account = {
    id: "fixture-account",
    name: "测试同学",
    nameEn: "Test Student",
    role: role === "manager" ? "president" : "student",
  };
  const json = (data, status = 200) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };
  if (url.pathname === "/page/desktop") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }
  const asset =
    url.pathname.startsWith("/javascript/desktop/") && assets.get(path.basename(url.pathname));
  if (asset) {
    res.writeHead(200, {
      "Content-Type": url.pathname.endsWith(".css") ? "text/css" : "text/javascript",
    });
    res.end(asset);
    return;
  }
  if (url.pathname === "/other%20photo/WFL-crest.svg") {
    res.writeHead(200, { "Content-Type": "image/svg+xml" });
    res.end(crest);
    return;
  }
  if (url.pathname === "/api/campus-social/me") {
    if (role === "guest") return json({ message: "请先登录校园账号" }, 401);
    return json({ account, token, offices: [] });
  }
  if (url.pathname === "/api/club/all") {
    catalogCalls++;
    if (catalogCalls === 1) {
      await catalogGate;
      return json({ message: "社团目录暂时不可用" }, 503);
    }
    return json({ code: 200, data: clubs });
  }
  if (url.pathname === "/api/campus-social/me/clubs") return json(memberships);
  if (url.pathname === "/api/club-workspace") {
    if (role !== "manager") return json({ message: "无管理权限" }, 403);
    return json({ account, token, clubs: memberships.slice(0, 1) });
  }
  if (url.pathname === "/api/campus-social/calendar") {
    calendarQueries.push(Object.fromEntries(url.searchParams));
    return json({ account, token, clubs: memberships, events, timezone: "Asia/Shanghai" });
  }
  if (url.pathname === "/api/campus-social/inbox") return json([{ unread: 1 }]);
  if (url.pathname === "/api/campus-social/notifications") {
    return json({
      items: [
        {
          id: "message:fixture",
          type: "message",
          url: "/page/messages",
          createdAt: "2026-11-17T08:00:00Z",
          unread: true,
          actor: account,
        },
      ],
      notices: [],
      unread: 1,
      token,
    });
  }
  if (url.pathname === "/api/campus-social/personal-welcome") return json({ enabled: false });
  const clubId = /^\/api\/campus-social\/clubs\/(\d+)\/join$/.exec(url.pathname)?.[1];
  if (clubId && req.method === "POST") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    joins.push({
      clubId,
      requestToken: req.headers["x-workspace-token"],
      body: JSON.parse(Buffer.concat(chunks)),
    });
    return json({ status: "pending" });
  }
  if (clubId)
    return json({
      status: memberships.some(({ id }) => id === Number(clubId)) ? "member" : "none",
      token,
    });
  if (url.pathname === "/api/club/search") {
    const keyword = url.searchParams.get("keyword");
    return json({
      code: 200,
      data: clubs
        .filter(({ clubName }) => clubName.includes(keyword))
        .map(({ id, clubName }) => ({ id, name: clubName })),
    });
  }
  if (url.pathname === "/api/campus-social/users") return json([]);
  if (url.pathname === "/api/campus-social/posts") return json({ items: [] });
  res.writeHead(404).end();
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

const origin = `http://127.0.0.1:${server.address().port}`;
const url = origin + "/page/desktop";
const errors = [];
let browser;

async function openPage(role, platform = "win32") {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([{ name: "qa-role", value: role, url: origin }]);
  await context.addInitScript((value) => {
    window.clubDesktop = { platform: value };
  }, platform);
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.setFixedTime(new Date("2026-11-17T08:00:00Z"));
  await page.goto(url, { waitUntil: "domcontentloaded" });
  return page;
}

try {
  browser = await chromium.launch({ executablePath: browserPath, headless: true });
  const page = await openPage("manager");
  const summary = page.getByRole("region", { name: "工作台概览" });
  const recommended = page.getByRole("region", { name: "推荐社团" });
  const newest = page.getByRole("button", { name: /测试工作台公告/ });
  const create = page.getByRole("link", { name: "创建活动", exact: true });
  await recommended.getByRole("status", { name: "正在加载" }).waitFor();
  catalogFailure();
  await recommended.getByRole("alert").waitFor();
  await recommended.getByRole("button", { name: "重试", exact: true }).click();
  const photography = recommended.getByRole("link", { name: /校园摄影社/ });
  await photography.waitFor();
  assert.equal(catalogCalls, 2);
  await photography.locator('img[src*="WFL-crest.svg"]').waitFor();
  await create.waitFor();
  assert.equal(
    await create.getAttribute("href"),
    "/page/club/workspace?tab=calendar&action=create-event",
  );
  await summary
    .getByRole("link", { name: /加入的社团/ })
    .getByText("2", { exact: true })
    .waitFor();
  await summary
    .getByRole("link", { name: /本月活动/ })
    .getByText("3", { exact: true })
    .waitFor();
  await summary
    .getByRole("link", { name: /待处理事项/ })
    .getByText("1", { exact: true })
    .waitFor();
  assert.deepEqual(calendarQueries[0], { from: "2026-11-01", to: "2027-02-01" });

  const nav = page.getByRole("navigation", { name: "工作台导航" });
  assert.equal(
    await nav.getByRole("link", { name: "首页", exact: true }).getAttribute("aria-current"),
    "page",
  );
  const messageLink = nav.getByRole("link", { name: /消息.*1/ });
  await messageLink.waitFor();
  assert.equal(await messageLink.getAttribute("href"), "/page/messages");
  assert.equal(
    await nav.getByRole("link", { name: /活动日程.*1/ }).getAttribute("href"),
    "/page/calendar",
  );
  await page.getByRole("button", { name: /站内消息/ }).click();
  const notification = page.getByRole("region", { name: "站内消息" });
  await notification.getByText("发来一条私信").waitFor();
  await page.keyboard.press("Escape");
  await notification.waitFor({ state: "hidden" });

  assert.equal(await newest.getAttribute("data-unread"), "true");
  await newest.click();
  const drawer = page.getByRole("dialog", { name: "公告详情" });
  await drawer.getByRole("heading", { name: "测试工作台公告" }).waitFor();
  assert.equal(page.url(), url);
  await page.keyboard.press("Escape");
  await drawer.waitFor({ state: "hidden" });
  assert.equal(await newest.getAttribute("data-unread"), "false");

  const activity = page.getByRole("button", { name: /校园采风日程/ });
  assert.match(await activity.innerText(), /即将开始/);
  assert.match(await page.getByRole("button", { name: /校园影像交流会/ }).innerText(), /未开始/);
  assert.match(await page.getByRole("button", { name: /往期报名说明会/ }).innerText(), /已结束/);
  await activity.click();
  await page.getByRole("dialog", { name: "活动详情" }).getByText("社团活动室").waitFor();
  await page.keyboard.press("Escape");

  const search = page.getByRole("combobox");
  await page.keyboard.press("Control+k");
  assert.equal(await search.evaluate((input) => input === document.activeElement), true);
  assert.equal(await search.getAttribute("placeholder"), "搜索社团、活动、成员或公告");
  await search.fill("测试工作台公告");
  await page.getByRole("option", { name: /测试工作台公告/ }).waitFor();
  await search.press("ArrowDown");
  await search.press("Enter");
  await drawer.waitFor();
  await page.keyboard.press("Escape");
  await search.fill("校园摄影社");
  await page
    .getByRole("option", { name: /校园摄影社/ })
    .first()
    .waitFor();
  await search.fill("校园采风日程");
  const eventResult = page.getByRole("option", { name: /校园采风日程/ });
  await eventResult.waitFor();
  assert.equal(await eventResult.getAttribute("href"), "/page/calendar");
  await search.fill("");
  await search.press("Escape");

  const accountMenu = page.getByLabel("账户菜单");
  await accountMenu.click();
  await page.getByRole("link", { name: "个人资料与设置" }).waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "个人资料与设置" }).waitFor({ state: "hidden" });

  const joinCard = recommended.getByRole("article").filter({ hasText: "科创社" });
  await joinCard.getByRole("button", { name: /加入/ }).click();
  const joinDialog = page.getByRole("dialog", { name: /申请加入.*科创社/ });
  await joinDialog.getByRole("textbox").fill("我想了解本学期的社团活动。");
  await joinDialog.getByRole("button", { name: "提交申请", exact: true }).click();
  await joinDialog.waitFor({ state: "hidden" });
  assert.deepEqual(joins, [
    { clubId: "28", requestToken: token, body: { note: "我想了解本学期的社团活动。" } },
  ]);

  const screenshots = process.env.DESKTOP_DASHBOARD_SCREENSHOTS;
  if (screenshots) await mkdir(screenshots, { recursive: true });
  for (const [width, height] of [
    [1440, 900],
    [1920, 1080],
    [1280, 720],
    [1050, 720],
  ]) {
    await page.setViewportSize({ width, height });
    const view = await page.evaluate(() => {
      const workspace = document.querySelector(".desk-workspace");
      window.scrollTo(0, 0);
      return {
        documentWidth: document.documentElement.scrollWidth,
        sidebarWidth: document.querySelector(".desk-sidebar").getBoundingClientRect().width,
        workspaceWidth: workspace.clientWidth,
        workspaceScrollWidth: workspace.scrollWidth,
        layoutBottom: document.querySelector(".desk-clubs-panel").getBoundingClientRect().bottom,
      };
    });
    assert.ok(
      view.documentWidth <= width + 1,
      `Document horizontally overflows at ${width}×${height}`,
    );
    assert.ok(
      view.workspaceScrollWidth <= view.workspaceWidth + 1,
      `Workspace horizontally overflows at ${width}×${height}`,
    );
    if (width >= 1100)
      assert.ok(
        view.sidebarWidth >= 200 && view.sidebarWidth <= 250,
        `Incorrect sidebar width ${view.sidebarWidth}px`,
      );
    else assert.ok(view.sidebarWidth < 110, `Sidebar should collapse at ${width}px`);
    if (height === 1080)
      assert.ok(view.layoutBottom <= height, "Core content should fit above the fold at 1080p");
    if (screenshots)
      await page.screenshot({ path: path.join(screenshots, `dashboard-${width}x${height}.png`) });
  }

  const student = await openPage("student");
  const disabledCreate = student.getByRole("button", { name: "创建活动", exact: true });
  await student.getByText("仅有社团管理权限的账号可以创建活动。").waitFor();
  assert.equal(await disabledCreate.isDisabled(), true);

  const guest = await openPage("guest", "darwin");
  const guestCreate = guest.getByRole("link", { name: "创建活动", exact: true });
  await guestCreate.waitFor();
  const signIn = new URL(await guestCreate.getAttribute("href"), origin);
  assert.equal(signIn.pathname, "/page/user/login");
  assert.equal(
    signIn.searchParams.get("next"),
    "/page/club/workspace?tab=calendar&action=create-event",
  );
  await guest.getByText("登录后查看已加入社团的活动。").waitFor();
  const macTitleBar = guest.locator(".desk-titlebar[data-platform=darwin]");
  const macTitlePadding = await macTitleBar.evaluate((node) =>
    parseInt(getComputedStyle(node).paddingLeft, 10),
  );
  assert.ok(macTitlePadding >= 76, "macOS title must reserve room for the system traffic lights");
  const macSearch = guest.getByRole("combobox");
  assert.equal(await macSearch.getAttribute("aria-keyshortcuts"), "Meta+K");
  await guest.keyboard.press("Meta+k");
  assert.equal(await macSearch.evaluate((input) => input === document.activeElement), true);
  assert.deepEqual(errors, []);
  process.stdout.write(
    "Desktop dashboard browser smoke passed at 1440×900, 1920×1080, 1280×720 and 1050×720.\n",
  );
} finally {
  catalogFailure();
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
