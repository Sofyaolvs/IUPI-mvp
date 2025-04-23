const API_URL = 'http://172.18.9.214:3001';

// Cache para armazenar jogos já buscados
let gamesCache = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos em milissegundos

// Extrair imagem para card
const extractCardImage = (gameData) => {
  if (!gameData) return null;
  
  if (gameData.cardImage && typeof gameData.cardImage === 'string') {
    return gameData.cardImage;
  }

  if (gameData.images && Array.isArray(gameData.images) && gameData.images.length > 0) {
    return gameData.images[0];
  }
  
  return null;
};

// Buscar jogos da API com cache
export const fetchGames = async (forceRefresh = false) => {
  try {
    const now = Date.now();
    
    // Usar cache se disponível e ainda válido, a menos que forceRefresh seja true
    if (!forceRefresh && gamesCache && (now - lastFetchTime) < CACHE_TTL) {
      console.log('Using cached games data');
      return gamesCache;
    }
    
    console.log('Fetching fresh games from API');
    const response = await fetch(`${API_URL}/games`, {
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

// Processar imagens dos jogos em lote
async function processGamesImages(games) {
  const processedGames = [];
  const gamesNeedingImages = [];
  
  // Primeiro passo: identificar jogos que precisam de imagens
  for (const game of games) {
    if (!game || !game.url) {
      console.warn('Skipping invalid game entry:', game);
      continue;
    }
    
    // Se já tem imagem, não precisa processar
    if (game.cardImage || game.image) {
      processedGames.push(game);
    } else {
      gamesNeedingImages.push(game);
    }
  }
  
  // Segundo passo: processar em paralelo apenas os jogos que precisam de imagens
  if (gamesNeedingImages.length > 0) {
    console.log(`Processing images for ${gamesNeedingImages.length} games`);
    
    // Limitar processamento paralelo para não sobrecarregar
    const batchSize = 5;
    for (let i = 0; i < gamesNeedingImages.length; i += batchSize) {
      const batch = gamesNeedingImages.slice(i, i + batchSize);
      
      // Processar batch em paralelo
      const promises = batch.map(async (game) => {
        try {
          const gameData = await window.electronAPI.scrapeGame(game.url);
          
          if (!gameData.error) {
            const cardImage = extractCardImage(gameData);
            
            if (cardImage) {
              game.cardImage = cardImage;
              game.image = cardImage;
            }
          }
          return game;
        } catch (error) {
          console.error(`Error processing game ${game.title || 'Untitled'}:`, error);
          return game;
        }
      });
      
      const processedBatch = await Promise.all(promises);
      processedGames.push(...processedBatch);
      
      // Pequena pausa entre batches para evitar sobrecarga
      if (i + batchSize < gamesNeedingImages.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
  
  return processedGames;
}

// Buscar jogo por ID com cache
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
    
    const response = await fetch(`${API_URL}/games/${gameId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar jogo: ${response.statusText}`);
    }

    const game = await response.json();
    
    // Processar imagem se necessário
    if (!game.cardImage && !game.image && game.url) {
      try {
        const gameData = await window.electronAPI.scrapeGame(game.url);
        
        if (!gameData.error) {
          const cardImage = extractCardImage(gameData);
          
          if (cardImage) {
            game.cardImage = cardImage;
            game.image = cardImage;
          }
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
        const gameTags = (game.tags || []).map(tag => tag.name.toLowerCase());
        
        return (
          gameTitle.includes(normalizedSearchTerm) ||
          gameDescription.includes(normalizedSearchTerm) ||
          gameSubject.includes(normalizedSearchTerm) ||
          gameTags.some(tag => tag.includes(normalizedSearchTerm))
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

export const filterGames = (games, selectedSubjects = [], selectedGameTypes = []) => {
  if (!selectedSubjects.length && !selectedGameTypes.length) {
    return games;
  }
  
  return games.filter(game => {
    // Subject filtering
    const subjectMatch = selectedSubjects.length === 0 || 
      (game.subject && selectedSubjects.includes(game.subject.toLowerCase()));
    
    // Game type (tags) filtering
    const tagsMatch = selectedGameTypes.length === 0 || 
      (game.tags && game.tags.some(tag => 
        selectedGameTypes.includes(tag.name.toLowerCase())
      ));
    
    return subjectMatch && tagsMatch;
  });
};
