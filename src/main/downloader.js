const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');

/**
* Inicia o jogo a partir de seu executável
* @param {string} filePath Caminho do executável
* @returns {Promise<Object>} Resultado da execução
*/
function launchGame(filePath) {
 return new Promise((resolve, reject) => {
   if (!fs.existsSync(filePath)) {
     reject(new Error(`O arquivo não existe: ${filePath}`));
     return;
   }
   
   console.log(`Executando jogo: ${filePath}`);
   
   exec(`"${filePath}"`, (error, stdout, stderr) => {
     if (error) {
       console.error(`Erro ao executar o jogo: ${error.message}`);
       reject(error);
       return;
     }
     
     resolve({
       success: true,
       message: 'Jogo iniciado com sucesso!',
       output: stdout
     });
   });
 });
}

/**
* Verifica o status de instalação de um jogo
* @param {string} gameUrl URL da página do jogo
* @param {string} baseDir Diretório base para verificação
* @returns {Promise<Object>} Status do jogo
*/
async function checkGameStatus(gameUrl, baseDir = null) {
 try {
   const gameInfo = await scrapeItchGame(gameUrl);
   const gameName = sanitizeFileName(gameInfo.title);
   
   const gameStatus = isGameInstalled(gameName, baseDir);
   
   return {
     gameInfo,
     installed: gameStatus.installed,
     executablePath: gameStatus.executablePath,
     gamePath: gameStatus.gamePath
   };
 } catch (error) {
   console.error("Erro ao verificar status do jogo:", error);
   return {
     installed: false,
     executablePath: null,
     error: error.message
   };
 }
}

module.exports = { 
 downloadGameFromItch, 
 scrapeItchGame, 
 isGameInstalled, 
 launchGame, 
 checkGameStatus,
 findExecutableInFolder,
 sanitizeFileName,
 getChromePath,
 getConfiguredBrowserOptions,
 launchBrowser
};

