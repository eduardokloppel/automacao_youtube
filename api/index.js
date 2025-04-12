// Ponto de entrada para a API Vercel
export default function handler(req, res) {
  const path = req.url.split('/api/')[1] || '';
  
  // Roteamento básico
  if (path === '' || path === '/') {
    return res.status(200).json({ 
      status: 'success', 
      message: 'API está ativa',
      endpoints: ['/api/processQueue']
    });
  }
  
  // Resposta 404 para rotas não encontradas
  return res.status(404).json({ 
    status: 'error', 
    message: 'Endpoint não encontrado' 
  });
} 