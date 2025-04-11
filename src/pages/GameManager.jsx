import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GameScraper from '../components/GameScraper.jsx';
import GameExecutor from '../components/GameExecutor.jsx';
import DownloadButton from '../components/DownloadButton.jsx';

const GameManager = () => {
  const navigate = useNavigate();
  const [scrapedData, setScrapedData] = useState(null);
  const [downloadedGame, setDownloadedGame] = useState(null);

  const goToLibrary = () => {
    navigate('/');
  };

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
      <div style={{ marginBottom: '15px' }}>
        <button 
          onClick={goToLibrary}
          style={{ padding: '8px 16px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Voltar para Biblioteca
        </button>
      </div>
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
          <DownloadButton 
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
