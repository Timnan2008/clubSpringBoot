const {
  app,
  BrowserWindow,
  ipcMain,
  session,
  Menu,
  dialog,
  nativeImage,
  nativeTheme,
  screen,
} = require("electron");
const path = require("node:path"),
  fs = require("node:fs");
const { pathToFileURL } = require("node:url");
const { PRODUCTION, LOCAL } = require("./policy.cjs");
const { createClient } = require("./client.cjs");
const { createCampusTransport } = require("./transport.cjs");
const { createAppearanceStore } = require("./appearance.cjs");
const previewArg = process.argv.find((arg) => arg.startsWith("--club-preview="));
const previewRole = previewArg?.split("=")[1];
const preview = Boolean(previewArg);
if (preview && !["student", "teacher", "admin"].includes(previewRole))
  throw Error("无效预览身份");
const isWindows = process.platform === "win32";
const platform =
  process.env.CLUB_QA && process.env.CLUB_QA_PLATFORM === "win32" ? "win32" : process.platform;
if (isWindows && !process.env.CLUB_DESKTOP_USER_DATA)
  app.setPath("userData", path.join(app.getPath("appData"), "QingpuWFLClubDesktop"));
if (!app.isPackaged)
  app.setPath(
    "userData",
    path.join(__dirname, "..", ".local", process.env.CLUB_QA ? "qa-profile" : "profile"),
  );
if (process.env.CLUB_DESKTOP_USER_DATA)
  app.setPath("userData", process.env.CLUB_DESKTOP_USER_DATA);
if (preview)
  app.setPath("userData", path.join(__dirname, "..", ".local", "preview-" + previewRole));
if (isWindows) app.setAppUserModelId("com.qpwflshclub.desktop");
const appearance = createAppearanceStore(app.getPath("userData"));
if (preview && !fs.existsSync(path.join(app.getPath("userData"), "appearance.json")))
  appearance.save({ mode: "dark", accent: "#796094" });
const primary = process.env.CLUB_QA || app.requestSingleInstanceLock();
if (!primary) app.quit();
app.on("second-instance", () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});
let mainWindow,
  serverName = "production";
const base = () => (serverName === "local" ? LOCAL : PRODUCTION);
// The original Windows client used the default session. Keep its campus login cookies.
const remoteSession = () =>
  isWindows && serverName === "production"
    ? session.defaultSession
    : session.fromPartition(`persist:club-${serverName}`);
