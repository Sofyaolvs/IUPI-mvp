import React, { useState } from 'react';
import GameScraper from './GameScraper.jsx'
import GameDownloader from './GameDownloader.jsx'
import GameExecutor from './GameExecutor.jsx'

const GameManager = () => {
  const [scrapedData, setScrapedData] = useState(null);
  const [downloadedGame, setDownloadedGame] = useState(null);
  const [activeTab, setActiveTab] = useState('scrape');

  const handleScrapingComplete = (data) => {
    setScrapedData(data);
    setActiveTab('download');
  };

  const handleDownloadComplete = (data) => {
    setDownloadedGame(data);
    setActiveTab('execute');
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Game Manager</h1>
      
      <div className="flex mb-4 border-b">
        <button
          onClick={() => setActiveTab('scrape')}
          className={`p-2 ${activeTab === 'scrape' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
        >
          Scrape
        </button>
        <button
          onClick={() => setActiveTab('download')}
          className={`p-2 ${activeTab === 'download' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
          disabled={!scrapedData}
        >
          Download
        </button>
        <button
          onClick={() => setActiveTab('execute')}
          className={`p-2 ${activeTab === 'execute' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
          disabled={!downloadedGame}
        >
          Execute
        </button>
      </div>
      
      {activeTab === 'scrape' && (
        <GameScraper onScrapingComplete={handleScrapingComplete} />
      )}
      
      {activeTab === 'download' && (
        <GameDownloader 
          url={scrapedData?.downloadUrl} 
          onDownloadComplete={handleDownloadComplete} 
        />
      )}
      
      {activeTab === 'execute' && (
        <GameExecutor filePath={downloadedGame?.path} />
      )}
      
      {scrapedData && (
        <div className="mt-6 p-4 border rounded">
          <h2 className="text-xl font-bold mb-2">{scrapedData.title}</h2>
          <p className="mb-4">{scrapedData.description}</p>
          
          {scrapedData.images.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {scrapedData.images.slice(0, 4).map((img, index) => (
                <div key={index} className="bg-gray-200 h-32 flex items-center justify-center">
                  <img src="/api/placeholder/200/150" alt={img.alt} className="max-h-full" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GameManager