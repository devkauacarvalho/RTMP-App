# Pet Monitor PWA — Documento de Referência e Requisitos

> Sistema de monitoramento ao vivo para o **Hotel Pet Paradise**. Tutores acompanham seus pets via câmeras transmitidas em LL-HLS pelo navegador, sem instalação de aplicativos nativos.

## 1. Visão Geral e Contexto
O Pet Monitor PWA é um sistema web progressivo (PWA) desenvolvido para um Pet Hotel. O objetivo central é permitir que os tutores acompanhem seus animais de estimação ao vivo através de câmeras instaladas em áreas específicas (ex: Hospedagem, Recreação, Banho e Tosa).
O sistema gerencia o Ingest de vídeo via RTMP a partir de um gravador/DVR e distribui o stream em LL-HLS (Low Latency HLS) para garantir o menor atraso possível na transmissão ao vivo diretamente pelo navegador, eliminando a necessidade de instalação de aplicativos nativos.

---

## 2. Stack Tecnológica (Tech Stack)
O projeto é completamente conteinerizado via Docker (Docker Compose) e planejado para alta compatibilidade e portabilidade (ARM-compatível, ex: Oracle Free Tier).

| Camada | Tecnologia | Detalhes |
|---|---|---|
| **Frontend** | React 19 + TypeScript + Vite | Container: Node 20 Alpine (Porta 5173) |
| **UI** | Tailwind CSS v4 + Shadcn UI | Radix UI + Lucide React |
| **Player de Vídeo** | hls.js ^1.6 | HTML5 `<video>`, `lowLatencyMode: true` |
| **Backend** | Node.js + Express | Container: Node 20 Alpine (Porta 3000) |
| **Segurança** | JWT, bcrypt, Helmet, CORS | Tokens expiram em 24h |
| **Banco de Dados** | PostgreSQL 15 Alpine | `pg` (Prepared Statements) |
| **Servidor de Mídia**| SRS (Simple Realtime Server) v5 | Ingest: RTMP (1935) / Playback: LL-HLS (8080) |

---

## 3. Modelo de Dados (Database Schema)

```sql
-- Usuários do sistema (admins e tutores)
users(id, name, email UNIQUE, password, role ['admin'|'tutor'], phone)

-- Pets vinculados aos tutores
pets(id, name, species, breed, age, tutor_id FK→users, services JSONB, check_in DATE, check_out DATE)

-- Configuração global do servidor RTMP
rtmp_config(id, server_url)

-- Câmeras/áreas monitoradas
rtmp_cameras(id PK VARCHAR, name, stream_key, status ['ativo'|'inativo'], playable_url)

-- Logs de Auditoria
audit_logs(id, entity_type, entity_id, action, changes JSONB, performed_by FK, performed_at)
```

**Câmeras padrão inicializadas via `init.sql`:**

| ID | Nome | Stream Key |
|---|---|---|
| `hospedagem` | Hospedagem | `hosp123` |
| `recreacao` | Recreação | `rec123` |
| `banho` | Banho e Tosa | `banho123` |

> **Importante:** O nome da câmera (`rtmp_cameras.name`) deve coincidir **exatamente** com o serviço contratado pelo pet (`pets.services`) para que a câmera apareça no portal do tutor.

---

## 4. Fluxo de Vídeo e Status Atual

```
DVR (HDCVI) → RTMP push → SRS :1935 → LL-HLS .m3u8 → hls.js no browser
```

- SRS autentica o push via hook `POST /api/video/auth-publish` no backend.
- O hook de publish também atualiza o status da câmera para `ativo`.
- Ao encerrar, o hook `POST /api/video/on-unpublish` pode ser usado para monitoramento.

**Status Atual:**
- Backend: Operacional (Autenticação, cadastros, hooks SRS validados).
- Frontend: Login e Dashboards operacionais. Player customizado LL-HLS.
- Infra: Docker Compose rodando.

---

## 5. Variáveis de Ambiente (.env)

