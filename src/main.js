const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { scrapeItchGame } = require('./main/scraper'); // importa o scraper

// Evita problema no Windows com electron-squirrel-startup
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY, // Webpack vai injetar o caminho correto
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.webContents.openDevTools(); // opcional: remove isso na versão final
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 🔌 IPC para scraping com Puppeteer
ipcMain.handle('scrape-game', async (event, gameUrl) => {
  try {
    const gameData = await scrapeItchGame(gameUrl);
    return gameData;
  } catch (error) {
    console.error('Erro no scraping:', error);
    return { error: 'Erro ao fazer scraping do jogo.' };
  }
});
