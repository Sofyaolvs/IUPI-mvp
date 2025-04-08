const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('fs');
const { execFile } = require('child_process');
const { scrapeItchGame } = require('./main/scraper');
const { downloadGameFromItch } = require('./main/downloader');

// Impede problema no Windows com electron-squirrel-startup
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
      contextIsolation: true,
      nodeIntegration: false
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

// 📡 HANDLERS IPC //

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
    // Cria a pasta 'jogos' no diretório do aplicativo
    const jogosDir = path.join(app.getAppPath(), 'jogos');
    
    if (!fs.existsSync(jogosDir)) {
      fs.mkdirSync(jogosDir, { recursive: true });
      console.log('Pasta jogos criada:', jogosDir);
    }
    
    // Envia atualizações de progresso para o frontend
    const sendProgress = (percent, status, error = null) => {
      if (mainWindow) {
        mainWindow.webContents.send('download-progress', { 
          percent, 
          status,
          error
        });
      }
    };

    // Inicia processo com 10%
    sendProgress(10, 'downloading');
    
    // Inicia o download usando o módulo downloader
    const downloadResult = await downloadGameFromItch(gameUrl, jogosDir);
    
    if (!downloadResult.success) {
      sendProgress(0, 'error', downloadResult.message);
      return downloadResult;
    }
    
    // Se o download foi bem-sucedido
    sendProgress(100, 'complete');
    
    // Retorna informações sobre o arquivo baixado
    // Verificamos se há arquivos executáveis entre os baixados
    let exePath = '';
    
    if (downloadResult.files && downloadResult.files.length > 0) {
      // Procura por arquivos .exe
      const exeFile = downloadResult.files.find(file => file.toLowerCase().endsWith('.exe'));
      
      if (exeFile) {
        exePath = exeFile;
      } else {
        // Se não encontrou .exe, usa o primeiro arquivo
        exePath = downloadResult.files[0];
      }
    }
    
    return {
      success: true,
      message: 'Download concluído com sucesso!',
      path: exePath,
      allFiles: downloadResult.files
    };
  } catch (error) {
    console.error('Erro no download:', error);
    
    // Envia atualização de erro
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', { 
        percent: 0, 
        status: 'error',
        error: error.message
      });
    }
    
    return { 
      success: false,
      message: `Erro ao iniciar download do jogo: ${error.message}` 
    };
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

// Abrir arquivo pelo caminho
ipcMain.on('open-file-by-path', (event, filePath) => {
  if (fs.existsSync(filePath)) {
    execFile(filePath, (error) => {
      if (error) {
        console.error('Erro ao abrir arquivo:', error);
      }
    });
  } else {
    console.error('Arquivo não encontrado:', filePath);
  }
});