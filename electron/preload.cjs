const { contextBridge, ipcRenderer } = require("electron");
const allowed = new Set(["new", "open", "save", "export", "undo", "redo"]);
contextBridge.exposeInMainWorld("bricklinkDesktop", {
  platform: process.platform,
  onMenu(callback) {
    const listener = (_event, action) => {
      if (allowed.has(action)) callback(action);
    };
    ipcRenderer.on("menu-action", listener);
    return () => ipcRenderer.removeListener("menu-action", listener);
  },
});
