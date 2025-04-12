// Script para atualizar todos os arquivos da pasta API para usar ES Modules
const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'api');
const files = fs.readdirSync(apiDir);

console.log('Atualizando arquivos da pasta API para ES Modules...');

files.forEach(file => {
  if (file.endsWith('.js')) {
    const filePath = path.join(apiDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Verificar se o arquivo já usa ES Modules
    if (!content.includes('export default') && content.includes('module.exports')) {
      console.log(`Atualizando ${file}...`);
      
      // Substituir module.exports por export default
      content = content.replace(/module\.exports\s*=\s*{([^}]*)}/g, function(match, p1) {
        // Extrair nomes de funções
        const funcNames = p1.split(',').map(s => s.trim());
        
        // Criar exports individuais
        const exports = funcNames.map(name => `export const ${name} = ${name};`).join('\n');
        
        return exports;
      });
      
      // Substituir module.exports = func por export default func
      content = content.replace(/module\.exports\s*=\s*([^{;]*);?/g, 'export default $1;');
      
      // Salvar o arquivo
      fs.writeFileSync(filePath, content);
      console.log(`✅ ${file} atualizado`);
    } else {
      console.log(`⏭️ ${file} já está usando ES Modules ou não contém module.exports`);
    }
  }
});

console.log('Processo concluído!'); 