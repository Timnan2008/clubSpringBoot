const {
  app,
  BrowserWindow,
  Menu,
  session,
  shell,
  screen,
  ipcMain,
} = require("electron");
const fs = require("node:fs");
const path = require("node:path");

// 默认打开线上站点；本地调试可用 CLUB_DESKTOP_URL=http://127.0.0.1:8088/ npm start
const APP_URL = process.env.CLUB_DESKTOP_URL || "https://qpwflhsclub.com/";
const START_PATH = process.env.CLUB_DESKTOP_START || "/page/dashboard";
const IS_MAC = process.platform === "darwin";
const SMOKE = process.env.CLUB_DESKTOP_SMOKE === "1";
const SCHOOL_HOSTS = new Set(["qpwflhsclub.com", "www.qpwflhsclub.com"]);

// 本地调试或自动化测试时，避免与已安装客户端的用户数据目录冲突
if (process.env.CLUB_DESKTOP_USER_DATA) {
  app.setPath("userData", process.env.CLUB_DESKTOP_USER_DATA);
}

// 只在桌面端隐藏网站自带的顶部导航，网页本身不受影响
const HIDE_SITE_HEADER_CSS = `
  html body header.navbar,
  html body .navbar.navbar-enhanced,
  html body .campus-top { display: none !important; }
  :root, html, body { --navbar-height: 0px !important; }
  #club-login-error-toast {
    position: fixed;
    top: 22px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2147483647;
    max-width: min(560px, 86vw);
    padding: 11px 20px;
    border: 1px solid #7a3b4a;
    border-radius: 12px;
    background: #2a1f24;
    color: #ffd7de;
    font: 14px/1.55 "Microsoft YaHei", "PingFang SC", sans-serif;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  }
`;

// 登录失败时由桌面端直接提示，避免网站版本不显示错误信息
const LOGIN_ERROR_HOOK_JS = `(() => {
  if (window.__clubLoginErrorHook) return;
  window.__clubLoginErrorHook = true;
  const show = (message) => {
    let el = document.getElementById("club-login-error-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "club-login-error-toast";
      el.setAttribute("role", "alert");
      document.body.appendChild(el);
    }
    el.textContent = message;
    clearTimeout(window.__clubLoginErrorTimer);
    window.__clubLoginErrorTimer = setTimeout(() => el.remove(), 6000);
  };
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    try {
      const input = args[0];
      const url = typeof input === "string" ? input : (input && input.url) || "";
      if (!url.includes("/api/user/login")) return response;
      const data = await response.clone().json().catch(() => null);
      if (!response.ok) {
        show("登录失败，请检查邮箱和密码。");
      } else if (data && data.code !== 200) {
        const raw = String(data.message || "").trim();
        const zh = raw ? raw.split(" / ")[0] : "";
        show(zh || "邮箱或密码错误，请重新输入。");
      }
    } catch {}
    return response;
  };
})();`;

// 页面脚本会在窗口尺寸变化时重新显示导航，用内联 important 兜底
const HIDE_SITE_HEADER_JS = `(() => {
  const apply = () => {
    document
      .querySelectorAll("header.navbar, .navbar.navbar-enhanced")
      .forEach((el) => {
        if (
          el.style.getPropertyValue("display") === "none" &&
          el.style.getPropertyPriority("display") === "important"
        ) {
          return;
        }
        el.style.setProperty("display", "none", "important");
      });
  };
  apply();
  if (!window.__clubNavbarGuard) {
    window.__clubNavbarGuard = true;
    window.addEventListener("resize", apply, { passive: true });
  }
})();`;

app.setPath(
  "userData",
  process.env.CLUB_DESKTOP_USER_DATA ||
    path.join(app.getPath("appData"), "QingpuWFLClubDesktop"),
);
app.setAppUserModelId("com.qpwflshclub.desktop");

