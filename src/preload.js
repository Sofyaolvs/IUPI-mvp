const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Existing methods
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
  
  // New method for loading images as base64
  getImageBase64: async (imagePath) => {
    try {
      return await ipcRenderer.invoke('get-image-base64', imagePath);
    } catch (error) {
      console.error('Error in getImageBase64:', error);
      throw error;
    }
  },
  
  // Optional utility for clearing the image cache
  clearImageCache: () => ipcRenderer.invoke('clear-image-cache'),

  // Persistent config (survives app restarts and port changes)
  configGet: (key) => ipcRenderer.invoke('config-get', key),
  configSet: (key, value) => ipcRenderer.invoke('config-set', key, value),
  configDelete: (key) => ipcRenderer.invoke('config-delete', key),

  // Faz fetch pelo processo Node (contorna problemas de certificado no Windows)
  fetchUrl: (url, options) => ipcRenderer.invoke('fetch-url', url, options),
});