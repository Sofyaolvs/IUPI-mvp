import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GameCard from '../../components/GameCard/GameCard.jsx';
import Loader from '../../components/Loader/Loader.jsx';

import './InstalledGames.css';

function InstalledGames() {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Load installed games
  useEffect(() => {
    const loadInstalledGames = async () => {
      setIsLoading(true);
      try {
        // Carregar jogos instalados diretamente da API do Electron
        const installedGamesData = await window.electronAPI.checkInstalledGames();
        setGames(installedGamesData);
        setError('');
      } catch (err) {
        setError(`Erro ao carregar jogos: ${err.message}`);
        console.error("Erro completo:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInstalledGames();
  }, []);
  
  // Voltar para a biblioteca
  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="installed-games-page">
      <header className="page-header">
        <button className="back-button" onClick={handleGoBack}>
          <svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" viewBox="0 0 24 24">
            <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m15 6l-6 6l6 6"/>
          </svg>
          
        </button>
        <h1 className='games-h1'>Jogos Instalados</h1>
      </header>

      {error && <p className="error-message">{error}</p>}

      {isLoading ? (
        <Loader message="Carregando jogos" />
      ) : (
        <div className="games-grid">
          {games.length > 0 ? (
            games.map(game => (
              <GameCard
                key={game.id || `installed-${game.name || game.title}`}
                image={game.image}
                cardImage={game.cardImage}
                title={game.title || game.name}
                subject={game.subject}
                tags={game.tags}
                id={game.id}
                isInstalled={true}
                executablePath={game.executablePath}
                path={game.path}
                description={game.description}
                url={game.url}
              />
            ))
          ) : (
            <div className="no-results-message">
              <p>Nenhum jogo instalado</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default InstalledGames;