import React, { useState } from 'react';
import GameScraper from './GameScraper.jsx';
// import GameDownloader from './GameDownloader.jsx';
import GameExecutor from './GameExecutor.jsx';

const GameManager = () => {
  const [scrapedData, setScrapedData] = useState(null);
  const [downloadedGame, setDownloadedGame] = useState(null);
  const [showExecutor, setShowExecutor] = useState(false); // novo estado

  const handleScrapingComplete = (data) => {
    console.log('[SCRAPER] Dados extraídos:', data);
    setScrapedData(data);
  };

  const handleDownloadComplete = (data) => {
    console.log('[DOWNLOADER] Jogo baixado:', data);
    setDownloadedGame(data);
  };

  const handleExecuteClick = () => {
    setShowExecutor(true);
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

      {/* Botão pra executar jogo manualmente */}
      <div className="text-center">
        <button
          onClick={handleExecuteClick}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
        >
          Executar jogo
        </button>
      </div>

      {showExecutor && (
        <GameExecutor filePath="/home/kaike/Downloads/TerrorDaCaatinga.exe" />
      )}
    </div>
  );
};

export default GameManager;
