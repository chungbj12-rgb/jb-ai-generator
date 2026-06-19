const { app, BrowserWindow, nativeImage } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");
const { URL } = require("url");

const PORT = 8765;
let server = null;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function getRootDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath);
  }
  return path.join(__dirname, "..");
}

function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
        let filePath = decodeURIComponent(url.pathname);
        if (filePath === "/" || filePath === "") {
          filePath = "/standalone-client/index.html";
        }
        const safePath = path
          .normalize(filePath.replace(/^\//, ""))
          .replace(/^(\.\.[/\\])+/, "");
        const full = path.join(rootDir, safePath);
        if (!full.startsWith(rootDir)) {
          res.writeHead(403);
          res.end("Forbidden");
          return;
        }
        if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        const ext = path.extname(full).toLowerCase();
        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
        fs.createReadStream(full).pipe(res);
      } catch (err) {
        res.writeHead(500);
        res.end(String(err));
      }
    });

    server.listen(PORT, "127.0.0.1", () => resolve());
    server.on("error", reject);
  });
}

function createWindow() {
  const rootDir = getRootDir();
  const iconPath = path.join(rootDir, "assets", "icon.png");
  const icon =
    fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined;

  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    title: "JB스포츠 AI 블로그 생성기",
    icon,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(`http://127.0.0.1:${PORT}/standalone-client/index.html`);
}

app.whenReady().then(async () => {
  const rootDir = getRootDir();
  await startStaticServer(rootDir);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (server) server.close();
  if (process.platform !== "darwin") app.quit();
});