/**
* Função principal para baixar jogos do itch.io
* @param {string} url URL da página do jogo
* @param {Object} options Opções de download
* @returns {Promise<Object>} Resultado do download
*/
async function downloadGameFromItch(url, options = {}) {
 const { 
   customDownloadPath = null,
   timeout = 600000,  // 10 minutos
   saveImages = true,
   extractZips = true,
   deleteZipAfterExtract = false  // Alterado para false como padrão mais seguro
 } = options;
 
 let browser = null;
 
 try {
   // Obter informações do jogo primeiro
   console.log(`Iniciando processo de download para ${url}`);
   const gameInfo = await scrapeItchGame(url);
   const gameName = sanitizeFileName(gameInfo.title);
   
   // Definir pasta de download
   const baseDownloadPath = customDownloadPath || path.join(process.cwd(), 'lib');
   const downloadPath = path.join(baseDownloadPath, gameName);
   
   console.log(`Pasta de destino: ${downloadPath}`);
   
   if(downloadPath.includes('unknown-game')){
     return {
       success: false,
       installed: false,
       message: 'Download cancelado! (unknown-game)',
     }
   }
   
   // Verificar se o jogo já está instalado
   const gameStatus = isGameInstalled(gameName, baseDownloadPath);
   if (gameStatus.installed) {
     console.log(`O jogo "${gameName}" já está instalado em: ${gameStatus.executablePath}`);
     return {
       success: true,
       installed: true,
       message: 'O jogo já está instalado!',
       executablePath: gameStatus.executablePath,
       gamePath: gameStatus.gamePath,
       gameInfo: gameInfo
     };
   }
   
   // Iniciar download do jogo
   // Usar o sistema aprimorado para iniciar o navegador
   browser = await launchBrowser({
     defaultViewport: null
   });
   
   const page = await browser.newPage();
   
   // Definir onde os arquivos serão baixados
   const client = await page.createCDPSession();
   await client.send('Page.setDownloadBehavior', {
     behavior: 'allow',
     downloadPath,
   });
   
   // Navegar para a página do jogo
   console.log(`Navegando para ${url}`);
   await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });    
   await page.waitForSelector('a.button.download_btn', { timeout: 60000 });
   await page.click('a.button.download_btn');
   
   // Criar a pasta se não existir
   if (!fs.existsSync(downloadPath)) {
     fs.mkdirSync(downloadPath, { recursive: true });
   }
   
   // Esperar download iniciar
   console.log('Aguardando início do download...');
   await new Promise(resolve => setTimeout(resolve, 5000));
   
   // Esperar até que não haja mais arquivos .crdownload ou .part
   let downloadComplete = !checkOngoingDownloads(downloadPath);
   let checkCount = 0;
   const maxChecks = timeout / 10000; // Converter timeout para número de checagens
   
   console.log(`Monitorando download (timeout: ${timeout / 60000} minutos)`);
   while (!downloadComplete && checkCount < maxChecks) {
     await new Promise(resolve => setTimeout(resolve, 10000)); // Esperar 10 segundos
     downloadComplete = !checkOngoingDownloads(downloadPath);
     checkCount++;
     if (checkCount % 6 === 0) { // Log a cada minuto
       console.log(`Download em andamento... ${checkCount * 10 / 60} minutos passados`);
     }
   }
   
   if (!downloadComplete) {
     console.warn('Tempo limite excedido, mas o download pode continuar em segundo plano');
   } else {
     console.log("Download concluído!");
   }
   
   await browser.close();
   browser = null;
   
   // Obter os arquivos mais recentes no diretório
   const recentFiles = getRecentFiles(downloadPath);
   console.log(`Arquivos encontrados após download: ${recentFiles.map(f => f.filePath).join(', ')}`);
   
   // Verificar se há arquivos .zip para extrair
   if (extractZips) {
     let extractedFolders = [];
     
     for (const fileInfo of recentFiles) {
       if (fileInfo.filePath.toLowerCase().endsWith('.zip')) {
         console.log(`Preparando para extrair: ${fileInfo.filePath}`);
         
         try {
           // Criar uma pasta específica para extração baseada no nome do arquivo zip
           const zipFileName = path.basename(fileInfo.filePath, '.zip');
           const extractFolder = path.join(downloadPath, `${zipFileName}_extracted`);
           
           // Criar a pasta de extração se não existir
           if (!fs.existsSync(extractFolder)) {
             fs.mkdirSync(extractFolder, { recursive: true });
           }
           
           console.log(`Extraindo ${fileInfo.filePath} para ${extractFolder}`);
           
           await extractZipFile(fileInfo.filePath, extractFolder);
           extractedFolders.push(extractFolder);
           
           console.log(`Extração de ${fileInfo.filePath} concluída com sucesso!`);
           
           if (deleteZipAfterExtract) {
             try {
               fs.unlinkSync(fileInfo.filePath);
               console.log(`Arquivo ZIP removido após extração: ${fileInfo.filePath}`);
             } catch (unlinkError) {
               console.error(`Erro ao remover arquivo ZIP: ${unlinkError.message}`);
             }
           }
         } catch (extractError) {
           console.error(`Erro ao extrair ${fileInfo.filePath}: ${extractError.message}`);
         }
       }
     }
     
     // Registrar todas as pastas extraídas
     if (extractedFolders.length > 0) {
       console.log(`Pastas com arquivos extraídos: ${extractedFolders.join(', ')}`);
     }
   }
   
   // Salvar informações do jogo após download e extração (inclui URL para referência futura)
   gameInfo.url = url;
   saveGameInfo(gameInfo, downloadPath);
   
   // Baixar imagens do jogo após download e extração
   if (saveImages && gameInfo.images && gameInfo.images.length > 0) {
     await downloadGameImages(gameInfo.images, downloadPath);
   }
   
   // Encontrar executável na pasta do jogo com busca recursiva aprimorada
   const executablePath = findExecutableInFolder(downloadPath, true); // true para busca recursiva
   
   if (executablePath) {
     console.log(`Executável encontrado: ${executablePath}`);
   } else {
     console.log('Nenhum executável encontrado na pasta do jogo');
   }
   
   console.log("Processo de download finalizado");
   
   return {
     success: true,
     installed: true,
     message: 'Download concluído com sucesso!',
     gamePath: downloadPath,
     files: recentFiles.map(f => f.filePath),
     executablePath: executablePath,
     gameInfo: gameInfo
   };
 } catch (error) {
   console.error('Erro no download:', error);
   
   // Garantir que o navegador seja fechado em caso de erro
   if (browser) {
     try {
       await browser.close();
     } catch (closeError) {
       console.error('Erro ao fechar navegador:', closeError.message);
     }
   }
   
   return {
     success: false,
     installed: false,
     message: `Erro no download: ${error.message}`,
     error: error
   };
 }
}

