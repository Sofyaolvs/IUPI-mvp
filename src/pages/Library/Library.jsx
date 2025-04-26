import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import GameCard from '../../components/GameCard/GameCard.jsx';
import Carousel from '../../components/Carousel/Carousel.jsx';
import Subject from '../../components/Subjects/Subject.jsx';
import SearchBar from '../../components/Search/SearchBar.jsx';
import FilterButton from '../../components/Filter/FilterButton.jsx';
import Loader from '../../components/Loader/Loader.jsx'; 
import { fetchGames, searchGames } from '../../services/api.jsx';

// Importação de estilos
import '../../index.css';
import './Library.css';
import '../../components/Carousel/Carousel.css';
import '../../components/GameCard/GameCard.css';
import '../../components/Subjects/Subject.css';
import '../../components/Filter/FilterButton.css';

// Importação de imagens
import tigrinho from '../../assets/tigrinho.svg';
import Telahorizontal from '../../assets/Telahorizontal.svg';

// Dados das categorias
const subjectsData = [
  { id: 1, title: 'Português', image: Telahorizontal },
  { id: 2, title: 'Matemática', image: tigrinho },
  { id: 3, title: 'História', image: tigrinho },
  { id: 4, title: 'Geografia', image: tigrinho },
  { id: 5, title: 'Ciências', image: tigrinho },
  { id: 6, title: 'Arte', image: tigrinho },
];

