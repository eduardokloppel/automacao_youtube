// Carregar variáveis de ambiente do arquivo .env
require('dotenv').config();

const { google } = require('googleapis');
const { getYouTubeAuthClient, getDriveAuthClient } = require('./auth');
const Airtable = require('airtable');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuração do Airtable
const airtableBase = new Airtable({
  apiKey: process.env.AIRTABLE_TOKEN_ID
}).base(process.env.AIRTABLE_BASE_ID);

const airtableTable = airtableBase(process.env.AIRTABLE_TABLE_NAME);

/**
 * Busca um vídeo pendente aleatório no Airtable
 * @returns {Promise<Object>} Registro encontrado ou null
 */
async function findPendingVideo() {
  try {
    // Busca todos os registros com Status = 'Pending'
    const records = await airtableTable.select({
      filterByFormula: "{Status} = 'Pending'",
      fields: ['Video Filename', 'Caption', 'Titulo Youtube', 'Date Added', 'Status']
    }).firstPage();

    if (records && records.length > 0) {
      // Seleciona um registro aleatório
      const randomIndex = Math.floor(Math.random() * records.length);
      const selectedRecord = records[randomIndex];
      
      console.log(`Selecionado aleatoriamente o vídeo ${randomIndex + 1} de ${records.length} disponíveis`);
      return selectedRecord;
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao buscar vídeos pendentes no Airtable:', error);
    throw error;
  }
}

/**
 * Busca um arquivo no Google Drive pelo ID
 * @param {string} fileId ID do arquivo no Google Drive
 * @returns {Promise<Object>} Arquivo encontrado
 */
async function getFileFromDrive(fileId) {
  try {
    const auth = await getDriveAuthClient();
    const drive = google.drive({ version: 'v3', auth });
    
    // Busca o arquivo por ID
    const file = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, size'
    });
    
    return file.data;
  } catch (error) {
    console.error('Erro ao buscar arquivo no Drive:', error);
    throw error;
  }
}

/**
 * Obtém o conteúdo de um arquivo do Google Drive pelo ID
 * @param {string} fileId ID do arquivo
 * @returns {Promise<Object>} Stream de dados
 */
async function getDriveFileStream(fileId) {
  try {
    const auth = await getDriveAuthClient();
    const drive = google.drive({ version: 'v3', auth });
    
    // Obtém o conteúdo do arquivo
    const fileContent = await drive.files.get({
      fileId: fileId,
      alt: 'media'
    }, {
      responseType: 'stream'
    });
    
    return fileContent.data;
  } catch (error) {
    console.error('Erro ao obter stream do arquivo do Drive:', error);
    throw error;
  }
}

/**
 * Faz upload do vídeo para o YouTube
 * @param {Object} videoStream Stream do vídeo
 * @param {string} title Título do vídeo
 * @param {string} description Descrição do vídeo (opcional)
 * @param {string} account Conta do YouTube a ser usada
 * @returns {Promise<Object>} Dados do vídeo enviado
 */