/**
 * Identifica os possíveis botões de download na página
 * @param {Page} page Instância de página do Puppeteer
 * @returns {Promise<Array>} Lista de links de download
 */
async function findDownloadButtons(page) {
  return page.evaluate(() => {
    // Busca por qualquer elemento que pareça um botão de download
    const links = Array.from(document.querySelectorAll('a, button'));
    return links
      .filter(link => {
        // Verificar se é um link visível
        const isVisible = link.offsetWidth > 0 && link.offsetHeight > 0;
        if (!isVisible) return false;
        
        // Obter atributos relevantes
        const href = (link.href || '').toLowerCase();
        const text = (link.innerText || '').toLowerCase();
        const classes = (link.className || '').toLowerCase();
        const id = (link.id || '').toLowerCase();
        
        // Verificar possíveis indicadores de download
        const isDownloadClass = classes.includes('download') || id.includes('download');
        const isDownloadText = text.includes('download') || text.includes('baixar') || text.includes('get');
        const isExecutable = href.includes('.exe') || href.includes('.zip') || href.includes('.msi');
        const hasDownloadAttr = link.hasAttribute('download');
        
        return isDownloadClass || isDownloadText || isExecutable || hasDownloadAttr || href.includes('download');
      })
      .map((link, index) => ({
        index,
        href: link.href || null,
        text: link.innerText || '',
        classes: link.className || '',
        id: link.id || '',
        tagName: link.tagName.toLowerCase(),
        position: link.getBoundingClientRect(),
        isButton: link.tagName.toLowerCase() === 'button'
      }));
  });
} require('child_process');

/**
 * Detecta o caminho do Chrome no sistema operacional
 * @returns {string} Caminho para o executável do Chrome
 */
