import React, { useState, useEffect } from 'react';

const GameLibrary = () => {
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        // In a real React app, you would make an API call to your backend
        const response = await fetch('/api/games');
        if (!response.ok) {
          throw new Error('Failed to fetch games');
        }
        const data = await response.json();
        setGames(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGames();
  }, []);

  const handleLaunchGame = (filePath) => {
    // This would typically call your GameExecutor component
    console.log(`Launching game: ${filePath}`);
  };

  if (isLoading) {
    return <div className="p-4">Loading your game library...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Your Game Library</h2>
      
      {games.length === 0 ? (
        <div className="text-gray-500">No games found in your library</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((game) => (
            <div key={game.id} className="border rounded p-4 flex flex-col">
              <div className="bg-gray-200 h-32 mb-2 flex items-center justify-center">
                <img src="/api/placeholder/150/100" alt={game.title} className="max-h-full" />
              </div>
              <h3 className="font-bold">{game.title}</h3>
              <p className="text-sm text-gray-700 flex-grow">{game.description.substring(0, 100)}...</p>
              <button
                onClick={() => handleLaunchGame(game.filePath)}
                className="mt-2 bg-green-500 text-white p-2 rounded hover:bg-green-600"
              >
                Launch Game
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default GameLibrary