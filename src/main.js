const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');

const { scrapeItchGame } = require('./main/scraper');
const { downloadGameFromItch } = require('./main/downloader'); // download via puppeteer

// 🪟 Impede problema no Windows com electron-squirrel-startup
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
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

//
// 📡 HANDLERS IPC
//

// 🔍 Scraping de dados do jogo no Itch.io
ipcMain.handle('scrape-game', async (event, gameUrl) => {
  try {
    const gameData = await scrapeItchGame(gameUrl);
    return gameData;
  } catch (error) {
    console.error('Erro no scraping:', error);
    return { error: 'Erro ao fazer scraping do jogo.' };
  }
});

// ⬇️ Download automático do jogo
ipcMain.handle('download-game', async (event, gameUrl) => {
  try {
    const result = await downloadGameFromItch(gameUrl);
    return result;
  } catch (error) {
    console.error('Erro no download:', error);
    return { error: 'Erro ao iniciar download do jogo.' };
  }
});

// 📁 Criação da pasta "jogos"
ipcMain.handle('create-folder', async () => {
  try {
    const folderPath = path.join(__dirname, '../jogos');
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      console.log('Pasta criada:', folderPath);
      return { success: true, path: folderPath };
    } else {
      console.log('Pasta já existe:', folderPath);
      return { success: true, path: folderPath, alreadyExists: true };
    }
  } catch (error) {
    console.error('Erro ao criar pasta:', error);
    return { error: 'Erro ao criar pasta' };
  }
});

// 🚀 Execução do jogo por caminho
ipcMain.handle('execute-game', async (event, filePath) => {
  return new Promise((resolve) => {
    if (!fs.existsSync(filePath)) {
      resolve({ error: 'Arquivo não encontrado: ' + filePath });
      return;
    }

    const dirPath = path.dirname(filePath);
    const infoFile = path.join(dirPath, 'info.txt');

    fs.writeFile(infoFile, 'user', (err) => {
      if (err) {
        console.error('Erro ao criar info.txt:', err);
      } else {
        console.log('info.txt criado.');
      }
    });

    execFile(filePath, (error, stdout, stderr) => {
      if (error) {
        resolve({ error: stderr || error.message });
        return;
      }
      resolve({ output: stdout || 'Jogo executado com sucesso!' });
    });
  });
});
