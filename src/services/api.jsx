const API_URL = 'http://172.18.9.214:3001';

// Utility function to extract first image from game data
const extractCardImage = (gameData) => {
  if (!gameData) return null;
  
  // Try to get the cardImage first
  if (gameData.cardImage && typeof gameData.cardImage === 'string') {
    return gameData.cardImage;
  }
  
  // Fall back to first image in the images array
  if (gameData.images && Array.isArray(gameData.images) && gameData.images.length > 0) {
    return gameData.images[0];
  }
  
  // Fall back to default
  return null;
};

// Function to fetch games and add cardImage
export const fetchGames = async () => {
  try {
    console.log('Fetching games from API');
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
    console.log('Games from API:', games);
    
    // Process each game to ensure it has images
    const processedGames = [];
    
    for (const game of games) {
      // Skip invalid games
      if (!game || !game.url) {
        console.warn('Skipping invalid game entry:', game);
        continue;
      }
      
      try {
        console.log(`Processing game: ${game.title || 'Untitled'}, URL: ${game.url}`);
        
        // For each game, we need to fetch its image if it doesn't have one
        if (!game.cardImage && !game.image) {
          console.log('Game has no image, fetching from itch.io:', game.url);
          
          // Scrape the game's page to get images
          const gameData = await window.electronAPI.scrapeGame(game.url);
          
          if (!gameData.error) {
            // Extract card image
            const cardImage = extractCardImage(gameData);
            
            // Add the image to the game
            if (cardImage) {
              game.cardImage = cardImage;
              game.image = cardImage; // For backward compatibility
            }
            
            console.log('Added image to game:', game.title, cardImage ? 'image found' : 'no image found');
          } else {
            console.error('Error scraping game:', gameData.error);
          }
        }
        
        processedGames.push(game);
      } catch (error) {
        console.error(`Error processing game ${game.title || 'Untitled'}:`, error);
        // Still add the game even if processing fails
        processedGames.push(game);
      }
    }
    
    console.log('Processed games:', processedGames.length);
    return processedGames;
  } catch (error) {
    console.error('Error fetching games:', error.message);
    throw new Error(error.message || 'Erro ao conectar com o servidor');
  }
};

// Function to fetch a single game by ID
export const fetchGameById = async (gameId) => {
  try {
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
    
    // If the game doesn't have an image, scrape it
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
    
    return game;
  } catch (error) {
    console.error('Error fetching game by ID:', error.message);
    throw new Error(error.message || 'Erro ao buscar o jogo');
  }
};

// Método 1: Busca local (filtrar jogos já carregados)
export const searchGamesLocally = async (searchTerm) => {
  try {
    // Buscar todos os jogos primeiro
    const allGames = await fetchGames();
    
    // Se não houver termo de busca, retornar todos os jogos
    if (!searchTerm || searchTerm.trim() === '') {
      return allGames;
    }
    
    // Filtrar jogos pelo nome
    const normalizedSearchTerm = searchTerm.toLowerCase().trim();
    const filteredGames = allGames.filter(game => {
      // Checar se o título existe e se contém o termo de busca
      return game.title && game.title.toLowerCase().includes(normalizedSearchTerm);
    });
    
    console.log(`Found ${filteredGames.length} games matching "${searchTerm}"`);
    return filteredGames;
  } catch (error) {
    console.error('Error searching games:', error.message);
    throw new Error(error.message || 'Erro ao buscar jogos');
  }
};

// Método 2: Busca na API (assumindo que a API suporta busca por nome)
export const searchGamesAPI = async (searchTerm) => {
  try {
    // Se não houver termo de busca, buscar todos os jogos
    if (!searchTerm || searchTerm.trim() === '') {
      return await fetchGames();
    }
    
    console.log(`Searching games with term: "${searchTerm}"`);
    // Usando parâmetros de query para buscar pelo nome
    const response = await fetch(`${API_URL}/games?name=${encodeURIComponent(searchTerm)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar jogos: ${response.statusText}`);
    }

    const games = await response.json();
    console.log(`Found ${games.length} games matching "${searchTerm}"`);
    
    // Processar os jogos para garantir que tenham imagens (reutilizando lógica)
    const processedGames = [];
    
    for (const game of games) {
      if (!game || !game.url) {
        console.warn('Skipping invalid game entry:', game);
        continue;
      }
      
      try {
        // Para cada jogo, precisamos buscar sua imagem se não tiver uma
        if (!game.cardImage && !game.image) {
          const gameData = await window.electronAPI.scrapeGame(game.url);
          
          if (!gameData.error) {
            const cardImage = extractCardImage(gameData);
            
            if (cardImage) {
              game.cardImage = cardImage;
              game.image = cardImage;
            }
          }
        }
        
        processedGames.push(game);
      } catch (error) {
        console.error(`Error processing game ${game.title || 'Untitled'}:`, error);
        processedGames.push(game);
      }
    }
    
    return processedGames;
  } catch (error) {
    console.error('Error searching games from API:', error.message);
    throw new Error(error.message || 'Erro ao buscar jogos');
  }
};

// Função principal para buscar jogos - escolhe entre busca local ou na API
// Por padrão, usa a busca local que funciona em qualquer API
export const searchGames = async (searchTerm) => {
  // Você pode escolher qual método usar baseado na sua API:
  
  // Método 1: Busca local (sempre funciona, mas menos eficiente com muitos jogos)
  return await searchGamesLocally(searchTerm);
  
  // Método 2: Busca na API (mais eficiente, mas requer suporte da API)
  // return await searchGamesAPI(searchTerm);
};