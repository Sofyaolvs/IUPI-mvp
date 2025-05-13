import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import GameCard from '../../components/GameCard/GameCard.jsx';
import Carousel from '../../components/Carousel/Carousel.jsx';
import Subject from '../../components/Subjects/Subject.jsx';
import SearchBar from '../../components/Search/SearchBar.jsx';
import FilterButton from '../../components/Filter/FilterButton.jsx';
import Loader from '../../components/Loader/Loader.jsx'; 
import { fetchGames, searchGames } from '../../services/api.jsx';

// Import styles
import '../../index.css';
import './Library.css';
import '../../components/Carousel/Carousel.css';
import '../../components/GameCard/GameCard.css';
import '../../components/Subjects/Subject.css';
import '../../components/Filter/FilterButton.css';

// Import images
import iupi from '../../assets/iupi.png'
import lacos_da_amizade from '../../assets/lacos_da_amizade.png'
import floresta_das_emocoes from '../../assets/floresta_das_emocoes.png'
import aventuras_do_reino_antigo from '../../assets/aventuras_do_reino_antigo.png'
import fortal_run from '../../assets/fortal_run.png'
import joy_defenders from '../../assets/joy_defenders.png'
import lacos_da_amizade2 from '../../assets/lacos_da_amizade2.png'

// Category data
const subjectsData = [
  { id: 1, title: 'Português', image: lacos_da_amizade },
  { id: 2, title: 'Matemática', image: floresta_das_emocoes },
  { id: 3, title: 'História', image: aventuras_do_reino_antigo },
  { id: 4, title: 'Geografia', image: fortal_run },
  { id: 5, title: 'Ciências', image: joy_defenders },
  { id: 6, title: 'Arte', image: lacos_da_amizade2 },
];

