import React, { useState } from 'react';

const GameDownloader = ({ url, onDownloadComplete }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [downloadInfo, setDownloadInfo] = useState(null);

  const handleDownload = async () => {
    if (!url) {
      setError('URL não fornecida');
      return;
    }

    setIsDownloading(true);
    setError(null);
    setProgress(0);

    try {
      // Simular progresso de download
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 8;
          return newProgress >= 100 ? 100 : newProgress;
        });
      }, 500);

      // 🔌 Chamada via IPC para Electron (download automatizado com Puppeteer)
      const result = window.electron.ipcRenderer.invoke('download-game', url);
      clearInterval(progressInterval)
      setProgress(100);

      if (result?.error) {
        throw new Error(result.error);
      }

      setDownloadInfo(result);

      if (onDownloadComplete) {
        onDownloadComplete(result);
      }
    } catch (err) {
      console.error('Erro ao baixar:', err);
      setError(err.message || 'Erro inesperado');
      setProgress(0);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="p-4 border rounded shadow-sm">
      <h2 className="text-xl font-bold mb-4">Game Downloader</h2>
      <div className="flex flex-col gap-4">
        <div className="text-gray-700">URL: {url || 'Nenhuma URL fornecida'}</div>
        
        <button
          onClick={handleDownload}
          disabled={isDownloading || !url}
          className="bg-green-500 text-white p-2 rounded hover:bg-green-600 disabled:bg-gray-400"
        >
          {isDownloading ? 'Baixando...' : 'Baixar Jogo'}
        </button>

        {isDownloading && (
          <div className="w-full bg-gray-200 rounded overflow-hidden">
            <div 
              className="bg-blue-500 text-white text-center p-1 transition-all duration-300 ease-out" 
              style={{ width: `${progress}%` }}
            >
              {Math.round(progress)}%
            </div>
          </div>
        )}

        {error && <div className="text-red-500">{error}</div>}

        {downloadInfo && (
          <div className="bg-gray-100 p-2 rounded">
            <div className="font-bold text-green-700">Download Concluído!</div>
            <div><strong>Arquivo:</strong> {downloadInfo.fileName}</div>
            <div><strong>Local:</strong> {downloadInfo.path}</div>
            {downloadInfo.message && <div>{downloadInfo.message}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameDownloader;
