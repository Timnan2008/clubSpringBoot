const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld(
  "clubDesktop",
  Object.freeze({
    read: (key, input) => ipcRenderer.invoke("club:read", key, input),
    info: () => ipcRenderer.invoke("club:info"),
    write: (key, input) => ipcRenderer.invoke("club:write", key, input),
    setServer: (name) => ipcRenderer.invoke("club:server", name),
    logout: () => ipcRenderer.invoke("club:logout"),
    appearance: () => ipcRenderer.invoke("club:appearance"),
    saveAppearance: (value) => ipcRenderer.invoke("club:appearance-save", value),
    resetAppearance: () => ipcRenderer.invoke("club:appearance-reset"),
    pickBackground: () => ipcRenderer.invoke("club:background-pick"),
    windowAction: (command) => ipcRenderer.invoke("club:window", command),
    onWindowState: (callback) => {
      const handler = (_, maximized) => callback(maximized);
      ipcRenderer.on("club:window-state", handler);
      return () => ipcRenderer.removeListener("club:window-state", handler);
    },
    onSessionChanged: (callback) => {
      const handler = () => callback();
      ipcRenderer.on("club:session-changed", handler);
      return () => ipcRenderer.removeListener("club:session-changed", handler);
    },
  }),
);
