import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GameCard from '../../components/GameCard/GameCard.jsx';
import Carousel from '../../components/Carousel/Carousel.jsx';
import Subject from '../../components/Subjects/Subject.jsx';
import SearchBar from '../../components/Search/SearchBar.jsx';
import FilterButton from '../../components/Filter/FilterButton.jsx';
import Loader from '../../components/Loader/Loader.jsx'; 
import { fetchGames } from '../../services/api.jsx';

// Importação de estilos
import '../../index.css';
import './Library.css';
import '../../components/Carousel/Carousel.css';
import '../../components/GameCard/GameCard.css'
import '../../components/Subjects/Subject.css';
import '../../components/Filter/FilterButton.css';

// Importação de imagens
import tigrinho from '../../assets/tigrinho.svg';
import Telahorizontal from '../../assets/Telahorizontal.svg';

// Dados das categorias
const subjectsData = [
  { id: 1, title: 'Portugues', image: Telahorizontal },
  { id: 2, title: 'Jogos de Raciocínio', image: tigrinho },
  { id: 3, title: 'Jogos de Quebra-cabeça', image: tigrinho },
  { id: 4, title: 'Jogos de Memória', image: tigrinho },
];

function Library() {
  const navigate = useNavigate();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedGameTypes, setSelectedGameTypes] = useState([]);
  const [availableGames, setAvailableGames] = useState([]);
  const [installedGames, setInstalledGames] = useState([]);
  const [error, setError] = useState('');
  const [rawResponse, setRawResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar jogos da API
  useEffect(() => {
    const loadGames = async () => {
      setIsLoading(true);
      try {
        const games = await fetchGames();
        setAvailableGames(games.filter(game => !game.installed));
        setInstalledGames(games.filter(game => game.installed));
        setRawResponse(games);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadGames();
  }, []);

  // Dados para o filtro
  const subjects = [
    { id: 'arte', name: 'Arte' },
    { id: 'ciencias', name: 'Ciências' },
    { id: 'geografia', name: 'Geografia' },
    { id: 'historia', name: 'História' },
    { id: 'lingua-portuguesa', name: 'Lingua Portuguesa' },
    { id: 'matematica', name: 'Matemática' }
  ];

  const gameTypes = [
    { id: 'memoria', name: 'Memória' },
    { id: 'raciocinio', name: 'Raciocínio' },
    { id: 'logica', name: 'Lógica' },
    { id: 'estrategia', name: 'Estratégia' },
    { id: 'colorir', name: 'Colorir' },
    { id: 'plataforma', name: 'Plataforma' },
    { id: 'quebra-cabeca', name: 'Quebra-cabeça' },
    { id: 'tabuleiro', name: 'Tabuleiro' },
    { id: 'aventura', name: 'Aventura' }
  ];

  const toggleFilterPopup = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  const toggleSubject = (subjectId) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId) 
        : [...prev, subjectId]
    );
  };

  const toggleGameType = (gameTypeId) => {
    setSelectedGameTypes(prev => 
      prev.includes(gameTypeId) 
        ? prev.filter(id => id !== gameTypeId) 
        : [...prev, gameTypeId]
    );
  };

  const handleClearFilters = () => {
    setSelectedSubjects([]);
    setSelectedGameTypes([]);
  };


  //filtrar tiverem mais jogos na api e as tags estiverem sendo puxadas
  const handleApplyFilters = () => {
    console.log('Filters applied:', {
      subjects: selectedSubjects,
      gameTypes: selectedGameTypes
    });

    setIsFilterOpen(false);
  };

  //fazer a busca qnd o léo juntar a parte do jogo especifico (buscar pro nome do jogo)
  const handleSearch = (searchTerm) => {
    console.log('Buscando por:', searchTerm);
    
  };

  return (
    <div className="app">
      <header className="header">
        <div className="search-container">
          <button className="filter-button" onClick={toggleFilterPopup}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeMiterlimit="10"
    strokeWidth="1.5"
    d="M21.25 12H8.895m-4.361 0H2.75m18.5 6.607h-5.748m-4.361 0H2.75m18.5-13.214h-3.105m-4.361 0H2.75m13.214 2.18a2.18 2.18 0 1 0 0-4.36a2.18 2.18 0 0 0 0 4.36Zm-9.25 6.607a2.18 2.18 0 1 0 0-4.36a2.18 2.18 0 0 0 0 4.36Zm6.607 6.608a2.18 2.18 0 1 0 0-4.361a2.18 2.18 0 0 0 0 4.36Z"
  />
</svg>

            Filtrar
          </button>
          <SearchBar onSearch={handleSearch} />
        </div>
      </header>

      <main className="main-content">
        <Subject subjects={subjectsData} />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        
        {/* enquanto chama os jogos fica carregando yay */}
        {isLoading ? (
          <Loader message="Carregando jogos" />
        ) : (
          <>
            <Carousel title="Jogos Disponíveis">
              {availableGames.map(game => (
                <GameCard
                  key={game.id}
                  image={game.image}
                  title={game.name}
                  subject={game.subject}
                />
              ))}
            </Carousel>
            
            <Carousel title="Jogos Instalados">
              {installedGames.map(game => (
                <GameCard
                  key={game.id}
                  image={game.image}
                  title={game.name}
                  subject={game.subject}
                />
              ))}
            </Carousel>
          </>
        )}
      </main>

      <FilterButton 
        isOpen={isFilterOpen}
        onClose={toggleFilterPopup}
        subjects={subjects}
        gameTypes={gameTypes}
        selectedSubjects={selectedSubjects}
        selectedGameTypes={selectedGameTypes}
        toggleSubject={toggleSubject}
        toggleGameType={toggleGameType}
        handleClearFilters={handleClearFilters}
        handleApplyFilters={handleApplyFilters}
      />
    </div>
  );
}

export default Library;