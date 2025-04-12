import { google } from 'googleapis';
import { getYouTubeAuthClient } from './auth.js';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import os from 'os';
import fetch from 'node-fetch';
import Airtable from 'airtable';

// Configuração do Airtable
const airtableBase = new Airtable({
  apiKey: process.env.AIRTABLE_TOKEN_ID
}).base(process.env.AIRTABLE_BASE_ID);

const airtableTable = airtableBase(process.env.AIRTABLE_TABLE_NAME);

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
  
  // Apenas permitir requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Extrair os dados da requisição
    const { videoUrl, title, description, tags } = req.body;
    
    if (!videoUrl) {
      return res.status(400).json({ error: 'URL do vídeo é obrigatória' });
    }

    // Criar pasta temporária para download do vídeo
    const tempDir = path.join(os.tmpdir(), 'youtube-upload-' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Nome do arquivo de vídeo
    const videoFileName = path.join(tempDir, 'video.mp4');
    
    // Baixar o vídeo
    console.log(`Baixando vídeo de: ${videoUrl}`);
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Falha ao baixar o vídeo: ${videoResponse.statusText}`);
    }
    
    // Salvar o vídeo localmente
    const videoBuffer = await videoResponse.buffer();
    fs.writeFileSync(videoFileName, videoBuffer);
    
    // Obter cliente autenticado
    const auth = await getYouTubeAuthClient();
    
    // Inicializar a API do YouTube
    const youtube = google.youtube({
      version: 'v3',
      auth
    });
    
    // Definir os metadados do vídeo
    const videoMetadata = {
      snippet: {
        title: title || 'Vídeo sem título',
        description: description || 'Vídeo enviado automaticamente',
        tags: tags ? tags.split(',').map(tag => tag.trim()) : []
      },
      status: {
        privacyStatus: 'private'  // Pode ser 'private', 'public' ou 'unlisted'
      }
    };
    
    // Upload para o YouTube
    console.log('Iniciando upload para o YouTube...');
    const response = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: videoMetadata,
      media: {
        body: fs.createReadStream(videoFileName)
      }
    });
    
    // Limpar arquivos temporários
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    const videoId = response.data.id;
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Registrar no Airtable
    if (process.env.AIRTABLE_BASE_ID && process.env.AIRTABLE_TABLE_NAME) {
      try {
        await airtableTable.create([
          {
            fields: {
              'Título': title || 'Vídeo sem título',
              'Descrição': description || '',
              'URL do YouTube': youtubeUrl,
              'Status': 'Publicado',
              'Data de Upload': new Date().toISOString()
            }
          }
        ]);
        console.log('Registro criado no Airtable');
      } catch (airtableError) {
        console.error('Erro ao salvar no Airtable:', airtableError);
        // Não falharemos a requisição principal se o registro no Airtable falhar
      }
    }
    
    // Retornar ID e URL do vídeo
    return res.status(200).json({
      success: true,
      videoId: videoId,
      videoUrl: youtubeUrl
    });
  } catch (error) {
    console.error('Erro ao fazer upload do vídeo:', error);
    return res.status(500).json({ 
      error: 'Falha ao fazer upload do vídeo',
      details: error.message
    });
  }
} 