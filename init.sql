CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    phone VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS pets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    species VARCHAR(50),
    breed VARCHAR(100),
    age VARCHAR(50),
    tutor_id INTEGER REFERENCES users(id),
    services JSONB,
    check_in DATE,
    check_out DATE
);

CREATE TABLE IF NOT EXISTS rtmp_config (
    id SERIAL PRIMARY KEY,
    server_url VARCHAR(255)
);

-- Insere uma configuração padrão para o RTMP
INSERT INTO rtmp_config (id, server_url) VALUES (1, 'rtmp://localhost/live') ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS rtmp_cameras (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    stream_key VARCHAR(100),
    status VARCHAR(50),
    playable_url VARCHAR(255)
);

-- Inserir as 3 câmeras padrão para facilitar o início
INSERT INTO rtmp_cameras (id, name, stream_key, status, playable_url) 
VALUES 
('hospedagem', 'Hospedagem', 'hosp123', 'inativo', ''),
('recreacao', 'Recreação', 'rec123', 'inativo', ''),
('banho', 'Banho e Tosa', 'banho123', 'inativo', '')
ON CONFLICT (id) DO NOTHING;