async function uploadToYouTube(videoStream, title, description = '', account = 'eduardoalveskloppel') {
  try {
    const auth = await getYouTubeAuthClient(account);
    const youtube = google.youtube({ version: 'v3', auth });
    
    // Define os metadados do vídeo
    const videoMetadata = {
      snippet: {
        title: title,
        description: description || '',
        categoryId: '15' // Pets & Animals
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false,
        embeddable: true
      }
    };
    
    // Faz upload para o YouTube
    const response = await youtube.videos.insert({
      part: 'snippet,status',
      notifySubscribers: false,
      requestBody: videoMetadata,
      media: {
        body: videoStream
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Erro ao fazer upload para YouTube:', error);
    throw error;
  }
}

/**
 * Atualiza o status do registro no Airtable
 * @param {string} recordId ID do registro
 * @param {string} status Novo status
 * @returns {Promise<Object>} Registro atualizado
 */
async function updateAirtableRecord(recordId, status) {
  try {
    const updatedRecord = await airtableTable.update(recordId, {
      'Status': status
    });
    
    return updatedRecord;
  } catch (error) {
    console.error('Erro ao atualizar registro no Airtable:', error);
    throw error;
  }
}

/**
 * Exclui um arquivo do Google Drive
 * @param {string} fileId ID do arquivo
 * @returns {Promise<boolean>} Sucesso ou falha
 */
async function deleteDriveFile(fileId) {
  try {
    const auth = await getDriveAuthClient();
    const drive = google.drive({ version: 'v3', auth });
    
    await drive.files.delete({
      fileId: fileId
    });
    
    console.log(`Arquivo ${fileId} excluído com sucesso do Drive`);
    return true;
  } catch (error) {
    console.error('Erro ao excluir arquivo do Drive:', error);
    return false;
  }
}

/**
 * Encontra um arquivo de texto associado ao vídeo
 * @param {string} videoFileId ID do arquivo de vídeo
 * @returns {Promise<Object>} Arquivo de texto encontrado ou null
 */
async function findAssociatedTextFile(videoFileId) {
  try {
    const auth = await getDriveAuthClient();
    const drive = google.drive({ version: 'v3', auth });
    
    // Busca por um arquivo .txt com nome similar ao do vídeo
    const response = await drive.files.list({
      q: `name contains '${videoFileId}' and mimeType = 'text/plain'`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });
    
    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0];
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao buscar arquivo de texto associado:', error);
    return null;
  }
}

/**
 * Processa a fila de vídeos
 * @param {string} account Conta do YouTube a ser usada
 * @returns {Promise<Object>} Resultado do processamento
 */
async function processQueue(account = 'miu09622') {
  try {
    console.log(`Iniciando processamento da fila para a conta ${account}...`);
    
    // 1. Busca um registro pendente no Airtable
    const record = await findPendingVideo();
    if (!record) {
      console.log('Nenhum vídeo pendente encontrado.');
      return {
        status: 'empty',
        message: 'Nenhum vídeo pendente encontrado'
      };
    }
    
    console.log(`Vídeo encontrado: ${record.fields['Video Filename']}`);
    
    // 2. O nome do arquivo no Airtable é o próprio ID do Drive
    const fileId = record.fields['Video Filename'];
    console.log(`ID do arquivo no Drive: ${fileId}`);
    
    // 3. Busca o arquivo no Drive
    const file = await getFileFromDrive(fileId);
    console.log(`Arquivo encontrado: ${file.name}`);
    
    // 4. Obtém o stream do arquivo
    const videoStream = await getDriveFileStream(fileId);
    console.log('Stream do vídeo obtido');
    
    // 5. Faz upload para o YouTube
    const videoTitle = record.fields['Titulo Youtube'] || record.fields['Video Filename'];
    const videoDescription = record.fields['Caption'] || '';
    
    console.log(`Iniciando upload para o YouTube...
Título: ${videoTitle}
Descrição: ${videoDescription}`);
    
    const uploadedVideo = await uploadToYouTube(videoStream, videoTitle, videoDescription, account);
    console.log(`Vídeo enviado com sucesso! ID: ${uploadedVideo.id}`);
    
    // 6. Atualiza o status no Airtable
    await updateAirtableRecord(record.id, 'Posted');
    console.log('Status atualizado no Airtable para Posted');
    
    // 7. Procura e exclui o arquivo de texto associado (se existir)
    const textFile = await findAssociatedTextFile(fileId);
    if (textFile) {
      const deleted = await deleteDriveFile(textFile.id);
      if (deleted) {
        console.log(`Arquivo de texto ${textFile.name} excluído com sucesso`);
      }
    }
    
    // 8. Exclui o arquivo de vídeo do Drive
    const videoDeleted = await deleteDriveFile(fileId);
    if (videoDeleted) {
      console.log(`Vídeo ${file.name} excluído com sucesso`);
    }
    
    return {
      status: 'success',
      videoId: uploadedVideo.id,
      title: videoTitle,
      recordId: record.id
    };
  } catch (error) {
    console.error('Erro durante o processamento:', error);
    return {
      status: 'error',
      message: error.message
    };
  }
}

/**
 * Handler da API Vercel
 */
// Formato correto para Vercel Functions
export default async function handler(req, res) {
  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Tratamento para requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Verificar se é uma requisição de agendamento do Upstash
  const isScheduled = req.headers['upstash-signature'] || false;
  
  // Verificar horário do Brasil (GMT-3)
  const now = new Date();
  // Ajusta para o fuso horário do Brasil (GMT-3)
  const brasilTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
  const hour = brasilTime.getHours();
  
  // Verifica se o horário está dentro do intervalo permitido (7h às 22h)
  const isValidHour = hour >= 7 && hour <= 22;
  
  if (!isValidHour && isScheduled) {
    console.log(`Horário atual no Brasil: ${hour}h. Fora do horário de publicação.`);
    return res.status(200).json({
      status: 'skipped',
      message: `Fora do horário de publicação (${hour}h)`
    });
  }
  
  // Processar requisição conforme o método
  if (req.method === 'POST') {
    try {
      // Obter a conta a ser usada (padrão: miu09622)
      const { account = 'miu09622' } = req.body || {};
      
      // Processar a fila
      const result = await processQueue(account);
      
      // Retornar o resultado
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao processar requisição:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  } else {
    // Método não permitido
    return res.status(405).json({
      status: 'error',
      message: 'Método não permitido'
    });
  }
} 