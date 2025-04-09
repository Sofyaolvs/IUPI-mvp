const fs = require('fs');
const path = require('path');
const { app, dialog } = require('electron');
const { promisify } = require('util');
const fsPromises = fs.promises;
const AdmZip = require('adm-zip');

/**
 * Seleciona um diretório através de uma caixa de diálogo
 * @param {BrowserWindow} window - Janela do Electron (pai)
 * @param {Object} options - Opções para o diálogo
 * @returns {Promise<string|null>} - Caminho selecionado ou null
 */
async function selectDirectory(window, options = {}) {
  const defaultOptions = {
    title: 'Selecionar pasta',
    buttonLabel: 'Escolher',
    properties: ['openDirectory']
  };

  const mergedOptions = { ...defaultOptions, ...options };
  const result = await dialog.showOpenDialog(window, mergedOptions);

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
}

/**
 * Move um arquivo de um local para outro
 * @param {string} source - Caminho de origem
 * @param {string} destination - Caminho de destino
 * @returns {Promise<boolean>} - Sucesso da operação
 */
async function moveFile(source, destination) {
  try {
    // Verificar se o diretório de destino existe
    const destDir = path.dirname(destination);
    if (!fs.existsSync(destDir)) {
      await fsPromises.mkdir(destDir, { recursive: true });
    }

    // Verificar se o arquivo de origem existe
    if (!fs.existsSync(source)) {
      throw new Error(`Arquivo de origem não encontrado: ${source}`);
    }

    // Verificar se o destino já existe
    if (fs.existsSync(destination)) {
      throw new Error(`Arquivo de destino já existe: ${destination}`);
    }

    // Mover o arquivo
    await fsPromises.rename(source, destination);
    return true;
  } catch (error) {
    console.error('Erro ao mover arquivo:', error);

    // Tentar copiar e excluir se rename falhar (para volumes diferentes)
    try {
      await fsPromises.copyFile(source, destination);
      await fsPromises.unlink(source);
      return true;
    } catch (err) {
      console.error('Falha no fallback de copiar/excluir:', err);
      throw error;
    }
  }
}

/**
 * Renomeia um arquivo ou diretório
 * @param {string} filePath - Caminho atual do arquivo
 * @param {string} newName - Novo nome (sem o caminho)
 * @returns {Promise<string>} - Novo caminho completo
 */
