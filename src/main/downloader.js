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
    
    await page.waitForSelector('a.button.download_btn', { timeout: 5000 });
    await page.click('a.button.download_btn');
    
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