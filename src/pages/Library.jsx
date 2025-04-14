import React from 'react';
import { useNavigate } from 'react-router-dom';
import GameCard from '../components/GameCard.jsx';
import Carousel from '../components/Carousel.jsx';
import Subject from '../components/Subject.jsx';
import SearchBar from '../components/SearchBar.jsx';

// Importação de estilos
import '../index.css';
import './Library.css';
import '../components/Carousel.css';
import '../components/GameCard.css';
import '../components/Subject.css';

// Importação de imagens
import tigrinho from '../assets/tigrinho.svg';
import Telahorizontal from '../assets/Telahorizontal.svg';

// Dados dos jogos
const availableGames = [
  { id: 1, title: 'Animais na Selva', image: Telahorizontal },
  { id: 2, title: 'Encontre as Diferenças', image: tigrinho },
  { id: 3, title: 'Combinando Animais', image: tigrinho },
  { id: 4, title: 'Robô Matemático', image: tigrinho },
  { id: 5, title: 'Princesa Guerreira', image: tigrinho },
  { id: 6, title: 'Cuca', image: tigrinho },
];

const installedGames = [
  { id: 7, title: 'Fada do Mar', image: tigrinho },
  { id: 8, title: 'Pirata Aventureiro', image: tigrinho },
  { id: 9, title: 'Harry Explorador', image: tigrinho },
  { id: 10, title: 'Gato Travesso', image: tigrinho },
  { id: 11, title: 'Jogo de Letrinhas', image: tigrinho },
  { id: 12, title: 'Coelhinho Chef', image: tigrinho },
];

// Dados das categorias
const subjectsData = [
  { id: 1, title: 'Portugues', image: Telahorizontal },
  { id: 2, title: 'Jogos de Raciocínio', image: tigrinho },
  { id: 3, title: 'Jogos de Quebra-cabeça', image: tigrinho },
  { id: 4, title: 'Jogos de Memória', image: tigrinho },
  { id: 5, title: 'Jogos de Raciocínio', image: tigrinho },
  { id: 6, title: 'Jogos de Quebra-cabeça', image: tigrinho },
];

function App() {
  const navigate = useNavigate();

  const goToGameManager = () => {
    navigate('/game-manager');
  };

  const handleSearch = (searchTerm) => {
    console.log('Buscando por:', searchTerm);
    // Aqui você pode implementar a lógica para filtrar jogos
    // Por exemplo, você poderia navegar para uma rota de resultados de busca:
    // navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="search-container">
          <button className="filter-button">
            <span className="filter-icon">&#9776;</span>
            Filtrar
          </button>
          <SearchBar onSearch={handleSearch} />
          {/* <button 
            className="navigation-button" 
            onClick={goToGameManager}
            style={{ marginLeft: '10px', padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Ir para Gerenciador de Jogos
          </button> */}
        </div>
      </header>

      <main className="main-content">
      <Subject subjects={subjectsData} />
        <Carousel title="Jogos Disponíveis">
          {availableGames.map(game => (
            <GameCard key={game.id} image={game.image} title={game.title} />
          ))}
        </Carousel>
        
        <Carousel title="Jogos Instalados">
          {installedGames.map(game => (
            <GameCard key={game.id} image={game.image} title={game.title} />
          ))}
        </Carousel>
      </main>
    </div>
  );
}

export default App;