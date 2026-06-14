const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: false,
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

// Middleware de Autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token não fornecido.' });

  jwt.verify(token, process.env.JWT_SECRET || 'secret123', (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido ou expirado.' });
    req.user = user;
    next();
  });
};

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// SRS on_publish Hook (Streaming)
app.post('/api/video/auth-publish', async (req, res) => {
  const { ip, stream, param } = req.body;
  const streamKey = param ? new URLSearchParams(param.replace('?', '')).get('key') : null;

  if (!streamKey) {
    console.warn(`Publicação rejeitada: Sem chave (IP: ${ip})`);
    return res.status(200).send("1"); 
  }

  try {
    const result = await pool.query(
      'SELECT id FROM rtmp_cameras WHERE id = $1 AND stream_key = $2 AND status = $3',
      [stream, streamKey, 'ativo']
    );

    if (result.rows.length > 0) {
      return res.status(200).send("0");
    }
    return res.status(200).send("1");
  } catch (err) {
    return res.status(200).send("1");
  }
});

app.post('/api/video/on-unpublish', (req, res) => {
  res.status(200).send("0");
});

// Rotas de Autenticação
app.post('/api/auth/login', async (req, res) => {
  const { username, password, userType } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE role = $1 AND (email = $2 OR name = $2)', [userType, username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Utilizador não encontrado.' });

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Senha inválida.' });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secret123', { expiresIn: '24h' });
    res.json({ success: true, token, user: { id: user.id, username: user.name, userType: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

app.post('/api/register', async (req, res) => {
  const { tutor, pet } = req.body;
  try {
    await pool.query('BEGIN');
    const hashedPassword = await bcrypt.hash(tutor.password, 10);
    const tutorRes = await pool.query(
      'INSERT INTO users (name, email, password, role, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [tutor.name, tutor.email, hashedPassword, 'tutor', tutor.phone]
    );
    await pool.query(
      'INSERT INTO pets (name, species, breed, age, tutor_id, services, check_in, check_out) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [pet.name, pet.species, pet.breed, pet.age, tutorRes.rows[0].id, JSON.stringify(pet.services), pet.checkIn, pet.checkOut]
    );
    await pool.query('COMMIT');
    res.status(201).json({ success: true });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: 'Erro no cadastro.' });
  }
});

// Rotas de Dados
app.get('/api/pets/my', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pets WHERE tutor_id = $1', [req.user.id]);
    res.json({ pets: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar pets.' });
  }
});

app.get('/api/rtmp/cameras', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, stream_key as "streamKey", status, playable_url as "playableUrl" FROM rtmp_cameras');
    res.json({ cameras: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar câmeras.' });
  }
});

app.listen(port, async () => {
  console.log(`Backend rodando na porta ${port}`);
  try {
    const adminCheck = await pool.query("SELECT * FROM users WHERE email = 'admin@pethotel.com'");
    if (adminCheck.rows.length === 0) {
      const hash = await bcrypt.hash('123456', 10);
      await pool.query("INSERT INTO users (name, email, password, role) VALUES ('admin', 'admin@pethotel.com', $1, 'admin')", [hash]);
      console.log('Admin criado: admin@pethotel.com / 123456');
    }
  } catch (err) {
    console.error('Erro na inicialização:', err);
  }
});
