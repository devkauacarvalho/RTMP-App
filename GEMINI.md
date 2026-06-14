# Documento de Requisitos do Produto (PRD) - Pet Monitor PWA

## 1. Visão Geral e Contexto
O **Pet Monitor PWA** é um sistema web progressivo (PWA) desenvolvido para um Pet Hotel. O objetivo central é permitir que os tutores (donos dos pets) acompanhem seus animais de estimação ao vivo através de câmeras instaladas em áreas específicas (ex: Área de Recreação, Gatil, Berçário). 
O sistema lida com o Ingest de vídeo via RTMP a partir de um DVR (conectado a câmeras HDCVI) e distribui o stream em **LL-HLS (Low Latency HLS)** para garantir um atraso mínimo na transmissão ao vivo pelo navegador, sem necessidade de instalação de apps nativos.

## 2. Arquitetura e Stack Tecnológica (Tech Stack)
O projeto é conteinerizado via Docker (Docker Compose) e focado em alta compatibilidade (preparado para instâncias ARM na Oracle Free Tier). 

* **Frontend (PWA):**
  * Framework: React 19 + TypeScript + Vite.
  * Estilização: Tailwind CSS + Shadcn UI (Componentes Radix UI + Lucide React).
  * Player de Vídeo: `react-player` (suporte a HLS via hls.js).
  * Container: Node 20 Alpine (Porta exposta: 5173).
* **Backend (API):**
  * Framework: Node.js + Express.
  * Segurança e Middlewares: JWT (Autenticação), bcrypt (Hash de senhas), CORS, Helmet.
  * Container: Node 20 Alpine (Porta exposta: 3000).
* **Banco de Dados:**
  * SGBD: PostgreSQL 15 Alpine.
  * Driver Node: `pg` (Pool de conexões).
  * Container: Porta exposta 5432 com volume persistente.
* **Servidor de Mídia (Video Streaming):**
  * Software: SRS (Simple Realtime Server) v5.
  * Protocolo de Entrada (Ingest): RTMP (Porta 1935).
  * Protocolo de Saída (Playback): HTTP / LL-HLS (Porta 8080).
  * Configuração: Fragmentos HLS de 2s e janela de 10s para baixa latência.
* **Ingest de Vídeo (Opcional/FFmpeg):**
  * Container FFmpeg para converter fluxos RTSP/DVR em RTMP para o SRS se necessário.

## 3. Modelo de Dados (Database Schema)
O banco de dados relacional (PostgreSQL) possui as seguintes entidades principais:

* `users`: Armazena os usuários do sistema.
  * Campos: `id`, `name`, `email`, `password`, `role` ('admin' ou 'tutor'), `phone`.
* `pets`: Armazena os pets vinculados aos tutores.
  * Campos: `id`, `name`, `species`, `breed`, `age`, `tutor_id` (FK), `services` (JSONB), `check_in`, `check_out`.
* `rtmp_config`: Configurações globais do servidor RTMP.
  * Campos: `id`, `server_url`.
* `rtmp_cameras`: Armazena as áreas monitoradas.
  * Campos: `id` (PK string), `name`, `stream_key`, `status` ('ativo', 'inativo'), `playable_url` (Link HLS .m3u8).

## 4. Status Atual da Implementação
* **Backend:** Implementado com suporte a autenticação, registro de tutor/pet e hooks do SRS (`auth-publish`).
* **Frontend:**
  * `LoginScreen`: Funcional, conectando ao backend.
  * `AdminDashboard`: Funcional, permitindo cadastro de tutores/pets e configuração de câmeras RTMP.
  * `TutorDashboard`: Implementado com `ReactPlayer`, filtrando câmeras por serviços do pet.
* **Infraestrutura:** Docker Compose configurado para todos os serviços (DB, SRS, Backend, Frontend, FFmpeg).

## 5. Configuração e Variáveis de Ambiente (.env)
Para rodar o projeto, as seguintes variáveis devem estar no arquivo `.env`:

```env
POSTGRES_USER=user_aqui
POSTGRES_PASSWORD=senha_aqui
POSTGRES_DB=nome_db
JWT_SECRET=segredo_jwt
STREAM_KEY=chave_fixa_opcional
PUBLIC_IP=ip_ou_localhost
```

## 6. Próximos Passos (To-Do)
1.  **Correção Crítica:** No `TutorDashboard.tsx`, as URLs de fetch estão apontando para um endpoint antigo (Supabase). Devem ser corrigidas para usar `import.meta.env.VITE_API_URL`.
2.  **Controle de Acesso:** Implementar a lógica de permissões granulares (`user_cameras`) se necessário, ou consolidar o acesso via `pets.services` como está atualmente.
3.  **PWA:** Configurar `vite-plugin-pwa` para gerar o manifesto e service worker, permitindo instalação no celular.
4.  **Estilização:** Refinar o design mobile-first e garantir que o player de vídeo seja responsivo em todos os tamanhos.

## 7. Diretrizes para Agentes de IA (AI Coding Guidelines)
*As regras abaixo servem como contrato estrito para geração de código neste projeto:*
1. **Stack Visual:** Ao criar novos componentes de UI, utilize *exclusivamente* Tailwind CSS e componentes do Shadcn UI baseados no Radix UI. Não introduza bibliotecas de CSS-in-JS (como Styled Components).
2. **Utilitários:** Para mesclar classes do Tailwind, sempre utilize a função `cn` localizada em `components/ui/utils.ts`.
3. **Gerenciamento de Pacotes:** Não utilize o Deno. O projeto roda estritamente com o ecossistema Node.js via `npm`. Não introduza versões fixadas de pacotes nos imports de arquivos `.tsx`.
4. **Segurança de Código:** Nunca exponha portas de banco de dados diretamente ao público em produção e garanta que todas as consultas ao banco de dados no Node.js utilizem consultas parametrizadas (Prepared Statements via `pg`) para evitar SQL Injection.
5. **Comunicação de API:** O Frontend (`localhost:5173`) deve sempre se comunicar com o Backend (`localhost:3000`) utilizando as variáveis expostas pelo Vite (ex: `import.meta.env.VITE_API_URL`).
6. **Controle:** Deixe sempre uma mensagem de commit ao final de uma modificação, acrescentando e corrigindo commits durante as solicitações.