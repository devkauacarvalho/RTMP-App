# Pet Monitor PWA — Documento de Referência

> Sistema de monitoramento ao vivo para o **Hotel Pet Paradise**. Tutores acompanham seus pets via câmeras transmitidas em LL-HLS pelo navegador, sem instalação de aplicativos nativos.

---

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| **Frontend** | React + TypeScript + Vite | React 19, Vite 5 |
| **UI** | Tailwind CSS v4 + Shadcn UI (Radix UI + Lucide React) | – |
| **Player de Vídeo** | hls.js | ^1.6 |
| **Backend** | Node.js + Express | Node 20 |
| **Segurança** | JWT + bcrypt + Helmet + CORS | – |
| **Banco de Dados** | PostgreSQL 15 | Alpine |
| **Servidor de Mídia** | SRS (Simple Realtime Server) v5 | – |
| **Ingest** | RTMP (porta 1935) | – |
| **Playback** | LL-HLS via HTTP (porta 8080) | fragmentos de 2s, janela de 10s |
| **Infraestrutura** | Docker Compose | ARM-compatível (Oracle Free Tier) |

---

## Regras para Agentes de IA

> As regras abaixo são contratos estritos para geração de código neste projeto.

### 1. UI & Estilização
- Use **exclusivamente** Tailwind CSS e componentes Shadcn UI (Radix UI).
- Para mesclar classes Tailwind, sempre use a função `cn` localizada em `components/ui/utils.ts`.
- Não introduza CSS-in-JS (Styled Components, Emotion, etc.).

### 2. Gerenciamento de Pacotes
- O projeto usa **Node.js + npm** exclusivamente. Não use Deno, Bun ou yarn.
- Não fixe versões de pacotes nos imports de arquivos `.tsx` (sem versionamento nos imports).

### 3. Comunicação Frontend ↔ Backend
- O frontend (`localhost:5173`) deve se comunicar com o backend (`localhost:3000`) usando **sempre** `import.meta.env.VITE_API_URL`.
- Nunca faça chamadas de API com URL hardcoded.

### 4. Segurança de Backend
- Todas as queries ao PostgreSQL devem usar **prepared statements** via `pg` (ex: `pool.query('SELECT ... WHERE id = $1', [id])`).
- Nunca exponha a porta do banco de dados (`5432`) publicamente.
- JWT gerado com `JWT_SECRET` do ambiente; nunca use o fallback `'secret123'` em produção.

### 5. Feedback de UI
- Use **Sonner** (`toast.success`, `toast.error`, `toast.warning`) para feedback ao usuário.
- Nunca use `alert()`, `confirm()` ou `prompt()` nativos do browser.

### 6. Commits
- Ao final de cada modificação, forneça uma mensagem de commit clara no formato:
  ```
  feat(componente): descrição concisa do que foi feito
  fix(módulo): descrição do bug corrigido
  ```

---

## Schema do Banco de Dados

```sql
-- Usuários do sistema (admins e tutores)
users(id, name, email UNIQUE, password, role ['admin'|'tutor'], phone)

-- Pets vinculados aos tutores
pets(id, name, species, breed, age, tutor_id FK→users, services JSONB, check_in DATE, check_out DATE)

-- Configuração global do servidor RTMP
rtmp_config(id, server_url)

-- Câmeras/áreas monitoradas
rtmp_cameras(id PK VARCHAR, name, stream_key, status ['ativo'|'inativo'], playable_url)
```

**Câmeras padrão inicializadas via `init.sql`:**

| ID | Nome | Stream Key |
|---|---|---|
| `hospedagem` | Hospedagem | `hosp123` |
| `recreacao` | Recreação | `rec123` |
| `banho` | Banho e Tosa | `banho123` |

> **Importante:** O nome da câmera (`rtmp_cameras.name`) deve coincidir **exatamente** com o serviço contratado pelo pet (`pets.services`) para que a câmera apareça no portal do tutor.

---

## Autenticação

- **Admin:** login por `email` ou `name` (campo `name` na tabela `users`).
- **Tutor:** login por `email` (campo `email` na tabela `users`). A senha é gerada pelo admin no momento do cadastro.
- Tokens JWT expiram em **24h**.

---

## Variáveis de Ambiente (`.env`)

```env
# Banco de Dados
POSTGRES_USER=user_aqui
POSTGRES_PASSWORD=senha_aqui
POSTGRES_DB=nome_db
DB_HOST=db
DB_USER=user_aqui
DB_PASS=senha_aqui
DB_NAME=nome_db

# Backend
JWT_SECRET=segredo_jwt_seguro
PORT=3000
FRONTEND_URL=http://localhost:5173   # URL do frontend para CORS

# Frontend (exposto pelo Vite)
VITE_API_URL=http://localhost:3000

# SRS / DVR
PUBLIC_IP=ip_ou_localhost
DVR_IP=ip_local_do_dvr
DVR_USER=usuario_dvr
DVR_PASS=senha_dvr
DVR_CHANNEL=1
```

---

## Fluxo de Vídeo

```
DVR (HDCVI) → RTMP push → SRS :1935 → LL-HLS .m3u8 → hls.js no browser
```

- SRS autentica o push via hook `POST /api/video/auth-publish` no backend.
- Ao encerrar, o hook `POST /api/video/on-unpublish` atualiza o status da câmera para `inativo`.

---

## Pendências (To-Do)

- [ ] **Ícones PWA:** Adicionar `pwa-192x192.png` e `pwa-512x512.png` em `frontend/public/`.
- [ ] **SSL/HTTPS:** Configurar Nginx Reverse Proxy + Certbot (PWA requer HTTPS em produção).
- [ ] **Testes de carga:** Validar latência do SRS com múltiplos acessos simultâneos.
- [ ] **Monitoramento:** Implementar logs detalhados no ingest para depurar quedas de sinal.
- [ ] **Exclusão de tutores/pets:** Endpoint e UI de deleção de registros no AdminDashboard.