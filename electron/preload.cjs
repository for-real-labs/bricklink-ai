const { contextBridge, ipcRenderer } = require("electron");
const allowed = new Set(["new", "open", "save", "export", "undo", "redo"]);
contextBridge.exposeInMainWorld("brickbuilderStudioDesktop", {
  platform: process.platform,
  openBrickBuilder: (url) => ipcRenderer.invoke("open-brickbuilder", url),
  openInBrickLink: (model) => ipcRenderer.invoke("open-bricklink", model),
  onMenu(callback) {
    const listener = (_event, action) => {
      if (allowed.has(action)) callback(action);
    };
    ipcRenderer.on("menu-action", listener);
    return () => ipcRenderer.removeListener("menu-action", listener);
  },
});
