// Carregar variáveis de ambiente do arquivo .env
require('dotenv').config();

const { google } = require('googleapis');
const { getYouTubeAuthClient } = require('./api/auth');

// Verificar se uma conta foi especificada como argumento
const accountArg = process.argv[2];
const account = accountArg || 'eduardoalveskloppel';

// Função para verificar o status da autenticação do YouTube
async function checkYouTubeAuth() {
  try {
    console.log(`Verificando autenticação do YouTube para a conta "${account}"...`);
    const auth = await getYouTubeAuthClient(account);
    
    // Inicializar a API do YouTube
    const youtube = google.youtube({ version: 'v3', auth });
    
    // Tenta obter informações do canal para verificar se a autenticação funciona
    const response = await youtube.channels.list({
      part: 'snippet',
      mine: true
    });
    
    if (response.data.items && response.data.items.length > 0) {
      const channel = response.data.items[0];
      console.log('Autenticação bem-sucedida!');
      console.log(`Canal conectado: ${channel.snippet.title}`);
      console.log(`ID do canal: ${channel.id}`);
      return true;
    } else {
      console.log('Autenticação falhou: Nenhum canal encontrado.');
      return false;
    }
  } catch (error) {
    console.error('Erro na autenticação do YouTube:', error);
    return false;
  }
}

// Função para listar os últimos vídeos enviados
async function listRecentUploads() {
  try {
    console.log('\nVerificando uploads recentes...');
    const auth = await getYouTubeAuthClient(account);
    const youtube = google.youtube({ version: 'v3', auth });
    
    // Primeiro, obter o ID da playlist de uploads do canal
    const channelResponse = await youtube.channels.list({
      part: 'contentDetails',
      mine: true
    });
    
    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      console.log('Não foi possível encontrar o canal.');
      return;
    }
    
    const uploadsPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;
    
    // Agora, listar os vídeos da playlist de uploads
    const playlistResponse = await youtube.playlistItems.list({
      part: 'snippet,status',
      playlistId: uploadsPlaylistId,
      maxResults: 5
    });
    
    if (!playlistResponse.data.items || playlistResponse.data.items.length === 0) {
      console.log('Nenhum vídeo encontrado no canal.');
      return;
    }
    
    console.log(`Encontrados ${playlistResponse.data.items.length} vídeos recentes:`);
    
    for (const item of playlistResponse.data.items) {
      const video = item.snippet;
      console.log(`\nTítulo: ${video.title}`);
      console.log(`ID: ${video.resourceId.videoId}`);
      console.log(`Status: ${item.status ? item.status.privacyStatus : 'desconhecido'}`);
      console.log(`Data de publicação: ${video.publishedAt}`);
      console.log(`URL: https://www.youtube.com/watch?v=${video.resourceId.videoId}`);
    }
  } catch (error) {
    console.error('Erro ao listar uploads:', error);
  }
}

// Função para fazer um teste de upload pequeno
async function testUpload() {
  try {
    console.log('\nFazendo um teste de upload...');
    
    // Criando um arquivo de texto simples para upload de teste
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    const tempDir = path.join(os.tmpdir(), 'youtube-test');
    fs.mkdirSync(tempDir, { recursive: true });
    
    const testFilePath = path.join(tempDir, 'test.txt');
    fs.writeFileSync(testFilePath, 'Arquivo de teste para YouTube API');
    
    const auth = await getYouTubeAuthClient(account);
    const youtube = google.youtube({ version: 'v3', auth });
    
    // Tenta enviar um vídeo de teste (isso não funcionará, mas ajudará a diagnosticar)
    try {
      const response = await youtube.videos.insert({
        part: 'snippet,status',
        notifySubscribers: false,
        requestBody: {
          snippet: {
            title: 'Vídeo de teste ' + new Date().toISOString(),
            description: 'Este é um vídeo de teste para diagnóstico de API'
          },
          status: {
            privacyStatus: 'private'
          }
        },
        media: {
          body: fs.createReadStream(testFilePath)
        }
      });
      
      console.log('Resposta da API:', response.data);
    } catch (uploadError) {
      console.log('Erro de upload esperado (não é um vídeo válido, mas mostra o estado da API):');
      console.log(uploadError.message);
      
      // Verificar se o erro é de formato inválido (esperado) ou de autenticação/permissão (problema real)
      if (uploadError.message.includes('invalid format') || uploadError.message.includes('formato inválido')) {
        console.log('Erro esperado de formato - a API está funcionando corretamente.');
      } else if (uploadError.message.includes('permission') || uploadError.message.includes('permissão') || 
                 uploadError.message.includes('auth') || uploadError.message.includes('token')) {
        console.log('ERRO DE PERMISSÃO: Há um problema com as credenciais ou permissões da API.');
      }
    }
    
    // Limpar arquivo temporário
    fs.unlinkSync(testFilePath);
    fs.rmdirSync(tempDir);
    
  } catch (error) {
    console.error('Erro no teste de upload:', error);
  }
}

// Executar testes
async function runTests() {
  console.log(`Iniciando diagnóstico de API do YouTube para a conta "${account}"...`);
  
  const authSuccess = await checkYouTubeAuth();
  
  if (authSuccess) {
    await listRecentUploads();
    await testUpload();
  } else {
    console.log('ERRO: A autenticação falhou. Não é possível continuar os testes.');
  }
  
  console.log('\nDiagnóstico concluído.');
}

// Executar
runTests(); 