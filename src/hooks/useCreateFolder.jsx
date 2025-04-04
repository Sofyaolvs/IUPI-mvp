import { useCallback } from 'react';

export function useCreateFolder() {
  const createFolder = useCallback(async () => {
    try {
      const result = await window.electronAPI.createFolder();
      console.log(result);
    } catch (error) {
      console.error('Erro ao criar pasta:', error);
    }
  }, []);

  return createFolder;
}
