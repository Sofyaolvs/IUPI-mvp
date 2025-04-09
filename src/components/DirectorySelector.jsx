import React, { useState, useEffect } from 'react';
import { FolderOpen, Check, AlertCircle } from 'lucide-react';
import '../css/DirectorySelector.css';

const DirectorySelector = ({ 
  onDirectorySelected,
  defaultPath,
  label = "Selecionar pasta para jogos",
  className
}) => {
  const [selectedPath, setSelectedPath] = useState(defaultPath || '');
  const [status, setStatus] = useState(defaultPath ? 'selected' : 'initial');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (defaultPath) {
      setSelectedPath(defaultPath);
      setStatus('selected');
    }
  }, [defaultPath]);

  const handleSelectDirectory = async () => {
    try {
      setStatus('selecting');
      setError(null);

      if (!window.electronAPI || !window.electronAPI.selectDirectory) {
        throw new Error('API de seleção de diretório não disponível');
      }

      const result = await window.electronAPI.selectDirectory();
      
      if (!result) {
        // Usuário cancelou a seleção
        setStatus(selectedPath ? 'selected' : 'initial');
        return;
      }

      setSelectedPath(result);
      setStatus('selected');
      
      // Notificar o componente pai
      if (onDirectorySelected && typeof onDirectorySelected === 'function') {
        onDirectorySelected(result);
      }
    } catch (err) {
      console.error('Erro ao selecionar diretório:', err);
      setError(err.message || 'Erro ao selecionar o diretório');
      setStatus('error');
    }
  };

  return (
    <div className={`directory-selector ${className || ''} status-${status}`}>
      <div className="directory-selector-content">
        <button 
          className={`directory-selector-button ${status}`}
          onClick={handleSelectDirectory}
          disabled={status === 'selecting'}
        >
          {status === 'selecting' ? (
            <span className="loading-spinner"></span>
          ) : status === 'selected' ? (
            <Check className="directory-icon success" />
          ) : status === 'error' ? (
            <AlertCircle className="directory-icon error" />
          ) : (
            <FolderOpen className="directory-icon" />
          )}
          
          <span className="button-text">
            {status === 'selecting' ? 'Selecionando...' : label}
          </span>
        </button>
        
        {selectedPath && (
          <div className="selected-path">
            <span className="path-label">Pasta selecionada:</span>
            <span className="path-value" title={selectedPath}>
              {selectedPath}
            </span>
          </div>
        )}
        
        {error && (
          <div className="directory-error">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default DirectorySelector;