```env
# Banco de Dados
POSTGRES_USER=admin_pet
POSTGRES_PASSWORD=db123
POSTGRES_DB=petmonitor
DB_HOST=db
DB_USER=admin_pet
DB_PASS=db123
DB_NAME=petmonitor

# Backend
JWT_SECRET=secret123
PORT=3000
FRONTEND_URL=http://18.229.158.162:5173

# Configurações Adicionais
STREAM_KEY=123456

# Frontend
VITE_API_URL=http://18.229.158.162:3000

# SRS / DVR
PUBLIC_IP=18.229.158.162
DVR_IP=192.168.1.100
DVR_USER=admin
DVR_PASS=admin
DVR_CHANNEL=1
```

---

## 6. Regras para Agentes de IA e Diretrizes de Código

> As regras abaixo são contratos estritos para geração de código neste projeto.

1. **UI & Estilização:** Use exclusivamente Tailwind CSS e componentes Shadcn UI (Radix UI). Não introduza CSS-in-JS.
2. **Utilitários de Estilo:** Para mesclar classes Tailwind, sempre use a função `cn` localizada em `components/ui/utils.ts`.
3. **Gerenciamento de Pacotes:** O projeto usa Node.js + npm exclusivamente. Não fixe versões nos imports `.tsx`.
4. **Comunicação API:** Chamadas de rede do Frontend devem usar sempre `import.meta.env.VITE_API_URL`. Nunca codifique URLs fixas.
5. **Segurança de Backend:** Todas as queries ao PostgreSQL devem usar consultas parametrizadas (Prepared Statements). Nunca exponha a porta 5432 publicamente.
6. **Feedback de UI:** Use Sonner (`toast.success`, `toast.error`) para feedback. Nunca use `alert()` ou `confirm()`.
7. **Commits:** Mensagens claras no formato `feat(escopo): descrição` ou `fix(escopo): descrição`. Execute e valide uma única tarefa por vez.

---

## 7. Plano de Controle e Pendências (Backlog)

### Módulo 0: Saneamento e Limpeza de Código
* [x] Tarefa 0.1: Executar npm uninstall react-player no terminal do frontend para remover a dependência morta do package.json.
* [x] Tarefa 0.2: Ajustar o arquivo srs.conf alterando os parâmetros da seção hls para hls_fragment 1; ou hls_fragment 2; e hls_window 5; visando habilitar o empacotamento de baixa latência no servidor de mídia.

### Módulo 1: Otimização do Player de Vídeo e Latência
* [x] Tarefa 1.1: Alterar a inicialização da instância do Hls no arquivo TutorDashboard.tsx modificando o parâmetro para lowLatencyMode: true e adicionando liveSyncDurationCount: 2 para forçar o sincronismo agressivo com o tempo real.
* [x] Tarefa 1.2: Customizar a interface visual do player no TutorDashboard.tsx. Remover o atributo nativo controls do elemento `<video>` e criar uma barra de ferramentas sobreposta elegante utilizando classes do Tailwind CSS e ícones do lucide-react. (Botão de volume oculto via comentário).
* [ ] Tarefa 1.3: Adicionar a funcionalidade "Tirar Print" na barra customizada do player, utilizando a API de Canvas do HTML5 para capturar o frame atual do elemento `<video>` e disparar o download imediato da imagem gerada.

### Módulo 2: Integração de Recursos Administrativos
* [ ] Tarefa 2.1: Conectar os botões de ação de exclusão presentes no AdminDashboard.tsx ao componente modal DeleteConfirmDialog.tsx e integrar com as rotas de exclusão lógica já existentes no backend (DELETE /api/tutors/:id e DELETE /api/pets/:id).

### Módulo 3: PWA, Infraestrutura e Monitoramento
* [ ] Tarefa 3.1: Adicionar arquivos de imagem reais válidos para pwa-192x192.png e pwa-512x512.png no diretório frontend/public/ para sanar as pendências de manifesto do PWA.
* [ ] Tarefa 3.2: Configurar um Proxy Reverso via Nginx integrado ao Certbot para a entrega de HTTPS em ambiente de produção (requisito obrigatório para o funcionamento de PWAs).
* [ ] Tarefa 3.3: Validar latência do SRS com múltiplos acessos simultâneos (Testes de carga).
* [ ] Tarefa 3.4: Implementar logs detalhados no ingest para depurar quedas de sinal.