async function renameFile(filePath, newName) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo não encontrado: ${filePath}`);
    }

    const dirPath = path.dirname(filePath);
    const newPath = path.join(dirPath, newName);

    if (fs.existsSync(newPath)) {
      throw new Error(`Já existe um arquivo com o nome ${newName}`);
    }

    await fsPromises.rename(filePath, newPath);
    return newPath;
  } catch (error) {
    console.error('Erro ao renomear arquivo:', error);
    throw error;
  }
}

/**
 * Extrai um arquivo comprimido (.zip, .rar, etc.)
 * @param {string} archivePath - Caminho do arquivo comprimido
 * @param {string} extractPath - Diretório de extração
 * @param {function} progressCallback - Callback para progresso
 * @returns {Promise<Array>} - Lista de arquivos extraídos
 */
async function extractArchive(archivePath, extractPath, progressCallback = () => {}) {
  try {
    // Verificar se o arquivo existe
    if (!fs.existsSync(archivePath)) {
      throw new Error(`Arquivo não encontrado: ${archivePath}`);
    }

    // Verificar a extensão do arquivo
    const ext = path.extname(archivePath).toLowerCase();
    
    // Criar diretório de extração se não existir
    if (!fs.existsSync(extractPath)) {
      await fsPromises.mkdir(extractPath, { recursive: true });
    }

    // Funções para diferentes tipos de arquivo
    if (ext === '.zip') {
      return await extractZip(archivePath, extractPath, progressCallback);
    } else if (ext === '.rar') {
      // Você precisaria adicionar uma biblioteca para RAR
      throw new Error('Extração de arquivos RAR não está implementada');
    } else if (['.gz', '.tar', '.tgz'].includes(ext)) {
      // Você precisaria adicionar outra biblioteca para TAR/GZ
      throw new Error('Extração de arquivos TAR/GZ não está implementada');
    } else {
      throw new Error(`Tipo de arquivo não suportado: ${ext}`);
    }
  } catch (error) {
    console.error('Erro ao extrair arquivo:', error);
    throw error;
  }
}

/**
 * Extrai um arquivo ZIP usando adm-zip
 * @param {string} zipPath - Caminho do arquivo ZIP
 * @param {string} extractPath - Diretório para extração
 * @param {function} progressCallback - Callback para progresso
 * @returns {Promise<Array>} - Lista de arquivos extraídos
 */
async function extractZip(zipPath, extractPath, progressCallback) {
  return new Promise((resolve, reject) => {
    try {
      const zip = new AdmZip(zipPath);
      const zipEntries = zip.getEntries();
      const totalEntries = zipEntries.length;
      
      // Verificar se o arquivo ZIP está vazio
      if (totalEntries === 0) {
        throw new Error('Arquivo ZIP vazio');
      }
      
      // Preparar lista de arquivos
      const extractedFiles = [];
      
      // Informar início da extração
      progressCallback({ 
        percent: 0, 
        status: 'extracting',
        total: totalEntries
      });
      
      // Para cada entrada no ZIP
      zipEntries.forEach((entry, index) => {
        // Calcular progresso
        const percent = Math.floor((index / totalEntries) * 100);
        
        progressCallback({ 
          percent, 
          status: 'extracting',
          file: entry.entryName,
          current: index + 1,
          total: totalEntries
        });
        
        // Adicionar à lista de arquivos extraídos se não for diretório
        if (!entry.isDirectory) {
          const outputPath = path.join(extractPath, entry.entryName);
          extractedFiles.push(outputPath);
        }
      });
      
      // Extrair o ZIP
      zip.extractAllTo(extractPath, true);
      
      // Informar conclusão
      progressCallback({ percent: 100, status: 'complete' });
      
      // Deletar o arquivo ZIP após extração
      try {
        fs.unlinkSync(zipPath);
        console.log(`Arquivo ZIP removido após extração: ${zipPath}`);
      } catch (deleteError) {
        console.error(`Erro ao deletar arquivo ZIP: ${deleteError.message}`);
      }
      
      resolve(extractedFiles);
    } catch (error) {
      console.error('Erro na extração ZIP:', error);
      reject(error);
    }
  });
}

/**
 * Cria uma lista de jogos instalados no diretório
 * @param {string} gamesDir - Diretório dos jogos
 * @returns {Promise<Array>} - Lista de jogos encontrados
 */
async function listInstalledGames(gamesDir) {
  try {
    if (!fs.existsSync(gamesDir)) {
      await fsPromises.mkdir(gamesDir, { recursive: true });
      return [];
    }

    const entries = await fsPromises.readdir(gamesDir, { withFileTypes: true });
    const games = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const gamePath = path.join(gamesDir, entry.name);
        
        // Procurar executáveis ou outros indicadores de jogo
        const gameFiles = await fsPromises.readdir(gamePath);
        
        // Detectar executáveis ou arquivos index.html (jogos web)
        const exeFiles = gameFiles.filter(file => 
          file.endsWith('.exe') || 
          file.endsWith('.app') ||
          file === 'index.html'
        );
        
        // Procurar um arquivo de informações ou qualquer arquivo JSON que possa ter metadados
        const infoFiles = gameFiles.filter(file => 
          file === 'info.json' || 
          file === 'game.json' || 
          file === 'metadata.json'
        );
        
        let gameInfo = {
          id: entry.name,
          name: entry.name,
          path: gamePath,
          executable: exeFiles.length > 0 ? path.join(gamePath, exeFiles[0]) : null,
          hasExecutable: exeFiles.length > 0
        };
        
        // Carregar informações extras se disponíveis
        if (infoFiles.length > 0) {
          try {
            const infoPath = path.join(gamePath, infoFiles[0]);
            const infoContent = await fsPromises.readFile(infoPath, 'utf8');
            const info = JSON.parse(infoContent);
            
            gameInfo = { ...gameInfo, ...info };
          } catch (err) {
            console.warn(`Erro ao carregar informações do jogo ${entry.name}:`, err);
          }
        }
        
        games.push(gameInfo);
      }
    }

    return games;
  } catch (error) {
    console.error('Erro ao listar jogos:', error);
    throw error;
  }
}

module.exports = {
  selectDirectory,
  moveFile,
  renameFile,
  extractArchive,
  listInstalledGames
};