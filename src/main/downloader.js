const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');  // Add this dependency for ZIP extraction

async function downloadGameFromItch(url, customDownloadPath = null) {
  // Get game info first to create a folder with the game name
  const gameInfo = await scrapeItchGame(url);
  const gameName = gameInfo.title.replace(/[/\\?%*:|"<>]/g, '-'); // Replace invalid characters
  
  // Use custom path or default path
  const baseDownloadPath = path.join(os.homedir(), 'Downloads/lib');
  // Create a subfolder with the game name
  const downloadPath = path.join(baseDownloadPath, gameName);
  
  console.log(`Iniciando download de ${url} para ${downloadPath}`);
  
  // Verify if directory exists, create if not
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath, { recursive: true });
  }
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null
  });
  
  const page = await browser.newPage();
  
  // Define where files will be downloaded
  const client = await page.createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath,
  });
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2' });
    console.log(`Navegou para ${url}`);
    
    // Selectors for different types of download buttons on Itch.io
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
    
    console.log(`Procurando pelo botão usando o seletor ${seletor}`);
    
    try {
      await page.waitForSelector(seletor, { visible: true, timeout: 10000 });
      console.log("Botão encontrado");
      
      await page.click(seletor);
      console.log("Clicou no botão de download");
    } catch (error) {
      console.log(`Erro ao clicar no botão: ${error}`);
      
      // Try to find alternative buttons
      const downloadLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links
          .filter(link => {
            const href = (link.href || '').toLowerCase();
            const text = (link.innerText || '').toLowerCase();
            return (href.includes('.exe') || 
                   href.includes('download') || 
                   href.includes('.zip') || 
                   text.includes('download') ||
                   text.includes('baixar')) &&
                   link.offsetWidth > 0 && 
                   link.offsetHeight > 0;
          })
          .map((link, index) => ({
            index,
            href: link.href,
            text: link.innerText,
            position: link.getBoundingClientRect()
          }));
      });
      
      console.log("Possíveis links encontrados: ", downloadLinks);
      
      if (downloadLinks.length > 0) {
        let bestLinkIndex = 0;
        let bestScore = 0;

        downloadLinks.forEach((link, index) => {
          let score = 0;
          const href = link.href.toLowerCase();
          const text = link.text.toLowerCase();

          if (href.includes('.exe')) score += 5;
          if (href.includes('.zip')) score += 4;
          if (text.includes('download now')) score += 3;
          if (text.includes('download')) score += 2;
          if (text.includes('baixar')) score += 2;
          if (link.position.y < 500) score += 1; // Links more to the top have priority
          
          if (score > bestScore) {
            bestScore = score;
            bestLinkIndex = index;
          }
        });

        const bestLink = downloadLinks[bestLinkIndex];

        try {
          await page.click(`a[href="${bestLink.href}"]`);
          console.log("Clicou no botão de download alternativo");
        } catch (clickError) {
          await page.evaluate((href) => {
            const links = Array.from(document.querySelectorAll('a'));
            const targetLink = links.find(link => link.href === href);
            if (targetLink) targetLink.click();
          }, bestLink.href);
        }
      } else {
        throw new Error('Não foi possível encontrar o botão de download');
      }
    }
    
    // Wait for download to start
    console.log('Aguardando download...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if there are files being downloaded
    const checkFiles = () => {
      try {
        const files = fs.readdirSync(downloadPath);
        return files.some(f => f.endsWith('.crdownload') || f.endsWith('.part'));
      } catch (err) {
        console.error('Erro ao verificar diretório:', err);
        return false;
      }
    };
    
    // Wait until there are no more .crdownload or .part files
    let downloadComplete = !checkFiles();
    let checkCount = 0;
    const maxChecks = 60; // 10 minutes (60 checks of 10 seconds)
    
    while (!downloadComplete && checkCount < maxChecks) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      downloadComplete = !checkFiles();
      checkCount++;
      console.log(`Verificando download... ${checkCount}/${maxChecks}`);
    }
    
    if (!downloadComplete) {
      console.warn('Tempo limite excedido, mas o download pode continuar em segundo plano');
    }
    
    await browser.close();
    
    // Get the most recent files in the directory
    const getRecentFiles = () => {
      try {
        const files = fs.readdirSync(downloadPath);
        
        // Filter temporary files
        const validFiles = files.filter(file => 
          !file.endsWith('.crdownload') && 
          !file.endsWith('.part') && 
          !file.endsWith('.tmp')
        );
        
        // Sort by modification date
        const filesWithStats = validFiles.map(file => {
          const filePath = path.join(downloadPath, file);
          const stats = fs.statSync(filePath);
          return { file, filePath, stats };
        });
        
        filesWithStats.sort((a, b) => b.stats.mtime - a.stats.mtime);
        
        // Return the 3 most recent files
        return filesWithStats.slice(0, 3).map(f => f);
      } catch (err) {
        console.error('Erro ao listar arquivos recentes:', err);
        return [];
      }
    };
    
    const recentFiles = getRecentFiles();
    
    // Check if there are .zip files to extract
    for (const fileInfo of recentFiles) {
      if (fileInfo.filePath.toLowerCase().endsWith('.zip')) {
        console.log(`Arquivo ZIP encontrado: ${fileInfo.filePath}`);
        try {
          // Extract the ZIP file to the game folder
          const zip = new AdmZip(fileInfo.filePath);
          zip.extractAllTo(downloadPath, true);
          console.log(`Arquivo ZIP extraído para: ${downloadPath}`);
          
          // Find executable after extraction
          const extractedFiles = fs.readdirSync(downloadPath);
          const exeFiles = extractedFiles.filter(file => file.toLowerCase().endsWith('.exe'));
          
          // Deletar o arquivo ZIP após extração
          try {
            fs.unlinkSync(fileInfo.filePath);
            console.log(`Arquivo ZIP removido após extração: ${fileInfo.filePath}`);
          } catch (deleteError) {
            console.error(`Erro ao deletar arquivo ZIP: ${deleteError.message}`);
          }
          if (exeFiles.length > 0) {
            console.log(`Arquivos executáveis encontrados: ${exeFiles.join(', ')}`);
          }
        } catch (zipError) {
          console.error(`Erro ao extrair arquivo ZIP: ${zipError}`);
        }
      }
    }
    
    // Find all executables in the game folder
    const findExecutables = (dir) => {
      const results = [];
      const list = fs.readdirSync(dir);
      
      list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat && stat.isDirectory()) {
          // Recursively search subdirectories
          results.push(...findExecutables(filePath));
        } else if (file.toLowerCase().endsWith('.exe')) {
          results.push(filePath);
        }
      });
      
      return results;
    };
    
    const executableFiles = findExecutables(downloadPath);
    
    return {
      success: true,
      message: 'Download concluído com sucesso!',
      path: downloadPath,
      files: recentFiles.map(f => f.filePath),
      executables: executableFiles,
      gameInfo: gameInfo
    };
  } catch (error) {
    console.error('Erro no download:', error);
    await browser.close();
    
    return {
      success: false,
      message: `Erro no download: ${error.message}`,
      error: error
    };
  }
}

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

// Example usage
// downloadGameFromItch('https://example-game.itch.io/game-name')
//   .then(result => console.log(result))
//   .catch(error => console.error(error));

module.exports = { downloadGameFromItch, scrapeItchGame };