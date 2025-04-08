import React, { useState } from 'react';

const GameExecutor = ({ filePath }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleExecute = async () => {
    if (!filePath) {
      setError('Nenhum caminho de arquivo fornecido');
      return;
    }
    console.log("a")
    setIsExecuting(true);
    setError(null);
    setResult(null);

    try {
      // 🔌 Chamada via IPC para Electron
      console.log("b")
      const response = await window.electronAPI.executeGame(filePath);

      console.log(response)
      console.log("c")

      if (response?.error) {
        throw new Error(response.error);
      }

      setResult(response?.output || 'Jogo iniciado com sucesso!');
    } catch (err) {
      setError(err.message || 'Erro ao executar o jogo');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="p-4 border rounded shadow-sm">
      <h2 className="text-xl font-bold mb-4">Game Launcher</h2>
      <div className="flex flex-col gap-4">
        <div className="text-gray-700">Arquivo: {filePath || 'Nenhum arquivo selecionado'}</div>
        <button
          onClick={handleExecute}
          disabled={isExecuting || !filePath}
          className="bg-purple-500 text-white p-2 rounded hover:bg-purple-600 disabled:bg-gray-400"
        >
          {isExecuting ? 'Iniciando...' : 'Jogar'}
        </button>
        
        {error && <div className="text-red-500">{error}</div>}
        
        {result && (
          <div className="bg-gray-100 p-2 rounded">
            <div className="font-bold">Resultado da Execução:</div>
            <pre className="whitespace-pre-wrap">{result}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameExecutor;
