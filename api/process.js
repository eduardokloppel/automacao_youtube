import { google } from 'googleapis';
import { getYouTubeAuthClient, getDriveAuthClient } from './auth.js';
import Airtable from 'airtable';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Configuração do Airtable
const airtableBase = new Airtable({
  apiKey: process.env.AIRTABLE_TOKEN_ID
}).base(process.env.AIRTABLE_BASE_ID);

const airtableTable = airtableBase(process.env.AIRTABLE_TABLE_NAME);

/**
 * Obtém vídeos do Drive que ainda não foram processados
 * @returns {Promise<Array>} Lista de arquivos de vídeo não processados
 */
async function getUnprocessedVideos() {
  try {
    const auth = await getDriveAuthClient();
    const drive = google.drive({ version: 'v3', auth });
    
    // Busca vídeos da pasta
    const response = await drive.files.list({
      q: `'${process.env.DRIVE_FOLDER_ID}' in parents and trashed = false and (mimeType contains 'video/')`,
      fields: 'files(id, name, webContentLink, createdTime, mimeType, description)',
      orderBy: 'createdTime desc'
    });
    
    const videos = response.data.files;
    
    // Busca registros do Airtable para verificar quais já foram processados
    const airtableRecords = await airtableTable.select({
      fields: ['ID do Drive']
    }).all();
    
    // Extrai os IDs do Drive que já foram processados
    const processedIds = airtableRecords
      .map(record => record.get('ID do Drive'))
      .filter(id => id); // Remove valores null/undefined
    
    // Filtra apenas vídeos não processados
    return videos.filter(video => !processedIds.includes(video.id));
  } catch (error) {
    console.error('Erro ao buscar vídeos não processados:', error);
    throw error;
  }
}

/**
 * Obtém URL de download de um arquivo do Drive
 * @param {string} fileId ID do arquivo no Google Drive
 * @returns {Promise<string>} URL de download
 */
async function getFileDownloadUrl(fileId) {
  try {
    const auth = await getDriveAuthClient();
    const drive = google.drive({ version: 'v3', auth });
    
    // Gera URL de download
    const response = await drive.files.get({
      fileId: fileId,
      alt: 'media',
    }, {
      responseType: 'stream'
    });
    
    return response;
  } catch (error) {
    console.error('Erro ao obter URL de download:', error);
    throw error;
  }
}

/**
 * Faz upload de um vídeo para o YouTube
 * @param {Object} videoStream Stream do vídeo
 * @param {Object} metadata Metadados do vídeo
 * @returns {Promise<Object>} Dados do vídeo enviado
 */
async function uploadToYouTube(videoStream, metadata) {
  try {
    const auth = await getYouTubeAuthClient();
    const youtube = google.youtube({ version: 'v3', auth });
    
    // Prepara metadados do vídeo
    const videoMetadata = {
      snippet: {
        title: metadata.title || 'Vídeo sem título',
        description: metadata.description || '',
        tags: metadata.tags || []
      },
      status: {
        privacyStatus: 'private' // Pode ser modificado para 'public' ou 'unlisted'
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
 * Registra o vídeo processado no Airtable
 * @param {Object} driveFile Dados do arquivo do Drive
 * @param {Object} youtubeData Dados do vídeo no YouTube
 * @returns {Promise<Object>} Registro criado no Airtable
 */
async function recordInAirtable(driveFile, youtubeData) {
  try {
    const record = await airtableTable.create([
      {
        fields: {
          'Título': driveFile.name || 'Vídeo sem título',
          'Descrição': driveFile.description || '',
          'URL do YouTube': `https://www.youtube.com/watch?v=${youtubeData.id}`,
          'ID do Drive': driveFile.id,
          'ID do YouTube': youtubeData.id,
          'Status': 'Publicado',
          'Data de Upload': new Date().toISOString()
        }
      }
    ]);
    
    return record;
  } catch (error) {
    console.error('Erro ao registrar no Airtable:', error);
    throw error;
  }
}

/**
 * Processa um vídeo do início ao fim
 * @param {Object} video Dados do vídeo do Drive
 * @returns {Promise<Object>} Resultado do processamento
 */
async function processVideo(video) {
  let tempDir = null;
  let tempFilePath = null;
  
  try {
    // Cria diretório temporário
    tempDir = path.join(os.tmpdir(), `youtube-upload-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    tempFilePath = path.join(tempDir, `${video.name}`);
    
    // Obtém stream de download
    const videoStream = await getFileDownloadUrl(video.id);
    
    // Prepara metadados
    const metadata = {
      title: video.name,
      description: video.description || '',
      tags: []
    };
    
    // Faz upload para o YouTube
    const youtubeData = await uploadToYouTube(videoStream.data, metadata);
    
    // Registra no Airtable
    await recordInAirtable(video, youtubeData);
    
    return {
      success: true,
      videoId: youtubeData.id,
      videoUrl: `https://www.youtube.com/watch?v=${youtubeData.id}`
    };
  } catch (error) {
    console.error(`Erro ao processar vídeo ${video.name}:`, error);
    throw error;
  } finally {
    // Limpa arquivos temporários
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

/**
 * Handler para API Vercel
 */
export default async function handler(req, res) {
  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Tratamento para requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Apenas aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    // Verifica se deve processar um ID específico ou todos os pendentes
    const { fileId } = req.body;
    
    if (fileId) {
      // Processa apenas um vídeo específico
      const auth = await getDriveAuthClient();
      const drive = google.drive({ version: 'v3', auth });
      
      const file = await drive.files.get({
        fileId: fileId,
        fields: 'id, name, description, mimeType'
      });
      
      if (!file.data) {
        return res.status(404).json({ error: 'Arquivo não encontrado' });
      }
      
      const result = await processVideo(file.data);
      return res.status(200).json(result);
    } else {
      // Processa todos os vídeos pendentes
      const unprocessedVideos = await getUnprocessedVideos();
      
      if (unprocessedVideos.length === 0) {
        return res.status(200).json({ message: 'Não há vídeos pendentes para processar' });
      }
      
      // Processa apenas o primeiro vídeo da fila
      const result = await processVideo(unprocessedVideos[0]);
      return res.status(200).json(result);
    }
  } catch (error) {
    console.error('Erro ao processar vídeo:', error);
    return res.status(500).json({
      error: 'Falha ao processar vídeo',
      details: error.message
    });
  }
} 