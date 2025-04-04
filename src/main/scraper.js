const puppeteer = require('puppeteer');

async function scrapeItchGame(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const data = await page.evaluate(() => {
    const title = document.querySelector('.game_title')?.textContent?.trim() || '';
    const description = document.querySelector('.formatted_description')?.textContent?.trim() || '';
    const developer = document.querySelector('.developer_name')?.textContent?.trim() || '';
    const images = Array.from(document.querySelectorAll('.screenshot_list img')).map(img => img.src);
    return { title, description, developer, images };
  });

  await browser.close();
  return data;
}

module.exports = { scrapeItchGame };
