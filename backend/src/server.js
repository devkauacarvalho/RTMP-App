const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: false, // Necessário para permitir o carregamento de streams de vídeo externos se necessário
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: 5432,
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// SRS on_publish Hook
app.post('/api/video/auth-publish', async (req, res) => {
  const { ip, stream, param } = req.body;
  
  // SRS envia params como string: ?key=minha_chave
  const streamKey = param ? new URLSearchParams(param.get ? param : param.replace('?', '')).get('key') : null;

  if (!streamKey) {
    console.error(`Publicação rejeitada: Sem chave de stream (IP: ${ip})`);
    return res.status(200).send("1"); 
  }

  try {
    const result = await pool.query(
      'SELECT id FROM rtmp_cameras WHERE id = $1 AND stream_key = $2 AND status = $3',
      [stream, streamKey, 'ativo']
    );

    if (result.rows.length > 0) {
      console.log(`Publicação autorizada: Stream ${stream} (IP: ${ip})`);
      return res.status(200).send("0");
    } else {
      console.warn(`Publicação negada: Chave ou ID inválido para ${stream} (IP: ${ip})`);
      return res.status(200).send("1");
    }
  } catch (err) {
    console.error('Erro na validação do SRS Hook:', err);
    return res.status(200).send("1");
  }
});

app.post('/api/video/on-unpublish', (req, res) => {
  const { stream } = req.body;
  console.log(`Stream encerrada: ${stream}`);
  res.status(200).send("0");
});

app.listen(port, () => {
  console.log(`Backend rodando na porta ${port}`);
});
