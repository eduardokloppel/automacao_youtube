// Endpoint de teste simples para Vercel
export default function handler(req, res) {
  res.status(200).json({ 
    message: 'API funcionando!',
    timestamp: new Date().toISOString(),
    method: req.method
  });
} 