function getChromePath() {
  const platform = os.platform();
  console.log(`Detectando Chrome em plataforma: ${platform}`);
  
  try {
    if (platform === 'win32') {
      const chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        // Adiciona caminhos para o Chrome instalado pelo usuário
        path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
        // Chromium paths
        'C:\\Program Files\\Chromium\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe'
      ];
      
      for (const chromePath of chromePaths) {
        if (fs.existsSync(chromePath)) {
          console.log(`Navegador encontrado em: ${chromePath}`);
          return chromePath;
        }
      }
      
      // Tenta localizar o chrome usando o registry (Windows)
      try {
        const { execSync } = require('child_process');
        const regQuery = 'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" /ve';
        const regResult = execSync(regQuery, { encoding: 'utf8' });
        const match = regResult.match(/REG_SZ\s+([^\s]+)/);
        if (match && match[1]) {
          const chromePath = match[1].trim();
          if (fs.existsSync(chromePath)) {
            console.log(`Chrome encontrado via registry: ${chromePath}`);
            return chromePath;
          }
        }
      } catch (regError) {
        console.warn(`Erro ao verificar no registry: ${regError.message}`);
      }
      
      throw new Error('Chrome ou Edge não encontrado nos caminhos padrões do Windows');
    } else if (platform === 'linux') {
      const chromePaths = [
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/snap/bin/chromium',
        '/usr/bin/microsoft-edge-stable',
        '/usr/bin/microsoft-edge',
        // Adiciona caminhos para instalações específicas de distribuições
        '/opt/google/chrome/chrome',
        '/opt/google/chrome-beta/chrome',
        '/opt/google/chrome-unstable/chrome'
      ];
      
      for (const chromePath of chromePaths) {
        if (fs.existsSync(chromePath)) {
          console.log(`Navegador encontrado em: ${chromePath}`);
          return chromePath;
        }
      }
      
      // Tenta localizar o chrome usando whereis/which
      try {
        const { execSync } = require('child_process');
        const browsers = ['google-chrome', 'chromium', 'chromium-browser', 'microsoft-edge'];
        
        for (const browser of browsers) {
          try {
            const whichResult = execSync(`which ${browser}`, { encoding: 'utf8' }).trim();
            if (whichResult && fs.existsSync(whichResult)) {
              console.log(`Navegador encontrado via which: ${whichResult}`);
              return whichResult;
            }
          } catch (whichError) {
            // Continua para o próximo navegador
          }
          
          try {
            const whereisResult = execSync(`whereis -b ${browser}`, { encoding: 'utf8' });
            const match = whereisResult.match(new RegExp(`${browser}:\\s+([^\\s]+)`));
            if (match && match[1] && fs.existsSync(match[1])) {
              console.log(`Navegador encontrado via whereis: ${match[1]}`);
              return match[1];
            }
          } catch (whereisError) {
            // Continua para o próximo navegador
          }
        }
      } catch (cmdError) {
        console.warn(`Erro ao verificar com which/whereis: ${cmdError.message}`);
      }
      
      throw new Error('Chrome, Chromium ou Edge não encontrado em caminhos comuns do Linux');
    } else if (platform === 'darwin') {
      const macChromePaths = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        // Verifica também na pasta do usuário
        path.join(os.homedir(), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
        path.join(os.homedir(), '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'),
        path.join(os.homedir(), '/Applications/Chromium.app/Contents/MacOS/Chromium')
      ];
      
      for (const chromePath of macChromePaths) {
        if (fs.existsSync(chromePath)) {
          console.log(`Navegador encontrado em: ${chromePath}`);
          return chromePath;
        }
      }
      
      // Tenta usar mdfind para localizar o Chrome
      try {
        const { execSync } = require('child_process');
        const mdfindResult = execSync('mdfind "kMDItemCFBundleIdentifier == com.google.Chrome"', { encoding: 'utf8' }).trim();
        
        if (mdfindResult) {
          const chromePath = path.join(mdfindResult.split('\n')[0], 'Contents/MacOS/Google Chrome');
          if (fs.existsSync(chromePath)) {
            console.log(`Chrome encontrado via mdfind: ${chromePath}`);
            return chromePath;
          }
        }
      } catch (mdfindError) {
        console.warn(`Erro ao verificar com mdfind: ${mdfindError.message}`);
      }
      
      throw new Error('Chrome, Edge ou Chromium não encontrado em caminhos comuns do macOS');
    } else {
      throw new Error(`Sistema operacional não suportado: ${platform}`);
    }
  } catch (error) {
    console.error(`Erro ao detectar navegador: ${error.message}`);
    
    // Tentar usar variável de ambiente CHROME_PATH como fallback
    if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
      console.log(`Usando navegador da variável de ambiente CHROME_PATH: ${process.env.CHROME_PATH}`);
      return process.env.CHROME_PATH;
    }
    
    // Se não encontrar, deixa o Puppeteer tentar encontrar o navegador
    console.warn('Não foi possível localizar navegador. Puppeteer tentará encontrar automaticamente.');
    return null;
  }
}

/**
 * Configura as opções do navegador para Puppeteer com detecção inteligente
 * @param {Object} customOptions Opções personalizadas para mesclar
 * @returns {Object} Opções configuradas para uso com Puppeteer
 */
function getConfiguredBrowserOptions(customOptions = {}) {
  // Opções padrão
  const defaultOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--metrics-recording-only',
      '--mute-audio',
      '--safebrowsing-disable-auto-update'
    ],
    ignoreHTTPSErrors: true
  };
  
  try {
    // Tenta obter o caminho do Chrome
    const chromePath = getChromePath();
    
    // Se encontrou um caminho para o Chrome, adiciona às opções
    if (chromePath) {
      defaultOptions.executablePath = chromePath;
    }
  } catch (error) {
    console.warn(`Aviso: ${error.message}. Tentando usar Chrome instalado pelo Puppeteer.`);
  }
  
  // Mescla as opções personalizadas com as padrão
  return { ...defaultOptions, ...customOptions };
}

/**
 * Função aprimorada para iniciar o navegador com tratamento de erros robusto
 * @param {Object} options Opções para inicializar o navegador
 * @returns {Promise<Browser>} Instância do navegador
 */
