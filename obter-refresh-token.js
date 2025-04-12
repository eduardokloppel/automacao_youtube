// Carregar variáveis de ambiente do arquivo .env
require('dotenv').config();

const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const opener = require('opener');
const fs = require('fs');

// Configuração das credenciais OAuth2
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// Voltando para a URI de redirecionamento padrão para Web Application
const REDIRECT_URI = 'http://localhost:3000/oauth2callback'; 

/**
 * Cria um cliente OAuth2
 * @returns {Object} Cliente OAuth2
 */
function createOAuthClient() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
}

/**
 * Gera a URL de autorização
 * @param {Object} oauth2Client Cliente OAuth2
 * @returns {string} URL de autorização
 */
function getAuthUrl(oauth2Client) {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube'
    ],
    prompt: 'consent'
  });
}

/**
 * Inicia o servidor local para capturar o código de autorização
 * @param {Object} oauth2Client Cliente OAuth2
 * @returns {Promise<Object>} Token obtido
 */
function startServer(oauth2Client) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const queryObject = url.parse(req.url, true).query;
        
        if (queryObject.code) {
          // Finaliza a resposta HTTP
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body>
                <h1>Autorização concluída!</h1>
                <p>Você pode fechar esta janela e voltar ao terminal.</p>
              </body>
            </html>
          `);
          
          // Encerra o servidor
          server.close();
          
          // Troca o código pelo token
          const { tokens } = await oauth2Client.getToken(queryObject.code);
          resolve(tokens);
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('Código de autorização não recebido');
          server.close();
          reject(new Error('Código de autorização não recebido'));
        }
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`Erro: ${error.message}`);
        server.close();
        reject(error);
      }
    });
    
    server.listen(3000, () => {
      console.log('Servidor ouvindo na porta 3000...');
    });
  });
}

/**
 * Função principal para obter o token
 */
async function getRefreshToken() {
  try {
    // Criar cliente OAuth2
    const oauth2Client = createOAuthClient();
    
    // Gerar URL de autorização
    const authUrl = getAuthUrl(oauth2Client);
    
    // Exibir instruções
    console.log('\n======= INSTRUÇÕES PARA OBTER O REFRESH TOKEN =======\n');
    console.log('1. Copie e abra a URL a seguir no navegador:');
    console.log('\n' + authUrl + '\n');
    console.log('2. Faça login com a conta miu09622@gmail.com');
    console.log('3. Conceda as permissões solicitadas');
    console.log('4. Você será redirecionado para localhost\n');
    
    // Tentar abrir o navegador automaticamente
    try {
      console.log('Tentando abrir o navegador automaticamente...');
      opener(authUrl);
    } catch (error) {
      console.log('Não foi possível abrir o navegador automaticamente.');
      console.log('Por favor, copie e cole a URL no seu navegador.');
    }
    
    // Iniciar servidor para capturar o código
    console.log('Aguardando autorização...');
    const tokens = await startServer(oauth2Client);
    
    // Exibir tokens obtidos
    console.log('\n======= TOKEN OBTIDO COM SUCESSO =======\n');
    console.log('Refresh Token:', tokens.refresh_token);
    console.log('\nAdicione este Refresh Token ao seu arquivo .env:');
    console.log('YOUTUBE_REFRESH_TOKEN_MIU=' + tokens.refresh_token);
    
    // Salvar token em um arquivo de backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `refresh-token-${timestamp}.json`;
    fs.writeFileSync(backupFile, JSON.stringify(tokens, null, 2));
    console.log(`\nUm backup do token completo foi salvo em ${backupFile}`);
    
  } catch (error) {
    console.error('Erro ao obter token:', error);
  }
}

// Verificar se as credenciais estão configuradas
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error('\n❌ ERRO: Credenciais não configuradas!');
  console.error('Verifique se você configurou GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no arquivo .env');
  process.exit(1);
}

// Executar
getRefreshToken(); 