const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');

// Função para normalizar nomes de jogos para comparação
function normalizeGameName(name) {
  return name.toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove pontuação
            .replace(/\s+/g, '-')    // Substitui espaços por hífens
            .trim();
}

// Função para sanitizar o nome do jogo para uso em nomes de arquivo
function sanitizeFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_'); // Remove caracteres inválidos para nomes de arquivo
}

// Função para verificar se o jogo já está instalado
function isGameInstalled(gameTitle) {
  const gamesDir = path.join(os.homedir(), 'IUPI-mvp/lib');

  if (!fs.existsSync(gamesDir)) {
    return { installed: false, executablePath: null };
  }

  const folders = fs.readdirSync(gamesDir, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name);
  
  // Normalizar o título do jogo para comparação
  const normalizedGameTitle = normalizeGameName(gameTitle);
  const gameTitleNoSpaces = normalizedGameTitle.replace(/\s+/g, ''); // Sem espaços
  const gameTitleNoHyphens = normalizedGameTitle.replace(/-+/g, ''); // Sem traços
  const gameTitleNoSpacesOrHyphens = normalizedGameTitle.replace(/[\s-]+/g, ''); // Sem espaços e sem traços

  for (const folder of folders) {
    const normalizedFolder = normalizeGameName(folder);
    const folderNoSpaces = normalizedFolder.replace(/\s+/g, ''); // Sem espaços
    const folderNoHyphens = normalizedFolder.replace(/-+/g, ''); // Sem traços
    const folderNoSpacesOrHyphens = normalizedFolder.replace(/[\s-]+/g, ''); // Sem espaços e sem traços

    // Verifica de todas as formas possíveis:
    if (
      normalizedFolder.includes(normalizedGameTitle) || 
      normalizedGameTitle.includes(normalizedFolder) || 
      folderNoSpaces.includes(gameTitleNoSpaces) || 
      gameTitleNoSpaces.includes(folderNoSpaces) || 
      folderNoHyphens.includes(gameTitleNoHyphens) || 
      gameTitleNoHyphens.includes(folderNoHyphens) || 
      folderNoSpacesOrHyphens.includes(gameTitleNoSpacesOrHyphens) || 
      gameTitleNoSpacesOrHyphens.includes(folderNoSpacesOrHyphens)
    ) {
      const folderPath = path.join(gamesDir, folder);
      console.log("Caminho do arquivo verificado: " + folderPath);
      const executablePath = findExecutableInFolder(folderPath);

      if (executablePath) {
        return { installed: true, executablePath };
      }
    }
  }

  return { installed: false, executablePath: null };
}

// Função para encontrar executáveis em uma pasta recursivamente
function findExecutableInFolder(dir) {
  if (!fs.existsSync(dir)) return null;
  
  try {
    const files = fs.readdirSync(dir);
    
    // Primeiro procurar arquivos .exe na raiz
    const exeFile = files.find(f => f.toLowerCase().endsWith('.exe'));
    if (exeFile) {
      return path.join(dir, exeFile);
    }
    
    // Se não encontrar, procurar em subpastas
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        const result = findExecutableInFolder(filePath);
        if (result) return result;
      }
    }
  } catch (err) {
    console.error("Erro ao procurar executável:", err);
  }
  
  return null;
}

// Função para baixar informações do jogo do itch.io
async function scrapeItchGame(url) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const data = await page.evaluate(() => {
    const title = document.querySelector('.game_title')?.textContent?.trim() || 'unknown-game';
    const description = document.querySelector('.formatted_description')?.textContent?.trim() || '';
    const developer = document.querySelector('.developer_name')?.textContent?.trim() || '';
    const images = Array.from(document.querySelectorAll('.screenshot_list img')).map(img => img.src);
    const tags = Array.from(document.querySelectorAll('.game_tags .tag'))
      .map(tag => tag.textContent.trim())
      .filter(tag => tag);
      
    return { title, description, developer, images, tags };
  });

  await browser.close();
  return data;
}

// Função para salvar as informações do jogo em arquivo JSON
function saveGameInfo(gameInfo, gamePath) {
  const infoPath = path.join(gamePath, 'game-info.json');
  fs.writeFileSync(infoPath, JSON.stringify(gameInfo, null, 2));
  console.log(`Informações do jogo salvas em: ${infoPath}`);
}

// Função para baixar imagens do jogo
async function downloadGameImages(images, gamePath) {
  const imagesDir = path.join(gamePath, 'images');
  
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i];
      const viewSource = await page.goto(imageUrl);
      const buffer = await viewSource.buffer();
      
      const imagePath = path.join(imagesDir, `screenshot-${i+1}.jpg`);
      fs.writeFileSync(imagePath, buffer);
      console.log(`Imagem baixada: ${imagePath}`);
    }
    
    await browser.close();
    return true;
  } catch (error) {
    console.error("Erro ao baixar imagens:", error);
    return false;
  }
}

