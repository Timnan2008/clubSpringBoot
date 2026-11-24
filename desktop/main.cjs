const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  protocol,
  screen,
  session,
  shell,
} = require("electron");
const { readFile } = require("node:fs/promises");
const { join } = require("node:path");

const appName = "青浦世外 · 社团管理平台";
const offlineUrl = "club-desktop://offline/";
const registrationSite = "https://beian.miit.gov.cn/";
const legacyVideoOrigin = "http://123.57.189.22";
const isMac = process.platform === "darwin";
const basePreferences = {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  webSecurity: true,
  webviewTag: false,
};

let mainWindow;

app.setName(appName);
protocol.registerSchemesAsPrivileged([
  { scheme: "club-desktop", privileges: { standard: true, secure: true } },
]);

function getSiteOrigin(configured = "http://127.0.0.1:8088") {
  const site = URL.parse(configured);
  const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(site?.hostname);
  if (
    !site ||
    (site.protocol !== "https:" && !(site.protocol === "http:" && isLoopback)) ||
    site.username ||
    site.password ||
    site.pathname !== "/" ||
    site.search ||
    site.hash
  ) {
    throw new Error(
      "CLUB_DESKTOP_URL 应为 HTTPS 源地址或 HTTP 本机回环地址，例如 http://127.0.0.1:8088。",
    );
  }
  return site.origin;
}

function isSiteUrl(raw, origin) {
  try {
    const url = new URL(raw);
    return (
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      url.origin === origin
    );
  } catch {
    return false;
  }
}

function registerControls(origin) {
  const operations = {
    minimize: (win) => win.minimize(),
    "toggle-maximize": (win) => (win.isMaximized() ? win.unmaximize() : win.maximize()),
    close: (win) => win.close(),
    "is-maximized": (win) => win.isMaximized(),
  };
  for (const [name, operation] of Object.entries(operations)) {
    ipcMain.handle("club-window:" + name, (event, ...args) => {
      const win = mainWindow;
      const frame = event.senderFrame;
      if (
        args.length ||
        !win ||
        win.isDestroyed() ||
        event.sender !== win.webContents ||
        !frame ||
        frame !== event.sender.mainFrame ||
        !isSiteUrl(frame.url, origin)
      ) {
        throw new Error("Window action rejected");
      }
      return operation(win);
    });
  }
}

function openExternalLink(raw) {
  const url = URL.parse(raw);
  if (!url || url.username || url.password || url.search || url.hash) return;
  const legacyVideo =
    url.origin === legacyVideoOrigin &&
    /^\/media\/(video|vedio)\/[^/]+\/[^/]+\.mp4$/i.test(url.pathname);
  if (url.href === registrationSite || legacyVideo) {
    void shell.openExternal(url.href).catch((error) => console.error(error.message));
  }
}

function restrictNavigation(win, origin, openPreview) {
  const contents = win.webContents;
  // The site's subframes include its existing verification widgets. Desktop IPC is top-frame only.
  contents.on("will-navigate", (details) => {
    if (isSiteUrl(details.url, origin)) return;
    details.preventDefault();
    if (isSiteUrl(contents.getURL(), origin) && details.initiator === contents.mainFrame) {
      openExternalLink(details.url);
    }
  });
  contents.on("will-redirect", (details) => {
    if (details.isMainFrame && !isSiteUrl(details.url, origin)) details.preventDefault();
  });
  contents.on("will-attach-webview", (event) => event.preventDefault());
  contents.setWindowOpenHandler(({ url, postBody }) => {
    if (!postBody && isSiteUrl(contents.getURL(), origin)) {
      if (openPreview && isSiteUrl(url, origin)) openPreview(url);
      else openExternalLink(url);
    }
    return { action: "deny" };
  });
}

function createPreview(parent, origin, url) {
  const preview = new BrowserWindow({
    parent,
    width: 1000,
    height: 750,
    autoHideMenuBar: true,
    webPreferences: { ...basePreferences, session: parent.webContents.session },
  });
  if (!isMac) preview.removeMenu();
  restrictNavigation(preview, origin);
  void preview.loadURL(url).catch(() => {
    if (!preview.isDestroyed()) preview.close();
  });
}

async function registerOfflinePage(home) {
  const template = await readFile(join(__dirname, "offline.html"), "utf8");
  const escape = (value) =>
    value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
  const html = template
    .replace("{{HOME_URL}}", escape(home.href))
    .replace("{{SITE_ORIGIN}}", escape(home.origin))
    .replace("{{CAPTION_INSET}}", isMac ? "88px" : "16px");
  protocol.handle("club-desktop", (request) => {
    if (request.method !== "GET" || request.url !== offlineUrl)
      return new Response(null, { status: 404 });
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
      },
    });
  });
}