async function launchBrowser(options = {}) {
  const browserOptions = getConfiguredBrowserOptions(options);
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      console.log(`Tentativa ${attempts + 1}/${maxAttempts} de iniciar o navegador...`);
      
      if (attempts > 0) {
        console.log('Aguardando 2 segundos antes de tentar novamente...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Tentar inicializar o browser
      const browser = await puppeteer.launch(browserOptions);
      console.log('Navegador iniciado com sucesso!');
      
      return browser;
    } catch (error) {
      attempts++;
      console.error(`Erro ao iniciar navegador (tentativa ${attempts}/${maxAttempts}): ${error.message}`);
      
      // Na última tentativa, se ainda não houver executablePath, tenta sem especificar
      if (attempts === maxAttempts - 1 && browserOptions.executablePath) {
        console.log('Tentando iniciar sem especificar o caminho do executável...');
        delete browserOptions.executablePath;
      }
      
      // Se todas as tentativas falharem, propaga o erro
      if (attempts >= maxAttempts) {
        throw new Error(`Falha ao iniciar o navegador após ${maxAttempts} tentativas: ${error.message}`);
      }
    }
  }
}

/**
 * Normaliza nome do jogo para comparação
 * @param {string} name Nome do jogo
 * @returns {string} Nome normalizado
 */
function normalizeGameName(name) {
  return name.toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove pontuação
            .replace(/\s+/g, '-')    // Substitui espaços por hífens
            .trim();
}

/**
 * Sanitiza o nome do jogo para uso em nomes de arquivo
 * @param {string} name Nome original
 * @returns {string} Nome sanitizado
 */
function sanitizeFileName(name) {
  return name.replace(/[/\\?%*:|"<>]/g, '-'); // Remove caracteres inválidos
}

/**
 * Busca informações do jogo na página do itch.io
 * @param {string} url URL da página do jogo
 * @returns {Promise<Object>} Informações do jogo
 */
async function scrapeItchGame(url) {
  let browser = null;
  
  try {
    console.log(`Acessando ${url} para obter informações do jogo...`);
    
    // Usar sistema aprimorado para iniciar o navegador
    browser = await launchBrowser({
      defaultViewport: { width: 1280, height: 800 }
    });
    
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br'
    });
    
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 45000 
    });

    // Aguardar possíveis imagens aparecerem
    await Promise.race([
      page.waitForSelector('.screenshot_list img', { timeout: 5000 }).catch(() => null),
      page.waitForSelector('.game_cover img', { timeout: 5000 }).catch(() => null),
      page.waitForSelector('.game_header_image img', { timeout: 5000 }).catch(() => null),
      page.waitForSelector('.game_thumb_image img', { timeout: 5000 }).catch(() => null),
      page.waitForSelector('.thumb_link img', { timeout: 5000 }).catch(() => null),
      new Promise(resolve => setTimeout(resolve, 5000))
    ]);
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    const data = await page.evaluate(() => {
      const getValidUrl = (src) => {
        if (!src) return null;
        const cleanUrl = src.split('?')[0].trim();
        if (cleanUrl.startsWith('http')) return cleanUrl;
        if (cleanUrl.startsWith('//')) return 'https:' + cleanUrl;
        if (cleanUrl.startsWith('/')) return 'https://itch.io' + cleanUrl;
        return cleanUrl;
      };

      const title =
        document.querySelector('.game_title')?.textContent?.trim() ||
        document.querySelector('h1.title')?.textContent?.trim() ||
        document.querySelector('meta[property="og:title"]')?.content?.trim() ||
        document.title.replace(' by ', ' - ').split(' - ')[0]?.trim() || '';

      const description =
        document.querySelector('.formatted_description')?.textContent?.trim() ||
        document.querySelector('meta[property="og:description"]')?.content?.trim() ||
        document.querySelector('.game_text_description')?.textContent?.trim() || '';

      const developer =
        document.querySelector('.developer_name')?.textContent?.trim() ||
        document.querySelector('.user_column a')?.textContent?.trim() ||
        (document.title.includes(' by ') ? document.title.split(' by ')[1]?.split(' - ')[0]?.trim() : '');

      let allImages = [];

      // Imagem principal do Open Graph
      const metaImage = document.querySelector('meta[property="og:image"]')?.content;
      if (metaImage) {
        const imgSrc = getValidUrl(metaImage);
        if (imgSrc) allImages.push(imgSrc);
      }

      // Screenshots e thumbs
      const screenshotListImages = Array.from(document.querySelectorAll('.screenshot_list img, .thumb_list img'));
      screenshotListImages.forEach(img => {
        const imgSrc = getValidUrl(img.dataset.fullscreen || img.dataset.srcOrig || img.src);
        if (imgSrc && !allImages.includes(imgSrc)) allImages.push(imgSrc);
      });

      // Imagens de capa
      const coverImages = Array.from(document.querySelectorAll('.game_cover img, .game_header_image img, .thumb_link img'));
      coverImages.forEach(img => {
        const imgSrc = getValidUrl(img.dataset.srcOrig || img.src);
        if (imgSrc && !allImages.includes(imgSrc)) allImages.push(imgSrc);
      });

      // Fallback para outras imagens
      if (allImages.length === 0) {
        const extraImages = Array.from(document.querySelectorAll('.game_frame img, .screenshot img, .game_thumb_image img'));
        extraImages.forEach(img => {
          const imgSrc = getValidUrl(img.src);
          if (imgSrc && !allImages.includes(imgSrc)) allImages.push(imgSrc);
        });
      }

      // Último fallback para quaisquer imagens maiores que 100x100
      if (allImages.length === 0) {
        const allPageImages = Array.from(document.querySelectorAll('img'));
        allPageImages.forEach(img => {
          if (img.width > 100 && img.height > 100) {
            const imgSrc = getValidUrl(img.src);
            if (imgSrc && !allImages.includes(imgSrc) && !imgSrc.includes('avatar')) allImages.push(imgSrc);
          }
        });
      }

      // Tags do jogo
      const tags = Array.from(document.querySelectorAll('.game_tags .tag, .game_info_panel_widget .tags a'))
        .map(tag => tag.textContent.trim())
        .filter(tag => tag);

      return {
        title,
        description,
        developer,
        images: allImages,
        cardImage: allImages.length > 0 ? allImages[0] : null,
        tags: tags.map(tag => ({ name: tag }))
      };
    });

    await browser.close();
    console.log(`Informações do jogo obtidas: ${data.title}`);
    return data;
  } catch (error) {
    console.error("Erro no scraping:", error.message);
    
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error("Erro ao fechar navegador:", closeError.message);
      }
    }
    
    return { 
      title: '',
      description: '',
      developer: '',
      images: [],
      cardImage: null,
      tags: [],
      error: `Erro ao obter informações do jogo: ${error.message}` 
    };
  }
}

