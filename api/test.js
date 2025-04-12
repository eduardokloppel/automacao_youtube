// Endpoint de teste para verificar compatibilidade
module.exports = (req, res) => {
  res.status(200).json({ message: 'Teste de API com CommonJS funcionando!' });
} 