ipcMain.on("window:minimize", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.on("window:toggle-maximize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});

ipcMain.on("window:close", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

ipcMain.handle("window:is-maximized", (event) => {
  return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
});

let mainWindow = null;
let clubView = null;

function stateFile() {
  return path.join(app.getPath("userData"), "window-state.json");
}

function loadState() {
  try {
    const state = JSON.parse(fs.readFileSync(stateFile(), "utf8"));
    return state && typeof state === "object" ? state : {};
  } catch {
    return {};
  }
}

function saveState(win) {
  try {
    const bounds = win.isMaximized() ? win.getNormalBounds() : win.getBounds();
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
    fs.writeFileSync(
      stateFile(),
      JSON.stringify({ ...bounds, maximized: win.isMaximized() }),
    );
  } catch {
    // 窗口状态写失败不影响使用
  }
}

function isInternal(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    return u.host === new URL(APP_URL).host || SCHOOL_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

function openExternal(url) {
  if (/^(https?:|mailto:)/i.test(url)) shell.openExternal(url).catch(() => {});
}

// 网页内容都跑在 <webview> 里，导航与快捷键在这里处理
function wireClubView(contents) {
  clubView = contents;

  contents.on("dom-ready", () => {
    contents.insertCSS(HIDE_SITE_HEADER_CSS).catch(() => {});
    contents.executeJavaScript(HIDE_SITE_HEADER_JS).catch(() => {});
    contents.executeJavaScript(LOGIN_ERROR_HOOK_JS).catch(() => {});
  });

  contents.on("before-input-event", (event, input) => {
    const key = String(input.key || "").toLowerCase();
    if ((input.control || input.meta) && key === "k") {
      event.preventDefault();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("app:focus-search");
      }
    }
  });

  contents.setWindowOpenHandler(({ url }) => {
    if (isInternal(url)) contents.loadURL(url);
    else openExternal(url);
    return { action: "deny" };
  });

  contents.on("will-navigate", (event, url) => {
    if (isInternal(url)) return;
    event.preventDefault();
    openExternal(url);
  });

  contents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    const key = input.key;
    if (input.alt && key === "Left") {
      event.preventDefault();
      if (contents.canGoBack()) contents.goBack();
    } else if (input.alt && key === "Right") {
      event.preventDefault();
      if (contents.canGoForward()) contents.goForward();
    } else if (key === "F5" || (input.control && key.toLowerCase() === "r")) {
      event.preventDefault();
      contents.reload();
    }
  });

  if (SMOKE) {
    contents.once("did-finish-load", () => {
      console.log(`[desktop] smoke ok: ${contents.getURL()}`);
      app.exit(0);
    });
    contents.on("did-fail-load", (_, code, desc, url, isMainFrame) => {
      if (!isMainFrame || code === -3) return;
      console.error(`[desktop] smoke failed (${code}) ${url}: ${desc}`);
      app.exit(1);
    });
  }
}

function createWindow() {
  const state = loadState();
  const workArea = screen.getPrimaryDisplay().workAreaSize;
  const width = Math.min(
    Number.isFinite(state.width) ? state.width : 1440,
    workArea.width,
  );
  const height = Math.min(
    Number.isFinite(state.height) ? state.height : 900,
    workArea.height,
  );
  const win = new BrowserWindow({
    width,
    height,
    minWidth: Math.min(1024, workArea.width),
    minHeight: Math.min(680, workArea.height),
    show: false,
    frame: IS_MAC,
    titleBarStyle: IS_MAC ? "hiddenInset" : undefined,
    trafficLightPosition: IS_MAC ? { x: 16, y: 14 } : undefined,
    title: "青浦世外社团",
    icon: path.join(__dirname, "build", "icon.png"),
    backgroundColor: "#ffffff",
    autoHideMenuBar: !IS_MAC,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: false,
      webviewTag: true,
      devTools: !app.isPackaged,
    },
  });
  mainWindow = win;
  if (IS_MAC) {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        { role: "appMenu" },
        { role: "editMenu" },
        { role: "viewMenu" },
        { role: "windowMenu" },
      ]),
    );
  } else {
    Menu.setApplicationMenu(null);
  }

  win.on("maximize", () => win.webContents.send("window:maximized", true));
  win.on("unmaximize", () => win.webContents.send("window:maximized", false));

  if (state.maximized) win.maximize();
  win.once("ready-to-show", () => {
    if (!SMOKE) win.show();
  });
  win.loadFile(path.join(__dirname, "shell.html"), {
    query: { url: APP_URL, start: START_PATH },
  });

  if (SMOKE) {
    setTimeout(() => {
      console.error("[desktop] smoke timeout");
      app.exit(1);
    }, 25000).unref();
  }

  win.on("app-command", (_, command) => {
    if (!clubView) return;
    if (command === "browser-backward" && clubView.canGoBack()) {
      clubView.goBack();
    }
    if (command === "browser-forward" && clubView.canGoForward()) {
      clubView.goForward();
    }
  });

  win.on("close", () => saveState(win));
  win.on("closed", () => {
    mainWindow = null;
    clubView = null;
  });
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.on("web-contents-created", (_, contents) => {
    if (contents.getType() === "webview") {
      wireClubView(contents);
      return;
    }

    // 只允许挂载指向本站的 webview，并强制收紧安全选项
    contents.on("will-attach-webview", (event, webPreferences, params) => {
      delete webPreferences.preload;
      webPreferences.nodeIntegration = false;
      webPreferences.contextIsolation = true;
      webPreferences.sandbox = true;
      if (!isInternal(params.src)) event.preventDefault();
    });
  });

  app.whenReady().then(() => {
    // 本地壳没有需要用到的浏览器权限，统一拒绝
    session.defaultSession.setPermissionRequestHandler((_, __, callback) =>
      callback(false),
    );
    session.defaultSession.setPermissionCheckHandler(() => false);

    // 导出 Excel 等下载时弹出保存对话框
    session.defaultSession.on("will-download", (_, item) => {
      item.setSaveDialogOptions({ title: "保存文件" });
    });

    createWindow();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