/**
 * Verifica se o jogo já está instalado
 * @param {string} gameTitle Título do jogo
 * @param {string} baseDir Diretório base para verificação
 * @returns {Object} Status de instalação e caminho do executável
 */
function isGameInstalled(gameTitle, baseDir) {
  const gamesDir = baseDir || path.join(process.cwd(), 'lib');

  console.log("Verificando se o jogo está instalado em: " + gamesDir);
  if (!fs.existsSync(gamesDir)) {
    return { installed: false, executablePath: null };
  }

  try {
    const folders = fs.readdirSync(gamesDir, { withFileTypes: true })
                      .filter(dirent => dirent.isDirectory())
                      .map(dirent => dirent.name);
    
    // Normalizar o título do jogo para comparação
    const normalizedGameTitle = normalizeGameName(gameTitle);
    const gameTitleNoSpaces = normalizedGameTitle.replace(/\s+/g, '');
    const gameTitleNoHyphens = normalizedGameTitle.replace(/-+/g, '');
    
    for (const folder of folders) {
      const normalizedFolder = normalizeGameName(folder);
      const folderNoSpaces = normalizedFolder.replace(/\s+/g, '');
      const folderNoHyphens = normalizedFolder.replace(/-+/g, '');
      
      if (
        normalizedFolder.includes(normalizedGameTitle) || 
        normalizedGameTitle.includes(normalizedFolder) || 
        folderNoSpaces.includes(gameTitleNoSpaces) || 
        gameTitleNoSpaces.includes(folderNoSpaces) || 
        folderNoHyphens.includes(gameTitleNoHyphens)
      ) {
        const folderPath = path.join(gamesDir, folder);
        console.log("Pasta de jogo encontrada: " + folderPath);
        const executablePath = findExecutableInFolder(folderPath);

        if (executablePath) {
          return { installed: true, executablePath, gamePath: folderPath };
        }
      }
    }
  } catch (err) {
    console.error("Erro ao verificar instalação:", err);
  }

  return { installed: false, executablePath: null };
}

