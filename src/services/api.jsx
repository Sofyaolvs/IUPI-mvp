function getApiUrl() {
  // Detecta ambiente local
  const isLocal = window?.location?.hostname === 'localhost' || window?.location?.hostname === 'locahost';
  if (isLocal) {
    // Verify if there's a custom API URL set
    if (window.HOMOLOG_API_URL) {
      console.log('Using custom API URL:', window.HOMOLOG_API_URL);
      return window.HOMOLOG_API_URL;
    }
    return 'http://52.91.62.219:3001'; // Default API URL
  }
  // Usa a chave global definida pelo input
  if (window.HOMOLOG_API_URL) {
    return window.HOMOLOG_API_URL;
  }
  // Fallback: pode retornar uma string vazia ou lançar erro
  return '';
}

const API_URL = getApiUrl();

// Cache para armazenar jogos já buscados
let gamesCache = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos em milissegundos

// Helper function to extract card image with improved logging
const extractCardImage = (gameData) => {
  if (!gameData) {
    console.log('extractCardImage: gameData is null or undefined');
    return null;
  }
  
  // Check if there's a cardImage property
  if (gameData.cardImage && typeof gameData.cardImage === 'string') {
    console.log('Using existing cardImage:', gameData.cardImage.substring(0, 50) + '...');
    return gameData.cardImage;
  }

  // Check if there are images in the images array
  if (gameData.images && Array.isArray(gameData.images) && gameData.images.length > 0) {
    console.log('Using first image from images array:', gameData.images[0].substring(0, 50) + '...');
    return gameData.images[0];
  }
  
  console.log('No suitable image found in gameData');
  return null;
};

// Buscar jogos da API com cache e melhor tratamento de imagens
export const fetchGames = async (forceRefresh = false) => {
  try {
    const now = Date.now();
    
    // Usar cache se disponível e ainda válido, a menos que forceRefresh seja true
    if (!forceRefresh && gamesCache && (now - lastFetchTime) < CACHE_TTL) {
      console.log('Using cached games data');
      return gamesCache;
    }
    
    const apiUrl = getApiUrl();
    console.log('Fetching fresh games from API:', apiUrl);
    
    const response = await fetch(`${apiUrl}/games`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar jogos: ${response.statusText}`);
    }

    const games = await response.json();
    console.log(`Fetched ${games.length} games from API`);
    
    // Processamento em lote das imagens para melhorar performance
    const processedGames = await processGamesImages(games);
    
    // Atualizar cache
    gamesCache = processedGames;
    lastFetchTime = now;
    
    return processedGames;
  } catch (error) {
    console.error('Error fetching games:', error.message);
    
    // Se houver um erro, mas tivermos cache, use-o como fallback
    if (gamesCache) {
      console.log('Using cached data as fallback due to API error');
      return gamesCache;
    }
    
    throw new Error(error.message || 'Erro ao conectar com o servidor');
  }
};

// Processar imagens dos jogos em lote com melhor logging
async function processGamesImages(games) {
  if (!games || !Array.isArray(games)) {
    console.error('processGamesImages: Invalid games array');
    return [];
  }
  
  const processedGames = [];
  const gamesNeedingImages = [];
  
  // Primeiro passo: identificar jogos que precisam de imagens
  for (const game of games) {
    if (!game || !game.url) {
      console.warn('Skipping invalid game entry:', game);
      continue;
    }
    
    // Se já tem imagem, não precisa processar
    if ((game.cardImage && typeof game.cardImage === 'string') || 
        (game.image && typeof game.image === 'string')) {
      console.log(`Game ${game.title || game.name || 'Untitled'} already has image`);
      processedGames.push(game);
    } else {
      console.log(`Game ${game.title || game.name || 'Untitled'} needs image scraping`);
      gamesNeedingImages.push(game);
    }
  }
  
  // Segundo passo: processar em paralelo apenas os jogos que precisam de imagens
  if (gamesNeedingImages.length > 0) {
    console.log(`Processing images for ${gamesNeedingImages.length} games`);
    
    // Limitar processamento paralelo para não sobrecarregar
    const batchSize = 5; // Reduced batch size for better stability
    for (let i = 0; i < gamesNeedingImages.length; i += batchSize) {
      const batch = gamesNeedingImages.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(gamesNeedingImages.length/batchSize)}`);
      
      // Processar batch em paralelo
      const promises = batch.map(async (game) => {
        try {
          console.log(`Scraping image for ${game.title || game.name || 'Untitled'} from ${game.url}`);
          const gameData = await window.electronAPI.scrapeGame(game.url);
          
          if (!gameData.error) {
            const cardImage = extractCardImage(gameData);
            
            if (cardImage) {
              console.log(`Successfully found image for ${game.title || game.name || 'Untitled'}`);
              game.cardImage = cardImage;
              game.image = cardImage;
            } else {
              console.log(`No image found for ${game.title || game.name || 'Untitled'}`);
            }
          } else {
            console.error(`Error scraping ${game.title || game.name || 'Untitled'}:`, gameData.error);
          }
          return game;
        } catch (error) {
          console.error(`Error processing game ${game.title || game.name || 'Untitled'}:`, error);
          return game;
        }
      });
      
      try {
        const processedBatch = await Promise.all(promises);
        processedGames.push(...processedBatch);
        
        // Add a small delay between batches to avoid overwhelming the system
        if (i + batchSize < gamesNeedingImages.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error('Error processing batch:', error);
        // Add the remaining games without processing to avoid losing data
        processedGames.push(...batch);
      }
    }
  }
  
  console.log(`Finished processing images for all games, total: ${processedGames.length}`);
  return processedGames;
}

