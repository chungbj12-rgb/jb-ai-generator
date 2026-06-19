const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("jbaiDesktop", {
  platform: process.platform,
});