/**
 * Encontra arquivos executáveis em uma pasta recursivamente
 * @param {string} dir Diretório para busca
 * @param {boolean} recursive Se deve buscar em subpastas
 * @returns {string|null} Caminho do executável ou null
 */
function findExecutableInFolder(dir, recursive = true) {
  if (!fs.existsSync(dir)) {
    console.log(`Pasta não existe: ${dir}`);
    return null;
  }
  
  try {
    console.log(`Procurando executáveis em: ${dir}`);
    const files = fs.readdirSync(dir);
    
    // Primeiro procurar arquivos .exe na raiz
    const exeFile = files.find(f => f.toLowerCase().endsWith('.exe'));
    if (exeFile) {
      const exePath = path.join(dir, exeFile);
      console.log(`Executável .exe encontrado: ${exePath}`);
      return exePath;
    }
    
    // Se não encontrou .exe, procurar por arquivos .html
    const htmlFile = files.find(f => 
      f.toLowerCase() === 'index.html' || 
      f.toLowerCase().endsWith('.html')
    );
    if (htmlFile) {
      const htmlPath = path.join(dir, htmlFile);
      console.log(`Arquivo HTML encontrado para execução na aplicação desktop: ${htmlPath}`);
      return htmlPath;
    }
    
    // Se não encontrou nada na raiz e recursive=true, procurar em subpastas
    if (recursive) {
      for (const file of files) {
        const filePath = path.join(dir, file);
        
        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
          console.log(`Verificando subpasta: ${filePath}`);
          const result = findExecutableInFolder(filePath, true);
          if (result) return result;
        }
      }
    }
    
    console.log(`Nenhum executável encontrado em: ${dir}`);
    return null;
  } catch (err) {
    console.error(`Erro ao procurar executáveis em ${dir}:`, err);
    return null;
  }
}

/**
 * Salva informações do jogo em um arquivo JSON
 * @param {Object} gameInfo Informações do jogo
 * @param {string} gamePath Caminho da pasta do jogo
 */
function saveGameInfo(gameInfo, gamePath) {
  try {
    const infoPath = path.join(gamePath, 'game-info.json');
    fs.writeFileSync(infoPath, JSON.stringify(gameInfo, null, 2));
    console.log(`Informações do jogo salvas em: ${infoPath}`);
  } catch (error) {
    console.error(`Erro ao salvar informações do jogo: ${error.message}`);
  }
}

/**
 * Baixa as imagens do jogo
 * @param {Array<string>} images URLs das imagens
 * @param {string} gamePath Caminho da pasta do jogo
 * @returns {Promise<boolean>} Status do download
 */
async function downloadGameImages(images, gamePath) {
  if (!images || images.length === 0) return false;
  
  const imagesDir = path.join(gamePath, 'images');
  
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  
  let browser = null;
  
  try {
    // Usar o sistema aprimorado para iniciar o navegador
    browser = await launchBrowser();
    const page = await browser.newPage();
    
    console.log(`Baixando ${images.length} imagens do jogo...`);
    
    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i];
      try {
        const viewSource = await page.goto(imageUrl);
        const buffer = await viewSource.buffer();
        
        const imagePath = path.join(imagesDir, `screenshot-${i+1}.jpg`);
        fs.writeFileSync(imagePath, buffer);
        console.log(`Imagem ${i+1} baixada: ${path.basename(imagePath)}`);
      } catch (imageError) {
        console.error(`Erro ao baixar imagem ${i+1}: ${imageError.message}`);
      }
    }
    
    await browser.close();
    return true;
  } catch (error) {
    console.error("Erro ao baixar imagens:", error);
    
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error("Erro ao fechar navegador:", closeError.message);
      }
    }
    
    return false;
  }
}

/**
 * Move arquivos de uma pasta para outra
 * @param {string} sourcePath Caminho de origem
 * @param {string} targetPath Caminho de destino
 * @returns {boolean} Status da operação
 */
