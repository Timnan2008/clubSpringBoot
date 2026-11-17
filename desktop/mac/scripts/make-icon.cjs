// Render the existing school crest into a Mac app icon. No remote assets are used.
const path = require("node:path");
const fs = require("node:fs");
const root = path.join(__dirname, "..");
if (process.versions.electron) {
  const { app, BrowserWindow } = require("electron");
  app.setPath("userData", path.join(root, ".cache", "icon-profile"));
  app.commandLine.appendSwitch("force-device-scale-factor", "1");
  app.whenReady().then(async () => {
    try {
      const win = new BrowserWindow({
        width: 1024,
        height: 1024,
        useContentSize: true,
        frame: false,
        transparent: true,
        show: false,
        webPreferences: { sandbox: true, contextIsolation: true, offscreen: true },
      });
      await win.loadFile(path.join(root, "assets", "icon-source.html"));
      await win.webContents.executeJavaScript(
        "Promise.all([...document.images].map(i => i.decode()))",
      );
      await new Promise((resolve) => setTimeout(resolve, 400));
      fs.writeFileSync(
        path.join(root, "assets", "icon.png"),
        (await win.webContents.capturePage()).toPNG(),
      );
      app.quit();
    } catch (error) {
      console.error(error);
      app.exit(1);
    }
  });
} else {
  const { execFileSync } = require("node:child_process");
  execFileSync(require("electron"), [__filename], { stdio: "inherit" });
  const set = path.join(root, ".cache", "icon.iconset");
  fs.mkdirSync(set, { recursive: true });
  for (const size of [16, 32, 128, 256, 512]) {
    for (const scale of [1, 2])
      execFileSync(
        "/usr/bin/sips",
        [
          "-z",
          String(size * scale),
          String(size * scale),
          path.join(root, "assets", "icon.png"),
          "--out",
          path.join(set, `icon_${size}x${size}${scale === 2 ? "@2x" : ""}.png`),
        ],
        { stdio: "ignore" },
      );
  }
  execFileSync("/usr/bin/iconutil", [
    "-c",
    "icns",
    set,
    "-o",
    path.join(root, "assets", "icon.icns"),
  ]);
  console.log("Mac app icon generated from the existing school crest.");
}
