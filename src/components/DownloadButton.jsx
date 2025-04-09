import React, { useState, useEffect } from 'react';
import { Download, Loader, AlertTriangle, Play } from 'lucide-react';
import '../css/DownloadButton.css'

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
  
      // Validação mais simples e correta da URL (caindo aq qnd tenmta baixar!!!) sendo q a url nn tá vazia???
      if (!url || typeof url !== 'string') {
        throw new Error('URL vazia ou inválida');
      }
  
      // Verificar se é uma URL do Itch.io 
      if (!url.includes('itch.io')) {
        throw new Error('Por favor, forneça uma URL válida do Itch.io');
      }
  
      console.log('download começando com URL:', url);
      setDownloadState('downloading');
      setProgress(5);
      setErrorMessage('');
     
      const result = await window.electronAPI.downloadGame(url);
      console.log('Download result:', result);
      
      if (result.success) {
        setDownloadPath(result.path);
        setDownloadState('completed');
        setProgress(100);
        
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
    let baseClass = 'download-button';
    if (downloadState === 'completed') return `${baseClass} completed`;
    if (downloadState === 'error') return `${baseClass} error`;
    if (downloadState === 'downloading' || downloadState === 'extracting') 
      return `${baseClass} disabled`;
    return baseClass;
  };

  return (
    <div className="download-wrapper">
      <button
        onClick={buttonAction}
        disabled={downloadState === 'downloading' || downloadState === 'extracting'}
        className={getButtonClass()}
      >
        {getButtonIcon()}
        {getButtonText()}
      </button>

      {(downloadState === 'downloading' || downloadState === 'extracting') && (
        <div className="progress-bar">
          <div 
            className="progress" 
            style={{ width: `${progress}%` }}
          />
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