import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchGameById } from '../../services/api.jsx';
import './GamePage.css';
import defaultImage from '../../assets/Telahorizontal.svg';
import Loader from '../../components/Loader/Loader.jsx';
import DownloadButton from '../../components/Download/DownloadButton.jsx';
import RecommendedGames from '../RecommendedGames/RecommendedGames.jsx';

export default function GamePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gameData, setGameData] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [executablePath, setExecutablePath] = useState(null);
  const [currentGroup, setCurrentGroup] = useState(0);
  const [processedImages, setProcessedImages] = useState([]);
  
  const navigate = useNavigate();
  const { id } = useParams();
  const SLIDES_PER_GROUP = 3;

  // Função para carregar imagem como base64 via API Electron
  const loadImageAsBase64 = async (imagePath) => {
    if (!imagePath) return null;
    
    try {
      console.log('Carregando imagem como Base64:', imagePath);
      
      // Verificar se a API do Electron está disponível
      if (!window.electronAPI || !window.electronAPI.getImageBase64) {
        console.error('API do Electron para getImageBase64 não disponível');
        return imagePath; // Retorna o caminho original se a API não estiver disponível
      }
      
      // Chamar a API do Electron para converter a imagem para base64
      const base64Data = await window.electronAPI.getImageBase64(imagePath);
      console.log('Imagem carregada com sucesso como base64');
      return base64Data;
    } catch (error) {
      console.error('Erro ao carregar imagem como base64:', error);
      return null;
    }
  };

  // Função para processar array de imagens, convertendo para base64 se necessário
  const processImages = async (images, isInstalledGame) => {
    if (!images || !Array.isArray(images) || images.length === 0) {
      return [];
    }
    
    const processedImages = [];
    
    // Para jogos instalados, precisamos converter as imagens para base64
    if (isInstalledGame) {
      console.log('Processando imagens para jogo instalado:', images);
      
      for (const imgPath of images) {
        // Verificar se a imagem já é uma string base64
        if (imgPath && typeof imgPath === 'string' && imgPath.startsWith('data:')) {
          processedImages.push(imgPath);
          continue;
        }
        
        // Tentar carregar a imagem como base64
        const base64Data = await loadImageAsBase64(imgPath);
        if (base64Data) {
          console.log(`Imagem carregada com sucesso: ${imgPath.substring(0, 50)}...`);
          processedImages.push(base64Data);
        }
      }
    } else {
      // Para jogos não instalados, usar as URLs diretamente
      processedImages.push(...images);
    }
    
    console.log(`Processamento concluído. Total de imagens válidas: ${processedImages.length}`);
    return processedImages.filter(Boolean); // Remover possíveis valores nulos
  };

  useEffect(() => {
    const loadGameData = async () => {
      try {
        setLoading(true);
        setError('');
        
        console.log('Loading game data for ID:', id);
        
        // First, get the list of all installed games to check against
        const installedGames = await window.electronAPI.checkInstalledGames();
        console.log('Installed games:', installedGames);
        
        // Check if this is an installed game first (ID starts with 'installed-')
        if (id.startsWith('installed-')) {
          console.log('Loading installed game with ID:', id);
          
          // Try to get data from sessionStorage first
          const storedData = sessionStorage.getItem('installedGameData');
          
          if (storedData) {
            const parsedData = JSON.parse(storedData);
            
            // If we have stored data with matching ID, use it
            if (parsedData && parsedData.id === id) {
              console.log('Loading game data from session storage:', parsedData);
              console.log('Executable path from session:', parsedData.executablePath);
              
              // Extrair o nome da pasta do caminho do jogo
              let gameFolderName = '';
              if (parsedData.path) {
                const pathParts = parsedData.path.split('/');
                gameFolderName = pathParts[pathParts.length - 1];
              }
              
              // Inicializa array com todas as imagens para processar
              let imagesToProcess = [];
              
              // Adiciona a imagem principal se existir
              if (parsedData.image) {
                imagesToProcess.push(parsedData.image);
              }
              
              // Se temos o nome da pasta do jogo, tentamos carregar todas as screenshots
              if (gameFolderName) {
                for (let i = 1; i <= 6; i++) {
                  const screenshotPath = `lib/${gameFolderName}/images/screenshot-${i}.jpg`;
                  console.log(`Adding possible screenshot path: ${screenshotPath}`);
                  imagesToProcess.push(screenshotPath);
                }
              }
              
              // Processa as imagens para formato base64
              const processedImgs = await processImages(imagesToProcess, true);
              
              const updatedData = {
                ...parsedData,
                images: processedImgs
              };
              
              setGameData(updatedData);
              setProcessedImages(processedImgs);
              setIsInstalled(true);
              
              if (parsedData.executablePath) {
                setExecutablePath(parsedData.executablePath);
              } else {
                console.warn('No executable path in session data, will attempt to find it');
                
                // If we have a path, try to find the executable
                if (parsedData.path) {
                  try {
                    const exePath = await window.electronAPI.findExecutableInFolder(parsedData.path);
                    if (exePath) {
                      console.log('Found executable in game path:', exePath);
                      setExecutablePath(exePath);
                      
                      // Update session storage with the found executable path
                      const updatedData = { ...parsedData, executablePath: exePath };
                      sessionStorage.setItem('installedGameData', JSON.stringify(updatedData));
                    } else {
                      console.error('No executable found in game path:', parsedData.path);
                    }
                  } catch (findError) {
                    console.error('Error finding executable:', findError);
                  }
                }
              }
              
              setLoading(false);
              return;
            }
          }
          
          // If we don't have stored data, try to find it in installed games list
          const gameName = id.replace('installed-', '');
          console.log('Looking for installed game with name:', gameName);
          
          // Try to find the game with matching name (with improved matching logic)
          const foundGame = installedGames.find(game => {
            const gameTitle = (game.title || '').toLowerCase().trim();
            const gameName2 = (game.name || '').toLowerCase().trim();
            const searchName = gameName.toLowerCase().trim();
            
            return gameTitle === searchName || 
                   gameName2 === searchName || 
                   gameTitle.includes(searchName) || 
                   searchName.includes(gameTitle);
          });
          
          if (foundGame) {
            console.log('Found installed game:', foundGame);
            console.log('Executable path for installed game:', foundGame.executablePath);
            
            // Se encontrado, verificamos se há imagens disponíveis
            let imagesToProcess = [];
            
            // Se o jogo tem a propriedade 'image', adicionamos à lista
            if (foundGame.image) {
              console.log('Found image for installed game:', foundGame.image);
              imagesToProcess.push(foundGame.image);
            }
            
                          // Tentar construir caminhos para screenshots adicionais
            if (foundGame.path) {
              try {
                // Extrair o nome da pasta do jogo do caminho completo
                const pathParts = foundGame.path.split('/');
                const folderName = pathParts[pathParts.length - 1];
                
                // Para cada screenshot possível, construir o caminho e tentar carregar
                for (let i = 1; i <= 10; i++) { // Tenta até 10 screenshots
                  const screenshotPath = `lib/${folderName}/images/screenshot-${i}.jpg`;
                  console.log(`Trying to load additional screenshot: ${screenshotPath}`);
                  // Não verificamos se o arquivo existe aqui - deixamos isso para a função loadImageAsBase64
                  imagesToProcess.push(screenshotPath);
                }
              } catch (findImagesError) {
                console.error('Error constructing paths for screenshots:', findImagesError);
              }
            }
            
            // Processar as imagens para base64
            const processedImgs = await processImages(imagesToProcess, true);
            
            const gameDataObj = {
              ...foundGame,
              id: id, // Ensure ID is preserved
              images: processedImgs
            };
            
            setGameData(gameDataObj);
            setProcessedImages(processedImgs);
            setIsInstalled(true);
            
            if (foundGame.executablePath) {
              setExecutablePath(foundGame.executablePath);
            } else {
              console.warn('No executable path found for installed game:', gameName);
              
              // Try to find the executable path by checking the file system
              if (foundGame.path) {
                console.log('Trying to find executable in game path:', foundGame.path);
                try {
                  const exePath = await window.electronAPI.findExecutableInFolder(foundGame.path);
                  if (exePath) {
                    console.log('Found executable in game folder:', exePath);
                    setExecutablePath(exePath);
                    
                    // Save the found path to the gameData object
                    gameDataObj.executablePath = exePath;
                    
                    // Store in session for future use
                    sessionStorage.setItem('installedGameData', JSON.stringify(gameDataObj));
                  } else {
                    console.error('No executable found in game folder:', foundGame.path);
                    
                    // Check if there are ZIP files that might need extraction
                    try {
                      const zipFiles = await window.electronAPI.findZipFilesInFolder(foundGame.path);
                      if (zipFiles && zipFiles.length > 0) {
                        console.log('Found ZIP files that might contain the game:', zipFiles);
                        // We don't auto-extract here, but we could store this information for later
                        gameDataObj.zipFiles = zipFiles;
                        sessionStorage.setItem('installedGameData', JSON.stringify(gameDataObj));
                      }
                    } catch (zipError) {
                      console.error('Error checking for ZIP files:', zipError);
                    }
                  }
                } catch (findError) {
                  console.error('Error finding executable:', findError);
                }
              }
            }
            
            // If the game has a URL and we have no images, try to get more info via web scraping
            if (foundGame.url && (!processedImgs.length || processedImgs.length === 0)) {
              try {
                const scrapedData = await window.electronAPI.scrapeGame(foundGame.url);
                
                if (!scrapedData.error) {
                  // Process additional scraped images
                  const scrapedImages = scrapedData.images || [];
                  const processedScrapedImgs = await processImages(scrapedImages, false);
                  
                  // Update game data with description and additional images
                  const updatedData = {
                    ...gameDataObj,
                    description: gameDataObj.description || scrapedData.description,
                    images: [...processedImgs, ...processedScrapedImgs].filter(Boolean)
                  };
                  
                  setGameData(updatedData);
                  setProcessedImages(updatedData.images);
                  
                  // Update session storage
                  sessionStorage.setItem('installedGameData', JSON.stringify(updatedData));
                }
              } catch (scrapeError) {
                console.error('Error scraping game:', scrapeError);
              }
            }
            
            setLoading(false);
            return;
          } else {
            console.warn(`Installed game not found with name: ${gameName}`);
          }
        }
        
        // If not an installed game or installed game not found, fetch from API
        console.log('Fetching game from API with ID:', id);
        const game = await fetchGameById(id);
        
        // Check if this game is already installed by comparing name
        const gameName = game.name || game.title;
        if (gameName) {
          console.log('Checking if game is already installed:', gameName);
          const normalizedName = gameName.toLowerCase().trim();
          
          // Improved matching logic
          const matchedInstalledGame = installedGames.find(installedGame => {
            const installedName = (installedGame.name || installedGame.title || '').toLowerCase().trim();
            return installedName === normalizedName || 
                   installedName.includes(normalizedName) || 
                   normalizedName.includes(installedName);
          });
          
          if (matchedInstalledGame) {
            console.log(`Game ${gameName} is already installed:`, matchedInstalledGame);
            setIsInstalled(true);
            
            if (matchedInstalledGame.executablePath) {
              console.log('Using executable path from installed game:', matchedInstalledGame.executablePath);
              setExecutablePath(matchedInstalledGame.executablePath);
            } else if (matchedInstalledGame.path) {
              console.log('Searching for executable in installed game path:', matchedInstalledGame.path);
              try {
                const exePath = await window.electronAPI.findExecutableInFolder(matchedInstalledGame.path);
                if (exePath) {
                  console.log('Found executable in installed game folder:', exePath);
                  setExecutablePath(exePath);
                  
                  // Update the matchedInstalledGame record for future use
                  matchedInstalledGame.executablePath = exePath;
                } else {
                  console.error('No executable found in installed game folder:', matchedInstalledGame.path);
                }
              } catch (findError) {
                console.error('Error finding executable:', findError);
              }
            }
            
            // Processar imagens do jogo instalado
            const installedImages = matchedInstalledGame.image ? [matchedInstalledGame.image] : [];
            const processedInstalledImgs = await processImages(installedImages, true);
            
            // Merge data from API and installed game
            game.executablePath = matchedInstalledGame.executablePath || null;
            game.installed = true;
            game.path = matchedInstalledGame.path || null;
            
            // Combinar imagens do jogo instalado com as do API
            const apiImages = game.images || [];
            const processedApiImgs = await processImages(apiImages, false);
            
            game.images = [...processedInstalledImgs, ...processedApiImgs].filter(Boolean);
            setProcessedImages(game.images);
          } else {
            // Processar imagens do jogo não instalado
            const apiImages = game.images || [];
            const processedApiImgs = await processImages(apiImages, false);
            game.images = processedApiImgs;
            setProcessedImages(processedApiImgs);
          }
        }
        
        // If game has URL but no images, scrape it
        if (game.url && (!game.images || game.images.length === 0)) {
          try {
            const scrapedData = await window.electronAPI.scrapeGame(game.url);
            
            if (!scrapedData.error) {
              // Process scraped images
              const scrapedImages = scrapedData.images || [];
              const processedScrapedImgs = await processImages(scrapedImages, false);
              
              // Merge scraped data with existing game data
              game.images = processedScrapedImgs;
              setProcessedImages(processedScrapedImgs);
              game.description = game.description || scrapedData.description;
              game.cardImage = game.cardImage || (processedScrapedImgs.length > 0 ? processedScrapedImgs[0] : null);
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
    if (!processedImages?.length) return;
    
    const nextIndex = currentSlide + 1;
    
    // Se atingiu o final das imagens, volte para o início
    if (nextIndex >= processedImages.length) {
      setCurrentSlide(0);
      setCurrentGroup(0);
      return;
    }
    
    setCurrentSlide(nextIndex);
    
    // Calcula o grupo correspondente ao novo slide
    const newGroup = Math.floor(nextIndex / SLIDES_PER_GROUP);
    if (newGroup !== currentGroup) {
      setCurrentGroup(newGroup);
    }
  };

  const prevSlide = () => {
    if (!processedImages?.length) return;
    
    const prevIndex = currentSlide - 1;
    
    // Se está no início, vá para o final
    if (prevIndex < 0) {
      const lastIndex = processedImages.length - 1;
      setCurrentSlide(lastIndex);
      setCurrentGroup(Math.floor(lastIndex / SLIDES_PER_GROUP));
      return;
    }
    
    setCurrentSlide(prevIndex);
    
    // Calcula o grupo correspondente ao novo slide
    const newGroup = Math.floor(prevIndex / SLIDES_PER_GROUP);
    if (newGroup !== currentGroup) {
      setCurrentGroup(newGroup);
    }
  };

  const nextGroup = () => {
    if (!processedImages?.length) return;
    
    const totalGroups = Math.ceil(processedImages.length / SLIDES_PER_GROUP);
    const newGroup = currentGroup === totalGroups - 1 ? 0 : currentGroup + 1;
    setCurrentGroup(newGroup);
    
    // Atualiza a imagem principal para a primeira imagem do novo grupo
    const newSlideIndex = newGroup * SLIDES_PER_GROUP;
    if (newSlideIndex < processedImages.length) {
      setCurrentSlide(newSlideIndex);
    }
  };

  const prevGroup = () => {
    if (!processedImages?.length) return;
    
    const totalGroups = Math.ceil(processedImages.length / SLIDES_PER_GROUP);
    const newGroup = currentGroup === 0 ? totalGroups - 1 : currentGroup - 1;
    setCurrentGroup(newGroup);
    
    // Atualiza a imagem principal para a primeira imagem do novo grupo
    const newSlideIndex = newGroup * SLIDES_PER_GROUP;
    if (newSlideIndex < processedImages.length) {
      setCurrentSlide(newSlideIndex);
    }
  };

  const getCurrentGroupImages = () => {
    if (!processedImages?.length) return [];
    
    const startIndex = currentGroup * SLIDES_PER_GROUP;
    return processedImages.slice(startIndex, startIndex + SLIDES_PER_GROUP);
  };

  const handleBackClick = () => {
    navigate(-1); // Navigate back to the previous page
  };

  const handlePlayGame = () => {
    // First check if we have an executable path
    if (!executablePath) {
      console.error('No executable path available for this game');
      
      // If we have a game path but no executable, try to find it
      if (gameData && gameData.path) {
        console.log('Attempting to find executable in game path:', gameData.path);
        
        window.electronAPI.findExecutableInFolder(gameData.path)
          .then(foundPath => {
            if (foundPath) {
              console.log('Found executable in game folder:', foundPath);
              setExecutablePath(foundPath);
              
              // Launch the game with the found executable
              launchGameWithPath(foundPath);
            } else {
              console.error('Failed to find any executable in game folder');
              // Show error to user if needed
            }
          })
          .catch(err => {
            console.error('Error searching for executable:', err);
            // Show error to user if needed
          });
      } else {
        console.error('No game path available to search for executables');
        // Show error to user if needed
      }
      return;
    }
    
    // If we have an executable path, launch the game
    launchGameWithPath(executablePath);
  };
  
  // Helper function to launch the game with a given path
  const launchGameWithPath = (path) => {
    console.log(`Launching game: ${gameData.title || gameData.name} at ${path}`);
    
    // Call the Electron API to launch the game
    window.electronAPI.openFileByPath(path, gameData.title || gameData.name)
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
    if (!gameData) return 'Jogo sem título';
    
    return gameData.title || gameData.name || 'Jogo sem título';
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
  // Get current group images for the carousel
  const currentGroupImages = getCurrentGroupImages();
  // Check if we're viewing from installed games list
  const isViewingInstalledGame = id.startsWith('installed-');

  return (
    <div className='game-infor'>
      <div>
        <button className="back-button" onClick={handleBackClick}>
          <ChevronLeft size={44} />
        </button>
      </div>

      {/* Categories / Tags - Only show if not viewing from installed games */}
      {!isViewingInstalledGame && (
        <div className="categories">
          {gameTags.length > 0 ? (
            gameTags.map((tag, index) => (
              <button key={index} className="category-button">{tag}</button>
            ))
          ) : (
            <button className="category-button">Sem categoria</button>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="content-wrapper">
        {/* Game preview */}
        <div className="game-preview">
          <div className="game-board">
            <div className="card-container">
              <div className="single-card">
                {processedImages && processedImages.length > 0 ? (
                  <img 
                    src={processedImages[currentSlide]} 
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
          {processedImages && processedImages.length > 1 && (
            <div className="carousel-container-gamePage">
              <button onClick={prevSlide} className="carousel-button">
                <ChevronLeft size={48} />
              </button>

              <div className="carousel-slides">
              {currentGroupImages.map((slide, index) => {
                  const actualIndex = currentGroup * SLIDES_PER_GROUP + index;
                  return (
                    <div 
                      key={actualIndex} 
                      className={`carousel-slide ${currentSlide === actualIndex ? 'active' : 'inactive'}`}
                      onClick={() => setCurrentSlide(actualIndex)}
                    >
                      <img 
                        src={slide} 
                        alt={`${gameData.title || 'Jogo'} preview ${actualIndex + 1}`}
                        onError={handleImageError}
                      />
                    </div>
                  );
                })}
              </div>

              <button onClick={nextSlide} className="carousel-button">
                <ChevronRight size={48} />
              </button>
            </div>
          )}
        </div>

        {/* Game description */}
        <div className="game-description">
          <h1 className="game-title">{gameName}</h1>
          <p className="description-text">
            {gameData.description || 'Nenhuma descrição disponível para este jogo.'}
          </p>
          
          {isInstalled ? (
            <button 
              className="play-button"
              onClick={handlePlayGame}
            >
              Jogar
            </button>
          ) : (
            <DownloadButton 
              gameData = {gameData}
              onDownloadComplete={(game) => {
                console.log('Download completed with data:', game);
                setIsInstalled(true);
                
                if (game && game.executablePath) {
                  console.log(`Executável encontrado: ${game.executablePath}`);
                  setExecutablePath(game.executablePath);
                } else {
                  console.error('Download result inválido ou sem caminho de executável:', game);
                }
              }} 
            />
          )}
        </div>
      </div>
        {/* Jogos recomendados  */}
        {!isViewingInstalledGame && (
          <div>
            <RecommendedGames currentGame={gameData} />
          </div>
        )}
    </div>
  );
}