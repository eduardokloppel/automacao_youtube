// Carregar variáveis de ambiente do arquivo .env
require('dotenv').config();

const { google } = require('googleapis');
const { getDriveAuthClient } = require('./api/auth');

// Função para listar arquivos na pasta do Drive
async function listDriveFiles() {
  try {
    console.log('Obtendo cliente autenticado...');
    const auth = await getDriveAuthClient();
    
    console.log('Inicializando cliente do Google Drive...');
    const drive = google.drive({ version: 'v3', auth });
    
    console.log(`Buscando arquivos na pasta ID: ${process.env.DRIVE_FOLDER_ID}...`);
    const response = await drive.files.list({
      q: `'${process.env.DRIVE_FOLDER_ID}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, createdTime, size)',
      orderBy: 'createdTime desc'
    });
    
    const files = response.data.files;
    
    if (files.length === 0) {
      console.log('Nenhum arquivo encontrado na pasta.');
    } else {
      console.log(`Encontrados ${files.length} arquivos:`);
      files.forEach(file => {
        console.log(`- ${file.name} (${file.mimeType}) - ID: ${file.id}`);
      });
    }
  } catch (error) {
    console.error('Erro ao listar arquivos do Drive:', error);
  }
}

// Executar
listDriveFiles(); 