const indexPath = path.join(__dirname, "..", "dist", "index.html");
const localURL = pathToFileURL(indexPath).href;
const client = preview
  ? require("./preview.cjs").createPreviewClient(previewRole)
  : createClient(createCampusTransport(remoteSession, base));
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
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send("club:session-changed");
}
function createWindow() {
  let state = {};
  try {
    state = JSON.parse(
      fs.readFileSync(path.join(app.getPath("userData"), "window-state.json")),
    );
  } catch {}
  const area = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width: Math.min(
      Number.isFinite(state.width) ? Math.max(920, state.width) : 1440,
      area.width,
    ),
    height: Math.min(
      Number.isFinite(state.height) ? Math.max(680, state.height) : 940,
      area.height,
    ),
    minWidth: 920,
    minHeight: 680,
    title: "青浦世外社团",
    frame: platform !== "win32",
    ...(platform === "darwin"
      ? { titleBarStyle: "hiddenInset", trafficLightPosition: { x: 20, y: 18 } }
      : {}),
    icon: path.join(__dirname, "..", "assets", "icon.png"),
    backgroundColor: appearance.read().mode === "dark" ? "#17191c" : "#fafafa",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webviewTag: false,
    },
  });
  mainWindow.webContents.on("will-navigate", (event) => event.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.once("ready-to-show", () => mainWindow.show());
  if (state.maximized) mainWindow.maximize();
  mainWindow.on("maximize", () => mainWindow.webContents.send("club:window-state", true));
  mainWindow.on("unmaximize", () => mainWindow.webContents.send("club:window-state", false));
  mainWindow.on("close", () => {
    const bounds = mainWindow.isMaximized()
      ? mainWindow.getNormalBounds()
      : mainWindow.getBounds();
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
    fs.writeFileSync(
      path.join(app.getPath("userData"), "window-state.json"),
      JSON.stringify({ ...bounds, maximized: mainWindow.isMaximized() }),
    );
  });
  mainWindow.loadFile(indexPath);
}
app.whenReady().then(() => {
  if (!primary) return;
  const preferences = path.join(app.getPath("userData"), "server.json");
  try {
    if (JSON.parse(fs.readFileSync(preferences)).server === "local") serverName = "local";
  } catch {}
  // Block network before creating any renderer, including image loads and future routes.
  if (preview) {
    for (const s of [
      session.defaultSession,
      session.fromPartition("persist:club-production"),
      session.fromPartition("persist:club-local"),
    ]) {
      s.webRequest.onBeforeRequest(
        { urls: ["http://*/*", "https://*/*", "ws://*/*", "wss://*/*"] },
        (_details, callback) => callback({ cancel: true }),
      );
    }
  }
  for (const name of ["production", "local"]) {
    const s =
      isWindows && name === "production"
        ? session.defaultSession
        : session.fromPartition(`persist:club-${name}`);
    s.setPermissionRequestHandler((_c, _p, cb) => cb(false));
    s.setPermissionCheckHandler(() => false);
    s.on("will-download", (_e, item) => item.cancel());
  }
  ipcMain.handle("club:info", (e) => {
    trusted(e);
    return {
      version: app.getVersion(),
      platform,
      server: serverName,
      baseURL: preview ? "" : base(),
      readOnly: preview,
      previewRole,
    };
  });
  ipcMain.handle("club:appearance", (e) => {
    trusted(e);
    return appearance.read();
  });
  ipcMain.handle("club:appearance-save", (e, value) => {
    trusted(e);
    const result = appearance.save(value);
    nativeTheme.themeSource = result.mode;
    return result;
  });
  ipcMain.handle("club:appearance-reset", (e) => {
    trusted(e);
    const result = appearance.reset();
    nativeTheme.themeSource = result.mode;
    return result;
  });
  ipcMain.handle("club:background-pick", async (e) => {
    trusted(e);
    const choice = await dialog.showOpenDialog(mainWindow, {
      title: "选择自己的背景图片",
      properties: ["openFile"],
      filters: [{ name: "图片", extensions: ["png", "jpg", "jpeg", "webp"] }],
    });
    if (choice.canceled || !choice.filePaths[0]) return null;
    const selected = choice.filePaths[0];
    const size = fs.statSync(selected).size;
    if (size > 20 * 1024 * 1024) throw Error("请选择小于 20 MB 的图片");
    if (!/\.(png|jpe?g|webp)$/i.test(selected)) throw Error("请选择 PNG、JPG 或 WebP 图片");
    let picture = nativeImage.createFromBuffer(fs.readFileSync(selected));
    if (picture.isEmpty()) throw Error("这张图片无法读取，请换一张");
    const dimensions = picture.getSize();
    const scale = Math.min(1, 2560 / Math.max(dimensions.width, dimensions.height));
    if (scale < 1)
      picture = picture.resize({
        width: Math.round(dimensions.width * scale),
        height: Math.round(dimensions.height * scale),
      });
    return appearance.saveImage(picture.toPNG());
  });
  ipcMain.handle("club:window", (e, command) => {
    trusted(e);
    if (command === "minimize") mainWindow.minimize();
    else if (command === "maximize")
      mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    else if (command === "close") {
      mainWindow.close();
      return false;
    } else if (command !== "state") throw Error("无效窗口操作");
    return mainWindow.isMaximized();
  });
  nativeTheme.themeSource = appearance.read().mode;
  ipcMain.handle("club:read", (e, key, input) => {
    trusted(e);
    return client.read(key, input);
  });
  ipcMain.handle("club:write", async (e, key, input) => {
    trusted(e);
    const result = await client.write(key, input);
    if (key === "login" && result.ok) notify();
    return result;
  });
  ipcMain.handle("club:server", (e, value) => {
    trusted(e);
    if (preview) throw Error("只读预览不能切换到校园服务");
    if (!["local", "production"].includes(value)) throw Error("无效服务器");
    client.invalidate();
    serverName = value;
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
    fs.writeFileSync(preferences, JSON.stringify({ server: value }));
    notify();
    return true;
  });
  ipcMain.handle("club:logout", async (e) => {
    trusted(e);
    if (preview) return false;
    await client.logout();
    await remoteSession().clearStorageData();
    notify();
    return true;
  });
  Menu.setApplicationMenu(
    platform !== "darwin"
      ? null
      : Menu.buildFromTemplate([
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
