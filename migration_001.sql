-- migration_001.sql
-- Gestão de Usuários + Audit Logs
-- Aplicar no container: docker exec -i pet_db psql -U admin_pet -d petmonitor < migration_001.sql

-- ─── Colunas de soft-delete e timestamps em users ────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS status      VARCHAR(20)  NOT NULL DEFAULT 'ativo';
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN   NOT NULL DEFAULT FALSE;

-- ─── Colunas de soft-delete e timestamps em pets ─────────────────────────────
ALTER TABLE pets ADD COLUMN IF NOT EXISTS status      VARCHAR(20)  NOT NULL DEFAULT 'ativo';
ALTER TABLE pets ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW();
ALTER TABLE pets ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW();

-- ─── Marca o admin padrão como super admin ────────────────────────────────────
UPDATE users SET is_super_admin = TRUE WHERE email = 'admin@pethotel.com';

-- ─── Tabela de logs de auditoria ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id            SERIAL       PRIMARY KEY,
    entity_type   VARCHAR(50)  NOT NULL,
    entity_id     INTEGER      NOT NULL,
    action        VARCHAR(20)  NOT NULL,
    changes       JSONB,
    performed_by  INTEGER      NOT NULL REFERENCES users(id),
    performed_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity       ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_performed_by ON audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_performed_at ON audit_logs(performed_at DESC);
