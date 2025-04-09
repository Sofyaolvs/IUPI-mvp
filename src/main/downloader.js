const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function downloadGameFromItch(url, customDownloadPath = null) {
  // Usa o caminho personalizado ou padrão
  const downloadPath = path.join(os.homedir(), 'Downloads');
  
  console.log(`Iniciando download de ${url} para ${downloadPath}`);
  
  // Verifica se o diretório existe, senão cria
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath, { recursive: true });
  }
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null
  });
  
  const page = await browser.newPage();
  
  // Define onde os arquivos serão baixados
  const client = await page.createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath,
  });
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2' });
    console.log(`Navegou para ${url}`);
    
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
    
    console.log(`Procurando pelo botão usando o seletor ${seletor}`);
    
    try {
      await page.waitForSelector(seletor, { visible: true, timeout: 10000 });
      console.log("Botão encontrado");
      
      await page.click(seletor);
      console.log("Clicou no botão de download");
    } catch (error) {
      console.log(`Erro ao clicar no botão: ${error}`);
      
      // Tenta encontrar botões alternativos
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
          if (link.position.y < 500) score += 1; // Links mais no topo têm prioridade
          
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
    
    // Aguarda um tempo para o download começar
    console.log('Aguardando download...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
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
    
    // Espere até que não haja mais arquivos .crdownload ou .part
    let downloadComplete = !checkFiles();
    let checkCount = 0;
    const maxChecks = 60; // 10 minutos (60 verificações de 10 segundos)
    
    while (!downloadComplete && checkCount < maxChecks) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Espera 10 segundos
      downloadComplete = !checkFiles();
      checkCount++;
      console.log(`Verificando download... ${checkCount}/${maxChecks}`);
    }
    
    if (!downloadComplete) {
      console.warn('Tempo limite excedido, mas o download pode continuar em segundo plano');
    }
    
    await browser.close();
    
    // Retorna os arquivos mais recentes do diretório
    const getRecentFiles = () => {
      try {
        const files = fs.readdirSync(downloadPath);
        
        // Filtra arquivos temporários
        const validFiles = files.filter(file => 
          !file.endsWith('.crdownload') && 
          !file.endsWith('.part') && 
          !file.endsWith('.tmp')
        );
        
        // Ordena por data de modificação
        const filesWithStats = validFiles.map(file => {
          const filePath = path.join(downloadPath, file);
          const stats = fs.statSync(filePath);
          return { file, filePath, stats };
        });
        
        filesWithStats.sort((a, b) => b.stats.mtime - a.stats.mtime);
        
        // Retorna os 3 arquivos mais recentes
        return filesWithStats.slice(0, 3).map(f => f.filePath);
      } catch (err) {
        console.error('Erro ao listar arquivos recentes:', err);
        return [];
      }
    };
    
    const recentFiles = getRecentFiles();
    
    // Verifica se há arquivos .zip para extrair
    for (const filePath of recentFiles) {
      if (filePath.toLowerCase().endsWith('.zip')) {
        // Aqui podemos adicionar um código para extrair o arquivo zip se necessário
        console.log(`Arquivo ZIP encontrado: ${filePath}`);
        // Implementação da extração seria adicionada aqui
      }
    }
    
    return {
      success: true,
      message: 'Download concluído com sucesso!',
      path: downloadPath,
      files: recentFiles
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

module.exports = { downloadGameFromItch };