const puppeteer = require('puppeteer-core');
const os = require('os');
const fs = require('fs');

function getChromePath() {
  const platform = os.platform();

  if (platform === 'win32') {
    const chromePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ];
    for (const chromePath of chromePaths) {
      if (fs.existsSync(chromePath)) return chromePath;
    }
    throw new Error('Chrome não encontrado nos caminhos padrões do Windows');
  } else if (platform === 'linux') {
    const chromePaths = [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium'
    ];
    for (const chromePath of chromePaths) {
      if (fs.existsSync(chromePath)) return chromePath;
    }
    throw new Error('Chrome não encontrado em caminhos comuns do Linux');
  } else if (platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  } else {
    throw new Error(`Sistema operacional não suportado: ${platform}`);
  }
}

const executablePath = getChromePath();
console.log('Chrome localizado em:', executablePath);

async function scrapeItchGame(url) {
  console.log('Starting scraping for URL:', url);

  if (!url || typeof url !== 'string' || !url.includes('itch.io')) {
    console.error('Invalid itch.io URL:', url);
    return { error: 'URL inválida ou não pertence ao itch.io' };
  }

  let browser = null;

  try {
    browser = await puppeteer.launch({
      executablePath,
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
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-ipc-flooding-protection'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    );

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br'
    });

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 45000
    });

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
        document.title.replace(' by ', ' - ').split(' - ')[0]?.trim() ||
        'unknown-game';

      const description =
        document.querySelector('.formatted_description')?.textContent?.trim() ||
        document.querySelector('meta[property="og:description"]')?.content?.trim() ||
        document.querySelector('.game_text_description')?.textContent?.trim() ||
        '';

      const developer =
        document.querySelector('.developer_name')?.textContent?.trim() ||
        document.querySelector('.user_column a')?.textContent?.trim() ||
        (document.title.includes(' by ') ? document.title.split(' by ')[1]?.split(' - ')[0]?.trim() : '');

      let allImages = [];

      const metaImage = document.querySelector('meta[property="og:image"]')?.content;
      if (metaImage) {
        const imgSrc = getValidUrl(metaImage);
        if (imgSrc) allImages.push(imgSrc);
      }

      const screenshotListImages = Array.from(document.querySelectorAll('.screenshot_list img, .thumb_list img'));
      screenshotListImages.forEach(img => {
        const imgSrc = getValidUrl(img.dataset.fullscreen || img.dataset.srcOrig || img.src);
        if (imgSrc && !allImages.includes(imgSrc)) allImages.push(imgSrc);
      });

      const coverImages = Array.from(document.querySelectorAll('.game_cover img, .game_header_image img, .thumb_link img'));
      coverImages.forEach(img => {
        const coverSrc = getValidUrl(img.dataset.srcOrig || img.src);
        if (coverSrc && !allImages.includes(coverSrc)) allImages.push(coverSrc);
      });

      if (allImages.length === 0) {
        const anyGameImages = Array.from(document.querySelectorAll('.game_frame img, .screenshot img, .game_thumb_image img'));
        anyGameImages.forEach(img => {
          const imgSrc = getValidUrl(img.src);
          if (imgSrc && !allImages.includes(imgSrc)) allImages.push(imgSrc);
        });
      }

      if (allImages.length === 0) {
        const allPageImages = Array.from(document.querySelectorAll('img'));
        allPageImages.forEach(img => {
          if (img.width > 100 && img.height > 100) {
            const imgSrc = getValidUrl(img.src);
            if (imgSrc && !allImages.includes(imgSrc) && !imgSrc.includes('avatar')) allImages.push(imgSrc);
          }
        });
      }

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

    console.log('Scraping concluído:', {
      title: data.title,
      imagens: data.images.length,
      primeiraImagem: data.images[0]
    });

    return data;

  } catch (err) {
    console.error("Erro ao fazer scraping:", err);
    return {
      error: `Erro ao fazer scraping: ${err.message}`,
      title: '',
      description: '',
      developer: '',
      images: [],
      cardImage: null,
      tags: []
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log('Browser fechado com sucesso');
      } catch (err) {
        console.error('Erro ao fechar o browser:', err);
      }
    }
  }
}

module.exports = { scrapeItchGame };
