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

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data:; " +
          "img-src 'self' file: data: https://*.itch.zone https://img.itch.zone https://img.itch.io https://itch.io https://itch-io.imgix.net *; " +
          "connect-src 'self' http://localhost:3000 http://172.18.9.214:3000 http://172.18.9.214:3001;"
        ]
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

// 📡 HANDLERS IPC //

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
  const appUrl = new URL(MAIN_WINDOW_WEBPACK_ENTRY).origin;

  try {
    // Check if lib directory exists
    if (!fs.existsSync(libDir)) {
      fs.mkdirSync(libDir, { recursive: true });
      return [];
    }

    const items = fs.readdirSync(libDir, { withFileTypes: true });
    const installedGames = [];

    // Process each game folder
    for (const item of items.filter(item => item.isDirectory())) {
      const gameFolderName = item.name;
      const gamePath = path.join(libDir, gameFolderName);
      
      // Check for game-info.json which would have been created during installation
      let gameInfo = { title: gameFolderName };
      const infoPath = path.join(gamePath, 'game-info.json');
      
      if (fs.existsSync(infoPath)) {
        try {
          const infoContent = fs.readFileSync(infoPath, 'utf8');
          gameInfo = { ...gameInfo, ...JSON.parse(infoContent) };
          if (gameInfo.name && !gameInfo.title) {
            gameInfo.title = gameInfo.name;
            delete gameInfo.name;
          }
        } catch (err) {
          console.error(`Error reading game info for ${gameFolderName}:`, err);
        }
      }
      
      // Check for screenshot image
      const imagesDir = path.join(gamePath, 'images');
      let image = null;
      
      if (fs.existsSync(imagesDir)) {
        try {
          const imageFiles = fs.readdirSync(imagesDir)
            .filter(filename => filename.startsWith('screenshot-') && 
                  (filename.endsWith('.jpg') || filename.endsWith('.png')));
          
          if (imageFiles.length > 0) {
            // Create a relative path instead of file:// URL
            const relImagePath = path.join('lib', gameFolderName, 'images', imageFiles[0]);
            
            // Normalize path separators for URLs (always use forward slashes)
            const normalizedPath = relImagePath.split(path.sep).join('/');
            
            // Serve the image through your app's protocol
            image = `${appUrl}/${normalizedPath}`;
          }
        } catch (err) {
          console.error(`Error reading images for ${gameFolderName}:`, err);
        }
      }
      gameInfo.image = image;
      
      // Find executable file
      let executablePath = null;
      try {
        const files = fs.readdirSync(gamePath);
        const exeFile = files.find(file => file.toLowerCase().endsWith('.exe'));
        if (exeFile) {
          executablePath = path.join(gamePath, exeFile);
        }
      } catch (err) {
        console.error(`Error finding executable for ${gameFolderName}:`, err);
      }
      
      installedGames.push({
        id: `installed-${gameInfo.title || gameFolderName}`, // Unique ID for installed games
        name: gameInfo.title || gameFolderName,
        title: gameInfo.title || gameFolderName,
        path: gamePath,
        image: image,
        cardImage: image, // Use same image for card
        description: gameInfo.description || '',
        subject: gameInfo.subject || '',
        tags: gameInfo.tags || [],
        executablePath,
        installed: true
      });
    }

    console.log(`Found ${installedGames.length} installed games:`, 
      installedGames.map(game => game.title || game.name));
    return installedGames;
  } catch (err) {
    console.error('Error reading installed games:', err.message);
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

//Arrumar lógica do isGameInstalled (pq quebra se o jogo ja estiver baixado)
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
      console.log("--------------------------------");
      console.log(`Jogo "${normalizedSlug}" já está instalado.`);
      // Monta o caminho como se fosse um download completo
      const exeDir = path.join(process.cwd(), 'lib', normalizedSlug);
      const exePath = fs.readdirSync(exeDir).find(file => file.endsWith('.exe'));

      console.log("--------------------------------")
      console.log(exeDir)
      console.log(exePath)
      console.log("--------------------------------")
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
ipcMain.on('open-file-by-path', async (event, filePath, gameName) => {
  console.log('Solicitação para abrir arquivo:', filePath);
  
  try {
    // Verificar se o caminho é um arquivo zip
    if (filePath && filePath.toLowerCase().endsWith('.zip')) {
      console.log('Arquivo ZIP detectado, extraindo antes de executar...');
      
      // Encontrar a pasta do jogo (diretório que contém o arquivo zip)
      const gameFolder = path.dirname(filePath);
      console.log('Pasta do jogo:', gameFolder);
      
      // Nome do arquivo zip sem extensão (para criar pasta de extração)
      const zipFileName = path.basename(filePath, '.zip');
      const extractFolder = path.join(gameFolder, `${zipFileName}_extracted`);
      
      // Criar pasta para extração se não existir
      if (!fs.existsSync(extractFolder)) {
        fs.mkdirSync(extractFolder, { recursive: true });
        console.log('Pasta de extração criada:', extractFolder);
      }
      
      // Verificar se a pasta de extração já tem arquivos
      let needsExtraction = true;
      try {
        const extractedFiles = fs.readdirSync(extractFolder);
        if (extractedFiles.length > 0) {
          console.log('Pasta de extração já existe e contém arquivos');
          needsExtraction = false;
        }
      } catch (err) {
        console.error('Erro ao verificar pasta de extração:', err);
      }
      
      // Extrair o arquivo zip se necessário
      if (needsExtraction) {
        console.log('Extraindo ZIP para pasta dedicada...');
        
        try {
          // Usar a função existente para extrair zip
          const AdmZip = require('adm-zip');
          const zip = new AdmZip(filePath);
          zip.extractAllTo(extractFolder, true);
          console.log('Extração concluída com sucesso!');
        } catch (extractError) {
          console.error('Erro ao extrair ZIP:', extractError);
          return;
        }
      }
      
      // Agora procurar por um executável na pasta extraída
      let executablePath = null;
      
      const findExecutableRecursive = (dir) => {
        try {
          const files = fs.readdirSync(dir);
          
          // Primeiro procurar arquivos .exe na pasta
          const exeFile = files.find(file => file.toLowerCase().endsWith('.exe'));
          if (exeFile) {
            return path.join(dir, exeFile);
          }
          
          // Se não encontrou, procurar em subpastas
          for (const file of files) {
            const filePath = path.join(dir, file);
            
            if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
              const exePath = findExecutableRecursive(filePath);
              if (exePath) return exePath;
            }
          }
          
          return null;
        } catch (err) {
          console.error('Erro ao buscar executável:', err);
          return null;
        }
      };
      
      executablePath = findExecutableRecursive(extractFolder);
      
      if (executablePath) {
        console.log('Executável encontrado após extração:', executablePath);
        filePath = executablePath;
      } else {
        console.error('Nenhum executável encontrado na pasta extraída');
        return;
      }
    }
    
    // Criar o arquivo userData.txt no mesmo diretório do executável
    const txtBasePath = path.dirname(filePath);
    
    if (!fs.existsSync(txtBasePath)) {
      fs.mkdirSync(txtBasePath, { recursive: true });
      console.log('Diretório criado:', txtBasePath);
    }
    
    const txtPath = path.join(txtBasePath, 'userData.txt');
    const userCode = 'user1';
    
    fs.writeFileSync(txtPath, userCode, 'utf8');
    console.log('Arquivo userData.txt criado em:', txtPath, 'com código: ', userCode);
    
    // Verificar se o arquivo executável existe antes de tentar abri-lo
    if (fs.existsSync(filePath)) {
      console.log('Abrindo executável:', filePath);
      execFile(filePath, (error) => {
        if (error) {
          console.error('Erro ao abrir arquivo:', error);
        } else {
          console.log('Executável iniciado com sucesso!');
        }
      });
    } else {
      console.error('Arquivo não encontrado:', filePath);
    }
  } catch (err) {
    console.error('Erro ao processar abertura de arquivo:', err);
  }
});

