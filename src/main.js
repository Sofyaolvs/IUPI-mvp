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

  // Set Content Security Policy to allow images from itch.zone and other domains
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' data:; img-src 'self' data: https://*.itch.zone https://img.itch.zone https://img.itch.io https://itch.io https://itch-io.imgix.net *"]
      }
    });
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

ipcMain.handle('scrape-game', async (event, gameUrl) => {
  try {
    // const games = getInstalledGames();
    // console.log('Jogos instalados:', games);

    const gameData = await scrapeItchGame(gameUrl);
    return gameData;
  } catch (error) {
    console.error('Erro no scraping:', error);
    return { error: 'Erro ao fazer scraping do jogo.' };
  }
});

ipcMain.handle('check-installed-games', async () => {
  const libDir = path.resolve(process.cwd(), 'lib');

  try {
    const items = fs.readdirSync(libDir, { withFileTypes: true });

    const folders = items
      .filter(item => item.isDirectory())
      .map(dir => dir.name);

    console.log('Pastas encontradas em /lib:', folders);
    return folders;
  } catch (err) {
    console.error('Erro ao ler a pasta /lib:', err.message);
    return [];
  }
});

function checkInstalledGames(){
  const libDir = path.resolve(process.cwd(), 'lib');

  try {
    const items = fs.readdirSync(libDir, { withFileTypes: true });

    const folders = items
      .filter(item => item.isDirectory())
      .map(dir => dir.name);

    console.log('Pastas encontradas em /lib:', folders);
    return folders;
  } catch (err) {
    console.error('Erro ao ler a pasta /lib:', err.message);
    return [];
  }
}

ipcMain.handle('download-game', async (event, gameUrl) => {
  try {
    console.log('Iniciando download-game com URL:', gameUrl);

    if (!gameUrl || typeof gameUrl !== 'string' || !/^https?:\/\/.+/.test(gameUrl) || !gameUrl.includes('itch.io')) {
      return {
        success: false,
        message: 'URL inválida fornecida para download'
      };
    }

    // Extrai o final da URL como slug (ex: "terror-da-caatinga")
    const urlSlug = gameUrl.split('/').filter(Boolean).pop();
    const normalizedSlug = normalizeName(urlSlug);

    // Chama a função para obter jogos instalados
    const installedGames = checkInstalledGames()
    if (!installedGames || installedGames.length === 0) {
      console.log('Nenhum jogo instalado encontrado');
    }

    // Verifica se o slug já corresponde a uma pasta instalada
    const alreadyInstalled = installedGames.some(gameName => {
      return normalizeName(gameName) === normalizedSlug;
    });

    if (alreadyInstalled) {
      console.log(`Jogo "${urlSlug}" já está instalado.`);
      
      // Monta o caminho como se fosse um download completo
      const exeDir = path.join(process.cwd(), 'lib', normalizedSlug);
      const exePath = fs.readdirSync(exeDir).find(file => file.endsWith('.exe'));

      return {
        success: true,
        executablePath: exePath ? path.join(exeDir, exePath) : null,
        path: exeDir,
        files: exePath ? [exePath] : [],
        message: 'Jogo já instalado. Pronto para jogar!'
      };
    }

    // 🔽 Continua com o download se não estiver instalado
    const jogosDir = path.join(app.getPath('userData'), 'jogos');
    if (!fs.existsSync(jogosDir)) fs.mkdirSync(jogosDir, { recursive: true });

    const sendProgress = (percent, status, error = null) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('download-progress', {
          percent: Math.round(percent),
          status,
          ...(error ? { error } : {})
        });
      }
    };

    sendProgress(10, 'downloading');

    const simulateProgress = () => {
      const steps = [25, 40, 60, 75, 90];
      let i = 0;
      return setInterval(() => {
        if (i < steps.length) {
          sendProgress(steps[i++], 'downloading');
        }
      }, 2000);
    };

    const progressInterval = simulateProgress();
    const downloadResult = await downloadGameFromItch(gameUrl, jogosDir);
    clearInterval(progressInterval);

    if (downloadResult.success) {
      sendProgress(100, 'complete');
      const exeFile = downloadResult.files?.find(f => f.endsWith('.exe'));
      return {
        success: true,
        executablePath: exeFile || null,
        path: downloadResult.path,
        files: downloadResult.files,
        message: 'Download concluído com sucesso!'
      };
    } else {
      sendProgress(0, 'error', downloadResult.message);
      return {
        success: false,
        message: downloadResult.message || 'Falha no download do jogo'
      };
    }

  } catch (error) {
    console.error('Erro no download:', error);
    mainWindow?.webContents.send('download-progress', {
      percent: 0,
      status: 'error',
      error: error.message
    });

    return {
      success: false,
      message: `Erro ao iniciar download do jogo: ${error.message}`
    };
  }
});

const normalizeName = (name) => {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/\s+/g, '-') // espaços → hífens
    .replace(/[^a-z0-9\-]/g, ''); // remove outros símbolos
};

// 🚀 Execução do jogo por caminho
ipcMain.handle('execute-game', async (event, filePath) => {
  return new Promise((resolve) => {
    if (!fs.existsSync(filePath)) {
      resolve({ error: 'Arquivo não encontra3wsdo: ' + filePath });
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
ipcMain.on('open-file-by-path', (event, filePath, gameName) => {
  
  const appPath = app.getAppPath(); // /home/kaike/IUPI-mvp/.webpack/main
  const projectRoot = path.resolve(__dirname, '../../');
  const formattedPath = path.join(projectRoot, 'lib', gameName);
  console.log('finalPath:', formattedPath);
  //const formattedPath = path.join(files[0], files[1]);

  try {
    
    if (!fs.existsSync(formattedPath)) {
      fs.mkdirSync(formattedPath, { recursive: true });
      console.log('Diretório criado:', formattedPath);
    }

    if (fs.existsSync(formattedPath) && fs.lstatSync(formattedPath).isFile()) {
      formattedPath = formattedPath;
    }
    
    const txtPath = path.join(formattedPath, 'userData.txt');
    const userCode = 'user7';

    fs.writeFileSync(txtPath, userCode, 'utf8');
    console.log('Arquivo userData.txt criado em:', txtPath, 'com código: ', userCode);

  } catch (err) {
    console.error('Erro ao criar userData.txt:', err);
    return;
  }
  
  const formattedFilePath = formattedPath;

  if (fs.existsSync(formattedFilePath)) {
    execFile(formattedFilePath, (error) => {
      if (error) {
        console.error('Erro ao abrir arquivo:', error);
      }
    });
  } else {
    console.error('Arquivo não encontrado:', formattedFilePath);
  }
});