const { google } = require('googleapis');
const { getDriveAuthClient } = require('./auth');

/**
 * Lista arquivos de vídeo em uma pasta específica do Google Drive
 * @param {string} folderId ID da pasta do Google Drive para buscar vídeos
 * @returns {Promise<Array>} Lista de arquivos de vídeo
 */
async function listVideosFromDrive(folderId = process.env.DRIVE_FOLDER_ID) {
  try {
    const auth = await getDriveAuthClient();
    const drive = google.drive({ version: 'v3', auth });
    
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false and (mimeType contains 'video/')`,
      fields: 'files(id, name, webContentLink, createdTime, mimeType, size, webViewLink)',
      orderBy: 'createdTime desc'
    });
    
    return response.data.files;
  } catch (error) {
    console.error('Erro ao listar vídeos do Drive:', error);
    throw error;
  }
}

/**
 * Obtém a URL para download de um arquivo do Drive
 * @param {string} fileId ID do arquivo no Google Drive
 * @returns {Promise<string>} URL para download
 */
async function getDriveFileDownloadUrl(fileId) {
  try {
    const auth = await getDriveAuthClient();
    const drive = google.drive({ version: 'v3', auth });
    
    const file = await drive.files.get({
      fileId: fileId,
      fields: 'webContentLink'
    });
    
    // A URL de download precisa ser modificada para uso direto
    let downloadUrl = file.data.webContentLink;
    if (downloadUrl) {
      downloadUrl = downloadUrl.replace('&export=download', '');
    }
    
    return downloadUrl;
  } catch (error) {
    console.error('Erro ao obter URL de download:', error);
    throw error;
  }
}

/**
 * Handler para endpoint de API Vercel que lista vídeos do Drive
 */
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS (preflight) request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const folderId = req.query.folderId || process.env.DRIVE_FOLDER_ID;
    if (!folderId) {
      return res.status(400).json({ error: 'ID da pasta não especificado' });
    }
    
    const videos = await listVideosFromDrive(folderId);
    return res.status(200).json({ success: true, videos });
  } catch (error) {
    console.error('Erro ao obter vídeos do Drive:', error);
    return res.status(500).json({
      error: 'Falha ao listar vídeos',
      details: error.message
    });
  }
}; 