// Função principal para baixar jogos
async function downloadGameFromItch(url, customDownloadPath = null) {
  try {
    // Obter informações do jogo primeiro
    const gameInfo = await scrapeItchGame(url);
    const gameName = sanitizeFileName(gameInfo.title);
    
    // Verificar se o jogo já está instalado
    const gameStatus = isGameInstalled(gameName);
    if (gameStatus.installed) {
      console.log(`O jogo "${gameName}" já está instalado em: ${gameStatus.executablePath}`);
      return {
        success: true,
        installed: true,
        message: 'O jogo já está instalado!',
        executablePath: gameStatus.executablePath,
        gameInfo: gameInfo
      };
    }
    
    // Definir pasta de download
    const baseDownloadPath = path.join(os.homedir(), 'IUPI-mvp/lib');
    const downloadPath = path.join(baseDownloadPath, gameName);
    
    console.log(`Iniciando download de ${url} para ${downloadPath}`);
    
    // Criar a pasta se não existir
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
    }
    
    // Salvar informações do jogo
    saveGameInfo(gameInfo, downloadPath);
    
    // Baixar imagens do jogo
    await downloadGameImages(gameInfo.images, downloadPath);
    
    // Iniciar download do jogo
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: null
    });
    
    const page = await browser.newPage();
    
    // Definir onde os arquivos serão baixados
    const client = await page.createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath,
    });
    
    await page.goto(url, { waitUntil: 'networkidle2' });
    console.log(`Navegou para ${url}`);
    
    await page.waitForSelector('a.button.download_btn', { timeout: 6000 });
    await page.click('a.button.download_btn');
    
    // Esperar para o download iniciar
    console.log('Aguardando download...');
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    // Verificar se há arquivos sendo baixados
    const checkFiles = () => {
      try {
        const files = fs.readdirSync(downloadPath);
        return files.some(f => f.endsWith('.crdownload') || f.endsWith('.part'));
      } catch (err) {
        console.error('Erro ao verificar diretório:', err);
        return false;
      }
    };
    
    // Esperar até que não haja mais arquivos .crdownload ou .part
    let downloadComplete = !checkFiles();
    let checkCount = 0;
    const maxChecks = 60; // 10 minutos (60 checks de 10 segundos)
    
    while (!downloadComplete && checkCount < maxChecks) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Esperar 10 segundos
      downloadComplete = !checkFiles();
      checkCount++;
      console.log(`Verificando download... ${checkCount}/${maxChecks}`);
    }
    
    if (!downloadComplete) {
      console.warn('Tempo limite excedido, mas o download pode continuar em segundo plano');
    }
    
    await browser.close();
    
    // Obter os arquivos mais recentes no diretório
    const getRecentFiles = () => {
      try {
        const files = fs.readdirSync(downloadPath);
        
        // Filtrar arquivos temporários
        const validFiles = files.filter(file => 
          !file.endsWith('.crdownload') && 
          !file.endsWith('.part') && 
          !file.endsWith('.tmp')
        );
        
        // Ordenar por data de modificação
        const filesWithStats = validFiles.map(file => {
          const filePath = path.join(downloadPath, file);
          const stats = fs.statSync(filePath);
          return { file, filePath, stats };
        });
        
        filesWithStats.sort((a, b) => b.stats.mtime - a.stats.mtime);
        
        // Retornar os 3 arquivos mais recentes
        return filesWithStats.slice(0, 3).map(f => f);
      } catch (err) {
        console.error('Erro ao listar arquivos recentes:', err);
        return [];
      }
    };
    
    const recentFiles = getRecentFiles();
    
    // Verificar se há arquivos .zip para extrair
    for (const fileInfo of recentFiles) {
      if (fileInfo.filePath.toLowerCase().endsWith('.zip')) {
        console.log(`Arquivo ZIP encontrado: ${fileInfo.filePath}`);
        try {
          // Extrair o arquivo ZIP para a pasta do jogo
          const zip = new AdmZip(fileInfo.filePath);
          zip.extractAllTo(downloadPath, true);
          console.log(`Arquivo ZIP extraído para: ${downloadPath}`);
          
          // Deletar o arquivo ZIP após extração
          try {
            fs.unlinkSync(fileInfo.filePath);
            console.log(`Arquivo ZIP removido após extração: ${fileInfo.filePath}`);
          } catch (deleteError) {
            console.error(`Erro ao deletar arquivo ZIP: ${deleteError.message}`);
          }
        } catch (zipError) {
          console.error(`Erro ao extrair arquivo ZIP: ${zipError}`);
        }
      }
    }
    
    // Encontrar todos os executáveis na pasta do jogo
    const executableFiles = findExecutableInFolder(downloadPath);
    
    return {
      success: true,
      installed: true,
      message: 'Download concluído com sucesso!',
      path: downloadPath,
      files: recentFiles.map(f => f.filePath),
      executables: executableFiles ? [executableFiles] : [],
      gameInfo: gameInfo
    };
  } catch (error) {
    console.error('Erro no download:', error);
    
    return {
      success: false,
      installed: false,
      message: `Erro no download: ${error.message}`,
      error: error
    };
  }
}

// Função para executar um jogo
async function launchGame(executablePath) {
  try {
    const { exec } = require('child_process');
    console.log(`Iniciando jogo: ${executablePath}`);
    
    exec(`"${executablePath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Erro ao executar o jogo: ${error.message}`);
        return;
      }
      console.log(`Jogo iniciado com sucesso!`);
    });
    
    return true;
  } catch (error) {
    console.error('Erro ao iniciar o jogo:', error);
    return false;
  }
}

// Função para verificar se um jogo está instalado e retornar o botão adequado
async function checkGameStatus(gameUrl) {
  try {
    // Primeiro, obtemos as informações do jogo para saber seu título
    const gameInfo = await scrapeItchGame(gameUrl);
    const gameName = sanitizeFileName(gameInfo.title);
    
    // Verificar se o jogo já está instalado
    const gameStatus = isGameInstalled(gameName);
    
    return {
      gameInfo,
      installed: gameStatus.installed,
      executablePath: gameStatus.executablePath
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
  checkGameStatus 
};