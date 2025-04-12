// Carregar variáveis de ambiente do arquivo .env
require('dotenv').config();

const { getAvailableYouTubeAccounts, getYouTubeAuthClient } = require('./api/auth');

async function testAccounts() {
  try {
    console.log('Contas do YouTube configuradas:');
    const accounts = getAvailableYouTubeAccounts();
    
    for (const account of accounts) {
      console.log(`\n[${account}]`);
      try {
        const auth = await getYouTubeAuthClient(account);
        const { google } = require('googleapis');
        const youtube = google.youtube({ version: 'v3', auth });
        
        // Tenta obter informações do canal para verificar se a autenticação funciona
        const response = await youtube.channels.list({
          part: 'snippet',
          mine: true
        });
        
        if (response.data.items && response.data.items.length > 0) {
          const channel = response.data.items[0];
          console.log(`✅ Conexão OK`);
          console.log(`Canal: ${channel.snippet.title}`);
          console.log(`ID: ${channel.id}`);
        } else {
          console.log(`❌ Falha na conexão: Nenhum canal encontrado`);
        }
      } catch (error) {
        console.log(`❌ Erro na conta ${account}:`);
        console.log(error.message);
      }
    }
  } catch (error) {
    console.error('Erro ao testar contas:', error);
  }
}

testAccounts(); 