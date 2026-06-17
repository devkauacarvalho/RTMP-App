const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
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

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido.' });
  jwt.verify(token, process.env.JWT_SECRET || 'secret123', (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido.' });
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
};

// SRS Hooks - Suporte a chaves via query param ou sufixo (DVR)
app.post('/api/video/auth-publish', async (req, res) => {
  const { ip, stream, param, app: appName } = req.body;
  
  // LOG CRÍTICO PARA DEPURAÇÃO
  console.log(`[Webhook SRS] APP: ${appName} | STREAM: ${stream} | PARAM: ${param} | IP: ${ip}`);

  // Bypass para o sinal transcodificado ou tráfego interno
  if (appName === 'live' || ip === '127.0.0.1' || ip === '::1') {
    console.log(`[Webhook SRS] Bypass autorizado: ${appName}/${stream}`);
    return res.status(200).send("0");
  }

  // Validação para o app 'ingest' (DVR/OBS)
  let streamKey = param ? new URLSearchParams(param.replace('?', '')).get('key') : null;
  let streamId = stream;

  // Suporte a formato camId_key
  if (!streamKey && stream.includes('_')) {
    const parts = stream.split('_');
    streamId = parts[0];
    streamKey = parts[1];
  }

  try {
    const result = await pool.query(
      'SELECT id FROM rtmp_cameras WHERE id = $1 AND stream_key = $2',
      [streamId, streamKey]
    );

    if (result.rows.length > 0) {
      await pool.query('UPDATE rtmp_cameras SET status = $1 WHERE id = $2', ['ativo', streamId]);
      console.log(`[Webhook SRS] Sucesso: Camera ${streamId} autorizada em '${appName}'`);
      return res.status(200).send("0");
    }
    
    console.warn(`[Webhook SRS] Negado: Camera ${streamId} com chave inválida em '${appName}'`);
    return res.status(200).send("1");
  } catch (err) {
    console.error('[Webhook SRS] Erro crítico:', err);
    return res.status(200).send("1");
  }
});

app.post('/api/video/on-unpublish', async (req, res) => {
  const { stream } = req.body;
  try {
    await pool.query('UPDATE rtmp_cameras SET status = $1 WHERE id = $2', ['inativo', stream]);
    console.log(`Stream Encerrada: ${stream}`);
    res.status(200).send("0");
  } catch (err) {
    res.status(200).send("0");
  }
});

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

app.post('/api/register', authenticateToken, isAdmin, async (req, res) => {
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
    const newTutor = { id: tutorRes.rows[0].id, name: tutor.name, email: tutor.email, phone: tutor.phone };
    const newPet = { ...pet, tutorId: tutorRes.rows[0].id };
    res.status(201).json({ success: true, tutor: newTutor, pet: newPet });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: 'Erro no cadastro.' });
  }
});

app.get('/api/tutors', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, phone FROM users WHERE role = $1', ['tutor']);
    res.json({ tutors: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar tutores.' });
  }
});

app.get('/api/pets', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT p.*, u.name as "tutorName" FROM pets p JOIN users u ON p.tutor_id = u.id');
    res.json({ pets: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar pets.' });
  }
});

app.get('/api/pets/my', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pets WHERE tutor_id = $1', [req.user.id]);
    res.json({ pets: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar pets.' });
  }
});

app.get('/api/rtmp/config', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT server_url as "serverUrl" FROM rtmp_config WHERE id = 1');
    res.json({ config: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar config RTMP.' });
  }
});

app.put('/api/rtmp/config', authenticateToken, isAdmin, async (req, res) => {
  const { serverUrl } = req.body;
  try {
    await pool.query('UPDATE rtmp_config SET server_url = $1 WHERE id = 1', [serverUrl]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar config RTMP.' });
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

app.put('/api/rtmp/cameras/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, streamKey, status, playableUrl } = req.body;
  try {
    await pool.query(
      'INSERT INTO rtmp_cameras (id, name, stream_key, status, playable_url) VALUES ($1, $2, $3, $4, $5) ' +
      'ON CONFLICT (id) DO UPDATE SET name = $2, stream_key = $3, status = $4, playable_url = $5',
      [id, name, streamKey, status, playableUrl]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar câmera.' });
  }
});

app.listen(port, '0.0.0.0', async () => {
  console.log(`Backend rodando na porta ${port}`);
  try {
    const adminCheck = await pool.query("SELECT * FROM users WHERE email = 'admin@pethotel.com'");
    if (adminCheck.rows.length === 0) {
      const hash = await bcrypt.hash('123456', 10);
      await pool.query("INSERT INTO users (name, email, password, role) VALUES ('admin', 'admin@pethotel.com', $1, 'admin')", [hash]);
    }
  } catch (err) {
    console.error('Erro na inicialização:', err);
  }
});
