import React, { useState, useEffect } from 'react';
import { Download, Loader, AlertTriangle, Play } from 'lucide-react';
import '../css/DownloadButton.css';

const DownloadButton = ({ gameUrl, className }) => {
  const [downloadState, setDownloadState] = useState('idle'); 
  const [progress, setProgress] = useState(0);
  const [downloadPath, setDownloadPath] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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
        return <Loader className="icon spinning" />;
      case 'completed':
        return <Play className="icon" />;
      case 'error':
        return <AlertTriangle className="icon" />;
      default:
        return <Download className="icon" />;
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
    let base = 'download-button';
    if (downloadState === 'completed') return `${base} completed`;
    if (downloadState === 'error') return `${base} error`;
    return base;
  };

  return (
    <div className={`download-wrapper ${className || ''}`}>
      <button
        onClick={buttonAction}
        disabled={downloadState === 'downloading' || downloadState === 'extracting'}
        className={`${getButtonClass()} ${downloadState === 'downloading' || downloadState === 'extracting' ? 'disabled' : ''}`}
      >
        {getButtonIcon()}
        {getButtonText()}
      </button>

      {(downloadState === 'downloading' || downloadState === 'extracting') && (
        <div className="progress-bar">
          <div className="progress" style={{ width: `${progress}%` }}></div>
        </div>
      )}

      {downloadState === 'completed' && (
        <p className="message success">Jogo pronto para jogar!</p>
      )}

      {downloadState === 'error' && (
        <p className="message error">{errorMessage || 'Erro durante o download'}</p>
      )}
    </div>
  );
};

export default DownloadButton;
