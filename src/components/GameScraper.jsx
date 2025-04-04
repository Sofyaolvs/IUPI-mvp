import React, { useState } from 'react';

const GameScraper = ({ onScrapingComplete }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleScrape = async () => {
    if (!url) {
      setError('Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // In a real React app, you would make an API call to your backend
      // which would handle the puppeteer scraping functionality
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Failed to scrape data');
      }

      const scrapedData = await response.json();
      if (onScrapingComplete) {
        onScrapingComplete(scrapedData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded shadow-sm">
      <h2 className="text-xl font-bold mb-4">Game Information Scraper</h2>
      <div className="flex flex-col gap-4">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter game URL"
          className="p-2 border rounded"
        />
        <button
          onClick={handleScrape}
          disabled={isLoading}
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isLoading ? 'Scraping...' : 'Scrape Game Info'}
        </button>
        {error && <div className="text-red-500">{error}</div>}
      </div>
    </div>
  );
};

export default GameScraper