const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld(
  "clubDesktop",
  Object.freeze({
    read: (key, input) => ipcRenderer.invoke("club:read", key, input),
    info: () => ipcRenderer.invoke("club:info"),
    write: (key, input) => ipcRenderer.invoke("club:write", key, input),
    setServer: (name) => ipcRenderer.invoke("club:server", name),
    logout: () => ipcRenderer.invoke("club:logout"),
    onSessionChanged: (callback) => {
      const handler = () => callback();
      ipcRenderer.on("club:session-changed", handler);
      return () => ipcRenderer.removeListener("club:session-changed", handler);
    },
  }),
);