// Subject and game type data - Movido para o início para fácil acesso
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
  
  // Add states for tracking rapid clicks and showing the debug popup
  const [filterClickCount, setFilterClickCount] = useState(0);
  const [showDebugPopup, setShowDebugPopup] = useState(false);
  const clickTimerRef = useRef(null);
  
  // Initialize localStorage values if they exist
  useEffect(() => {
    // Load homolog URL from localStorage
    const savedHomologUrl = localStorage.getItem('HOMOLOG_API_URL');
    if (savedHomologUrl) {
      window.HOMOLOG_API_URL = savedHomologUrl;
      console.log('Homolog URL loaded from localStorage:', savedHomologUrl);
    }
    
    // Load forced homolog API configuration
    const forceHomolog = localStorage.getItem('FORCE_HOMOLOG') === 'true';
    window.FORCE_HOMOLOG = forceHomolog;
    if (forceHomolog) {
      console.log('Forced homolog API usage activated');
    }
  }, []);
  
  // Custom function to get the API URL
  const getApiUrl = useCallback(() => {
    // Check if forced homolog API usage is enabled
    if (window.FORCE_HOMOLOG || localStorage.getItem('FORCE_HOMOLOG') === 'true') {
      const homologUrl = window.HOMOLOG_API_URL || localStorage.getItem('HOMOLOG_API_URL');
      if (homologUrl) {
        console.log('Using homolog API (forced):', homologUrl);
        return homologUrl;
      }
    }

    // Detect local environment
    const isLocal = window?.location?.hostname === 'localhost' || window?.location?.hostname === '127.0.0.1';
    if (isLocal) {
      // Check if homolog URL is configured
      const homologUrl = window.HOMOLOG_API_URL || localStorage.getItem('HOMOLOG_API_URL');
      if (homologUrl) {
        console.log('Using homolog API:', homologUrl);
        return homologUrl;
      }
      console.log('Using default local API: http://52.91.62.219:3001');
      return 'http://52.91.62.219:3001';
    }
    
    // Fallback to production
    console.log('Using production API');
    return '';
  }, []);
  
  // Custom function to fetch games with the correct URL
  const fetchGamesCustom = useCallback(async () => {
    try {
      const apiUrl = getApiUrl();
      console.log('Connecting to API:', apiUrl);
      
      // Basic implementation if we need to replace the original
      const response = await fetch(`${apiUrl}/games`);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error in fetchGamesCustom:', error);
      throw error;
    }
  }, [getApiUrl]);
  
  // Temporary filter states that are only applied when "Salvar" is clicked
  const [tempSelectedSubjects, setTempSelectedSubjects] = useState([]);
  const [tempSelectedGameTypes, setTempSelectedGameTypes] = useState([]);

  useEffect(() => {
    const loadGamesAndCheckInstalled = async () => {
      setIsLoading(true);
      try {
        // 1. First load all games from API
        console.log("Loading games from API...");
        // Use our modified version of fetchGames that respects API configuration
        const games = await fetchGamesCustom();
        console.log("Games loaded:", games);
        
        // 2. Store games in state
        setAllGames(games);
        
        // 3. Check which games are installed
        console.log("Checking installed games...");
        const installedGamesData = await window.electronAPI.checkInstalledGames();
        
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
        // setError(`Error loading games: ${err.message}`);
        console.error("Full error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadGamesAndCheckInstalled();
  }, [fetchGamesCustom]);

  // Modified toggleFilterPopup to track rapid clicks
  const toggleFilterPopup = () => {
    // Increment click count
    setFilterClickCount(prevCount => {
      const newCount = prevCount + 1;
      
      // Reset timer if it exists
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
      
      // Set a new timer to reset click count after 5 seconds
      clickTimerRef.current = setTimeout(() => {
        setFilterClickCount(0);
      }, 5000);
      
      // Check if we reached 10 clicks
      if (newCount === 10) {
        // Show debug popup
        setShowDebugPopup(true);
        return 0; // Reset counter
      }
      
      return newCount;
    });
    
    // Original filter popup toggle logic
    if (!isFilterOpen) {
      setTempSelectedSubjects([...selectedSubjects]);
      setTempSelectedGameTypes([...selectedGameTypes]);
    }
    setIsFilterOpen(!isFilterOpen);
  };
  
  // Function to close the debug popup
  const closeDebugPopup = () => {
    setShowDebugPopup(false);
  };

  const isGameAlreadyInstalled = useCallback((game) => {
    if (!game || !installedGames.length) return false;
    
    const gameName = (game.name || game.title || '').toLowerCase().trim();
    return installedGames.some(installedGame => {
      const installedName = (installedGame.name || installedGame.title || '').toLowerCase().trim();
      return gameName === installedName;
    });
  }, [installedGames]);
  
  const getInstalledGameData = useCallback((game) => {
    if (!game || !installedGames.length) return null;
    
    const gameName = (game.name || game.title || '').toLowerCase().trim();
    return installedGames.find(installedGame => {
      const installedName = (installedGame.name || installedGame.title || '').toLowerCase().trim();
      return gameName === installedName;
    });
  }, [installedGames]);

  // Toggle subject selection (only for temporary state)
  const toggleSubject = (subjectId) => {
    setTempSelectedSubjects(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId) 
        : [...prev, subjectId]
    );
  };

  // Toggle game type selection (only for temporary state)
  const toggleGameType = (gameTypeId) => {
    setTempSelectedGameTypes(prev => 
      prev.includes(gameTypeId) 
        ? prev.filter(id => id !== gameTypeId) 
        : [...prev, gameTypeId]
    );
  };

  // Improved function to filter games
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
        // Check each tag of the game
        for (const tag of game.tags) {
          // Check if the tag is an object with 'name' property
          if (typeof tag === 'object' && tag !== null && tag.name) {
            const tagName = tag.name.toLowerCase();
            // Check if any selected game type matches this tag
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

  // Function to filter based only on tag name (without relying on IDs)
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

  // Function to apply filters to games
  const applyFiltersToGames = useCallback(() => {
    if (selectedSubjects.length === 0 && selectedGameTypes.length === 0) {
      setIsFiltering(false);
      if (!isSearching) {
        // If there are no filters or search, show all games
        setAvailableGames(allGames.filter(game => !game.installed));
        return;
      }
    } else {
      setIsFiltering(true);
    }

    setIsLoading(true);
    
    try {
      // Get games (all or current search results)
      let gamesToFilter = allGames;
      
      // Apply text search, if there is one
      if (isSearching && searchTerm) {
        const term = searchTerm.toLowerCase();
        gamesToFilter = gamesToFilter.filter(game => {
          const gameTitle = (game.title || game.name || '').toLowerCase();
          const gameDescription = (game.description || '').toLowerCase();
          const gameSubject = (game.subject || '').toLowerCase();
          
          // Search in tags, considering they can be objects with 'name' property
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

      // Apply filters using the tag name filtering function
      const filteredGames = filterGamesByTagName(gamesToFilter, selectedSubjects, selectedGameTypes);
      
      console.log("Filters applied:", { 
        subjects: selectedSubjects, 
        gameTypes: selectedGameTypes,
        resultCount: filteredGames.length 
      });
      
      // Update only the available games list
      setAvailableGames(filteredGames.filter(game => !game.installed));
    } catch (err) {
      setError(`Error applying filters: ${err.message}`);
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

  // Clear filters (temporary and applied)
  const handleClearFilters = () => {
    // Clear both temporary and applied filters
    setTempSelectedSubjects([]);
    setTempSelectedGameTypes([]);
    setSelectedSubjects([]);
    setSelectedGameTypes([]);
    setIsFiltering(false);
  };

  // Apply filters when clicking "Salvar"
  const handleApplyFilters = () => {
    // Apply temporary filters to the actual filter state
    setSelectedSubjects(tempSelectedSubjects);
    setSelectedGameTypes(tempSelectedGameTypes);
    setIsFilterOpen(false);
    
    // Set filtering flag based on whether there are any filters
    setIsFiltering(tempSelectedSubjects.length > 0 || tempSelectedGameTypes.length > 0);
  };

  // Function to remove a specific filter tag
  const removeFilterTag = (type, id) => {
    if (type === 'subject') {
      setSelectedSubjects(prev => prev.filter(subjectId => subjectId !== id));
    } else if (type === 'gameType') {
      setSelectedGameTypes(prev => prev.filter(gameTypeId => gameTypeId !== id));
    }
  };

  // Search function
  const handleSearch = useCallback((term) => {
    // Avoid repeated search with the same term
    if (term === lastSearchTerm && term !== '') return;

    setLastSearchTerm(term);
    setSearchTerm(term);
    setIsSearching(!!term);
  }, [lastSearchTerm]);

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

  // Function to navigate to the all available games page
  const navigateToAllAvailableGames = () => {
    // Save current filter state in localStorage to retrieve on the other page
    localStorage.setItem('gameFilters', JSON.stringify({
      searchTerm,
      selectedSubjects,
      selectedGameTypes,
      isSearching,
      isFiltering
    }));
    
    navigate('/available-games');
  };

  // Function to navigate to the all installed games page
  const navigateToAllInstalledGames = () => {
    // Save current filter state in localStorage to retrieve on the other page
    localStorage.setItem('gameFilters', JSON.stringify({
      searchTerm,
      selectedSubjects,
      selectedGameTypes,
      isSearching,
      isFiltering
    }));
    
    navigate('/installed-games');
  };

  // Função para obter o nome completo de uma matéria pelo seu ID
  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : subjectId;
  };

  // Função para obter o nome completo de um tipo de jogo pelo seu ID
  const getGameTypeName = (gameTypeId) => {
    const gameType = gameTypes.find(gt => gt.id === gameTypeId);
    return gameType ? gameType.name : gameTypeId;
  };

 return (
    <div className="app">
      <header className="header">
        <div className="search-container">
          <div className='iupi logo'>
            <img 
              src={iupi} 
              alt="iupi logo" 
              className='iupi-logo' 
              style={{ 
                width: '120px', 
                height: 'auto',
                alignSelf: 'flex-start',
                marginRight: '700px'  // Increasing space between logo and filter
              }} 
            />
          </div>
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
        </div>
        
      </header>
      {(selectedSubjects.length > 0 || selectedGameTypes.length > 0) && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '5px' }}>
            {selectedSubjects.map(subjectId => (
              <span key={subjectId} className="filter-tag">
                {getSubjectName(subjectId)}
                <button onClick={() => removeFilterTag('subject', subjectId)}>×</button>
              </span>
            ))}
            {selectedGameTypes.map(gameTypeId => (
              <span key={gameTypeId} className="filter-tag">
                {getGameTypeName(gameTypeId)}
                <button onClick={() => removeFilterTag('gameType', gameTypeId)}>×</button>
              </span>
            ))}
          </div>
        </div>
      )}
      
    
      <main className="main-content">
        {error && <p className="error-message">{error}</p>}

        {isLoading ? (
          <Loader/>
        ) : (
          <>
            {/* Only show Subject component when no filters are active */}
            {!isFiltering && !isSearching && (
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
                    // If it's a Game Type
                    if (['raciocinio', 'quebra-cabeca', 'memoria'].includes(filterId)) {
                      // Add to temporary state if not already there
                      if (!tempSelectedGameTypes.includes(filterId)) {
                        setTempSelectedGameTypes(prev => [...prev, filterId]);
                      }
                    } 
                    // If it's a Subject
                    else {
                      // Add to temporary state if not already there
                      if (!tempSelectedSubjects.includes(filterId)) {
                        setTempSelectedSubjects(prev => [...prev, filterId]);
                      }
                    }
                    
                    // Open the filter popup for better visibility
                    setIsFilterOpen(true);
                  }
                }}
              />
            )}

            {/* Show carousels only when no filters are active */}
            {!isFiltering && !isSearching && (
              <>
                {availableGames.length > 0 && (
                  <div className="carousel-section">
                    <Carousel
                      title="Jogos Disponíveis"
                      onSeeMore={navigateToAllAvailableGames}
                      maxItems={availableGames.length}
                      totalItems={availableGames.length}
                    >
                      {availableGames.map(game => (
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
                          installedGames={installedGames}
                        />
                      ))}
                    </Carousel>
                  </div>
                )}
                
                {installedGames.length > 0 && (
                  <div className="carousel-section">
                    <Carousel
                      title="Jogos Instalados"
                      onSeeMore={navigateToAllInstalledGames}
                      maxItems={installedGames.length}
                      totalItems={installedGames.length}
                    >
                      {installedGames.map(game => (
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
                          installedGames={installedGames}
                        />
                      ))}
                    </Carousel>
                  </div>
                )}
              </>
            )}

            {/* Show all games in a grid when filtering or searching */}
            {(isFiltering || isSearching) && (
              <div className="games-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '20px',
                padding: '20px 0'
              }}>
                {/* Combine and filter both available and installed games */}
                {[...availableGames]
                  .filter(game => {
                    if (!isFiltering) return true;
                    
                    // Apply subject filters
                    const subjectMatch = selectedSubjects.length === 0 || 
                      (game.subject && selectedSubjects.some(subjectId => {
                        const gameSubject = (game.subject || '').toLowerCase();
                        return gameSubject === subjectId.toLowerCase() || 
                              gameSubject.includes(subjectId.toLowerCase());
                      }));
                    
                    // Apply game type filters
                    let tagsMatch = selectedGameTypes.length === 0;
                    
                    if (!tagsMatch && game.tags && Array.isArray(game.tags)) {
                      tagsMatch = game.tags.some(tag => {
                        const tagName = typeof tag === 'string' ? tag.toLowerCase() : 
                                       (tag && typeof tag === 'object' && tag.name ? tag.name.toLowerCase() : '');
                        
                        return selectedGameTypes.some(typeId => {
                          const gameType = gameTypes.find(t => t.id === typeId);
                          const gameTypeName = gameType ? gameType.name.toLowerCase() : typeId.toLowerCase();
                          return tagName === gameTypeName || tagName.includes(gameTypeName);
                        });
                      });
                    }
                    
                    return subjectMatch && tagsMatch;
                  })
                  .map(game => (
                    <GameCard
                      key={game.id || `game-${game.name || game.title}`}
                      image={game.image}
                      cardImage={game.cardImage}
                      title={game.title || game.name}
                      subject={game.subject}
                      tags={game.tags}
                      id={game.id}
                      isInstalled={isGameAlreadyInstalled(game)}
                      executablePath={game.executablePath}
                      path={game.path}
                      description={game.description}
                      url={game.url}
                      installedGames={installedGames}
                    />
                  ))}
              </div>
            )}

            {!isLoading && ((isFiltering || isSearching) && [...availableGames, ...installedGames].length === 0) && (
              <div className="no-results-message">
                {isSearching ? (
                  <p>Nenhum jogo encontrado para sua busca "{searchTerm}"</p>
                ) : isFiltering ? (
                  <p>Nenhum jogo encontrado para os filtros selecionados</p>
                ) : (
                  <p>Nenhum jogo disponível</p>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Debug popup that appears after 10 clicks */}
      {showDebugPopup && (
        <div className="debug-popup-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div className="debug-popup" style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '300px',
            maxWidth: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>Configuração da API</h3>
              <button 
                onClick={closeDebugPopup}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <input
                type="text"
                placeholder="URL da API de homologação"
                defaultValue={window.HOMOLOG_API_URL || ''}
                onChange={e => {
                  const value = e.target.value.trim();
                  if (value) {
                    // Store value in localStorage for persistence
                    localStorage.setItem('HOMOLOG_API_URL', value);
                    // Set global variable
                    window.HOMOLOG_API_URL = value;
                    console.log('API URL defined:', window.HOMOLOG_API_URL);
                  } else {
                    localStorage.removeItem('HOMOLOG_API_URL');
                    window.HOMOLOG_API_URL = null;
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!window.FORCE_HOMOLOG}
                  onChange={e => {
                    window.FORCE_HOMOLOG = e.target.checked;
                    localStorage.setItem('FORCE_HOMOLOG', e.target.checked ? 'true' : 'false');
                  }}
                  style={{ marginRight: '8px' }}
                />
                Forçar uso da API de homologação
              </label>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button 
                onClick={() => {
                  // Remove values
                  localStorage.removeItem('HOMOLOG_API_URL');
                  localStorage.removeItem('FORCE_HOMOLOG');
                  window.HOMOLOG_API_URL = null;
                  window.FORCE_HOMOLOG = false;
                  closeDebugPopup();
                  window.location.reload();
                }}
                style={{
                  width: '48%',
                  padding: '10px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Limpar
              </button>
              
              <button 
                onClick={() => {
                  // Reload the page to apply the new API URL
                  closeDebugPopup();
                  window.location.reload();
                }}
                style={{
                  width: '48%',
                  padding: '10px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

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