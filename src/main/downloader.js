const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function downloadGameFromItch(url) {
  const downloadPath = path.join(os.homedir(), 'Downloads');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
    defaultViewport: null
  });

  const page = await browser.newPage();

  // Define onde os arquivos serão baixados
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath,
  });

  await page.goto(url, { waitUntil: 'networkidle2' });

  // Espera o botão de download estar disponível
  await page.waitForSelector('a.button.download_btn', { timeout: 10000 });

  // Clica no botão
  await page.click('a.button.download_btn');

  // Aguarda um tempo para o download começar (ajuste conforme necessário)
  await page.waitForTimeout(5000);

  await browser.close();

  return {
    message: 'Download iniciado com sucesso!',
    path: downloadPath,
  };
}

module.exports = { downloadGameFromItch };