function Library() {
  const navigate = useNavigate();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedGameTypes, setSelectedGameTypes] = useState([]);
  const [availableGames, setAvailableGames] = useState([]);
  const [installedGames, setInstalledGames] = useState([]);
  const [allGames, setAllGames] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastSearchTerm, setLastSearchTerm] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);
  
  // Temporary filter states that are only applied when "Salvar" is clicked
  const [tempSelectedSubjects, setTempSelectedSubjects] = useState([]);
  const [tempSelectedGameTypes, setTempSelectedGameTypes] = useState([]);

  // Número máximo de jogos a exibir no carrossel antes de mostrar "Ver mais"
  const MAX_CAROUSEL_GAMES = 6;

  useEffect(() => {
    const loadGamesAndCheckInstalled = async () => {
      setIsLoading(true);
      try {
        // 1. First load all games from API
        console.log("Loading games from API...");
        const games = await fetchGames();
        console.log("Games loaded:", games);
        
        // 2. Store games in state
        setAllGames(games);
        
        // 3. Check which games are installed
        console.log("Checking installed games...");
        const installedGamesData = await window.electronAPI.checkInstalledGames();
        console.log("Installed games:", installedGamesData);
        
        // 4. Set installed games directly from the data we got
        // This already includes images, titles, and other info
        setInstalledGames(installedGamesData);
        
        // 5. Filter available games to exclude installed ones
        // Use title or name to match
        const installedNames = new Set(
          installedGamesData.map(game => (game.title || game.name).toLowerCase())
        );
        
        const availableGamesFiltered = games.filter(game => {
          const gameName = (game.name || game.title || '').toLowerCase();
          return !installedNames.has(gameName);
        });
        
        setAvailableGames(availableGamesFiltered);
        setError('');
      } catch (err) {
        setError(`Error loading games: ${err.message}`);
        console.error("Full error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadGamesAndCheckInstalled();
  }, []);

  function isGameInstalled(gameName) {
    // Itera sobre todos os jogos instalados
    for (const installedGame of installedGamesData) {
      console.log(`Comparando jogo: ${gameName} com o jogo instalado: ${installedGame.name}`);
  
      // Verifica se o nome do jogo disponível corresponde ao nome do jogo instalado
      if (installedGame.name.toLowerCase() === gameName.toLowerCase()) {
        return true; // Se encontrar, retorna true
      }
    }
  
    return false; // Se não encontrar o jogo, retorna false
  }
  
  // Dados de matérias e tipos de jogos
  const subjects = [
    { id: 'matematica', name: 'Matemática' },
    { id: 'portugues', name: 'Língua Portuguesa' },
    { id: 'ciencias', name: 'Ciências' },
    { id: 'geografia', name: 'Geografia' },
    { id: 'historia', name: 'História' },
    { id: 'arte', name: 'Arte' }
  ];

  const gameTypes = [
    { id: 'logica', name: 'Lógica' },
    { id: 'memoria', name: 'Memória' },
    { id: 'quebra-cabeca', name: 'Quebra-cabeça' },
    { id: 'raciocinio', name: 'Raciocínio' },
    { id: 'estrategia', name: 'Estratégia' },
    { id: 'colorir', name: 'Colorir' },
    { id: 'plataforma', name: 'Plataforma' },
    { id: 'tabuleiro', name: 'Tabuleiro' },
    { id: 'aventura', name: 'Aventura' }
  ];

  // Abrir/fechar o popup de filtro
  const toggleFilterPopup = () => {
    // When opening the filter, initialize temp states with current selections
    if (!isFilterOpen) {
      setTempSelectedSubjects([...selectedSubjects]);
      setTempSelectedGameTypes([...selectedGameTypes]);
    }
    setIsFilterOpen(!isFilterOpen);
  };
  
  // Alternar seleção de matéria (apenas para o estado temporário)
  const toggleSubject = (subjectId) => {
    setTempSelectedSubjects(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId) 
        : [...prev, subjectId]
    );
  };

  // Alternar seleção de tipo de jogo (apenas para o estado temporário)
  const toggleGameType = (gameTypeId) => {
    setTempSelectedGameTypes(prev => 
      prev.includes(gameTypeId) 
        ? prev.filter(id => id !== gameTypeId) 
        : [...prev, gameTypeId]
    );
  };

  // Função melhorada para filtrar jogos
  const filterGames = (games, subjects = [], gameTypes = []) => {
    if (!subjects.length && !gameTypes.length) {
      return games;
    }
    
    return games.filter(game => {
      // Subject filtering - case insensitive
      const subjectMatch = subjects.length === 0 || 
        (game.subject && subjects.some(subjectId => {
          const gameSubject = (game.subject || '').toLowerCase();
          return gameSubject === subjectId.toLowerCase() || 
                 gameSubject.includes(subjectId.toLowerCase());
        }));
      
      // Game type (tags) filtering - handle tags as objects with name property
      let tagsMatch = gameTypes.length === 0;
      
      if (!tagsMatch && game.tags && Array.isArray(game.tags)) {
        // Verificar cada tag do jogo
        for (const tag of game.tags) {
          // Verificar se a tag é um objeto com propriedade 'name'
          if (typeof tag === 'object' && tag !== null && tag.name) {
            const tagName = tag.name.toLowerCase();
            // Verificar se algum tipo de jogo selecionado corresponde a esta tag
            for (const typeId of gameTypes) {
              const gameType = gameTypes.find(t => t.id === typeId);
              if (gameType) {
                const gameTypeName = gameType.name.toLowerCase();
                if (tagName === gameTypeName || tagName.includes(gameTypeName)) {
                  tagsMatch = true;
                  break;
                }
              }
            }
            if (tagsMatch) break;
          }
        }
      }
      
      return subjectMatch && tagsMatch;
    });
  };

  // Função para filtrar baseado apenas em nome de tag (sem depender de IDs)
  const filterGamesByTagName = (games, subjects = [], gameTypeNames = []) => {
    if (!subjects.length && !gameTypeNames.length) {
      return games;
    }
    
    return games.filter(game => {
      // Subject filtering (case insensitive)
      const subjectMatch = subjects.length === 0 || 
        (game.subject && subjects.some(subjectId => {
          // Get the subject name from our subjects list
          const subjectObj = subjects.find(s => s.id === subjectId);
          const subjectName = subjectObj ? subjectObj.name.toLowerCase() : subjectId.toLowerCase();
          
          const gameSubject = (game.subject || '').toLowerCase();
          return gameSubject === subjectName || 
                 gameSubject.includes(subjectName);
        }));
      
      // Game type filtering based purely on tag name
      let tagsMatch = gameTypeNames.length === 0;
      
      if (!tagsMatch && game.tags && Array.isArray(game.tags)) {
        // Check each tag of the game
        tagsMatch = game.tags.some(tag => {
          // Get tag name whether tag is a string or an object with name property
          const tagName = typeof tag === 'string' ? tag.toLowerCase() : 
                         (tag && typeof tag === 'object' && tag.name ? tag.name.toLowerCase() : '');
          
          // Check if any selected game type matches this tag
          return gameTypeNames.some(typeId => {
            const gameType = gameTypes.find(t => t.id === typeId);
            const gameTypeName = gameType ? gameType.name.toLowerCase() : typeId.toLowerCase();
            return tagName === gameTypeName || tagName.includes(gameTypeName);
          });
        });
      }
      
      return subjectMatch && tagsMatch;
    });
  };

  // Função para aplicar filtros aos jogos
  const applyFiltersToGames = useCallback(() => {
    if (selectedSubjects.length === 0 && selectedGameTypes.length === 0) {
      setIsFiltering(false);
      if (!isSearching) {
        // Se não há filtros nem busca, mostrar todos os jogos
        setAvailableGames(allGames.filter(game => !game.installed));
        // Não setamos mais o installedGames aqui
        return;
      }
    } else {
      setIsFiltering(true);
    }

    setIsLoading(true);
    
    try {
      // Obter jogos (todos ou resultados da busca atual)
      let gamesToFilter = allGames;
      
      // Aplicar busca textual, se houver
      if (isSearching && searchTerm) {
        const term = searchTerm.toLowerCase();
        gamesToFilter = gamesToFilter.filter(game => {
          const gameTitle = (game.title || game.name || '').toLowerCase();
          const gameDescription = (game.description || '').toLowerCase();
          const gameSubject = (game.subject || '').toLowerCase();
          
          // Buscar nas tags, considerando que podem ser objetos com propriedade 'name'
          let tagMatch = false;
          if (game.tags && Array.isArray(game.tags)) {
            tagMatch = game.tags.some(tag => {
              const tagName = typeof tag === 'string' ? tag.toLowerCase() : 
                             (tag && tag.name ? tag.name.toLowerCase() : '');
              return tagName.includes(term);
            });
          }
          
          return (
            gameTitle.includes(term) ||
            gameDescription.includes(term) ||
            gameSubject.includes(term) ||
            tagMatch
          );
        });
      }

      // Aplicar filtros usando a função de filtragem por nome de tag
      const filteredGames = filterGamesByTagName(gamesToFilter, selectedSubjects, selectedGameTypes);
      
      console.log("Filtros aplicados:", { 
        subjects: selectedSubjects, 
        gameTypes: selectedGameTypes,
        resultCount: filteredGames.length 
      });
      
      // Atualizar apenas a lista de jogos disponíveis
      setAvailableGames(filteredGames.filter(game => !game.installed));
      // Não setamos mais o installedGames aqui
    } catch (err) {
      setError(`Erro ao aplicar filtros: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, selectedSubjects, selectedGameTypes, isSearching, allGames]);

  // Apply filters when selected filters or search term changes
  useEffect(() => {
    if (!isLoading && allGames.length > 0) {
      applyFiltersToGames();
    }
  }, [selectedSubjects, selectedGameTypes, isSearching, searchTerm, applyFiltersToGames, isLoading, allGames]);

  // Limpar filtros (temporários e aplicados)
  const handleClearFilters = () => {
    // Clear both temporary and applied filters
    setTempSelectedSubjects([]);
    setTempSelectedGameTypes([]);
    setSelectedSubjects([]);
    setSelectedGameTypes([]);
    setIsFiltering(false);
  };

  // Aplicar filtros ao clicar em "Salvar"
  const handleApplyFilters = () => {
    // Apply temporary filters to the actual filter state
    setSelectedSubjects(tempSelectedSubjects);
    setSelectedGameTypes(tempSelectedGameTypes);
    setIsFilterOpen(false);
    
    // Set filtering flag based on whether there are any filters
    setIsFiltering(tempSelectedSubjects.length > 0 || tempSelectedGameTypes.length > 0);
  };

  // Função de busca
  const handleSearch = useCallback((term) => {
    // Evitar busca repetida do mesmo termo
    if (term === lastSearchTerm && term !== '') return;

    setLastSearchTerm(term);
    setSearchTerm(term);
    setIsSearching(!!term);
  }, [lastSearchTerm]);

  // Limpar busca
  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setLastSearchTerm('');
    setIsSearching(false);
  }, []);

  // Debug function
  const logGameTags = useCallback(() => {
    // Log unique tag names from all games
    const tagNames = new Set();
    allGames.forEach(game => {
      if (game.tags && Array.isArray(game.tags)) {
        game.tags.forEach(tag => {
          const tagName = typeof tag === 'string' ? tag : (tag && tag.name ? tag.name : 'unknown');
          tagNames.add(tagName);
        });
      }
    });
    console.log("Unique tag names:", [...tagNames]);
  }, [allGames]);

  // Call debug function when games load
  useEffect(() => {
    if (allGames.length > 0) {
      logGameTags();
    }
  }, [allGames, logGameTags]);

  // Função para navegar para a página de todos os jogos disponíveis
  const navigateToAllAvailableGames = () => {
    // Salvar o estado atual dos filtros no localStorage para recuperar na outra página
    localStorage.setItem('gameFilters', JSON.stringify({
      searchTerm,
      selectedSubjects,
      selectedGameTypes,
      isSearching,
      isFiltering
    }));
    
    navigate('/available-games');
  };

  // Função para navegar para a página de todos os jogos instalados
  const navigateToAllInstalledGames = () => {
    // Salvar o estado atual dos filtros no localStorage para recuperar na outra página
    localStorage.setItem('gameFilters', JSON.stringify({
      searchTerm,
      selectedSubjects,
      selectedGameTypes,
      isSearching,
      isFiltering
    }));
    
    navigate('/installed-games');
  };

  return (
    <div className="app">
      <header className="header">
        <div className="search-container">
          <button 
            className={`filter-button ${isFiltering ? 'active' : ''}`} 
            onClick={toggleFilterPopup}
          >
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
            {isFiltering && (
              <span className="filter-badge">
                {selectedSubjects.length + selectedGameTypes.length}
              </span>
            )}
          </button>

          <SearchBar 
            onSearch={handleSearch} 
            debounceTime={500} 
            initialValue={searchTerm}
          />

          {isSearching && (
            <button className="clear-search-button" onClick={handleClearSearch}>
              Limpar busca
            </button>
          )}
        </div>
      </header>

      <main className="main-content">
        <Subject 
          subjects={subjectsData} 
          onSelectSubject={(id) => {
            // Map from Subject UI component ID to our filter system ID
            let filterId;
            switch(id) {
              case 1: // Portugues
                filterId = 'portugues';
                break;
              case 2: // Jogos de Raciocínio
                filterId = 'raciocinio';
                break;
              case 3: // Jogos de Quebra-cabeça
                filterId = 'quebra-cabeca';
                break;
              case 4: // Jogos de Memória
                filterId = 'memoria';
                break;
              default:
                filterId = null;
            }
            
            if (filterId) {
              // Se é um Tipo de Jogo
              if (['raciocinio', 'quebra-cabeca', 'memoria'].includes(filterId)) {
                // Adicionar ao estado temporário se ainda não estiver lá
                if (!tempSelectedGameTypes.includes(filterId)) {
                  setTempSelectedGameTypes(prev => [...prev, filterId]);
                }
              } 
              // Se é uma Matéria
              else {
                // Adicionar ao estado temporário se ainda não estiver lá
                if (!tempSelectedSubjects.includes(filterId)) {
                  setTempSelectedSubjects(prev => [...prev, filterId]);
                }
              }
              
              // Abrir o popup de filtro para melhor visibilidade
              setIsFilterOpen(true);
            }
          }}
        />

        {error && <p className="error-message">{error}</p>}

        {isLoading ? (
          <Loader message="Carregando jogos" />
        ) : (
          <>
            {availableGames.length > 0 && (
              <div className="carousel-section">
                <div className="carousel-header">
                  <h2>Jogos Disponíveis</h2>
                  {availableGames.length > MAX_CAROUSEL_GAMES && (
                    <button 
                      className="see-more-button"
                      onClick={navigateToAllAvailableGames}
                    >
                      Ver mais
                    </button>
                  )}
                </div>
                <Carousel>
                  {availableGames.slice(0, MAX_CAROUSEL_GAMES).map(game => (
                    <GameCard
                      key={game.id || `available-${game.name || game.title}`}
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
                  ))}
                </Carousel>
              </div>
            )}

            {installedGames.length > 0 && (
              <div className="carousel-section">
                <div className="carousel-header">
                  <h2>Jogos Instalados</h2>
                  {installedGames.length > MAX_CAROUSEL_GAMES && (
                    <button 
                      className="see-more-button"
                      onClick={navigateToAllInstalledGames}
                    >
                      Ver mais
                    </button>
                  )}
                </div>
                <Carousel>
                  {installedGames.slice(0, MAX_CAROUSEL_GAMES).map(game => (
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
                  ))}
                </Carousel>
              </div>
            )}

            {!isLoading && availableGames.length === 0 && installedGames.length === 0 && (
              <div className="no-results-message">
                {isSearching ? (
                  <p>Nenhum jogo encontrado para sua busca "{searchTerm}"</p>
                ) : isFiltering ? (
                  <p>Nenhum jogo encontrado para os filtros selecionados</p>
                ) : (
                  <p>Nenhum jogo disponível</p>
                )}
                
                {(isSearching || isFiltering) && (
                  <button className="clear-all-button" onClick={() => {
                    handleClearSearch();
                    handleClearFilters();
                  }}>
                    Limpar todos os filtros
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <FilterButton 
        isOpen={isFilterOpen}
        onClose={toggleFilterPopup}
        subjects={subjects}
        gameTypes={gameTypes}
        selectedSubjects={tempSelectedSubjects}  // Use temporary state for popup
        selectedGameTypes={tempSelectedGameTypes}  // Use temporary state for popup
        toggleSubject={toggleSubject}
        toggleGameType={toggleGameType}
        handleClearFilters={handleClearFilters}
        handleApplyFilters={handleApplyFilters}
      />
    </div>
  );
}

export default Library;