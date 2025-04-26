import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GameCard from '../../components/GameCard/GameCard.jsx';
import Loader from '../../components/Loader/Loader.jsx';
import { fetchGames } from '../../services/api.jsx';

// import '../../components/GameCard/GameCard.css';

function AvailableGames() {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Load all games
  useEffect(() => {
    const loadGames = async () => {
      setIsLoading(true);
      try {
        // Carregar todos os jogos
        const allGames = await fetchGames();
        setGames(allGames);
        setError('');
      } catch (err) {
        setError(`Erro ao carregar jogos: ${err.message}`);
        console.error("Erro completo:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadGames();
  }, []);
  
  // Voltar para a biblioteca
  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="available-games-page">
      <header className="page-header">
        <button className="back-button" onClick={handleGoBack}>
          <svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" viewBox="0 0 24 24">
            <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m15 6l-6 6l6 6"/>
          </svg>
        </button>
        <h1>Todos os Jogos Disponíveis</h1>
      </header>

      {isLoading ? (
        <Loader message="Carregando jogos" />
      ) : (
        <div className="games-grid">
          {games.length > 0 ? (
            games.map(game => (
              <GameCard
                key={game.id || `game-${game.name || game.title}`}
                image={game.image}
                cardImage={game.cardImage}
                title={game.title || game.name}
                subject={game.subject}
                tags={game.tags}
                id={game.id}
                isInstalled={false}
                executablePath={game.executablePath}
                path={game.path}
                description={game.description}
                url={game.url}
              />
            ))
          ) : (
            <div className="no-results-message">
              <p>Nenhum jogo disponível</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AvailableGames;