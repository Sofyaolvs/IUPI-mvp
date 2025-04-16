import React, { useState, useEffect } from 'react';
import { Download, Loader, AlertTriangle, Play } from 'lucide-react';
import '../css/DownloadButton.css';

const DownloadButton = ({ gameName, url, gameUrl, onDownloadComplete, className }) => {
  const downloadUrl = gameUrl || url;
  console.log('[DownloadButton] Props recebidas:', { gameName, url });

  console.log('[DownloadButton] Props recebidas:', { gameName });



  const [downloadState, setDownloadState] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [downloadPath, setDownloadPath] = useState('');
  const [executablePath, setExecutablePath] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const checkIfGameInstalled = async () => {
      if (!window.electronAPI || !downloadUrl) return;

      try {
        const installedGames = await window.electronAPI.checkInstalledGames();
        console.log('Jogos instalados:', installedGames);

        const gameSlug = downloadUrl.split('/').filter(Boolean).pop().toLowerCase().replace(/\s+/g, '-');
        console.log('Slug do jogo:', gameSlug);

        const formattedInstalledGames = installedGames.map(game =>
          game.toLowerCase().replace(/\s+/g, '-')
        );
    
        // Verifica se o jogo está instalado comparando com o gameSlug
        if (formattedInstalledGames.includes(gameSlug)) {
          console.log('Jogo já instalado:', gameSlug);
          // Atualizar o estado para refletir que o jogo já está instalado
          setDownloadState('completed');
          setProgress(100);
          setDownloadPath(`lib/${gameSlug}`);
          setExecutablePath(`lib/${gameSlug}`);
        } else {
          // Jogo não encontrado, mantém o estado 'idle' para download
          setDownloadState('idle');
        }
      } catch (err) {
        console.error('Erro ao verificar jogos instalados:', err);
        setDownloadState('error');
      }
    };

    checkIfGameInstalled();

    const handleDownloadProgress = (event, progressData) => {
      if (progressData) {
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
  }, [downloadUrl]);

  const handleDownload = async () => {
    try {
      if (!window.electronAPI) {
        throw new Error('API do Electron não disponível');
      }

      if (!downloadUrl) {
        setErrorMessage('URL não fornecida. Por favor, insira uma URL válida do Itch.io');
        setDownloadState('error');
        return;
      }

      console.log('Iniciando download com URL:', downloadUrl);
      setDownloadState('downloading');
      setProgress(5);
      setErrorMessage('');

      const result = await window.electronAPI.downloadGame(downloadUrl);
      if (result && result.success) {
        setDownloadPath(result.path || (result.files && result.files[0]));
        setExecutablePath(result.executablePath || result.executables?.[0]);
        setDownloadState('completed');
        setProgress(100);
        if (onDownloadComplete) onDownloadComplete(result);
      } else {
        setErrorMessage(result.message || 'Falha no download');
        setDownloadState('error');
      }
    } catch (error) {
      console.error('Erro no processo de download:', error);
      setErrorMessage(error.message || 'Falha inesperada no download');
      setDownloadState('error');
    }
  };

  const runGame = () => {
    if (!window.electronAPI) {
      setErrorMessage('API do Electron não disponível para abrir o jogo');
      setDownloadState('error');
      return;
    }

    if (executablePath) {
      window.electronAPI.openFileByPath(executablePath, gameName);
    } else if (downloadPath) {
      window.electronAPI.openFileByPath(downloadPath, gameName);
    } else {
      setErrorMessage('Caminho do jogo não disponível');
      setDownloadState('error');
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
      case 'extracting': return <Loader className="icon spinning" />;
      case 'completed': return <Play className="icon" />;
      case 'error': return <AlertTriangle className="icon" />;
      default: return <Download className="icon" />;
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
    if (className) baseClass = `${baseClass} ${className}`;
    if (downloadState === 'completed') return `${baseClass} completed`;
    if (downloadState === 'error') return `${baseClass} error`;
    if (downloadState === 'downloading' || downloadState === 'extracting') return `${baseClass} disabled`;
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
          <div className="progress" style={{ width: `${progress}%` }} />
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
