import React, { useState } from 'react';
import '../css/GameScraper.css';
const GameScraper = () => {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gameData, setGameData] = useState(null);
  
  // Usando uma URL externa para imagem placeholder
  const DEFAULT_IMAGE = 'https://github.com/Sofyaolvs/IUPI-mvp/blob/zip_delete/src/assets/Telahorizontal.svg';

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
        images: data.images.length > 0 ? data.images : [DEFAULT_IMAGE],
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

  const handleImageError = (e) => {
    e.target.src = DEFAULT_IMAGE;
    e.target.style.maxWidth = '100%';
    e.target.style.height = 'auto';
    e.target.alt = 'Imagem não disponível';
  };

  // Componente para renderizar imagens com fallback
  const ImageWithFallback = ({ src, alt, index }) => {
    return (
      <div className="scraper-image-wrapper">
        <img
          src={src}
          alt={alt}
          className="scraper-image"
          onError={handleImageError}
        />
      </div>
    );
  };

  // Botão de download separado como componente interno
  const DownloadButton = ({ gameUrl }) => {
    const handleDownload = async () => {
      try {
        await window.electronAPI.downloadGame(gameUrl);
      } catch (err) {
        console.error('Erro ao baixar jogo:', err);
        alert('Não foi possível baixar o jogo. Tente novamente mais tarde.');
      }
    };

    return (
      <button onClick={handleDownload} className="scraper-download-button">
        Baixar Jogo
      </button>
    );
  };

  return (
    <div className="scraper-container">
      <h1 className="scraper-title">IUPI</h1>
      
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
          {/* Carrossel de imagens */}
          <div className="scraper-carousel">
            {gameData.images.map((src, i) => (
              <ImageWithFallback
                key={i}
                src={src}
                alt={`Screenshot ${i + 1} de ${gameData.title}`}
                index={i}
              />
            ))}
          </div>
          
          {/* Info do jogo */}
          <div className="scraper-content">
            <div className="scraper-card">
              <h2 className="scraper-game-title">{gameData.title}</h2>
              
              {gameData.developer && (
                <p className="scraper-developer">
                  <strong>Desenvolvedor:</strong> {gameData.developer}
                </p>
              )}
              
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