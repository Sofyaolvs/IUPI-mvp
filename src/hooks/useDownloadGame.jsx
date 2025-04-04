import { useCallback } from 'react';

export function useDownloadGame() {
  const download = useCallback(async (url) => {
    try {
      const result = await window.electronAPI.downloadGame(url);
      console.log('Resultado do download:', result);
      return result;
    } catch (error) {
      console.error('Erro ao baixar o jogo:', error);
      return { success: false, message: 'Erro ao baixar o jogo' };
    }
  }, []);

  return download;
}
