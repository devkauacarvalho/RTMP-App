const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: 5432,
});

// ÔöÇÔöÇÔöÇ Middlewares ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token n├úo fornecido.' });
  jwt.verify(token, process.env.JWT_SECRET || 'secret123', (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inv├ílido.' });
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

const isSuperAdmin = (req, res, next) => {
  if (req.user && req.user.is_super_admin) {
    next();
  } else {
    res.status(403).json({ error: 'Acesso negado. Apenas super administradores.' });
  }
};

// ÔöÇÔöÇÔöÇ Helper de Auditoria ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

const logAudit = async (entityType, entityId, action, changes, performedBy) => {
  try {
    await pool.query(
      'INSERT INTO audit_logs (entity_type, entity_id, action, changes, performed_by) VALUES ($1, $2, $3, $4, $5)',
      [entityType, parseInt(entityId), action, JSON.stringify(changes), performedBy]
    );
  } catch (err) {
    console.error('[Audit] Erro ao registrar log:', err);
  }
};

// ÔöÇÔöÇÔöÇ SRS Hooks ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

app.post('/api/video/auth-publish', async (req, res) => {
  const { ip, stream, param, app: appName } = req.body;
  console.log(`[Webhook SRS] PUBLISH: App=${appName} | Stream=${stream} | IP=${ip}`);

  // Extrai streamId e streamKey independentemente do app (live, ingest, etc.)
  let streamKey = param ? new URLSearchParams(param.replace('?', '')).get('key') : null;
  let streamId = stream;

  // Suporte ao formato stream_key como sufixo (ex: cam902_123456)
  if (!streamKey && stream.includes('_')) {
    const parts = stream.split('_');
    streamId = parts[0];
    streamKey = parts[1];
  }

  // Bypass para tr├ífego interno sem stream_key (ex: transcodifica├º├úo interna)
  if (!streamKey && (ip === '127.0.0.1' || ip === '::1')) {
    console.log(`[Webhook SRS] Bypass tr├ífego interno: ${stream}`);
    return res.status(200).send("0");
  }

  try {
    const result = await pool.query(
      'SELECT id FROM rtmp_cameras WHERE id = $1 AND stream_key = $2',
      [streamId, streamKey]
    );

    if (result.rows.length > 0) {
      // Atualiza o status para 'ativo' em qualquer app (live, ingest, etc.)
      await pool.query('UPDATE rtmp_cameras SET status = $1 WHERE id = $2', ['ativo', streamId]);
      console.log(`[Webhook SRS] Autorizado e ativado: ${streamId} (app=${appName})`);
      return res.status(200).send("0");
    }

    console.warn(`[Webhook SRS] Negado: stream=${streamId}, key inv├ílida ou c├ómera n├úo encontrada`);
    return res.status(200).send("1");
  } catch (err) {
    console.error('[Webhook SRS] Erro auth:', err);
    return res.status(200).send("1");
  }
});

app.post('/api/video/on-unpublish', async (req, res) => {
  const { stream, app: appName } = req.body;
  console.log(`[Webhook SRS] UNPUBLISH detectado: ${appName}/${stream}`);
  res.status(200).send("0");
});

// ÔöÇÔöÇÔöÇ Autentica├º├úo ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

app.post('/api/auth/login', async (req, res) => {
  const { username, password, userType } = req.body;
  try {
    const query = userType === 'admin'
      ? "SELECT * FROM users WHERE role = $1 AND status != 'inativo' AND (email = $2 OR name = $2)"
      : "SELECT * FROM users WHERE role = $1 AND status != 'inativo' AND email = $2";
    const result = await pool.query(query, [userType, username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Utilizador não encontrado.' });
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Senha inválida.' });
    const token = jwt.sign(
      { id: user.id, role: user.role, is_super_admin: user.is_super_admin || false },
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
        isSuperAdmin: user.is_super_admin || false,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name, email, role, is_super_admin FROM users WHERE id = $1 AND status != 'inativo'", [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Utilizador não encontrado.' });
    const user = result.rows[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.name,
        userType: user.role,
        isSuperAdmin: user.is_super_admin || false,
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ─── Registro (Tutor + Pets opcionais) ──────────────────────────────────────

app.post('/api/register', authenticateToken, isAdmin, async (req, res) => {
  const { tutor, pets } = req.body;
  // Retrocompatibilidade: se receber `pet` (singular), converte para array
  const petList = Array.isArray(pets) ? pets : (req.body.pet ? [req.body.pet] : []);
  try {
    await pool.query('BEGIN');
    const hashedPassword = await bcrypt.hash(tutor.password, 10);
    
    // Verificar se e-mail já existe
    const existing = await pool.query('SELECT id, status FROM users WHERE email = $1', [tutor.email]);
    let tutorRes;
    
    if (existing.rows.length > 0) {
      if (existing.rows[0].status === 'ativo') {
        await pool.query('ROLLBACK');
        return res.status(400).json({ error: 'Este e-mail já está em uso por um tutor ativo.' });
      }
      // Se estiver inativo, reativa e atualiza os dados
      tutorRes = await pool.query(
        'UPDATE users SET name=$1, password=$2, phone=$3, status=$4, updated_at=NOW() WHERE id=$5 RETURNING id, name, email, phone',
        [tutor.name, hashedPassword, tutor.phone, 'ativo', existing.rows[0].id]
      );
    } else {
      // Se não existe, cria um novo
      tutorRes = await pool.query(
        'INSERT INTO users (name, email, password, role, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone',
        [tutor.name, tutor.email, hashedPassword, 'tutor', tutor.phone]
      );
    }

    const tutorId = tutorRes.rows[0].id;
    const createdPets = [];

    for (const pet of petList) {
      const petRes = await pool.query(
        'INSERT INTO pets (name, species, breed, age, tutor_id, services, check_in, check_out) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [pet.name, pet.species, pet.breed, pet.age, tutorId, JSON.stringify(pet.services || []), pet.checkIn, pet.checkOut]
      );
      createdPets.push(petRes.rows[0]);
      await logAudit('pet', petRes.rows[0].id, 'create', { name: pet.name, tutor_id: tutorId }, req.user.id);
    }

    await pool.query('COMMIT');


    const newTutor = { ...tutorRes.rows[0] };
    res.status(201).json({ success: true, tutor: newTutor, pets: createdPets });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Erro no cadastro.' });
  }
});

// ÔöÇÔöÇÔöÇ Tutores ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

app.get('/api/tutors', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, phone, created_at, updated_at FROM users WHERE role = 'tutor' AND status != 'inativo' ORDER BY name"
    );
    res.json({ tutors: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar tutores.' });
  }
});

app.put('/api/tutors/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, password } = req.body;
  try {
    const current = await pool.query("SELECT * FROM users WHERE id = $1 AND role = 'tutor'", [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Tutor n├úo encontrado.' });

    const old = current.rows[0];
    const changes = {};
    if (name && name !== old.name)   changes.name  = { old: old.name,  new: name };
    if (email && email !== old.email) changes.email = { old: old.email, new: email };
    if (phone && phone !== old.phone) changes.phone = { old: old.phone, new: phone };

    let result;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      result = await pool.query(
        'UPDATE users SET name=$1, email=$2, phone=$3, password=$4, updated_at=NOW() WHERE id=$5 RETURNING id, name, email, phone, updated_at',
        [name || old.name, email || old.email, phone || old.phone, hashedPassword, id]
      );
      changes.password = { old: '[oculto]', new: '[atualizado]' };
    } else {
      result = await pool.query(
        'UPDATE users SET name=$1, email=$2, phone=$3, updated_at=NOW() WHERE id=$4 RETURNING id, name, email, phone, updated_at',
        [name || old.name, email || old.email, phone || old.phone, id]
      );
    }

    await logAudit('user', id, 'update', changes, req.user.id);
    res.json({ success: true, tutor: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar tutor.' });
  }
});

app.delete('/api/tutors/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const current = await pool.query("SELECT * FROM users WHERE id = $1 AND role = 'tutor'", [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Tutor n├úo encontrado.' });

    await pool.query("UPDATE users SET status = 'inativo', updated_at = NOW() WHERE id = $1", [id]);
    await pool.query("UPDATE pets SET status = 'inativo', updated_at = NOW() WHERE tutor_id = $1", [id]);

    await logAudit('user', id, 'delete', { status: { old: 'ativo', new: 'inativo' } }, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao desativar tutor.' });
  }
});

// ÔöÇÔöÇÔöÇ Pets ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

app.get('/api/pets', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT p.*, u.name as \"tutorName\" FROM pets p JOIN users u ON p.tutor_id = u.id WHERE p.status != 'inativo' ORDER BY p.name"
    );
    res.json({ pets: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar pets.' });
  }
});

app.get('/api/pets/my', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM pets WHERE tutor_id = $1 AND status != 'inativo'",
      [req.user.id]
    );
    res.json({ pets: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar pets.' });
  }
});

app.put('/api/pets/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, species, breed, age, services, checkIn, checkOut } = req.body;
  try {
    const current = await pool.query('SELECT * FROM pets WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Pet n├úo encontrado.' });

    const old = current.rows[0];
    const changes = {};
    if (name    && name    !== old.name)    changes.name    = { old: old.name,    new: name };
    if (species && species !== old.species) changes.species = { old: old.species, new: species };
    if (breed   && breed   !== old.breed)   changes.breed   = { old: old.breed,   new: breed };
    if (age     && age     !== old.age)     changes.age     = { old: old.age,     new: age };
    if (services) changes.services = { old: old.services, new: services };
    if (checkIn  && checkIn  !== old.check_in)  changes.check_in  = { old: old.check_in,  new: checkIn };
    if (checkOut && checkOut !== old.check_out) changes.check_out = { old: old.check_out, new: checkOut };

    const result = await pool.query(
      'UPDATE pets SET name=$1, species=$2, breed=$3, age=$4, services=$5, check_in=$6, check_out=$7, updated_at=NOW() WHERE id=$8 RETURNING *',
      [
        name    || old.name,
        species || old.species,
        breed   || old.breed,
        age     || old.age,
        JSON.stringify(services !== undefined ? services : old.services),
        checkIn  || old.check_in,
        checkOut || old.check_out,
        id,
      ]
    );

    await logAudit('pet', id, 'update', changes, req.user.id);
    res.json({ success: true, pet: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar pet.' });
  }
});

app.delete('/api/pets/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const current = await pool.query('SELECT * FROM pets WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Pet n├úo encontrado.' });

    await pool.query("UPDATE pets SET status = 'inativo', updated_at = NOW() WHERE id = $1", [id]);
    await logAudit('pet', id, 'delete', { status: { old: 'ativo', new: 'inativo' } }, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao desativar pet.' });
  }
});

// ÔöÇÔöÇÔöÇ Admins (super admin apenas) ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

app.get('/api/admins', authenticateToken, isAdmin, isSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, phone, is_super_admin, created_at, updated_at FROM users WHERE role = 'admin' AND status != 'inativo' ORDER BY name"
    );
    res.json({ admins: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar admins.' });
  }
});

app.post('/api/admins', authenticateToken, isAdmin, isSuperAdmin, async (req, res) => {
  const { name, email, phone, password, isSuperAdmin: newIsSuperAdmin } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role, phone, is_super_admin) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, phone, is_super_admin',
      [name, email, hashedPassword, 'admin', phone || null, newIsSuperAdmin || false]
    );
    await logAudit('user', result.rows[0].id, 'create', { name, email, role: 'admin' }, req.user.id);
    res.status(201).json({ success: true, admin: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar admin.' });
  }
});

app.put('/api/admins/:id', authenticateToken, isAdmin, isSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, password } = req.body;
  try {
    const current = await pool.query("SELECT * FROM users WHERE id = $1 AND role = 'admin'", [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Admin n├úo encontrado.' });

    const old = current.rows[0];
    const changes = {};
    if (name  && name  !== old.name)  changes.name  = { old: old.name,  new: name };
    if (email && email !== old.email) changes.email = { old: old.email, new: email };
    if (phone && phone !== old.phone) changes.phone = { old: old.phone, new: phone };

    let result;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      result = await pool.query(
        'UPDATE users SET name=$1, email=$2, phone=$3, password=$4, updated_at=NOW() WHERE id=$5 RETURNING id, name, email, phone, is_super_admin, updated_at',
        [name || old.name, email || old.email, phone || old.phone, hashedPassword, id]
      );
      changes.password = { old: '[oculto]', new: '[atualizado]' };
    } else {
      result = await pool.query(
        'UPDATE users SET name=$1, email=$2, phone=$3, updated_at=NOW() WHERE id=$4 RETURNING id, name, email, phone, is_super_admin, updated_at',
        [name || old.name, email || old.email, phone || old.phone, id]
      );
    }

    await logAudit('user', id, 'update', changes, req.user.id);
    res.json({ success: true, admin: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar admin.' });
  }
});

app.delete('/api/admins/:id', authenticateToken, isAdmin, isSuperAdmin, async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Voc├¬ n├úo pode desativar a sua pr├│pria conta.' });
  }
  try {
    const current = await pool.query("SELECT * FROM users WHERE id = $1 AND role = 'admin'", [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Admin n├úo encontrado.' });

    await pool.query("UPDATE users SET status = 'inativo', updated_at = NOW() WHERE id = $1", [id]);
    await logAudit('user', id, 'delete', { status: { old: 'ativo', new: 'inativo' } }, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao desativar admin.' });
  }
});

// ÔöÇÔöÇÔöÇ Logs de Auditoria ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

app.get('/api/audit-logs', authenticateToken, isAdmin, async (req, res) => {
  const { entity_type, entity_id, action, limit = 100, offset = 0 } = req.query;
  try {
    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (entity_type) { conditions.push(`al.entity_type = $${paramIdx++}`); params.push(entity_type); }
    if (entity_id)   { conditions.push(`al.entity_id = $${paramIdx++}`);   params.push(parseInt(entity_id)); }
    if (action)      { conditions.push(`al.action = $${paramIdx++}`);       params.push(action); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const filterParams = [...params];

    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(
      `SELECT al.*, u.name as "performedByName"
       FROM audit_logs al
       LEFT JOIN users u ON al.performed_by = u.id
       ${whereClause}
       ORDER BY al.performed_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM audit_logs al ${whereClause}`,
      filterParams
    );

    res.json({ logs: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar logs.' });
  }
});

// ÔöÇÔöÇÔöÇ RTMP Config ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

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
    const result = await pool.query(
      'SELECT id, name, stream_key as "streamKey", status, playable_url as "playableUrl" FROM rtmp_cameras'
    );
    const cameras = result.rows.map(c => ({
      ...c,
      playableUrl: (c.playableUrl && c.playableUrl.trim() !== '') ? c.playableUrl : `/live/${c.id}.m3u8`
    }));
    res.json({ cameras });
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
    res.status(500).json({ error: 'Erro ao atualizar c├ómera.' });
  }
});

// ÔöÇÔöÇÔöÇ Inicializa├º├úo ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

app.listen(port, '0.0.0.0', async () => {
  console.log(`Backend rodando na porta ${port}`);
  try {
    const adminCheck = await pool.query("SELECT * FROM users WHERE email = 'admin@pethotel.com'");
    if (adminCheck.rows.length === 0) {
      const hash = await bcrypt.hash('123456', 10);
      await pool.query(
        "INSERT INTO users (name, email, password, role, is_super_admin) VALUES ('admin', 'admin@pethotel.com', $1, 'admin', true)",
        [hash]
      );
      console.log('[Init] Admin padr├úo criado.');
    }
  } catch (err) {
    console.error('Erro na inicializa├º├úo:', err);
  }
});