function moveFilesUp(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isDirectory()) {
    console.log(`Pasta de origem não existe: ${sourcePath}`);
    return false;
  }
  
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
  
  try {
    const items = fs.readdirSync(sourcePath);
    for (const item of items) {
      const sourceItemPath = path.join(sourcePath, item);
      const targetItemPath = path.join(targetPath, item);
      
      // Se o destino já existe, remover primeiro
      if (fs.existsSync(targetItemPath)) {
        if (fs.statSync(targetItemPath).isDirectory()) {
          fs.rmSync(targetItemPath, { recursive: true });
        } else {
          fs.unlinkSync(targetItemPath);
        }
      }
      
      // Move o arquivo/pasta
      fs.renameSync(sourceItemPath, targetItemPath);
      console.log(`Movido: ${path.basename(sourceItemPath)} -> ${path.basename(targetItemPath)}`);
    }
    
    // Remove a pasta de origem vazia
    fs.rmSync(sourcePath);
    console.log(`Pasta de origem removida: ${path.basename(sourcePath)}`);
    return true;
  } catch (error) {
    console.error(`Erro ao mover arquivos: ${error.message}`);
    return false;
  }
}

/**
 * Verifica se existem arquivos sendo baixados
 * @param {string} dirPath Caminho do diretório
 * @returns {boolean} True se houver downloads em andamento
 */
function checkOngoingDownloads(dirPath) {
  try {
    const files = fs.readdirSync(dirPath);
    return files.some(f => f.endsWith('.crdownload') || f.endsWith('.part'));
  } catch (err) {
    console.error('Erro ao verificar diretório:', err);
    return false;
  }
}

/**
 * Obtém os arquivos mais recentes em um diretório
 * @param {string} dirPath Caminho do diretório
 * @param {number} limit Limite de arquivos para retornar
 * @returns {Array} Lista de arquivos recentes
 */
function getRecentFiles(dirPath, limit = 3) {
  try {
    const files = fs.readdirSync(dirPath);
    
    // Filtrar arquivos temporários
    const validFiles = files.filter(file => 
      !file.endsWith('.crdownload') && 
      !file.endsWith('.part') && 
      !file.endsWith('.tmp')
    );
    
    // Ordenar por data de modificação
    const filesWithStats = validFiles.map(file => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      return { file, filePath, stats };
    });
    
    filesWithStats.sort((a, b) => b.stats.mtime - a.stats.mtime);
    
    // Retornar os X arquivos mais recentes
    return filesWithStats.slice(0, limit);
  } catch (err) {
    console.error('Erro ao listar arquivos recentes:', err);
    return [];
  }
}

/**
 * Extrai um arquivo ZIP
 * @param {string} zipPath Caminho do arquivo ZIP
 * @param {string} targetDir Pasta de destino
 * @returns {boolean} Status da extração
 */
function extractZipFile(zipPath, targetDir) {
  try {
    console.log(`Extraindo ZIP: ${path.basename(zipPath)} -> ${targetDir}`);
    // Criar pasta temporária para extração
    const tempExtractPath = path.join(targetDir, '_temp_extract');
    if (!fs.existsSync(tempExtractPath)) {
      fs.mkdirSync(tempExtractPath, { recursive: true });
    }

    // Extrair o ZIP
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(tempExtractPath, true);

    // Verificar o conteúdo extraído
    const extractedItems = fs.readdirSync(tempExtractPath);
    // Se houver apenas uma pasta no diretório extraído, movemos o conteúdo dessa pasta
    if (extractedItems.length === 1) {
      const singleItemPath = path.join(tempExtractPath, extractedItems[0]);
      if (fs.statSync(singleItemPath).isDirectory()) {
        // Move o conteúdo da pasta única para a pasta principal
        moveFilesUp(singleItemPath, targetDir);
      } else {
        // Se for apenas um arquivo, movê-lo para a pasta principal
        const targetPath = path.join(targetDir, extractedItems[0]);
        fs.renameSync(singleItemPath, targetPath);
      }
    } else {
      // Se houver múltiplos itens, movê-los diretamente para a pasta principal
      moveFilesUp(tempExtractPath, targetDir);
    }

    // Remover a pasta temporária se ainda existir
    if (fs.existsSync(tempExtractPath)) {
      fs.rmSync(tempExtractPath, { recursive: true });
    }

    // Deletar o arquivo ZIP após extração
    try {
      fs.unlinkSync(zipPath);
      console.log(`Arquivo ZIP removido após extração: ${path.basename(zipPath)}`);
    } catch (deleteError) {
      console.error(`Erro ao deletar arquivo ZIP: ${deleteError.message}`);
    }

    return true;
  } catch (error) {
    console.error(`Erro na extração do ZIP: ${error.message}`);
    return false;
  }
}