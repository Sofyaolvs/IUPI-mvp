import React, { useState } from 'react';
 
const GameExecutor = ({ filePath }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleExecute = async () => {
    if (!filePath) {
      setError('No file path provided');
      return;
    }

    setIsExecuting(true);
    setError(null);
    setResult(null);

    try {
      // In a real React app, you would make an API call to your backend
      // which would handle the execution functionality
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute game');
      }

      const executionResult = await response.json();
      setResult(executionResult.output);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="p-4 border rounded shadow-sm">
      <h2 className="text-xl font-bold mb-4">Game Launcher</h2>
      <div className="flex flex-col gap-4">
        <div className="text-gray-700">File: {filePath || 'No file selected'}</div>
        <button
          onClick={handleExecute}
          disabled={isExecuting || !filePath}
          className="bg-purple-500 text-white p-2 rounded hover:bg-purple-600 disabled:bg-gray-400"
        >
          {isExecuting ? 'Launching...' : 'Launch Game'}
        </button>
        
        {error && <div className="text-red-500">{error}</div>}
        
        {result && (
          <div className="bg-gray-100 p-2 rounded">
            <div className="font-bold">Execution Output:</div>
            <pre className="whitespace-pre-wrap">{result}</pre>
          </div>
        )}
      </div>
    </div>
  );
};


export default GameExecutor