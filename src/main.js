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
  
  // Abre DevTools em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
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
    console.log('Iniciando download-game com URL:', gameUrl);
    
    // Verificação adicional da URL
    if (!gameUrl || typeof gameUrl !== 'string') {
      console.error('URL inválida para download:', gameUrl);
      return {
        success: false,
        message: 'URL inválida fornecida para download'
      };
    }
    
    // Verificar se é uma URL válida
    if (!gameUrl.match(/^https?:\/\/.+/)) {
      console.error('Formato de URL inválido:', gameUrl);
      return {
        success: false,
        message: 'Formato de URL inválido'
      };
    }
    
    // Verificar se é uma URL do itch.io
    if (!gameUrl.includes('itch.io')) {
      console.error('URL não é do itch.io:', gameUrl);
      return {
        success: false,
        message: 'Por favor, forneça uma URL válida do Itch.io'
      };
    }
    
    // Diretório para jogos
    const jogosDir = path.join(app.getPath('userData'), 'jogos');
    
    if (!fs.existsSync(jogosDir)) {
      fs.mkdirSync(jogosDir, { recursive: true });
      console.log('Pasta jogos criada:', jogosDir);
    }
    
    // Função para enviar atualizações de progresso para o frontend
    const sendProgress = (percent, status, error = null) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        const progressData = { 
          percent: Math.round(percent), 
          status: status
        };
        
        if (error) {
          progressData.error = error;
        }
        
        console.log('Enviando progresso:', progressData);
        mainWindow.webContents.send('download-progress', progressData);
      }
    };

    // Inicia processo com 10%
    sendProgress(10, 'downloading');
    
    // Adicione um log para ver a URL exata
    console.log('Iniciando download da URL:', gameUrl);
    
    // Modificar o downloader.js para aceitar callbacks de progresso
    // ou simular progresso aqui enquanto o download ocorre
    
    // Simular alguns eventos de progresso
    const simulateProgress = () => {
      const progressSteps = [25, 40, 60, 75, 90];
      let stepIndex = 0;
      
      const progressInterval = setInterval(() => {
        if (stepIndex < progressSteps.length) {
          sendProgress(progressSteps[stepIndex], 'downloading');
          stepIndex++;
        } else {
          clearInterval(progressInterval);
        }
      }, 2000);
      
      return progressInterval;
    };
    
    const progressInterval = simulateProgress();
    
    // Inicia o download usando o módulo downloader
    const downloadResult = await downloadGameFromItch(gameUrl, jogosDir);
    
    // Limpa o intervalo de simulação
    clearInterval(progressInterval);
    
    console.log('Resultado do download:', downloadResult);
    
    if (downloadResult.success) {
      sendProgress(100, 'complete');
      
      return {
        success: true,
        path: downloadResult.files && downloadResult.files.length > 0 ? 
              downloadResult.files[0] : downloadResult.path,
        files: downloadResult.files,
        message: 'Download concluído com sucesso!'
      };
    } else {
      sendProgress(0, 'error', downloadResult.message || 'Falha no download');
      
      return {
        success: false,
        message: downloadResult.message || 'Falha no download do jogo'
      };
    }
  } catch (error) {
    console.error('Erro no download:', error);
    
    // Envia atualização de erro
    if (mainWindow && !mainWindow.isDestroyed()) {
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
ipcMain.handle('open-file-by-path', (event, filePath) => {
  console.log('Solicitação para abrir arquivo:', filePath);
  
  return new Promise((resolve) => {
    if (!filePath) {
      resolve({ error: 'Caminho do arquivo não fornecido' });
      return;
    }
    
    if (!fs.existsSync(filePath)) {
      resolve({ error: 'Arquivo não encontrado: ' + filePath });
      return;
    }
    
    execFile(filePath, (error, stdout, stderr) => {
      if (error) {
        console.error('Erro ao abrir arquivo:', error);
        resolve({ error: stderr || error.message });
        return;
      }
      
      console.log('Arquivo aberto com sucesso:', filePath);
      resolve({ success: true, output: stdout || 'Arquivo aberto com sucesso!' });
    });
  });
});

// Modificar para usar handle em vez de on (permite resposta assíncrona)
ipcMain.removeAllListeners('open-file-by-path');

// Manter o listener antigo para compatibilidade
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