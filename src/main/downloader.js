const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');
const { exec } = require('child_process');

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
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  console.log(`Acessando ${url} para obter informações do jogo...`);
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
  console.log(`Informações do jogo obtidas: ${data.title}`);
  return data;
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
 * @returns {string|null} Caminho do executável ou null
 */
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

/**
 * Salva informações do jogo em um arquivo JSON
 * @param {Object} gameInfo Informações do jogo
 * @param {string} gamePath Caminho da pasta do jogo
 */
function saveGameInfo(gameInfo, gamePath) {
  const infoPath = path.join(gamePath, 'game-info.json');
  fs.writeFileSync(infoPath, JSON.stringify(gameInfo, null, 2));
  console.log(`Informações do jogo salvas em: ${infoPath}`);
}

/**
 * Baixa as imagens do jogo
 * @param {Array<string>} images URLs das imagens
 * @param {string} gamePath Caminho da pasta do jogo
 * @returns {Promise<boolean>} Status do download
 */
async function downloadGameImages(images, gamePath) {
  const imagesDir = path.join(gamePath, 'images');
  
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  
  try {
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    console.log(`Baixando ${images.length} imagens do jogo...`);
    
    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i];
      const viewSource = await page.goto(imageUrl);
      const buffer = await viewSource.buffer();
      
      const imagePath = path.join(imagesDir, `screenshot-${i+1}.jpg`);
      fs.writeFileSync(imagePath, buffer);
      console.log(`Imagem ${i+1} baixada: ${path.basename(imagePath)}`);
    }
    
    await browser.close();
    return true;
  } catch (error) {
    console.error("Erro ao baixar imagens:", error);
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
          fs.rmdirSync(targetItemPath, { recursive: true });
        } else {
          fs.unlinkSync(targetItemPath);
        }
      }
      
      // Move o arquivo/pasta
      fs.renameSync(sourceItemPath, targetItemPath);
      console.log(`Movido: ${path.basename(sourceItemPath)} -> ${path.basename(targetItemPath)}`);
    }
    
    // Remove a pasta de origem vazia
    fs.rmdirSync(sourcePath);
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
      fs.rmdirSync(tempExtractPath, { recursive: true });
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
}

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
    deleteZipAfterExtract = true
  } = options;
  
  try {
    // Obter informações do jogo primeiro
    console.log(`Iniciando processo de download para ${url}`);
    const gameInfo = await scrapeItchGame(url);
    const gameName = sanitizeFileName(gameInfo.title);
    
    // Definir pasta de download
    const baseDownloadPath = customDownloadPath || path.join(process.cwd(), 'lib');
    const downloadPath = path.join(baseDownloadPath, gameName);
    
    console.log(`Pasta de destino: ${downloadPath}`);
    
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
    
    // Criar a pasta se não existir
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
    }
    
    // Salvar informações do jogo
    saveGameInfo(gameInfo, downloadPath);
    
    // Baixar imagens do jogo se necessário
    if (saveImages && gameInfo.images && gameInfo.images.length > 0) {
      await downloadGameImages(gameInfo.images, downloadPath);
    }
    
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
    
    // Navegar para a página do jogo
    console.log(`Navegando para ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Seletores para diferentes tipos de botões de download no Itch.io
    const seletor = 
      'a.button.download_btn, ' +
      'a[href*=".exe"], ' + 
      'a[download], ' +
      '.download-button, ' + 
      '#download-button, ' +
      'a.btn-download, ' +
      'button.download, ' +
      'a[href*=".zip"], ' +
      'a[href*=".msi"], ' +
      'a[href*="download"]';
    
    console.log(`Procurando pelo botão de download`);
    
    try {
      // Tentativa 1: Seletor direto
      await page.waitForSelector(seletor, { visible: true, timeout: 10000 });
      console.log("Botão encontrado via seletor direto");
      await page.click(seletor);
      console.log("Clicou no botão de download");
    } catch (error) {
      console.log(`Botão direto não encontrado. Buscando alternativas...`);
      
      // Tentativa 2: Análise avançada de botões
      const downloadLinks = await findDownloadButtons(page);
      console.log(`Encontrados ${downloadLinks.length} possíveis botões de download`);
      
      if (downloadLinks.length > 0) {
        // Pontuar cada link para encontrar o melhor
        let bestLinkIndex = 0;
        let bestScore = 0;

        downloadLinks.forEach((link, index) => {
          let score = 0;
          const href = (link.href || '').toLowerCase();
          const text = (link.text || '').toLowerCase();
          const classes = (link.classes || '').toLowerCase();

          // Pontuações para diferentes características
          if (href.includes('.exe')) score += 5;
          if (href.includes('.zip')) score += 4;
          if (classes.includes('download_btn')) score += 5;
          if (text.includes('download now')) score += 3;
          if (text.includes('download')) score += 2;
          if (text.includes('baixar')) score += 2;
          if (link.position.y < 500) score += 1; // Links mais no topo têm prioridade
          
          console.log(`Link ${index}: "${text}" (score: ${score})`);
          
          if (score > bestScore) {
            bestScore = score;
            bestLinkIndex = index;
          }
        });

        const bestLink = downloadLinks[bestLinkIndex];
        console.log(`Melhor link encontrado: "${bestLink.text}" (score: ${bestScore})`);

        try {
          if (bestLink.isButton) {
            await page.evaluate((index) => {
              const buttons = Array.from(document.querySelectorAll('button'));
              const targetButton = buttons.find((_, i) => i === index);
              if (targetButton) targetButton.click();
            }, bestLink.index);
          } else if (bestLink.href) {
            await page.evaluate((href) => {
              const links = Array.from(document.querySelectorAll('a'));
              const targetLink = links.find(link => link.href === href);
              if (targetLink) targetLink.click();
            }, bestLink.href);
          }
          console.log("Clicou no botão de download alternativo");
        } catch (clickError) {
          console.error(`Erro ao clicar no link: ${clickError.message}`);
          throw new Error('Falha ao clicar no botão de download');
        }
      } else {
        throw new Error('Não foi possível encontrar o botão de download');
      }
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
    
    // Obter os arquivos mais recentes no diretório
    const recentFiles = getRecentFiles(downloadPath);
    
    // Verificar se há arquivos .zip para extrair
    if (extractZips) {
      for (const fileInfo of recentFiles) {
        if (fileInfo.filePath.toLowerCase().endsWith('.zip')) {
          await extractZipFile(fileInfo.filePath, downloadPath);
        }
      }
    }
    
    // Encontrar executável na pasta do jogo
    const executablePath = findExecutableInFolder(downloadPath);
    
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
    
    return {
      success: false,
      installed: false,
      message: `Erro no download: ${error.message}`,
      error: error
    };
  }
}

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
  sanitizeFileName
};