// Carregar variáveis de ambiente do arquivo .env
require('dotenv').config();

// Importar a função de processamento
const processQueueHandler = require('./api/processQueue');

// Criar objetos de request e response para simular chamada HTTP
const req = {
  method: 'POST'
};

const res = {
  setHeader: (name, value) => {
    console.log(`Definindo header ${name}: ${value}`);
  },
  status: (code) => {
    console.log(`Status: ${code}`);
    return {
      json: (data) => {
        console.log('Resposta:', JSON.stringify(data, null, 2));
      },
      end: () => {
        console.log('Resposta finalizada sem conteúdo');
      }
    };
  }
};

// Função para executar o teste
async function runTest() {
  console.log('Iniciando teste da função processQueue...');
  try {
    await processQueueHandler(req, res);
  } catch (error) {
    console.error('Erro no teste:', error);
  }
}

// Executar o teste
runTest(); 