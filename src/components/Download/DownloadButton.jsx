import React, { useState, useEffect } from 'react';
import { Download, Loader, AlertTriangle, Play } from 'lucide-react';
import './DownloadButton.css';

const DownloadButton = ({ url, gameUrl, onDownloadComplete, isInstalled, className }) => {
  // Usar gameUrl se fornecido, caso contrário usar url (para compatibilidade com ambos)
  useEffect(() => {
    if (isInstalled) {
      setDownloadState('completed');
    }
  }, [isInstalled]);
  
  const downloadUrl = gameUrl || url;
  
  const [downloadState, setDownloadState] = useState('idle'); 
  const [progress, setProgress] = useState(0);
  const [downloadPath, setDownloadPath] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Função para manipular eventos de progresso do download
    const handleDownloadProgress = (event, progressData) => {
      console.log('Download progress:', progressData);
      
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
      // Registrar listener para eventos de progresso de download
      window.electronAPI.onDownloadProgress(handleDownloadProgress);
      console.log('Listener de download registrado');
    } else {
      console.error('Electron API não está disponível em DownloadButton');
    }

    return () => {
      if (window.electronAPI) {
        // Remover listener quando o componente for desmontado
        window.electronAPI.removeDownloadProgress(handleDownloadProgress);
      }
    };
  }, []);

  const handleDownload = async () => {
    try {
      // Verificar se electronAPI está disponível
      if (!window.electronAPI) {
        throw new Error('API do Electron não disponível');
      }
      
      // CORREÇÃO AQUI: Verificação da URL antes de continuar
      if (!downloadUrl) {
        console.error('URL vazia fornecida para download');
        setErrorMessage('URL não fornecida. Por favor, insira uma URL válida do Itch.io');
        setDownloadState('error');
        return; // Retorno antecipado se não houver URL
      }
      
      // Verificação de formato de URL básica
      if (typeof downloadUrl !== 'string' || !downloadUrl.trim()) {
        console.error('URL inválida:', downloadUrl);
        setErrorMessage('URL inválida. Por favor, insira uma URL válida do Itch.io');
        setDownloadState('error');
        return;
      }
      
      // Verificar se é uma URL do Itch.io 
      if (!downloadUrl.includes('itch.io')) {
        console.error('Não é URL do itch.io:', downloadUrl);
        setErrorMessage('Por favor, forneça uma URL válida do Itch.io');
        setDownloadState('error');
        return;
      }
      
      console.log('Iniciando download com URL:', downloadUrl);
      setDownloadState('downloading');
      setProgress(5);
      setErrorMessage('');
      
      // Chamar a API do Electron para download
      console.log('Chamando electronAPI.downloadGame com URL:', downloadUrl);
      const result = await window.electronAPI.downloadGame(downloadUrl);
      console.log("------------------------------------"+result.success+ "------------------------"+ result.path)
      console.log('Resultado do download:', result);
      
      if (result && result.success) {
        setDownloadPath(result.path || (result.files && result.files[0]));
        setDownloadState('completed');
        setProgress(100);
        
        if (onDownloadComplete) {
          onDownloadComplete(result);
        }
      } else {
        const msg = result && result.message ? result.message : 'Falha no download';
        console.error('Erro de download:', msg);
        setErrorMessage(msg);
        setDownloadState('error');
      }
    } catch (error) {
      console.error('Erro no processo de download:', error);
      setErrorMessage(error.message || 'Falha inesperada no download');
      setDownloadState('error');
      setProgress(0);
    }
  };

  const runGame = () => {
    try {
      console.log('\n\n\n\nTentando executar o jogo...\n\n\n\n');
      if (downloadPath && window.electronAPI) {
        console.log('Tentando abrir:', downloadPath);
        window.electronAPI.openFileByPath(downloadPath, gameName);
      } else if (!downloadPath) {
        setErrorMessage('Caminho do jogo não disponível');
        setDownloadState('error');
      } else {
        setErrorMessage('API do Electron não disponível para abrir o jogo');
        setDownloadState('error');
      }
    } catch (error) {
      console.error('Erro ao tentar executar o jogo:', error);
      setErrorMessage('Erro ao tentar executar o jogo: ' + (error.message || ''));
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
    // Estados 'downloading' e 'extracting' não fazem nada quando clicados (botão desabilitado)
  };

  const getButtonClass = () => {
    let baseClass = 'download-button';
    if (className) baseClass = `${baseClass} ${className}`;
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