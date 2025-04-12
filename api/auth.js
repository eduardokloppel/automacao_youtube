import { google } from 'googleapis';

// Configuração das credenciais OAuth2
const GOOGLE_CLIENT_ID_DEFAULT = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET_DEFAULT = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CLIENT_ID_MIU = process.env.GOOGLE_CLIENT_ID_MIU;
const GOOGLE_CLIENT_SECRET_MIU = process.env.GOOGLE_CLIENT_SECRET_MIU;
const DRIVE_CLIENT_ID = process.env.DRIVE_CLIENT_ID;
const DRIVE_CLIENT_SECRET = process.env.DRIVE_CLIENT_SECRET;

// Tokens de refresh para as diferentes contas
const YOUTUBE_TOKENS = {
  // Canal Tech Trendz (eduardoalveskloppel@gmail.com)
  eduardoalveskloppel: '1//04QUrdZTve9bXCgYIARAAGAQSNwF-L9Ir9vsGwkSmOidHyTekbhG3uifCa9gfHaFfgUBQlommVjK4sFo3AAKwbig3l9X0S2OlR18',
  
  // Canal Gatonauta (miu09622@gmail.com)
  miu09622: process.env.YOUTUBE_REFRESH_TOKEN_MIU || ''
};

// Refresh token para operações no Google Drive
const DRIVE_REFRESH_TOKEN = process.env.DRIVE_REFRESH_TOKEN;

/**
 * Cria um cliente OAuth2 autenticado para o YouTube
 * @param {string} account Conta a ser usada (eduardoalveskloppel ou miu09622)
 * @returns {Promise<Object>} Cliente OAuth2 autenticado
 */
async function getYouTubeAuthClient(account = 'eduardoalveskloppel') {
  // Verifica se a conta solicitada existe
  if (!YOUTUBE_TOKENS[account]) {
    throw new Error(`Conta '${account}' não configurada. Contas disponíveis: ${Object.keys(YOUTUBE_TOKENS).join(', ')}`);
  }

  // Seleciona as credenciais corretas com base na conta
  const clientId = account === 'miu09622' ? GOOGLE_CLIENT_ID_MIU : GOOGLE_CLIENT_ID_DEFAULT;
  const clientSecret = account === 'miu09622' ? GOOGLE_CLIENT_SECRET_MIU : GOOGLE_CLIENT_SECRET_DEFAULT;

  // Verifica se as credenciais para a conta específica estão definidas
  if (!clientId || !clientSecret) {
    throw new Error(`Credenciais (Client ID/Secret) não configuradas para a conta '${account}' no arquivo .env`);
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret
  );

  oauth2Client.setCredentials({
    refresh_token: YOUTUBE_TOKENS[account]
  });

  try {
    // Atualiza o token de acesso usando o refresh token
    const { token } = await oauth2Client.getAccessToken();
    oauth2Client.setCredentials({
      access_token: token,
      refresh_token: YOUTUBE_TOKENS[account]
    });
    return oauth2Client;
  } catch (error) {
    console.error(`Erro ao obter token de acesso para YouTube (${account}):`, error);
    throw error;
  }
}

/**
 * Cria um cliente OAuth2 autenticado para o Google Drive
 * @returns {Promise<Object>} Cliente OAuth2 autenticado
 */
async function getDriveAuthClient() {
  // Usa as credenciais específicas para o Drive
  if (!DRIVE_CLIENT_ID || !DRIVE_CLIENT_SECRET || !DRIVE_REFRESH_TOKEN) {
    throw new Error('Credenciais (DRIVE_CLIENT_ID/SECRET/REFRESH_TOKEN) não configuradas no arquivo .env');
  }
  
  const oauth2Client = new google.auth.OAuth2(
    DRIVE_CLIENT_ID,
    DRIVE_CLIENT_SECRET
  );

  // Define explicitamente os escopos necessários para o Drive
  oauth2Client.setCredentials({
    refresh_token: DRIVE_REFRESH_TOKEN,
    scope: 'https://www.googleapis.com/auth/drive'
  });

  try {
    // Atualiza o token de acesso usando o refresh token
    const { token } = await oauth2Client.getAccessToken();
    oauth2Client.setCredentials({
      access_token: token,
      refresh_token: DRIVE_REFRESH_TOKEN,
      scope: 'https://www.googleapis.com/auth/drive'
    });
    return oauth2Client;
  } catch (error) {
    console.error('Erro ao obter token de acesso para Drive:', error);
    throw error;
  }
}

/**
 * Lista as contas do YouTube disponíveis
 * @returns {Array<string>} Lista de contas configuradas
 */
function getAvailableYouTubeAccounts() {
  return Object.keys(YOUTUBE_TOKENS);
}

// Convertendo para ES Modules
export {
  getYouTubeAuthClient,
  getDriveAuthClient,
  getAvailableYouTubeAccounts
} 