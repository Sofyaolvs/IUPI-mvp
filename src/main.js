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

// Image cache to improve performance
const imageCache = new Map();

const createWindow = () => {
   mainWindow = new BrowserWindow({
     width: 800,
     height: 600,
     webPreferences: {
       preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
       contextIsolation: true,
       nodeIntegration: false
     },
     autoHideMenuBar: true,
   });

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data:; " +
          "img-src 'self' file: data: https://*.itch.zone https://img.itch.zone https://img.itch.io https://itch.io https://itch-io.imgix.net *; " +
          `connect-src 'self' http://52.91.62.219:3001;`
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

// Handler for getting images as Base64
ipcMain.handle('get-image-base64', async (event, imagePath) => {
  try {
    // Check if the image is already in the cache
    if (imageCache.has(imagePath)) {
      return imageCache.get(imagePath);
    }
    
    console.log('Getting image as Base64:', imagePath);
    
    // Handle various path formats
    let resolvedPath = imagePath;
    
    // If it's a relative path
    if (!path.isAbsolute(imagePath)) {
      // If it starts with 'lib/', resolve from app root
      if (imagePath.startsWith('lib/') || imagePath.startsWith('/lib/')) {
        resolvedPath = path.join(process.cwd(), imagePath.replace(/^\//, ''));
      } else {
        // Try multiple potential base paths
        const potentialPaths = [
          path.join(process.cwd(), imagePath),
          path.join(process.cwd(), 'lib', imagePath),
          // If we have a path like "images/screenshot-1.jpg"
          imagePath.includes('images/') ? 
            path.join(process.cwd(), imagePath) : 
            path.join(process.cwd(), 'images', imagePath)
        ];
        
        // Find the first path that exists
        for (const potentialPath of potentialPaths) {
          if (fs.existsSync(potentialPath)) {
            resolvedPath = potentialPath;
            break;
          }
        }
      }
    }
    
    // Check if the file exists
    if (!fs.existsSync(resolvedPath)) {
      console.error(`Image file not found: ${resolvedPath}`);
      
      // Try one more approach: if the path has game name and images folder
      const regex = /([^/\\]+)\/images\/([^/\\]+)$/;
      const matches = imagePath.match(regex);
      
      if (matches && matches.length >= 3) {
        const gameName = matches[1];
        const imageName = matches[2];
        
        // Try to find the game folder in the lib directory
        const libPath = path.join(process.cwd(), 'lib');
        if (fs.existsSync(libPath)) {
          const gameDir = path.join(libPath, gameName);
          if (fs.existsSync(gameDir)) {
            const imageDir = path.join(gameDir, 'images');
            if (fs.existsSync(imageDir)) {
              const imagePath = path.join(imageDir, imageName);
              if (fs.existsSync(imagePath)) {
                console.log(`Found image at: ${imagePath}`);
                resolvedPath = imagePath;
              }
            }
          }
        }
      }
      
      // If still not found
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }
    }
    
    // Read the file and convert to Base64
    const imageBuffer = fs.readFileSync(resolvedPath);
    
    // Determine MIME type based on file extension
    let mimeType = 'image/jpeg'; // Default
    if (resolvedPath.toLowerCase().endsWith('.png')) {
      mimeType = 'image/png';
    } else if (resolvedPath.toLowerCase().endsWith('.gif')) {
      mimeType = 'image/gif';
    } else if (resolvedPath.toLowerCase().endsWith('.webp')) {
      mimeType = 'image/webp';
    }
    
    // Create the Base64 data URL
    const base64Image = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    
    // Store in cache
    imageCache.set(imagePath, base64Image);
    
    // Return the Base64 string
    return base64Image;
  } catch (error) {
    console.error('Error getting image as Base64:', error);
    throw error;
  }
});

// Optional: Add a cache cleanup handler
ipcMain.handle('clear-image-cache', () => {
  const cacheSize = imageCache.size;
  imageCache.clear();
  console.log(`Cleared image cache (${cacheSize} entries)`);
  return { success: true, entriesCleared: cacheSize };
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
            // Create path to the image that will be loaded via getImageBase64
            const imagePath = path.join('lib', gameFolderName, 'images', imageFiles[0]);
            
            // Normalize path separators for URLs (always use forward slashes)
            image = imagePath.split(path.sep).join('/');
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

ipcMain.handle('findExecutableInFolder', async (event, folderPath) => {
  try {
    console.log('Searching for executable in folder:', folderPath);
    
    if (!folderPath || !fs.existsSync(folderPath)) {
      console.error('Invalid folder path or folder does not exist:', folderPath);
      return null;
    }
    
    // Use the existing findExecutableInFolder function if you have it
    // or implement a simplified version here
    const findExecutable = (dir, recursive = true) => {
      if (!fs.existsSync(dir)) return null;
      
      try {
        console.log(`Checking for executables in: ${dir}`);
        const files = fs.readdirSync(dir);
        
        // First look for .exe files
        const exeFile = files.find(f => f.toLowerCase().endsWith('.exe'));
        if (exeFile) {
          const exePath = path.join(dir, exeFile);
          console.log(`Found .exe file: ${exePath}`);
          return exePath;
        }
        
        // Also look for HTML files for WebGL games
        const htmlFile = files.find(f => 
          f.toLowerCase() === 'index.html' || 
          f.toLowerCase().endsWith('.html')
        );
        if (htmlFile) {
          const htmlPath = path.join(dir, htmlFile);
          console.log(`Found HTML file: ${htmlPath}`);
          return htmlPath;
        }
        
        // If not found and recursive is true, search subfolders
        if (recursive) {
          for (const file of files) {
            const filePath = path.join(dir, file);
            
            if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
              const result = findExecutable(filePath, true);
              if (result) return result;
            }
          }
        }
        
        return null;
      } catch (err) {
        console.error(`Error searching directory ${dir}:`, err);
        return null;
      }
    };
    
    // Search the directory for executables
    const executablePath = findExecutable(folderPath, true);
    
    // Also check if there are any "extracted" folders that might contain executables
    if (!executablePath) {
      console.log('No executable found in main folder, checking extracted folders...');
      
      try {
        const extractedFolders = fs.readdirSync(folderPath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory() && dirent.name.includes('_extracted'))
          .map(dirent => path.join(folderPath, dirent.name));
        
        for (const extractedFolder of extractedFolders) {
          console.log(`Checking extracted folder: ${extractedFolder}`);
          const extractedExecutable = findExecutable(extractedFolder, true);
          if (extractedExecutable) {
            console.log(`Found executable in extracted folder: ${extractedExecutable}`);
            return extractedExecutable;
          }
        }
      } catch (err) {
        console.error('Error searching extracted folders:', err);
      }
    }
    
    return executablePath;
  } catch (error) {
    console.error('Error in findExecutableInFolder handler:', error);
    return null;
  }
});

ipcMain.handle('extractAndLaunchZip', async (event, zipPath, gameName) => {
  try {
    console.log('Extracting and launching ZIP file:', zipPath);
    
    if (!zipPath || !fs.existsSync(zipPath)) {
      console.error('ZIP file does not exist:', zipPath);
      return { success: false, error: 'ZIP file not found' };
    }
    
    // Create extraction folder
    const gameFolder = path.dirname(zipPath);
    const zipFileName = path.basename(zipPath, '.zip');
    const extractFolder = path.join(gameFolder, `${zipFileName}_extracted`);
    
    console.log('Extracting to folder:', extractFolder);
    
    // Create the folder if it doesn't exist
    if (!fs.existsSync(extractFolder)) {
      fs.mkdirSync(extractFolder, { recursive: true });
    }
    
    // Extract the ZIP file
    try {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(extractFolder, true);
      console.log('ZIP file extracted successfully');
    } catch (extractError) {
      console.error('Error extracting ZIP file:', extractError);
      return { success: false, error: 'Failed to extract ZIP file: ' + extractError.message };
    }
    
    // Find executable in the extracted folder
    const findExecutable = (dir, recursive = true) => {
      if (!fs.existsSync(dir)) return null;
      
      try {
        console.log(`Checking for executables in: ${dir}`);
        const files = fs.readdirSync(dir);
        
        // First look for .exe files
        const exeFile = files.find(f => f.toLowerCase().endsWith('.exe'));
        if (exeFile) {
          const exePath = path.join(dir, exeFile);
          console.log(`Found .exe file: ${exePath}`);
          return exePath;
        }
        
        // Also look for HTML files for WebGL games
        const htmlFile = files.find(f => 
          f.toLowerCase() === 'index.html' || 
          f.toLowerCase().endsWith('.html')
        );
        if (htmlFile) {
          const htmlPath = path.join(dir, htmlFile);
          console.log(`Found HTML file: ${htmlPath}`);
          return htmlPath;
        }
        
        // If not found and recursive is true, search subfolders
        if (recursive) {
          for (const file of files) {
            const filePath = path.join(dir, file);
            
            if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
              const result = findExecutable(filePath, true);
              if (result) return result;
            }
          }
        }
        
        return null;
      } catch (err) {
        console.error(`Error searching directory ${dir}:`, err);
        return null;
      }
    };
    
    // Find executable in extracted folder
    const executablePath = findExecutable(extractFolder, true);
    
    if (!executablePath) {
      console.error('No executable found in extracted folder');
      return { success: false, error: 'No executable found in extracted folder' };
    }
    
    console.log('Found executable after extraction:', executablePath);
    
    // Create userData.txt in the same directory as the executable
    const txtBasePath = path.dirname(executablePath);
    
    try {
      const txtPath = path.join(txtBasePath, 'userData.txt');
      const userCode = 'user1';
      fs.writeFileSync(txtPath, userCode, 'utf8');
      console.log('Created userData.txt file at:', txtPath);
    } catch (txtError) {
      console.error('Error creating userData.txt:', txtError);
    }
    
    // Launch the executable
    try {
      // Check platform and use appropriate launch method
      const platform = process.platform;
      
      if (platform === 'win32') {
        // Windows
        execFile(executablePath, (error) => {
          if (error) {
            console.error('Error launching game on Windows:', error);
          } else {
            console.log('Game launched successfully on Windows');
          }
        });
      } else if (platform === 'linux') {
        // Linux - use Wine
        fs.chmodSync(executablePath, '755'); // Make executable
        
        const { spawn } = require('child_process');
        const wineProcess = spawn('wine', [executablePath], {
          detached: true,
          stdio: 'ignore',
          cwd: path.dirname(executablePath)
        });
        
        wineProcess.on('error', (err) => {
          console.error('Error launching game with Wine:', err);
        });
        
        wineProcess.unref();
        console.log('Game launched with Wine, PID:', wineProcess.pid);
      } else if (platform === 'darwin') {
        // macOS - use Wine
        const { spawn } = require('child_process');
        const wineProcess = spawn('wine', [executablePath], {
          detached: true,
          stdio: 'ignore',
          cwd: path.dirname(executablePath)
        });
        
        wineProcess.on('error', (err) => {
          console.error('Error launching game with Wine on macOS:', err);
        });
        
        wineProcess.unref();
        console.log('Game launched with Wine on macOS, PID:', wineProcess.pid);
      }
      
      return { 
        success: true, 
        executablePath,
        extractFolder
      };
    } catch (launchError) {
      console.error('Error launching game:', launchError);
      return { 
        success: false, 
        error: 'Failed to launch game: ' + launchError.message,
        executablePath  // Still return the path so the caller knows where it is
      };
    }
  } catch (error) {
    console.error('Error in extractAndLaunchZip handler:', error);
    return { success: false, error: error.message };
  }
});

module.exports = { app, BrowserWindow, ipcMain };