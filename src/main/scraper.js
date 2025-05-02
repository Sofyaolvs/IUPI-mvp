const puppeteer = require('puppeteer');

async function scrapeItchGame(url) {
  console.log('Starting scraping for URL:', url);
  
  // Validate URL
  if (!url || typeof url !== 'string' || !url.includes('itch.io')) {
    console.error('Invalid itch.io URL:', url);
    return { error: 'URL inválida ou não pertence ao itch.io' };
  }
  
  let browser = null;
  
  try {
    // Launch browser with necessary configurations and better error handling
    browser = await puppeteer.launch({ 
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set viewport for better image loading
    await page.setViewport({ width: 1280, height: 800 });
    
    // Set user agent to appear more like a regular browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36');
    
    // Add additional headers to avoid being blocked
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br'
    });
    
    console.log('Navigating to URL:', url);
    
    // Navigate to the page with extended timeout and wait for content
    await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: 45000 // Extended timeout for slower connections
    });
    
    console.log('Page loaded, waiting for content...');
    
    // Wait for key elements with better error handling
    await Promise.race([
      page.waitForSelector('.screenshot_list img', { timeout: 5000 }).catch(() => null),
      page.waitForSelector('.game_cover img', { timeout: 5000 }).catch(() => null),
      page.waitForSelector('.game_header_image img', { timeout: 5000 }).catch(() => null),
      page.waitForSelector('.game_thumb_image img', { timeout: 5000 }).catch(() => null),
      page.waitForSelector('.thumb_link img', { timeout: 5000 }).catch(() => null),
      new Promise(resolve => setTimeout(resolve, 5000)) // Fallback timeout
    ]);
    
    // Additional wait to ensure all content is loaded
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Extracting game data...');
    
    // Extract game data with improved image handling
    const data = await page.evaluate(() => {
      const getValidUrl = (src) => {
        if (!src) return null;
        
        // Clean up the URL by removing query parameters and trailing spaces
        const cleanUrl = src.split('?')[0].trim();
        
        // Ensure it's an absolute URL
        if (cleanUrl.startsWith('http')) {
          return cleanUrl;
        } else if (cleanUrl.startsWith('//')) {
          return 'https:' + cleanUrl;
        } else if (cleanUrl.startsWith('/')) {
          return 'https://itch.io' + cleanUrl;
        }
        
        return cleanUrl;
      };
      
      // Extract game title with fallbacks
      const title = 
        document.querySelector('.game_title')?.textContent?.trim() || 
        document.querySelector('h1.title')?.textContent?.trim() ||
        document.querySelector('meta[property="og:title"]')?.content?.trim() ||
        document.title.replace(' by ', ' - ').split(' - ')[0]?.trim() ||
        '';
      
      // Extract description with fallbacks
      const description = 
        document.querySelector('.formatted_description')?.textContent?.trim() || 
        document.querySelector('meta[property="og:description"]')?.content?.trim() ||
        document.querySelector('.game_text_description')?.textContent?.trim() ||
        '';
      
      // Extract developer
      const developer = 
        document.querySelector('.developer_name')?.textContent?.trim() ||
        document.querySelector('.user_column a')?.textContent?.trim() ||
        document.title.includes(' by ') ? document.title.split(' by ')[1]?.split(' - ')[0]?.trim() : '';
      
      // Extract all images with improved handling
      let allImages = [];
      
      // Method 1: Meta tags (most reliable for the main image)
      const metaImage = document.querySelector('meta[property="og:image"]')?.content;
      if (metaImage) {
        const imgSrc = getValidUrl(metaImage);
        if (imgSrc) allImages.push(imgSrc);
      }
      
      // Method 2: Screenshot list (most common for game pages)
      const screenshotListImages = Array.from(document.querySelectorAll('.screenshot_list img, .thumb_list img'));
      if (screenshotListImages.length > 0) {
        screenshotListImages.forEach(img => {
          // Check for high-res versions first
          const imgSrc = getValidUrl(img.dataset.fullscreen || img.dataset.srcOrig || img.src);
          if (imgSrc && !allImages.includes(imgSrc)) allImages.push(imgSrc);
        });
      }
      
      // Method 3: Cover and header images
      const coverImages = Array.from(document.querySelectorAll('.game_cover img, .game_header_image img, .thumb_link img'));
      if (coverImages.length > 0) {
        coverImages.forEach(img => {
          const coverSrc = getValidUrl(img.dataset.srcOrig || img.src);
          if (coverSrc && !allImages.includes(coverSrc)) allImages.push(coverSrc);
        });
      }
      
      // Method 4: Any images in the page that seem related to the game
      if (allImages.length === 0) {
        const anyGameImages = Array.from(document.querySelectorAll('.game_frame img, .screenshot img, .game_thumb_image img'));
        anyGameImages.forEach(img => {
          const imgSrc = getValidUrl(img.src);
          if (imgSrc && !allImages.includes(imgSrc)) allImages.push(imgSrc);
        });
      }
      
      // Method 5: Last resort - look for any large images in the page
      if (allImages.length === 0) {
        const allPageImages = Array.from(document.querySelectorAll('img'));
        allPageImages.forEach(img => {
          // Filter for larger images that are more likely to be game-related
          if (img.width > 100 && img.height > 100) {
            const imgSrc = getValidUrl(img.src);
            if (imgSrc && !allImages.includes(imgSrc) && !imgSrc.includes('avatar')) allImages.push(imgSrc);
          }
        });
      }
      
      // Get game tags
      const tags = Array.from(document.querySelectorAll('.game_tags .tag, .game_info_panel_widget .tags a'))
        .map(tag => tag.textContent.trim())
        .filter(tag => tag);
      
      console.log(`Extracted: ${title}, ${allImages.length} images`);
      
      return {
        title,
        description,
        developer,
        images: allImages,
        cardImage: allImages.length > 0 ? allImages[0] : null,
        tags: tags.map(tag => ({ name: tag }))  // Format tags as objects with name property
      };
    });
    
    // Take a screenshot for debugging if in development
    if (process.env.NODE_ENV === 'development') {
      await page.screenshot({ path: 'debug-screenshot.png' });
      console.log('Debug screenshot saved');
    }
    
    // Log results
    console.log('Scraping completed:', {
      title: data.title,
      imagesCount: data.images?.length || 0,
      hasCardImage: !!data.cardImage,
      firstImage: data.images && data.images.length > 0 
        ? (data.images[0].substring(0, 50) + '...') 
        : 'none'
    });
    
    return data;
  } catch (error) {
    console.error('Error during scraping:', error);
    return { 
      error: `Erro ao fazer scraping: ${error.message}`,
      images: [],
      cardImage: null
    };
  } finally {
    // Ensure browser is closed to prevent memory leaks
    if (browser) {
      try {
        await browser.close();
        console.log('Browser closed successfully');
      } catch (err) {
        console.error('Error closing browser:', err);
      }
    }
  }
}

module.exports = { scrapeItchGame };