const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  scrapeGame: (url) => ipcRenderer.invoke('scrape-game', url),
  downloadGame: (url, strategy = 'default') => ipcRenderer.invoke('download-game', url, strategy),
  openFileByPath: (filePath, gameName) => {
    // Support both invoke (for promise-based response) and send (for backwards compatibility)
    ipcRenderer.send('open-file-by-path', filePath, gameName);
    return ipcRenderer.invoke('open-file-by-path', filePath, gameName);
  },
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
  removeDownloadProgress: (callback) => ipcRenderer.removeListener('download-progress', callback),
  checkInstalledGames: () => ipcRenderer.invoke('check-installed-games'),
  findExecutableInFolder: (folderPath) => ipcRenderer.invoke('findExecutableInFolder', folderPath),
  extractAndLaunchZip: (zipPath, gameName) => ipcRenderer.invoke('extractAndLaunchZip', zipPath, gameName),

});