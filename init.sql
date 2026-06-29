CREATE TABLE IF NOT EXISTS users (
    id             SERIAL       PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    email          VARCHAR(100) UNIQUE,
    password       VARCHAR(255) NOT NULL,
    role           VARCHAR(50)  NOT NULL,
    phone          VARCHAR(20),
    status         VARCHAR(20)  NOT NULL DEFAULT 'ativo',
    is_super_admin BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pets (
    id         SERIAL      PRIMARY KEY,
    name       VARCHAR(100),
    species    VARCHAR(50),
    breed      VARCHAR(100),
    age        VARCHAR(50),
    tutor_id   INTEGER     REFERENCES users(id),
    services   JSONB,
    check_in   DATE,
    check_out  DATE,
    status     VARCHAR(20) NOT NULL DEFAULT 'ativo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rtmp_config (
    id         SERIAL PRIMARY KEY,
    server_url VARCHAR(255)
);

-- Insere uma configuração padrão para o RTMP
INSERT INTO rtmp_config (id, server_url) VALUES (1, 'rtmp://localhost/live') ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS rtmp_cameras (
    id           VARCHAR(50)  PRIMARY KEY,
    name         VARCHAR(100),
    stream_key   VARCHAR(100),
    status       VARCHAR(50),
    playable_url VARCHAR(255)
);

-- Inserir as 3 câmeras padrão para facilitar o início
INSERT INTO rtmp_cameras (id, name, stream_key, status, playable_url) 
VALUES 
('hospedagem', 'Hospedagem', 'hosp123', 'inativo', ''),
('recreacao', 'Recreação', 'rec123', 'inativo', ''),
('banho', 'Banho e Tosa', 'banho123', 'inativo', '')
ON CONFLICT (id) DO NOTHING;

-- Tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
    id           SERIAL      PRIMARY KEY,
    entity_type  VARCHAR(50) NOT NULL,
    entity_id    INTEGER     NOT NULL,
    action       VARCHAR(20) NOT NULL,
    changes      JSONB,
    performed_by INTEGER     NOT NULL REFERENCES users(id),
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity       ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_performed_by ON audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_performed_at ON audit_logs(performed_at DESC);

