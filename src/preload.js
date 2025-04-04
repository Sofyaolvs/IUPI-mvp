// ===== preload.js =====
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  scrapeGame: (gameUrl) => ipcRenderer.invoke('scrape-game', gameUrl),
  downloadGame: (url) => ipcRenderer.invoke('download-game', url),
  executeGame: (filePath) => ipcRenderer.invoke('execute-game', filePath),
});
