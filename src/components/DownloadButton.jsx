import React, { useState, useEffect } from 'react';
import { Download, Loader, AlertTriangle, Play } from 'lucide-react';

const DownloadButton = ({ url, onDownloadComplete }) => {
  const [downloadState, setDownloadState] = useState('idle'); 
  const [progress, setProgress] = useState(0);
  const [downloadPath, setDownloadPath] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Function to handle download progress events from main process
    const handleDownloadProgress = (event, progressData) => {
      console.log('Download progress:', progressData);
      setProgress(progressData.percent || 0);
      
      if (progressData.status === 'extracting') {
        setDownloadState('extracting');
      } else if (progressData.status === 'complete') {
        setDownloadState('completed');
      } else if (progressData.status === 'error') {
        setDownloadState('error');
        setErrorMessage(progressData.error || 'Erro durante o download');
      } else if (progressData.status === 'downloading') {
        setDownloadState('downloading');
      }
    };

    if (window.electronAPI) {
      // Register listener for download progress events
      window.electronAPI.onDownloadProgress(handleDownloadProgress);
      
    
      console.log('api passsa aq');
    } else {
      console.error('Electron API is not available in DownloadButton');
    }

    return () => {
      if (window.electronAPI) {
        // Remove listener when component unmounts
        window.electronAPI.removeDownloadProgress(handleDownloadProgress);
      }
    };
  }, []);

  const handleDownload = async () => {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API não disponível');
      }

      console.log('download começando aq', url);
      setDownloadState('downloading');
      setProgress(5);
      setErrorMessage('');
   
      // Start game download
      const result = await window.electronAPI.downloadGame(url);
      console.log('Download result:', result);
      
      if (result.success) {
        setDownloadPath(result.path);
        setDownloadState('completed');
        setProgress(100);
        
        // Notify parent component about completed download
        if (onDownloadComplete) {
          onDownloadComplete(result);
        }
      } else {
        setErrorMessage(result.message || 'Falha no download');
        setDownloadState('error');
      }
    } catch (error) {
      console.error('Erro no download:', error);
      setErrorMessage(error.message || 'Falha inesperada no download');
      setDownloadState('error');
    }
  };

  const runGame = () => {
    if (downloadPath && window.electronAPI) {
      window.electronAPI.openFileByPath(downloadPath);
    }
  };

  const getButtonText = () => {
    switch (downloadState) {
      case 'downloading': return 'Baixando...';
      case 'extracting': return 'Extraindo...';
      case 'completed': return 'Jogar';
      case 'error': return 'Tentar Novamente';
      default: return 'Download';
    }
  };

  const getButtonIcon = () => {
    switch (downloadState) {
      case 'downloading':
      case 'extracting':
        return <Loader className="animate-spin" />;
      case 'completed':
        return <Play />;
      case 'error':
        return <AlertTriangle />;
      default:
        return <Download />;
    }
  };

  const buttonAction = () => {
    if (downloadState === 'completed') {
      runGame();
    } else if (downloadState === 'error' || downloadState === 'idle') {
      handleDownload();
    }
  };

  const getButtonClass = () => {
    let base = 'flex items-center justify-center gap-2 px-4 py-2 rounded';
    if (downloadState === 'completed') return `${base} bg-green-500 text-white`;
    if (downloadState === 'error') return `${base} bg-red-500 text-white`;
    return `${base} bg-blue-500 text-white`;
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={buttonAction}
        disabled={downloadState === 'downloading' || downloadState === 'extracting'}
        className={`${getButtonClass()} ${downloadState === 'downloading' || downloadState === 'extracting' ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        {getButtonIcon()}
        {getButtonText()}
      </button>

      {(downloadState === 'downloading' || downloadState === 'extracting') && (
        <div className="w-full bg-gray-200 rounded-full overflow-hidden h-2">
          <div 
            className="bg-blue-500 h-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {downloadState === 'completed' && (
        <p className="text-green-600 text-sm">Jogo pronto para jogar!</p>
      )}

      {downloadState === 'error' && (
        <p className="text-red-600 text-sm">{errorMessage || 'Erro durante o download'}</p>
      )}
    </div>
  );
};

export default DownloadButton;