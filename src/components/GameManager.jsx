import React, { useState } from 'react';
import GameScraper from './GameScraper.jsx';
// import GameDownloader from './GameDownloader.jsx';
import GameExecutor from './GameExecutor.jsx';

const GameManager = () => {
  const [scrapedData, setScrapedData] = useState(null);
  const [downloadedGame, setDownloadedGame] = useState(null);

  const handleScrapingComplete = (data) => {
    console.log('[SCRAPER] Dados extraídos:', data);
    setScrapedData(data);
  };

  const handleDownloadComplete = (data) => {
    console.log('[DOWNLOADER] Jogo baixado:', data);
    setDownloadedGame(data);
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      {!scrapedData && (
        <GameScraper onScrapingComplete={handleScrapingComplete} />
      )}

      {scrapedData && !downloadedGame && (
        <>
          <div className="bg-gray-100 p-2 rounded shadow">
            <h3 className="font-semibold mb-2">Jogo encontrado:</h3>
            <p><strong>Título:</strong> {scrapedData.title}</p>
            <p><strong>URL do Download:</strong> {scrapedData.downloadUrl}</p>
          </div>

          {/* Mostra botão de download */}
          <GameDownloader 
            url={scrapedData.downloadUrl} 
            onDownloadComplete={handleDownloadComplete} 
          />
        </>
      )}

      {downloadedGame && (
        <GameExecutor filePath={downloadedGame.path} />
      )}
    </div>
  );
};

export default GameManager;
