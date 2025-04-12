// Carregar variáveis de ambiente do arquivo .env
require('dotenv').config();

const Airtable = require('airtable');

// Configuração do Airtable
const airtableBase = new Airtable({
  apiKey: process.env.AIRTABLE_TOKEN_ID
}).base(process.env.AIRTABLE_BASE_ID);

const airtableTable = airtableBase(process.env.AIRTABLE_TABLE_NAME);

// Função para listar registros pendentes
async function findPendingVideos() {
  try {
    console.log('Buscando registros pendentes no Airtable...');
    
    // Busca registros com Status = 'Pending', ordenados por Video Filename
    const records = await airtableTable.select({
      filterByFormula: "{Status} = 'Pending'",
      sort: [{ field: 'Video Filename', direction: 'asc' }],
      maxRecords: 5,
      fields: ['Video Filename', 'Caption', 'Titulo Youtube', 'Date Added', 'Status']
    }).firstPage();
    
    if (records.length === 0) {
      console.log('Nenhum registro pendente encontrado.');
    } else {
      console.log(`Encontrados ${records.length} registros pendentes:`);
      records.forEach(record => {
        console.log(`\nID: ${record.id}`);
        console.log(`Video Filename: ${record.get('Video Filename')}`);
        console.log(`Titulo Youtube: ${record.get('Titulo Youtube')}`);
        console.log(`Caption: ${record.get('Caption') || '(sem descrição)'}`);
        console.log(`Status: ${record.get('Status')}`);
        console.log(`Date Added: ${record.get('Date Added')}`);
      });
    }
  } catch (error) {
    console.error('Erro ao buscar registros do Airtable:', error);
  }
}

// Executar
findPendingVideos(); 