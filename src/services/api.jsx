// Modificação na função searchGamesLocally em api.jsx
export const searchGamesLocally = async (searchTerm) => {
  try {
    // Buscar todos os jogos primeiro
    const allGames = await fetchGames();
    
    // Se não houver termo de busca, retornar todos os jogos
    if (!searchTerm || searchTerm.trim() === '') {
      return allGames;
    }
    
    // Filtrar jogos pelo nome de forma mais abrangente
    const normalizedSearchTerm = searchTerm.toLowerCase().trim();
    const filteredGames = allGames.filter(game => {
      // Verificar diferentes propriedades onde o nome do jogo pode estar
      const gameTitle = game.title || game.name || '';
      const gameDescription = game.description || '';
      const gameSubject = game.subject || '';
      
      return (
        gameTitle.toLowerCase().includes(normalizedSearchTerm) ||
        gameDescription.toLowerCase().includes(normalizedSearchTerm) ||
        gameSubject.toLowerCase().includes(normalizedSearchTerm)
      );
    });
    
    console.log(`Found ${filteredGames.length} games matching "${searchTerm}"`);
    return filteredGames;
  } catch (error) {
    console.error('Error searching games:', error.message);
    throw new Error(error.message || 'Erro ao buscar jogos');
  }
};

// O método searchGames permanece o mesmo, usando o searchGamesLocally melhorado
export const searchGames = async (searchTerm) => {
  // Usando o método de busca local aprimorado
  return await searchGamesLocally(searchTerm);
};