import { useCallback } from 'react';

export function useOpenAndExecuteFile() {
  const openFile = useCallback(async (filePath) => {
    try {
      const result = await window.electronAPI.openAndExecuteFile(filePath);
      console.log('Resultado da execução:', result);
    } catch (error) {
      console.error('Erro ao executar arquivo:', error);
    }
  }, []);

  return openFile;
}
