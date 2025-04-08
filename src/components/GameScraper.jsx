import React, { useState } from 'react';
import DownloadButton from '../components/DownloadButton.jsx'
import '../css/GameScraper.css';

const GameScraper = () => {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gameData, setGameData] = useState(null);

  const fetchGameInfo = async (url) => {
    try {
      setLoading(true);
      setError('');
      const data = await window.electronAPI.scrapeGame(url);
      
      if (data.error) throw new Error(data.error);


      setGameData({
        title: data.title,
        description: data.description,
        developer: data.developer,
        images: data.images.length > 0 ? data.images : ['/api/placeholder/400/300'],
        tags: data.tags || [],
        url
      });
    } catch (err) {
      console.error(err);
      setError('Falha ao buscar informações do jogo.');
      setGameData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (urlInput.trim()) {
      fetchGameInfo(urlInput.trim());
    }
  };

  return (
    <div className="scraper-container">
      <h1 className="scraper-title">Scraping</h1>

      <form onSubmit={handleSubmit} className="scraper-form">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Cole a URL do jogo no itch.io"
          className="scraper-input"
        />
        <button
          type="submit"
          disabled={loading || !urlInput.trim()}
          className="scraper-button"
        >
          Buscar
        </button>
      </form>

      {loading ? (
        <p className="scraper-loading">Carregando informações do jogo...</p>
      ) : error ? (
        <div className="scraper-error">{error}</div>
      ) : gameData ? (
        <div className="scraper-grid">
         
          <div className="scraper-carousel">
            {gameData.images.map((src, i) => (
              <div key={i} className="scraper-image-wrapper">
                <img
                  src={src}
                  alt={`Screenshot ${i + 1} de ${gameData.title}`}
                  className="scraper-image"
                />
              </div>
            ))}
          </div>

          {/* Info do jogo */}
          <div className="scraper-content">
            <div className="scraper-card">
              <h2 className="scraper-game-title">{gameData.title}</h2>
              
              {gameData.tags?.length > 0 && (
                <div className="scraper-tags">
                  {gameData.tags.map((tag, i) => (
                    <span key={i} className="scraper-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="scraper-section">
              <h3 className="scraper-section-title">Descrição</h3>
              <div className="scraper-card">
                <p>{gameData.description}</p>
              </div>
            </div>

            <div className="scraper-download-container">
              <DownloadButton
                gameUrl={gameData.url} 
                className="scraper-download-button"
              />
            </div>
          </div>
        </div>
      ) : (
        <p className="scraper-placeholder">Insira uma URL para buscar os dados.</p>
      )}
    </div>
  );
};

export default GameScraper;