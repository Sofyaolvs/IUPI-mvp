
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  scrapeGame: (url) => ipcRenderer.invoke('scrape-game', url),
  downloadGame: (url) => ipcRenderer.invoke('download-game', url),
  openFileByPath: (filePath) => ipcRenderer.send('open-file-by-path', filePath),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
  removeDownloadProgress: (callback) => ipcRenderer.removeListener('download-progress', callback),
});
