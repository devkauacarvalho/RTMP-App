const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: 5432,
});

pool.on('error', (err) => {
  console.error('Erro inesperado na base de dados', err);
  process.exit(-1);
});

// Rota de Saude
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Hook do SRS para validar a publicacao (on_publish)
app.post('/api/video/auth-publish', async (req, res) => {
  const { ip, stream, param } = req.body;
  console.log(`SRS Hook Recebido: IP=${ip}, Stream=${stream}, Param=${param}`);
  
  // Extrair chave da URL query string (?key=VALOR)
  const streamKey = param ? new URLSearchParams(param).get('key') : null;

  if (!streamKey) {
    console.log(`Transmissao bloqueada: DVR no IP ${ip} tentou enviar sem chave.`);
    return res.status(200).send("1"); // Retorna "1" para o SRS rejeitar
  }

  try {
    const result = await pool.query(
      'SELECT * FROM rtmp_cameras WHERE id = $1 AND stream_key = $2',
      [stream, streamKey]
    );

    if (result.rows.length > 0) {
      console.log(`Acesso Autorizado: DVR (${ip}) transmitindo para câmara "${stream}"`);
      await pool.query('UPDATE rtmp_cameras SET status = $1 WHERE id = $2', ['ativo', stream]);
      return res.status(200).send("0"); // Retorna "0" para o SRS aceitar
    } else {
      console.log(`Acesso Negado: Chave invalida para a câmara "${stream}"`);
      return res.status(200).send("1");
    }
  } catch (err) {
    console.error('Erro na validacao do RTMP:', err);
    return res.status(200).send("1");
  }
});

// Hook do SRS para quando a transmissao encerra (on_unpublish)
app.post('/api/video/on-unpublish', async (req, res) => {
  const { stream } = req.body;
  try {
    await pool.query('UPDATE rtmp_cameras SET status = $1 WHERE id = $2', ['inativo', stream]);
    console.log(`Transmissao encerrada para a câmara: ${stream}`);
    return res.status(200).send("0");
  } catch (err) {
    return res.status(200).send("0");
  }
});

app.listen(port, () => {
  console.log(`Servidor backend rodando na porta ${port}`);
});
