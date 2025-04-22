const puppeteer = require('puppeteer');

async function scrapeItchGame(url) {
  console.log('Starting scraping for URL:', url);
  
  // Validate URL
  if (!url || typeof url !== 'string' || !url.includes('itch.io')) {
    console.error('Invalid itch.io URL:', url);
    return { error: 'URL inválida ou não pertence ao itch.io' };
  }
  
  try {
    // Launch browser with necessary configurations
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();
    
    // Set viewport for better image loading
    await page.setViewport({ width: 1280, height: 800 });
    
    // Set user agent to appear more like a regular browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36');
    
    console.log('Navigating to URL:', url);
    
    // Navigate to the page and wait for content to load
    await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    console.log('Page loaded, waiting for content...');
    
    // Wait specifically for key elements
    await Promise.race([
      page.waitForSelector('.screenshot_list img', { timeout: 5000 }).catch(() => null),
      page.waitForSelector('.game_cover img', { timeout: 5000 }).catch(() => null),
      page.waitForSelector('.game_header_image img', { timeout: 5000 }).catch(() => null)
    ]);
    
    // Extra wait to ensure images are loaded
    await page.waitForTimeout(2000);
    
    console.log('Extracting game data...');
    
    // Extract game data including images
    const data = await page.evaluate(() => {
      const getValidUrl = (src) => {
        if (!src) return null;
        // Ensure it's an absolute URL
        return src.startsWith('http') ? src : src;
      };
      
      // Extract game title
      const title = document.querySelector('.game_title')?.textContent?.trim() || '';
      
      // Extract description
      const description = document.querySelector('.formatted_description')?.textContent?.trim() || '';
      
      // Extract developer
      const developer = document.querySelector('.developer_name')?.textContent?.trim() || '';
      
      // Extract all images with proper handling
      let allImages = [];
      
      // Method 1: Screenshot list
      const screenshotListImages = Array.from(document.querySelectorAll('.screenshot_list img'));
      if (screenshotListImages.length > 0) {
        screenshotListImages.forEach(img => {
          // Check for high-res versions first
          const imgSrc = getValidUrl(img.dataset.fullscreen || img.dataset.srcOrig || img.src);
          if (imgSrc) allImages.push(imgSrc);
        });
      }
      
      // Method 2: Cover image
      const coverImg = document.querySelector('.game_cover img, .game_header_image img');
      if (coverImg) {
        const coverSrc = getValidUrl(coverImg.dataset.srcOrig || coverImg.src);
        if (coverSrc && !allImages.includes(coverSrc)) {
          allImages.push(coverSrc);
        }
      }
      
      // Method 3: Try to find any image related to the game
      if (allImages.length === 0) {
        const anyGameImage = document.querySelector('.game_frame img, .screenshot img, .game_thumb_image img');
        if (anyGameImage) {
          const imgSrc = getValidUrl(anyGameImage.src);
          if (imgSrc) allImages.push(imgSrc);
        }
      }
      
      // Get game tags
      const tags = Array.from(document.querySelectorAll('.game_tags .tag'))
        .map(tag => tag.textContent.trim())
        .filter(tag => tag);
      
      console.log(`Extracted: ${title}, ${allImages.length} images`);
      
      return {
        title,
        description,
        developer,
        images: allImages,
        cardImage: allImages.length > 0 ? allImages[0] : null,
        tags
      };
    });
    
    // Take a screenshot of the page for debugging
    if (process.env.NODE_ENV === 'development') {
      await page.screenshot({ path: 'debug-screenshot.png' });
      console.log('Debug screenshot saved');
    }
    
    await browser.close();
    
    // Log results
    console.log('Scraping completed:', {
      title: data.title,
      imagesCount: data.images?.length || 0,
      hasCardImage: !!data.cardImage
    });
    
    return data;
    
  } catch (error) {
    console.error('Error during scraping:', error);
    return { 
      error: `Erro ao fazer scraping: ${error.message}`,
      images: [],
      cardImage: null
    };
  }
}

module.exports = { scrapeItchGame };