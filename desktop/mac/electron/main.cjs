const { app, BrowserWindow, ipcMain, session, Menu, shell, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");
const { PRODUCTION, LOCAL, resourcePath, servicePath, allowedRemote } = require("./policy.cjs");

if (!app.isPackaged)
  app.setPath(
    "userData",
    path.join(__dirname, "..", ".local", process.env.CLUB_QA ? "qa-profile" : "profile"),
  );
let mainWindow,
  serviceWindow,
  serverName = "production";
const base = () => (serverName === "local" ? LOCAL : PRODUCTION);
const remoteSession = () => session.fromPartition(`persist:club-${serverName}`);
const indexPath = path.join(__dirname, "..", "dist", "index.html");
const localURL = pathToFileURL(indexPath).href;

function trusted(event) {
  if (
    !mainWindow ||
    event.sender !== mainWindow.webContents ||
    event.senderFrame !== mainWindow.webContents.mainFrame ||
    event.senderFrame.url !== localURL
  )
    throw Error("请求来源不受信任");
}
function notify() {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("club:session-changed");
}
function errorMessage(error) {
  return /timeout|abort/i.test(error.message)
    ? "连接超时，请检查网络后重试"
    : "暂时连接不上网站，请检查网络后重试";
}
async function read(key, input) {
  const route = resourcePath(key, input);
  try {
    const response = await remoteSession().fetch(base() + route, {
      method: "GET",
      credentials: "include",
      headers: { "Accept-Language": "zh-CN,zh;q=0.9" },
      signal: AbortSignal.timeout(18000),
      redirect: "error",
    });
    if (response.status === 401 || response.status === 403)
      return { ok: false, auth: true, message: "登录后查看你的校园动态" };
    if (!response.ok) return { ok: false, message: `网站暂时无法提供数据（${response.status}）` };
    if (key === "announcements") {
      const html = await response.text();
      const board =
        html.match(/<div[^>]*class="notice-board"[^>]*>([\s\S]*?)<\/section>/)?.[1] || "";
      const items = [
        ...board.matchAll(/<div[^>]*class="notice(?:-important|-normal)?"[^>]*>([\s\S]*?)<\/div>/g),
      ]
        .map((match, i) => ({
          id: String(i),
          title: match[1]
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .trim(),
        }))
        .filter((item) => item.title);
      return { ok: true, data: items };
    }
    if (!response.headers.get("content-type")?.includes("json"))
      return { ok: false, auth: key !== "clubs", message: "请先登录校园账号" };
    const json = await response.json();
    if (json.code && json.code !== 200)
      return { ok: false, auth: json.code === 401, message: json.message || "数据暂时不可用" };
    return { ok: true, data: json.code === 200 ? json.data : json };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}
function openService(route) {
  const url = base() + servicePath(route);
  if (serviceWindow && !serviceWindow.isDestroyed()) {
    serviceWindow.loadURL(url);
    serviceWindow.focus();
    return;
  }
  serviceWindow = new BrowserWindow({
    width: 1140,
    height: 800,
    minWidth: 780,
    minHeight: 580,
    title: "校园服务 · 青浦世外",
    backgroundColor: "#10101c",
    webPreferences: {
      partition: `persist:club-${serverName}`,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  serviceWindow.webContents.on("will-navigate", (event, target) => {
    if (!allowedRemote(target, base())) event.preventDefault();
  });
  serviceWindow.webContents.on("will-redirect", (event, target) => {
    if (!allowedRemote(target, base())) event.preventDefault();
  });
  serviceWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    if (allowedRemote(target, base())) {
      serviceWindow.loadURL(target);
    } else if (/^https:\/\//.test(target))
      dialog
        .showMessageBox(serviceWindow, {
          type: "question",
          message: "在浏览器中打开外部链接？",
          detail: target,
          buttons: ["取消", "打开"],
          defaultId: 0,
          cancelId: 0,
        })
        .then(({ response }) => {
          if (response === 1) shell.openExternal(target);
        });
    return { action: "deny" };
  });
  serviceWindow.webContents.on("did-finish-load", notify);
  serviceWindow.webContents.on("did-fail-load", (_e, code) => {
    if (code !== -3)
      dialog.showMessageBox(serviceWindow, {
        message: "校园服务加载失败",
        detail: "请检查网络后关闭此窗口，再从客户端重试。",
      });
  });
  serviceWindow.on("closed", () => {
    serviceWindow = null;
    notify();
  });
  serviceWindow.loadURL(url);
}
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 920,
    minHeight: 680,
    title: "青浦世外社团",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 20, y: 18 },
    backgroundColor: "#10101b",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  mainWindow.webContents.on("will-navigate", (event) => event.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.loadFile(indexPath);
}
app.whenReady().then(() => {
  const preferences = path.join(app.getPath("userData"), "server.json");
  try {
    if (JSON.parse(fs.readFileSync(preferences)).server === "local") serverName = "local";
  } catch {}
  for (const name of ["production", "local"]) {
    const s = session.fromPartition(`persist:club-${name}`);
    s.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    s.setPermissionCheckHandler(() => false);
    s.on("will-download", (_event, item, contents) => {
      if (!allowedRemote(item.getURL(), name === "local" ? LOCAL : PRODUCTION)) {
        item.cancel();
        return;
      }
      item.setSaveDialogOptions({
        title: "保存校园附件",
        defaultPath: path.basename(item.getFilename()),
      });
    });
    s.cookies.on("changed", notify);
  }
  ipcMain.handle("club:info", (event) => {
    trusted(event);
    return {
      version: app.getVersion(),
      platform: process.platform,
      server: serverName,
      baseURL: base(),
    };
  });
  ipcMain.handle("club:read", (event, key, input) => {
    trusted(event);
    return read(key, input);
  });
  ipcMain.handle("club:open", (event, route) => {
    trusted(event);
    openService(route);
    return true;
  });
  ipcMain.handle("club:server", (event, value) => {
    trusted(event);
    if (!["local", "production"].includes(value)) throw Error("无效服务器");
    if (serviceWindow) serviceWindow.close();
    serverName = value;
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
    fs.writeFileSync(preferences, JSON.stringify({ server: value }));
    notify();
    return true;
  });
  ipcMain.handle("club:logout", async (event) => {
    trusted(event);
    if (serviceWindow) serviceWindow.close();
    await remoteSession().clearStorageData();
    notify();
    return true;
  });
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "青浦世外社团",
        submenu: [
          { role: "about" },
          { type: "separator" },
          { role: "hide" },
          { role: "hideOthers" },
          { type: "separator" },
          { role: "quit" },
        ],
      },
      { role: "editMenu" },
      { role: "viewMenu" },
      { role: "windowMenu" },
    ]),
  );
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
