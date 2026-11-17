const { contextBridge, ipcRenderer } = require("electron");

if (process.isMainFrame && ["https:", "http:"].includes(location.protocol)) {
  contextBridge.exposeInMainWorld("clubDesktop", {
    platform: process.platform,
    minimize: () => ipcRenderer.invoke("club-window:minimize"),
    toggleMaximize: () => ipcRenderer.invoke("club-window:toggle-maximize"),
    close: () => ipcRenderer.invoke("club-window:close"),
    isMaximized: () => ipcRenderer.invoke("club-window:is-maximized"),
    onMaximized(callback) {
      if (typeof callback !== "function") throw new TypeError("Expected a callback");
      const listener = (_event, maximized) => {
        if (typeof maximized === "boolean") callback(maximized);
      };
      ipcRenderer.on("club-window:maximized", listener);
      return () => ipcRenderer.removeListener("club-window:maximized", listener);
    },
  });
}
