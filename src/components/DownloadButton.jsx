import React, { useState, useEffect } from 'react';
import { Download, Loader, CheckCircle, AlertTriangle, Play } from 'lucide-react';

const DownloadButton = ({ gameUrl, className }) => {
  const [downloadState, setDownloadState] = useState('idle'); 
  const [progress, setProgress] = useState(0);
  const [downloadPath, setDownloadPath] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [gameInfo, setGameInfo] = useState(null);


  useEffect(() => {
    
    const handleDownloadProgress = (event, progressData) => {
      setProgress(progressData.percent || 0);
      
      if (progressData.status === 'extracting') {
        setDownloadState('extracting');
      }
    };

   
    if (window.electronAPI) {
      window.electronAPI.onDownloadProgress(handleDownloadProgress);
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeDownloadProgress(handleDownloadProgress);
      }
    };
  }, []);

  const handleDownload = async () => {
    try {
      setDownloadState('downloading');
      setProgress(5);
      setErrorMessage('');
   
      const result = await window.electronAPI.downloadGame(gameUrl);
      
      if (result.success) {
        setDownloadPath(result.path);
        setDownloadState('completed');
        setProgress(100);
      } else {
        setErrorMessage(result.message || 'Download failed');
        setDownloadState('error');
      }
    } catch (error) {
      console.error('Download error:', error);
      setErrorMessage(error.message || 'Download failed unexpectedly');
      setDownloadState('error');
    }
  };

  const runGame = () => {
    if (downloadPath) {
     
      window.electronAPI.openFileByPath(downloadPath);
    }
  };

  const getButtonText = () => {
    switch (downloadState) {
      case 'downloading':
        return 'Baixando...';
      case 'extracting':
        return 'Extraindo...';
      case 'completed':
        return 'Jogar';
      case 'error':
        return 'Tentar Novamente';
      default:
        return 'Download';
    }
  };

  const getButtonIcon = () => {
    switch (downloadState) {
      case 'downloading':
      case 'extracting':
        return <Loader className="mr-2 h-4 w-4 animate-spin" />;
      case 'completed':
        return <Play className="mr-2 h-4 w-4" />;
      case 'error':
        return <AlertTriangle className="mr-2 h-4 w-4" />;
      default:
        return <Download className="mr-2 h-4 w-4" />;
    }
  };

  const buttonAction = () => {
    if (downloadState === 'completed') {
      runGame();
    } else if (downloadState === 'error' || downloadState === 'idle') {
      handleDownload();
    }
  };

  return (
    <div className="flex flex-col w-full max-w-xs">
      <button
        onClick={buttonAction}
        disabled={downloadState === 'downloading' || downloadState === 'extracting'}
        className={`flex items-center justify-center px-4 py-2 rounded-md text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
          downloadState === 'completed' 
            ? 'bg-green-600 hover:bg-green-700' 
            : downloadState === 'error'
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-blue-600 hover:bg-blue-700'
        } ${downloadState === 'downloading' || downloadState === 'extracting' ? 'opacity-90 cursor-not-allowed' : ''} ${className || ''}`}
      >
        {getButtonIcon()}
        {getButtonText()}
      </button>
      
      {(downloadState === 'downloading' || downloadState === 'extracting') && (
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
      
      {downloadState === 'completed' && (
        <p className="text-sm text-green-600 mt-2">Jogo pronto para jogar!</p>
      )}
      
      {downloadState === 'error' && (
        <p className="text-sm text-red-600 mt-2">{errorMessage || 'Erro durante o download'}</p>
      )}
    </div>
  );
};

export default DownloadButton;