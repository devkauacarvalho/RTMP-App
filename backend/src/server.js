const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// Middlewares de Segurança e Parse
app.use(helmet());
app.use(cors());
app.use(express.json());

// Banco de Dados
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: 5432,
});

pool.on('error', (err) => {
  console.error('Erro inesperado no banco de dados', err);
  process.exit(-1);
});

// --- ROTAS INICIAIS ---

// Healthcheck para o Docker
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Backend rodando perfeitamente.' });
});

// Webhook de Autorização do SRS (DVR -> Servidor)
app.post('/api/video/auth-publish', (req, res) => {
  const { action, ip, vhost, app, stream, param } = req.body;
  
  // O DVR deve enviar o RTMP assim: rtmp://seu-ip/live/area1?key=CHAVE_SECRETA
  // param conterá: "?key=CHAVE_SECRETA"
  
  const expectedKey = `?key=${process.env.STREAM_KEY || '123456'}`;
  
  if (param === expectedKey) {
    console.log(`Transmissão autorizada para a câmera: ${stream}`);
    return res.status(200).send("0"); // SRS exige retorno numérico 0 para Sucesso
  } else {
    console.log(`Tentativa de transmissão negada de IP: ${ip}`);
    return res.status(401).send("1"); // Erro, derruba a conexão
  }
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor backend rodando na porta ${port}`);
  
  // Testa a conexão com o banco logo na inicialização
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Falha ao conectar no PostgreSQL', err.stack);
    } else {
      console.log('Conectado ao banco de dados com sucesso!');
    }
  });
});