const legacyCaptionCss = `
  html:has(body):not([data-club-desktop-frame]):not(:has([data-club-desktop-frame], .desk-legacy)) {
    margin-top: 44px;
    scroll-padding-top: 44px;
  }
  html:has(body):not([data-club-desktop-frame]):not(:has([data-club-desktop-frame], .desk-legacy))::before {
    content: "青浦世外 · 社团管理平台";
    position: fixed;
    z-index: 2147483647;
    inset: 0 0 auto;
    height: 44px;
    box-sizing: border-box;
    padding: 0 ${isMac ? "16px 0 88px" : "160px 0 16px"};
    background: #19162a;
    border-bottom: 1px solid #302a44;
    color: #f4efff;
    font: 600 14px/43px system-ui, sans-serif;
    -webkit-app-region: drag;
  }
  html:not([data-club-desktop-frame]):not(:has([data-club-desktop-frame], .desk-legacy)) .navbar {
    top: 44px;
  }
`;

function createMainWindow(home) {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const win = new BrowserWindow({
    title: appName,
    icon: join(__dirname, "../src/main/resources/static/other photo/WFL-logo.png"),
    width: Math.min(1440, width),
    height: Math.min(900, height),
    minWidth: Math.min(960, width),
    minHeight: Math.min(600, height),
    show: false,
    backgroundColor: "#100e1b",
    titleBarStyle: "hidden",
    ...(isMac
      ? { trafficLightPosition: { x: 14, y: 15 } }
      : { titleBarOverlay: { height: 44, color: "#19162a", symbolColor: "#f4efff" } }),
    webPreferences: { ...basePreferences, preload: join(__dirname, "preload.cjs") },
  });
  mainWindow = win;
  if (!isMac) win.removeMenu();
  win.once("ready-to-show", () => win.show());
  win.on("closed", () => {
    mainWindow = null;
  });
  restrictNavigation(win, home.origin, (url) => createPreview(win, home.origin, url));

  const contents = win.webContents;
  contents.on("dom-ready", () => {
    const url = contents.getURL();
    if (isSiteUrl(url, home.origin) && new URL(url).pathname !== home.pathname) {
      void contents.insertCSS(legacyCaptionCss).catch(() => {});
    }
  });
  for (const name of ["maximize", "unmaximize"]) {
    win.on(name, () => {
      if (isSiteUrl(contents.getURL(), home.origin)) {
        contents.send("club-window:maximized", win.isMaximized());
      }
    });
  }

  let openingOfflinePage = false;
  function showOffline() {
    if (win.isDestroyed() || openingOfflinePage) return;
    openingOfflinePage = true;
    void win
      .loadURL(offlineUrl)
      .catch(() => {
        if (!win.isDestroyed()) {
          dialog.showErrorBox(appName, "无法打开社团平台。请检查服务器是否已启动后重新打开应用。");
          win.close();
        }
      })
      .finally(() => {
        openingOfflinePage = false;
      });
  }
  contents.on("did-fail-load", (_event, code, _description, url, isMainFrame) => {
    if (isMainFrame && code !== -3 && isSiteUrl(url, home.origin)) showOffline();
  });
  contents.on("did-navigate", (_event, url, status) => {
    if (status >= 400 && isSiteUrl(url, home.origin) && new URL(url).pathname === home.pathname) {
      showOffline();
    }
  });
  void win.loadURL(home.href).catch(() => {
    if (!contents.isDestroyed() && !contents.getURL()) showOffline();
  });
}

app
  .whenReady()
  .then(async () => {
    const home = new URL("/page/desktop", getSiteOrigin(process.env.CLUB_DESKTOP_URL));
    if (process.platform === "win32") app.setAppUserModelId("com.qpwflhs.club");
    await registerOfflinePage(home);
    let calendarNotifications = false;
    const trustedFrame = (url, details) =>
      details?.isMainFrame === true && isSiteUrl(url, home.origin);
    const isCalendar = (contents) =>
      contents &&
      contents === mainWindow?.webContents &&
      isSiteUrl(contents.getURL(), home.origin) &&
      new URL(contents.getURL()).pathname === "/page/calendar";
    session.defaultSession.setPermissionRequestHandler(
      (contents, permission, callback, details) => {
        if (!trustedFrame(details?.requestingUrl, details)) return callback(false);
        if (permission === "notifications" && isCalendar(contents)) calendarNotifications = true;
        callback(
          permission === "fullscreen" || (permission === "notifications" && isCalendar(contents)),
        );
      },
    );
    session.defaultSession.setPermissionCheckHandler(
      (contents, permission, origin, details) =>
        trustedFrame(origin, details) &&
        (permission === "fullscreen" ||
          (permission === "notifications" && calendarNotifications && isCalendar(contents))),
    );
    registerControls(home.origin);
    createMainWindow(home);
    app.on("activate", () => {
      if (!mainWindow) createMainWindow(home);
    });
  })
  .catch((error) => {
    dialog.showErrorBox(appName, error.message);
    app.exit(1);
  });

app.on("window-all-closed", () => {
  if (!isMac) app.quit();
});
