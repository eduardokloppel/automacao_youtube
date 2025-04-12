// Carregar variáveis de ambiente do arquivo .env
require('dotenv').config();

const { google } = require('googleapis');
const { getYouTubeAuthClient, getDriveAuthClient } = require('./api/auth');
const Airtable = require('airtable');

// Configuração do Airtable
const airtableBase = new Airtable({
  apiKey: process.env.AIRTABLE_TOKEN_ID
}).base(process.env.AIRTABLE_BASE_ID);

const airtableTable = airtableBase(process.env.AIRTABLE_TABLE_NAME);

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

async function main() {
  try {
    console.log('Iniciando processamento da fila...');
    
    // 1. Busca um registro pendente no Airtable
    const record = await findPendingVideo();
    if (!record) {
      console.log('Nenhum vídeo pendente encontrado.');
      return;
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
    
    const uploadedVideo = await uploadToYouTube(videoStream, videoTitle, videoDescription, 'miu09622');
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
    
    console.log('Processamento concluído com sucesso!');
  } catch (error) {
    console.error('Erro durante o processamento:', error);
  }
}

// Executa o script
main(); 