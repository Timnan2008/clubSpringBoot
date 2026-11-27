import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import test from "node:test";

const mainFile = new URL("../../desktop/main.cjs", import.meta.url);
const main = await readFile(mainFile, "utf8");
const require = createRequire(import.meta.url);
const origin = "http://127.0.0.1:8088";
const dashboard = origin + "/page/desktop";

async function startMain(platform = "win32", config) {
  const windows = [];
  const handlers = new Map();
  const protocols = new Map();
  const permissions = {};
  const external = [];
  const errors = [];
  const app = new EventEmitter();
  let ready;
  app.whenReady = () => ({
    then(handler) {
      ready = Promise.resolve().then(handler);
      return ready;
    },
  });
  app.setName = app.setAppUserModelId = app.quit = () => {};
  app.exit = (code) => errors.push(code);
  const electron = {
    app,
    BrowserWindow: class extends EventEmitter {
      constructor(options) {
        super();
        this.options = options;
        this.webContents = Object.assign(new EventEmitter(), {
          mainFrame: { url: "" },
          getURL: () => this.webContents.mainFrame.url,
          isDestroyed: () => false,
          setWindowOpenHandler(handler) {
            this.open = handler;
          },
        });
        windows.push(this);
      }
      isDestroyed() {
        return false;
      }
      removeMenu() {}
      minimize() {
        this.minimized = true;
      }
      async loadURL(url) {
        this.webContents.mainFrame.url = url;
      }
    },
    dialog: { showErrorBox: (_title, message) => errors.push(message) },
    ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
    protocol: {
      handle: (scheme, handler) => protocols.set(scheme, handler),
      registerSchemesAsPrivileged() {},
    },
    screen: { getPrimaryDisplay: () => ({ workAreaSize: { width: 1920, height: 1080 } }) },
    shell: { openExternal: async (url) => external.push(url) },
    session: {
      defaultSession: {
        setPermissionRequestHandler: (handler) => (permissions.request = handler),
        setPermissionCheckHandler: (handler) => (permissions.check = handler),
      },
    },
  };
  runInNewContext(main, {
    require: (name) => (name === "electron" ? electron : require(name)),
    process: { platform, env: { CLUB_DESKTOP_URL: config } },
    __dirname: fileURLToPath(new URL(".", mainFile)),
    URL,
    Response,
  });
  await ready.catch(() => {});
  return { windows, handlers, protocols, permissions, external, errors };
}

test("known external video and registration links open in the system browser", async () => {
  const { windows, external } = await startMain();
  const { webContents } = windows[0];
  const video = "http://123.57.189.22/media/video/study/Physics.mp4";
  const registration = "https://beian.miit.gov.cn/";
  for (const url of [video, registration, "https://example.org/untrusted", "file:///C:/Windows"]) {
    assert.equal(webContents.open({ url }).action, "deny");
  }
  webContents.open({ url: video, postBody: {} });
  assert.deepEqual(external, [video, registration]);
});

test("calendar system reminders require a request from the trusted calendar page", async () => {
  const { windows, permissions } = await startMain();
  const { webContents } = windows[0];
  const calendar = origin + "/page/calendar";
  const details = { isMainFrame: true, requestingUrl: calendar };
  const request = (overrides) => {
    let allowed;
    permissions.request(webContents, "notifications", (value) => (allowed = value), {
      ...details,
      ...overrides,
    });
    return allowed;
  };
  assert.equal(request({}), false);
  webContents.mainFrame.url = calendar;
  assert.equal(permissions.check(webContents, "notifications", origin, details), false);
  assert.equal(request({ isMainFrame: false }), false);
  assert.equal(request({ requestingUrl: "https://example.org/page/calendar" }), false);
  assert.equal(request({}), true);
  assert.equal(permissions.check(webContents, "notifications", origin, details), true);
});

test("Windows starts at the dashboard with native controls and hardened renderer settings", async () => {
  const { windows } = await startMain();
  const [win] = windows;
  assert.equal(win.webContents.getURL(), dashboard);
  assert.equal(win.options.titleBarStyle, "hidden");
  assert.equal(win.options.titleBarOverlay.height, 44);
  assert.equal(win.options.webPreferences.nodeIntegration, false);
  assert.equal(win.options.webPreferences.contextIsolation, true);
  assert.equal(win.options.webPreferences.sandbox, true);
  assert.equal(win.options.webPreferences.webSecurity, true);
});

test("window IPC checks the app window, main frame, exact origin and argument count", async () => {
  const { windows, handlers } = await startMain();
  const [win] = windows;
  const sender = win.webContents;
  const invoke = handlers.get("club-window:minimize");
  const valid = { sender, senderFrame: sender.mainFrame };
  assert.throws(() => invoke({ ...valid, sender: {} }), /rejected/);
  assert.throws(() => invoke({ ...valid, senderFrame: { url: dashboard } }), /rejected/);
  assert.throws(() => invoke(valid, true), /rejected/);
  sender.mainFrame.url = "https://example.org/";
  assert.throws(() => invoke(valid), /rejected/);
  assert.equal(win.minimized, undefined);
  sender.mainFrame.url = dashboard;
  invoke(valid);
  assert.equal(win.minimized, true);
});

test("unavailable dashboard uses the constrained offline page with a same-origin retry link", async () => {
  const { windows, protocols } = await startMain();
  const [win] = windows;
  win.webContents.emit("did-fail-load", {}, -102, "", dashboard, true);
  const url = win.webContents.getURL();
  assert.equal(url, "club-desktop://offline/");
  const offline = protocols.get("club-desktop");
  const response = offline({ url, method: "GET" });
  assert.match(response.headers.get("Content-Security-Policy"), /default-src 'none'/);
  assert.match(await response.text(), new RegExp(`href="${dashboard}"`));
  assert.equal(offline({ url: url + "other", method: "GET" }).status, 404);
});

test("macOS reserves native traffic lights and refuses an insecure remote configuration", async () => {
  const mac = await startMain("darwin", "https://example.org");
  assert.equal(mac.windows[0].webContents.getURL(), "https://example.org/page/desktop");
  assert.equal(mac.windows[0].options.trafficLightPosition.y, 15);
  assert.equal(mac.windows[0].options.titleBarOverlay, undefined);

  const invalid = await startMain("win32", "http://example.org");
  assert.equal(invalid.windows.length, 0);
  assert.match(invalid.errors[0], /CLUB_DESKTOP_URL/);
  assert.equal(invalid.errors[1], 1);
});