// Buscar jogo por ID com cache e melhor tratamento de imagens
export const fetchGameById = async (gameId) => {
  try {
    // Verificar se está no cache primeiro
    if (gamesCache) {
      const cachedGame = gamesCache.find(game => game.id === gameId);
      if (cachedGame) {
        console.log('Found game in cache:', gameId);
        return cachedGame;
      }
    }
    
    const apiUrl = getApiUrl();
    console.log(`Fetching game by ID ${gameId} from API:`, apiUrl);
    
    const response = await fetch(`${apiUrl}/games/${gameId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar jogo: ${response.statusText}`);
    }

    const game = await response.json();
    console.log('Fetched game:', game.title || game.name || gameId);
    
    // Processar imagem se necessário
    if ((!game.cardImage || !game.image) && game.url) {
      try {
        console.log(`Scraping image for game ${game.title || game.name || gameId} from ${game.url}`);
        const gameData = await window.electronAPI.scrapeGame(game.url);
        
        if (!gameData.error) {
          const cardImage = extractCardImage(gameData);
          
          if (cardImage) {
            console.log(`Successfully found image for ${game.title || game.name || gameId}`);
            game.cardImage = cardImage;
            game.image = cardImage;
          } else {
            console.log(`No image found for ${game.title || game.name || gameId}`);
          }
        } else {
          console.error(`Error scraping ${game.title || game.name || gameId}:`, gameData.error);
        }
      } catch (error) {
        console.error('Error scraping game image:', error);
      }
    }
    
    // Atualizar cache se existir
    if (gamesCache) {
      const index = gamesCache.findIndex(g => g.id === game.id);
      if (index >= 0) {
        gamesCache[index] = game;
      } else {
        gamesCache.push(game);
      }
    }
    
    return game;
  } catch (error) {
    console.error('Error fetching game by ID:', error.message);
    throw new Error(error.message || 'Erro ao buscar o jogo');
  }
};

// Função de busca otimizada
export const searchGames = async (searchTerm, selectedSubjects = [], selectedGameTypes = []) => {
  try {
    console.log(`Searching for: "${searchTerm}"`);
    
    // Ensure we have games in cache
    if (!gamesCache) {
      await fetchGames();
    }
    
    // Start with all games or search filtered ones
    let filteredGames = gamesCache;
    
    // Apply text search if there's a search term
    if (searchTerm && searchTerm.trim() !== '') {
      const normalizedSearchTerm = searchTerm.toLowerCase().trim();
      
      filteredGames = gamesCache.filter(game => {
        // Verify in various properties
        const gameTitle = (game.title || game.name || '').toLowerCase();
        const gameDescription = (game.description || '').toLowerCase();
        const gameSubject = (game.subject || '').toLowerCase();
        
        // Check tags, handling different formats
        let tagMatch = false;
        if (game.tags) {
          if (Array.isArray(game.tags)) {
            tagMatch = game.tags.some(tag => {
              if (typeof tag === 'string') {
                return tag.toLowerCase().includes(normalizedSearchTerm);
              } else if (tag && typeof tag === 'object' && tag.name) {
                return tag.name.toLowerCase().includes(normalizedSearchTerm);
              }
              return false;
            });
          }
        }
        
        return (
          gameTitle.includes(normalizedSearchTerm) ||
          gameDescription.includes(normalizedSearchTerm) ||
          gameSubject.includes(normalizedSearchTerm) ||
          tagMatch
        );
      });
    }
    
    console.log(`Found ${filteredGames.length} games after text search`);
    return filteredGames;
  } catch (error) {
    console.error('Error searching games:', error.message);
    throw new Error(error.message || 'Erro ao buscar jogos');
  }
};

// Improved filter function with better type checking
export const filterGames = (games, selectedSubjects = [], selectedGameTypes = []) => {
  if (!games || !Array.isArray(games)) {
    console.error('filterGames: Invalid games array');
    return [];
  }
  
  if (!selectedSubjects.length && !selectedGameTypes.length) {
    return games;
  }
  
  return games.filter(game => {
    // Subject filtering with better type checking
    const subjectMatch = selectedSubjects.length === 0 || 
      (game.subject && typeof game.subject === 'string' && 
       selectedSubjects.some(subject => game.subject.toLowerCase().includes(subject.toLowerCase())));
    
    // Game type (tags) filtering with better type handling
    let tagsMatch = selectedGameTypes.length === 0;
    
    if (!tagsMatch && game.tags) {
      if (Array.isArray(game.tags)) {
        tagsMatch = game.tags.some(tag => {
          // Handle tag being a string
          if (typeof tag === 'string') {
            return selectedGameTypes.some(type => 
              tag.toLowerCase().includes(type.toLowerCase())
            );
          }
          // Handle tag being an object with name property
          else if (tag && typeof tag === 'object' && tag.name) {
            return selectedGameTypes.some(type => 
              tag.name.toLowerCase().includes(type.toLowerCase())
            );
          }
          return false;
        });
      }
    }
    
    return subjectMatch && tagsMatch;
  });
};