import React, { useState } from 'react';

const GameDownloader = ({ url, onDownloadComplete }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [downloadInfo, setDownloadInfo] = useState(null);

  const handleDownload = async () => {
    if (!url) {
      setError('No URL provided');
      return;
    }

    setIsDownloading(true);
    setError(null);
    setProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          return newProgress >= 100 ? 100 : newProgress;
        });
      }, 500);

      // In a real React app, you would make an API call to your backend
      // which would handle the download functionality
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        throw new Error('Failed to download game');
      }

      const result = await response.json();
      setDownloadInfo(result);
      
      if (onDownloadComplete) {
        onDownloadComplete(result);
      }
    } catch (err) {
      setError(err.message);
      setProgress(0);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="p-4 border rounded shadow-sm">
      <h2 className="text-xl font-bold mb-4">Game Downloader</h2>
      <div className="flex flex-col gap-4">
        <div className="text-gray-700">URL: {url || 'No URL provided'}</div>
        <button
          onClick={handleDownload}
          disabled={isDownloading || !url}
          className="bg-green-500 text-white p-2 rounded hover:bg-green-600 disabled:bg-gray-400"
        >
          {isDownloading ? 'Downloading...' : 'Download Game'}
        </button>
        
        {isDownloading && (
          <div className="w-full bg-gray-200 rounded">
            <div 
              className="bg-blue-500 text-white text-center p-1 rounded" 
              style={{ width: `${progress}%` }}
            >
              {Math.round(progress)}%
            </div>
          </div>
        )}
        
        {error && <div className="text-red-500">{error}</div>}
        
        {downloadInfo && (
          <div className="bg-gray-100 p-2 rounded">
            <div className="font-bold">Download Complete!</div>
            <div>File: {downloadInfo.fileName}</div>
            <div>Path: {downloadInfo.path}</div>
            <div>{downloadInfo.message}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameDownloader