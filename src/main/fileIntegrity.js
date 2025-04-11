const fs = require('fs');
const crypto = require('crypto');
const yauzl = require('yauzl');
const path = require('path');

/**
 * Extrai um arquivo ZIP para um diretório especificado
 * @param {string} zipPath - Caminho do arquivo ZIP
 * @param {string} extractPath - Caminho para extração
 * @param {function} progressCallback - Callback para atualização de progresso
 * @returns {Promise<string[]>} - Lista de arquivos extraídos
 */
async function extractZipFile(zipPath, extractPath, progressCallback = () => {}) {
  if (!fs.existsSync(extractPath)) {
    fs.mkdirSync(extractPath, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        return reject(new Error(`Erro ao abrir ZIP: ${err.message}`));
      }

      const extractedFiles = [];
      const totalEntries = zipfile.entryCount;
      let processedEntries = 0;

      zipfile.on('entry', (entry) => {
        processedEntries++;
        
        // Atualizar progresso
        const percent = Math.floor((processedEntries / totalEntries) * 100);
        progressCallback({ 
          percent: Math.min(90 + (percent / 10), 99), // 90-99%
          status: 'extracting',
          file: entry.fileName,
          progress: processedEntries,
          total: totalEntries
        });

        // Manipular diretórios
        if (/\/$/.test(entry.fileName)) {
          // É um diretório
          const dirPath = path.join(extractPath, entry.fileName);
          fs.mkdirSync(dirPath, { recursive: true });
          zipfile.readEntry();
          return;
        }

        // Manipular arquivos
        zipfile.openReadStream(entry, (err, readStream) => {
          if (err) {
            zipfile.close();
            return reject(new Error(`Erro ao ler entrada ZIP: ${err.message}`));
          }

          // Normalizar caminho e criar diretórios necessários
          const outputPath = path.join(extractPath, entry.fileName);
          const outputDir = path.dirname(outputPath);
          
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          const writeStream = fs.createWriteStream(outputPath);
          
          readStream.on('end', () => {
            extractedFiles.push(outputPath);
            zipfile.readEntry();
          });

          // Pipe para o arquivo de saída
          readStream.pipe(writeStream);
        });
      });

      zipfile.on('error', (err) => {
        reject(new Error(`Erro ao extrair ZIP: ${err.message}`));
      });

      zipfile.on('end', () => {
        progressCallback({ percent: 100, status: 'extraction_complete' });
        
        // Deletar o arquivo ZIP após extração
        try {
          fs.unlinkSync(zipPath);
          console.log(`Arquivo ZIP removido após extração: ${zipPath}`);
        } catch (deleteError) {
          console.error(`Erro ao deletar arquivo ZIP: ${deleteError.message}`);
        }
        
        resolve(extractedFiles);
      });

      zipfile.readEntry();
    });
  });
}

module.exports = { 
  calculateFileHash, 
  verifyFileSize, 
  validateZipFile, 
  verifyFileIntegrity,
  extractZipFile 
};

/**
 * Calcula o hash SHA-256 de um arquivo para verificação de integridade
 * @param {string} filePath - Caminho do arquivo
 * @returns {Promise<string>} - Hash SHA-256 em formato hexadecimal
 */
function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('error', err => reject(err));
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/**
 * Verifica se o tamanho do arquivo está correto (ao comparar com o esperado)
 * @param {string} filePath - Caminho do arquivo
 * @param {number} expectedSize - Tamanho esperado em bytes
 * @returns {boolean} - Verdadeiro se o tamanho estiver correto
 */
function verifyFileSize(filePath, expectedSize) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size === expectedSize;
  } catch (error) {
    console.error('Erro ao verificar tamanho do arquivo:', error);
    return false;
  }
}

/**
 * Verifica a integridade de um arquivo utilizando várias técnicas
 * @param {string} filePath - Caminho do arquivo
 * @param {object} options - Opções de verificação
 * @returns {Promise<object>} - Resultado da verificação
 */
async function verifyFileIntegrity(filePath, options = {}) {
  if (!fs.existsSync(filePath)) {
    return { valid: false, reason: 'Arquivo não encontraaaaado' };
  }
  
  const result = {
    valid: true,
    size: 0,
    hash: null,
    zipValid: null,
    checks: []
  };
  
  try {
    // Verificar tamanho
    const stats = fs.statSync(filePath);
    result.size = stats.size;
    
    if (stats.size === 0) {
      result.valid = false;
      result.checks.push({ type: 'size', valid: false, reason: 'Arquivo vazio' });
    } else if (options.expectedSize && stats.size !== options.expectedSize) {
      result.valid = false;
      result.checks.push({ 
        type: 'size', 
        valid: false, 
        reason: `Tamanho incorreto. Esperado: ${options.expectedSize}, Atual: ${stats.size}` 
      });
    } else {
      result.checks.push({ type: 'size', valid: true });
    }
    
    // Calcular hash
    if (options.calculateHash) {
      result.hash = await calculateFileHash(filePath);
      
      if (options.expectedHash && result.hash !== options.expectedHash) {
        result.valid = false;
        result.checks.push({ 
          type: 'hash', 
          valid: false, 
          reason: `Hash incorreto. Esperado: ${options.expectedHash}, Atual: ${result.hash}` 
        });
      } else {
        result.checks.push({ type: 'hash', valid: true, value: result.hash });
      }
    }
    
    // Verificar arquivo ZIP
    if (options.validateZip && 
        ['.zip', '.jar', '.apk'].includes(path.extname(filePath).toLowerCase())) {
      result.zipValid = await validateZipFile(filePath);
      
      if (!result.zipValid) {
        result.valid = false;
        result.checks.push({ type: 'zip', valid: false, reason: 'Arquivo ZIP corrompido' });
      } else {
        result.checks.push({ type: 'zip', valid: true });
      }
    }
    
    return result;
  } catch (error) {
    console.error('Erro ao verificar integridade:', error);
    return { 
      valid: false, 
      reason: `Erro durante verificação: ${error.message}`,
      error
    };
  }
}

/**
 * Verifica se um arquivo ZIP é válido (não está corrompido)
 * @param {string} zipPath - Caminho do arquivo ZIP
 * @returns {Promise<boolean>} - Verdadeiro se o ZIP for válido
 */
function validateZipFile(zipPath) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        console.error('Erro ao abrir arquivo ZIP:', err);
        return resolve(false);
      }
      
      let isValid = true;
      let entriesProcessed = 0;
      
      zipfile.on('entry', (entry) => {
        entriesProcessed++;
        // Verificamos até 10 entradas para otimizar o processo
        if (entriesProcessed < 10) {
          zipfile.readEntry();
        } else {
          zipfile.close();
          resolve(isValid);
        }
      });
      
      zipfile.on('error', (err) => {
        console.error('Erro ao processar ZIP:', err);
        isValid = false;
        zipfile.close();
        resolve(isValid);
      });
      
      zipfile.on('end', () => {
        resolve(isValid);
      });
      
      zipfile.readEntry();
    });
  });
}