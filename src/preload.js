// // ===== preload.js =====
// const { contextBridge, ipcRenderer } = require('electron');

// contextBridge.exposeInMainWorld('electronAPI', {
//   scrapeGame: (gameUrl) => ipcRenderer.invoke('scrape-game', gameUrl),
//   executeGame: (filePath) => ipcRenderer.invoke('execute-game', filePath),
//   downloadGame: (url) => ipcRenderer.invoke('download-game', url),
//   createFolder: () => ipcRenderer.invoke('create-folder'),
//   openAndExecuteFile: (filePath) => ipcRenderer.invoke('open-and-execute-file', filePath),
//   onExecutionResult: (callback) => ipcRenderer.on('execution-result', (event, data) => callback(data))
// });


// const { contextBridge, ipcRenderer } = require('electron');

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  scrapeGame: (url) => ipcRenderer.invoke('scrape-game', url),
  downloadGame: (url) => ipcRenderer.invoke('download-game', url),
  openFileByPath: (filePath) => ipcRenderer.send('open-file-by-path', filePath),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
  removeDownloadProgress: (callback) => ipcRenderer.removeListener('download-progress', callback),
});
