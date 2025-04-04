import React, { useState,useEffect } from 'react';

const GameScraper = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gameData, setGameData] = useState({
    title: '',
    description: '',
    developer: '',
    images: []
  });

  // URL fixa do jogo no itch.io
  const gameUrl = 'https://3dsage.itch.io/3d-snowtank-gba';

  useEffect(() => {
    fetchGameInfo();
  }, []);

  
  const fetchGameInfo = async () => {
    try {
      setLoading(true);
      const data = await window.electronAPI.scrapeGame(gameUrl);
  
      if (data.error) {
        throw new Error(data.error);
      }
  
      setGameData({
        title: data.title,
        description: data.description,
        developer: data.developer,
        images: data.images.length > 0 ? data.images : ['/api/placeholder/400/300']
      });
    } catch (err) {
      setError('Falha ao buscar informações do jogo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Detalhes do Jogo no itch.io</h1>
      <p className="text-gray-600 mb-4">URL: <a href={gameUrl} target="_blank" rel="noopener noreferrer" className="underline">{gameUrl}</a></p>
      
      <div className="bg-yellow-100 p-3 rounded mb-6 border-l-4 border-yellow-500">
        <p className="text-sm">
          <strong>Nota:</strong> Este componente demonstra uma interface para exibir dados extraídos. 
          Na implementação real, a extração precisa ser feita em um backend devido às restrições de CORS/CSP.
        </p>
      </div>
      
      {loading ? (
        <div className="flex justify-center p-8">
          <p>Carregando informações do jogo...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 p-4 rounded mb-4 text-red-700">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="bg-gray-100 p-4 rounded">
              <h2 className="font-bold text-xl mb-2">{gameData.title}</h2>
              <p className="text-gray-600 mb-2">Por {gameData.developer}</p>
              
              {gameData.tags && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {gameData.tags.map((tag, i) => (
                    <span key={i} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              
              {gameData.releaseDate && (
                <p className="text-sm text-gray-600 mb-3">
                  Lançado em {gameData.releaseDate}
                </p>
              )}
              
              <button className="bg-green-600 text-white py-2 px-4 rounded w-full">
                Visitar Página do Jogo
              </button>
            </div>
          </div>
          
          <div className="md:col-span-2">
            <div className="mb-4">
              <h3 className="font-bold mb-2">Descrição</h3>
              <div className="bg-gray-100 p-4 rounded">
                <p>{gameData.description}</p>
              </div>
            </div>
            
            <div>
              <h3 className="font-bold mb-2">Imagens</h3>
              <div className="grid grid-cols-2 gap-2">
                {gameData.images.map((src, i) => (
                  <div key={i} className="overflow-hidden rounded bg-gray-200">
                    <img 
                      src={src} 
                      alt={`Screenshot ${i+1} de ${gameData.title}`} 
                      className="w-full h-40 object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameScraper;