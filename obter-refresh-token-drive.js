// Carregar variáveis de ambiente do arquivo .env
require('dotenv').config();

const { google } = require('googleapis');
const opener = require('opener');
const readline = require('readline');

// Configuração do OAuth2
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob'  // Usando OOB em vez de servidor local
);

// Define os escopos necessários
const SCOPES = [
  'https://www.googleapis.com/auth/drive',           // Acesso total ao Drive (incluindo exclusão)
  'https://www.googleapis.com/auth/drive.file',      // Acesso aos arquivos criados pelo app
  'https://www.googleapis.com/auth/drive.appdata'    // Acesso à pasta de dados do app
];

// Gera a URL de autorização
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent'  // Força a geração de um novo refresh token
});

// Cria interface para ler input do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Função principal
async function getRefreshToken() {
  try {
    console.log('\nAbrindo navegador para autorização...');
    console.log('\nPor favor:');
    console.log('1. Faça login com a conta que deseja usar para o Google Drive');
    console.log('2. Autorize o acesso aos escopos solicitados');
    console.log('3. Copie o código de autorização e cole aqui\n');
    
    // Abre o navegador com a URL de autorização
    opener(authUrl);
    
    // Aguarda o usuário colar o código
    const code = await new Promise((resolve) => {
      rl.question('Cole o código de autorização aqui: ', (answer) => {
        resolve(answer.trim());
      });
    });
    
    if (!code) {
      throw new Error('Código de autorização não fornecido');
    }
    
    // Troca o código pelo token
    const { tokens } = await oauth2Client.getToken(code);
    
    // Exibe o refresh token
    console.log('\nRefresh Token obtido com sucesso!');
    console.log('----------------------------------------');
    console.log('Refresh Token:', tokens.refresh_token);
    console.log('----------------------------------------');
    console.log('\nAdicione este token no arquivo .env como DRIVE_REFRESH_TOKEN');
    
    // Encerra o programa
    process.exit(0);
  } catch (error) {
    console.error('\nErro durante o processo de autorização:', error);
    process.exit(1);
  }
}

// Inicia o processo
getRefreshToken(); 