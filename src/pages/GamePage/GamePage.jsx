import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchGameById } from '../../services/api.jsx'; // Import the API function
import './GamePage.css';
import defaultImage from '../../assets/Telahorizontal.svg';
import Loader from '../../components/Loader/Loader.jsx'; // Import your Loader component
import DownloadButton from '../../components/Download/DownloadButton.jsx';

export default function GamePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gameData, setGameData] = useState(null);
  
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const loadGameData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Fetch game by ID using the API service
        const game = await fetchGameById(id);
        
        // If game has URL but no images, scrape it
        if (game.url && (!game.images || game.images.length === 0)) {
          try {
            const scrapedData = await window.electronAPI.scrapeGame(game.url);
            
            if (!scrapedData.error) {
              // Merge scraped data with existing game data
              game.images = scrapedData.images || [];
              game.description = game.description || scrapedData.description;
              game.cardImage = game.cardImage || (scrapedData.images && scrapedData.images.length > 0 ? scrapedData.images[0] : null);
              game.tags = game.tags || scrapedData.tags || [];
            }
          } catch (scrapeError) {
            console.error('Error scraping game:', scrapeError);
          }
        }
        
        setGameData(game);
      } catch (err) {
        console.error('Error loading game:', err);
        setError('Não foi possível carregar os dados do jogo.');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      loadGameData();
    }
  }, [id]);


  const handleImageError = (e) => {
    e.target.src = defaultImage;
    e.target.style.maxWidth = '100%';
    e.target.style.height = 'auto';
    e.target.alt = 'Imagem não disponível';
  };

  const nextSlide = () => {
    if (gameData?.images?.length > 0) {
      setCurrentSlide((prev) => (prev === gameData.images.length - 1 ? 0 : prev + 1));
    }
  };

  const prevSlide = () => {
    if (gameData?.images?.length > 0) {
      setCurrentSlide((prev) => (prev === 0 ? gameData.images.length - 1 : prev - 1));
    }
  };

  const handleBackClick = () => {
    navigate(-1); // Navigate back to the previous page
  };

  const handleDownloadComplete = () => {
    console.log('Download completo');
  };

  // Extract game tags for categories
  const getGameTags = () => {
    if (!gameData || !gameData.tags) return [];
    
    // If tags is an array of objects with name property
    if (gameData.tags[0] && typeof gameData.tags[0] === 'object') {
      return gameData.tags.map(tag => tag.name);
    }
 
    return gameData.tags;
  };

  const getGameName = () => {
    if (!gameData || !gameData.name) return [];
    
    // If tags is an array of objects with name property
    if (gameData.name && typeof gameData.name === 'object') {
      return gameData.name
    }
 
    return gameData.name;
  };

  if (loading) {
    return (
      <div className="game-loading-container">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-error">
        <p>{error}</p>
        <button onClick={handleBackClick}>Voltar</button>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="game-error">
        <p>Jogo não encontrado.</p>
        <button onClick={handleBackClick}>Voltar</button>
      </div>
    );
  }

  const gameTags = getGameTags();
  const gameName = getGameName();

  return (
    <div className='game-infor'>
      <div>
        <button className="back-button" onClick={handleBackClick}>
          <ChevronLeft size={44} />
        </button>
      </div>

      {/* Categories / Tags */}
      <div className="categories">
        {gameTags.length > 0 ? (
          gameTags.map((tag, index) => (
            <button key={index} className="category-button">{tag}</button>
          ))
        ) : (
          <button className="category-button">Sem categoria</button>
        )}
      </div>

      {/* Main content */}
      <div className="content-wrapper">
        {/* Game preview */}
        <div className="game-preview">
          <div className="game-board">
            <div className="card-container">
              <div className="single-card">
                {gameData.images && gameData.images.length > 0 ? (
                  <img 
                    src={gameData.images[currentSlide]} 
                    alt={`${gameData.title || 'Jogo'} preview`}
                    onError={handleImageError}
                  />
                ) : (
                  <img 
                    src={defaultImage} 
                    alt="Default game preview"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Carousel controls - only show if there are multiple images */}
          {gameData.images && gameData.images.length > 1 && (
            <div className="carousel-container-gamePage">
              <button onClick={prevSlide} className="carousel-button">
                <ChevronLeft size={48} />
              </button>

              <div className="carousel-slides">
                {gameData.images.map((slide, index) => (
                  <div 
                    key={index} 
                    className={`carousel-slide ${currentSlide === index ? 'active' : 'inactive'}`}
                  >
                    <img 
                      src={slide} 
                      alt={`${gameData.title || 'Jogo'} preview`}
                      onError={handleImageError}
                    />
                  </div>
                ))}
              </div>

              <button onClick={nextSlide} className="carousel-button">
                <ChevronRight size={48} />
              </button>
            </div>
          )}
        </div>

        {/* Game description */}
        <div className="game-description">
          <h1 className="game-title">{gameName || 'Sem título'}</h1>
          <p className="description-text">
            {gameData.description || 'Nenhuma descrição disponível para este jogo.'}
          </p>
          <DownloadButton 
            url={gameData.url} 
            gameName={gameData.name}
            onDownloadComplete={handleDownloadComplete} 
        />
        </div>
      </div>

     <div>
        <h2>Jogos recomendados</h2>
     </div>

      </div>
  );
}