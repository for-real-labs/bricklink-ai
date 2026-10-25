const { app, BrowserWindow, Menu, session } = require("electron");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");
const smoke = process.argv.includes("--smoke-test");
let smokeDirectory;
if (smoke) {
  smokeDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "brickbuilder-studio-smoke-"),
  );
  app.setPath("userData", smokeDirectory);
}
app.setName("BrickBuilder Studio");
const development = !app.isPackaged && process.argv.includes("--dev");
let window;
const send = (action) => window?.webContents.send("menu-action", action);
function createWindow() {
  window = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 390,
    minHeight: 600,
    title: "BrickBuilder Studio",
    backgroundColor: "#212226",
    show: !smoke,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  const entry = development
    ? "http://127.0.0.1:5174"
    : pathToFileURL(path.join(__dirname, "../dist/index.html")).href;
  window.webContents.on("will-navigate", (event, url) => {
    if (url !== entry) event.preventDefault();
  });
  window.webContents.on("will-attach-webview", (event) =>
    event.preventDefault(),
  );
  if (development) window.loadURL(entry);
  else window.loadFile(path.join(__dirname, "../dist/index.html"));
  if (smoke) {
    const timer = setTimeout(() => {
      console.error("Electron smoke test timed out");
      app.exit(1);
    }, 20000);
    window.webContents.on("did-finish-load", async () => {
      try {
        // Verify the packaged renderer, WebGL, desktop bridge and sandbox, without touching real projects.
        const result = await window.webContents.executeJavaScript(
          `new Promise((resolve,reject)=>{let attempts=0;const timer=setInterval(()=>{const canvas=document.querySelector('canvas');if(canvas){clearInterval(timer);const gl=canvas.getContext('webgl2');resolve({title:document.title,canvas:canvas.width>0&&canvas.height>0,webgl:!!gl,bridge:!!window.brickbuilderStudioDesktop,node:typeof window.require,parts:document.querySelectorAll('.model-row').length});}else if(++attempts>100){clearInterval(timer);reject(new Error('No WebGL canvas'));}},50);})`,
        );
        if (
          !result.canvas ||
          !result.webgl ||
          !result.bridge ||
          result.node !== "undefined" ||
          result.parts < 1
        )
          throw new Error(JSON.stringify(result));
        console.log("ELECTRON_SMOKE_PASS " + JSON.stringify(result));
        clearTimeout(timer);
        app.quit();
      } catch (error) {
        console.error(error);
        clearTimeout(timer);
        app.exit(1);
      }
    });
  }
}
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, _permission, callback) => callback(false),
  );
  session.defaultSession.setPermissionCheckHandler(() => false);
  const template = [
    ...(process.platform === "darwin"
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "New project",
          accelerator: "CmdOrCtrl+N",
          click: () => send("new"),
        },
        {
          label: "Open project…",
          accelerator: "CmdOrCtrl+O",
          click: () => send("open"),
        },
        {
          label: "Save project…",
          accelerator: "CmdOrCtrl+S",
          click: () => send("save"),
        },
        { label: "Export…", click: () => send("export") },
        { type: "separator" },
        { role: process.platform === "darwin" ? "close" : "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        {
          label: "Undo",
          accelerator: "CmdOrCtrl+Z",
          click: () => send("undo"),
        },
        {
          label: "Redo",
          accelerator: "CmdOrCtrl+Shift+Z",
          click: () => send("redo"),
        },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        ...(development ? [{ role: "toggleDevTools" }] : []),
      ],
    },
    { label: "Window", submenu: [{ role: "minimize" }, { role: "zoom" }] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin" || smoke) app.quit();
});
app.on("quit", () => {
  if (smokeDirectory)
    fs.rmSync(smokeDirectory, { recursive: true, force: true });
});
