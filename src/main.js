const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');
const puppeteer = require('puppeteer'); // Make sure this is imported

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

// // 📡 HANDLERS IPC //

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

// Extract and add these functions from the snippet provided
async function installGame(url, downloadsDir) {
  // Add progress updates during download
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  // Send update after browser launch
  if (mainWindow) {
    mainWindow.webContents.send('download-progress', { 
      percent: 20, 
      status: 'downloading'
    });
  }
  
  // Rest of the function...
  // This should include your actual download implementation
  
  // Send updates at key points
  if (mainWindow) {
    mainWindow.webContents.send('download-progress', { 
      percent: 40, 
      status: 'downloading'
    });
  }
  
  // Rest of download code...
  // Replace this with your actual implementation
  const finalFiles = []; // This should be populated with downloaded files
  
  return finalFiles;
}

async function extractGame(downloadsDir, finalFiles) {
  // Add progress updates during extraction
  if (mainWindow) {
    mainWindow.webContents.send('download-progress', { 
      percent: 70, 
      status: 'extracting'
    });
  }
  
  // Rest of extraction code...
  // Replace this with your actual extraction implementation
  
  if (mainWindow) {
    mainWindow.webContents.send('download-progress', { 
      percent: 90, 
      status: 'extracting'
    });
  }
  
  // Rest of function...
  // Replace with actual extraction logic
  const extractedFilePath = path.join(downloadsDir, 'extracted-game'); // Replace with actual path
  
  return extractedFilePath;
}

// Replace or update the downloadGame function
async function downloadGame(url) {
  try {
    // Verifique se a pasta 'jogos' existe 
    const downloadsDir = path.join(__dirname, '..', 'jogos');
    
    // Se a pasta não existir, cria a pasta 'jogos'
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
    
    // Send initial progress update
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', { 
        percent: 10, 
        status: 'downloading'
      });
    }
    // Baixar o jogo para a pasta 'jogos'
    const finalFiles = await installGame(url, downloadsDir); 
    
    // After download is complete, update progress
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', { 
        percent: 60, 
        status: 'extracting'
      });
    }
    
    // Após o download, extrair o jogo
    const extractedFilePath = await extractGame(downloadsDir, finalFiles);
    
    console.log(`Arquivos extraídos para: ${extractedFilePath}`);
    // Final progress update
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', { 
        percent: 100, 
        status: 'complete'
      });
    }
    // Verificar os arquivos baixados
    const installedFiles = fs.readdirSync(downloadsDir);
    console.log('Todos os arquivos encontrados no diretório de downloads:', installedFiles);
    
    return {
      success: true,
      message: 'Download e extração concluídos com sucesso',
      fileName: path.basename(extractedFilePath),
      path: extractedFilePath
    };
  } catch (error) {
    console.error('Erro no download:', error);
    
    // Send error progress update
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', { 
        percent: 0, 
        status: 'error',
        error: error.message
      });
    }
    
    return {
      success: false,
      message: `Erro: ${error.message}`
    };
  }
}

// ⬇️ Download automático do jogo - update to use the new downloadGame function
ipcMain.handle('download-game', async (event, gameUrl) => {
  try {
    const result = await downloadGame(gameUrl);
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

ipcMain.handle('execute-game', async (event, filePath) => {
  console.log("🟡 Executando jogo:", filePath);

  if (!fs.existsSync(filePath)) {
    console.log("🔴 Arquivo não encontrado");
    return { error: 'Arquivo não encontrado: ' + filePath };
  }

  const dirPath = path.dirname(filePath);
  const infoFile = path.join(dirPath, 'info.txt');

  try {
    // Criar info.txt com await
    await fs.promises.writeFile(infoFile, 'user');
    console.log('🟢 info.txt criado com sucesso');
  } catch (err) {
    console.error('🔴 Erro ao criar info.txt:', err);
    return { error: 'Erro ao criar info.txt: ' + err.message };
  }

  // Executar o jogo
  return new Promise((resolve) => {
    execFile(filePath, (error, stdout, stderr) => {
      if (error) {
        console.error("🔴 Erro ao executar:", stderr || error.message);
        resolve({ error: stderr || error.message });
      } else {
        console.log("🟢 Jogo executado com sucesso");
        resolve({ output: stdout || 'Jogo executado com sucesso!' });
      }
    });
  });
});