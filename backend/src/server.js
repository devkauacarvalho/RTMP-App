const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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
  res.status(200).json({ status: 'OK', message: 'Backend a correr perfeitamente.' });
});

// ... (rotas de vídeo SRS mantêm-se públicas)

app.get('/api/pets/my', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, species, breed, age, tutor_id as "tutorId", 
      services, check_in as "checkIn", check_out as "checkOut" 
      FROM pets 
      WHERE tutor_id = $1
    `, [req.user.id]);
    res.json({ pets: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar seus pets.' });
  }
});

app.post('/api/video/auth-publish', async (req, res) => {
  // O SRS envia vários dados do DVR, incluindo o IP público, o nome do stream e os parâmetros da URL
  const { ip, stream, param } = req.body;
  
  // O 'param' chega no formato "?key=CHAVE_AQUI". Extraímos apenas o valor.
  const streamKey = param ? new URLSearchParams(param).get('key') : null;

  if (!streamKey) {
    console.log(`❌ Transmissão bloqueada: DVR no IP ${ip} tentou enviar sem chave de transmissão.`);
    return res.status(401).send("1"); // "1" significa rejeitado para o servidor SRS
  }

  try {
    // Procura na base de dados se existe uma câmara com este ID (stream) que corresponda a esta chave (streamKey)
    const result = await pool.query(
      'SELECT * FROM rtmp_cameras WHERE id = $1 AND stream_key = $2',
      [stream, streamKey]
    );

    if (result.rows.length > 0) {
      const camera = result.rows[0];
      console.log(`✅ Acesso Autorizado: DVR (${ip}) a transmitir para a câmara "${camera.name}" (ID: ${stream})`);
      
      // Opcional: Atualiza automaticamente o status da câmara para "ativo" para o painel de administração saber que está online
      await pool.query('UPDATE rtmp_cameras SET status = $1 WHERE id = $2', ['ativo', stream]);
      
      return res.status(200).send("0"); // "0" significa autorizado para o servidor SRS
    } else {
      console.log(`❌ Acesso Negado: DVR (${ip}) usou uma chave inválida para a câmara ID "${stream}"`);
      return res.status(401).send("1");
    }
  } catch (err) {
    console.error('Erro na validação do RTMP com a base de dados:', err);
    return res.status(500).send("1"); // Bloqueia por precaução se a base de dados falhar
  }
});

// Outro Hook do SRS: Quando o DVR desliga/cai, podemos atualizar o status para inativo
app.post('/api/video/on-unpublish', async (req, res) => {
  const { stream } = req.body;
  try {
    await pool.query('UPDATE rtmp_cameras SET status = $1 WHERE id = $2', ['inativo', stream]);
    console.log(`⏸️ Transmissão encerrada para a câmara ID: ${stream}`);
    return res.status(200).send("0");
  } catch (err) {
    return res.status(200).send("0");
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password, userType } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Utilizador e palavra-passe são obrigatórios.' });
  }

  try {
    const query = 'SELECT * FROM users WHERE role = $1 AND (email = $2 OR name = $2)';
    const values = [userType, username];
    
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas ou utilizador não encontrado.' });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.name,
        userType: user.role,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Erro na rota de login:', err);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

app.post('/api/register', async (req, res) => {
  const { tutor, pet } = req.body;
  try {
    await pool.query('BEGIN');
    
    // Encriptar a palavra-passe gerada
    const hashedPassword = await bcrypt.hash(tutor.password, 10);
    
    const tutorQuery = `
      INSERT INTO users (name, email, password, role, phone) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING id, name, email, phone, name as username
    `;
    const tutorResult = await pool.query(tutorQuery, [tutor.name, tutor.email, hashedPassword, 'tutor', tutor.phone]);
    const newTutor = tutorResult.rows[0];

    const petQuery = `
      INSERT INTO pets (name, species, breed, age, tutor_id, services, check_in, check_out) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *
    `;
    const petResult = await pool.query(petQuery, [
      pet.name, pet.species, pet.breed, pet.age, newTutor.id, 
      JSON.stringify(pet.services), pet.checkIn, pet.checkOut
    ]);
    const newPet = petResult.rows[0];

    await pool.query('COMMIT');
    res.status(201).json({ tutor: newTutor, pet: newPet });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Erro no registo:', err);
    res.status(500).json({ error: 'Erro interno ao cadastrar tutor e pet.' });
  }
});

app.get('/api/tutors', async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name, email, phone, name as username FROM users WHERE role = 'tutor'");
    res.json({ tutors: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar tutores.' });
  }
});

app.get('/api/pets', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, species, breed, age, tutor_id as "tutorId", 
      services, check_in as "checkIn", check_out as "checkOut" 
      FROM pets
    `);
    res.json({ pets: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar pets.' });
  }
});

app.get('/api/rtmp/config', async (req, res) => {
  try {
    const result = await pool.query('SELECT server_url as "serverUrl" FROM rtmp_config WHERE id = 1');
    res.json({ config: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao carregar configuração do servidor.' });
  }
});

app.put('/api/rtmp/config', async (req, res) => {
  try {
    const { serverUrl } = req.body;
    await pool.query('UPDATE rtmp_config SET server_url = $1 WHERE id = 1', [serverUrl]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar configuração do servidor.' });
  }
});

app.get('/api/rtmp/cameras', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, stream_key as "streamKey", status, playable_url as "playableUrl" 
      FROM rtmp_cameras
    `);
    res.json({ cameras: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao carregar câmaras.' });
  }
});

app.put('/api/rtmp/cameras/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, streamKey, status, playableUrl } = req.body;
    
    const query = `
      INSERT INTO rtmp_cameras (id, name, stream_key, status, playable_url) 
      VALUES ($1, $2, $3, $4, $5) 
      ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name, 
        stream_key = EXCLUDED.stream_key, 
        status = EXCLUDED.status, 
        playable_url = EXCLUDED.playable_url
    `;
    await pool.query(query, [id, name, streamKey, status, playableUrl]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao guardar câmara.' });
  }
});

app.listen(port, async () => {
  console.log(`🚀 Servidor backend a correr na porta ${port}`);
  
  try {
    // 1. Testa a ligação à base de dados
    await pool.query('SELECT NOW()');
    console.log('📦 Ligado à base de dados com sucesso!');

    // 2. Verifica se a tabela users já existe (para evitar erros se o init.sql ainda estiver a correr)
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      );
    `);

    // 3. Se a tabela existir, verifica se o admin já lá está
    if (tableCheck.rows[0].exists) {
      const adminCheck = await pool.query("SELECT * FROM users WHERE email = 'admin@pethotel.com'");
      
      // 4. Se o admin não existir, cria-o automaticamente e encripta a palavra-passe corretamente!
      if (adminCheck.rows.length === 0) {
        const hash = await bcrypt.hash('123456', 10);
        await pool.query(
          "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
          ['admin', 'admin@pethotel.com', hash, 'admin']
        );
        console.log('👑 Utilizador admin gerado automaticamente pelo servidor!');
      }
    }
  } catch (err) {
    console.error('Falha ao ligar/inicializar PostgreSQL', err.stack);
  }
});