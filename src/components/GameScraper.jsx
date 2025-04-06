import React, { useState } from 'react';

const GameScraper = () => {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gameData, setGameData] = useState(null);

  const fetchGameInfo = async (url) => {
    try {
      setLoading(true);
      setError('');
      const data = await window.electronAPI.scrapeGame(url);

      if (data.error) throw new Error(data.error);

      setGameData({
        title: data.title,
        description: data.description,
        developer: data.developer,
        images: data.images.length > 0 ? data.images : ['/api/placeholder/400/300'],
        tags: data.tags || [],
        releaseDate: data.releaseDate || '',
        url
      });
    } catch (err) {
      console.error(err);
      setError('Falha ao buscar informações do jogo.');
      setGameData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (urlInput.trim()) {
      fetchGameInfo(urlInput.trim());
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">scraping</h1>

      <form onSubmit={handleSubmit} className="mb-6 flex gap-2 items-center">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Cole a URL do jogo no itch.io"
          className="flex-1 border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading || !urlInput.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Buscar
        </button>
      </form>

      
      {loading ? (
        <p className="text-center">Carregando informações do jogo...</p>
      ) : error ? (
        <div className="bg-red-100 p-4 rounded text-red-700">{error}</div>
      ) : gameData ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="bg-gray-100 p-4 rounded">
              <h2 className="font-bold text-xl mb-2">{gameData.title}</h2>
              {gameData.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {gameData.tags.map((tag, i) => (
                    <span key={i} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
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
                      alt={`Screenshot ${i + 1} de ${gameData.title}`}
                      className="w-full h-40 object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-sm text-center">Insira uma URL de jogo no itch.io para buscar os dados.</p>
      )}
    </div>
  );
};

export default GameScraper;
