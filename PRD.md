# Documento de Requisitos do Produto (PRD) - Pet Monitor PWA

## 1. Visão Geral e Contexto
O **Pet Monitor PWA** é um sistema web progressivo (PWA) desenvolvido para um Pet Hotel. O objetivo central é permitir que os tutores (donos dos pets) acompanhem seus animais de estimação ao vivo através de câmeras instaladas em áreas específicas (ex: Área de Recreação, Gatil, Berçário). 
O sistema lida com o Ingest de vídeo via RTMP a partir de um DVR (conectado a câmeras HDCVI) e distribui o stream em **LL-HLS (Low Latency HLS)** para garantir um atraso mínimo na transmissão ao vivo pelo navegador, sem necessidade de instalação de apps nativos.

## 2. Arquitetura e Stack Tecnológica (Tech Stack)
O projeto é conteinerizado via Docker (Docker Compose) e focado em alta compatibilidade (preparado para instâncias ARM na Oracle Free Tier). 

* **Frontend (PWA):**
  * Framework: React 19 + TypeScript + Vite.
  * Estilização: Tailwind CSS + Shadcn UI (Componentes Radix UI + Lucide React).
  * Player de Vídeo: `react-player` (suporte a HLS).
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

## 3. Modelo de Dados (Database Schema)
O banco de dados relacional (PostgreSQL) possui as seguintes entidades principais:

* `users`: Armazena os usuários do sistema.
  * Campos: `id` (PK), `name`, `email` (Unique), `password` (Bcrypt Hash), `role` ('admin' ou 'tutor'), `created_at`.
* `cameras`: Armazena as áreas monitoradas pelo Pet Hotel.
  * Campos: `id` (PK), `name` (Ex: "Área de Recreação"), `stream_name` (Unique, Ex: "area1"), `created_at`.
* `user_cameras`: Tabela de relacionamento (N:N) para controle de permissões.
  * Campos: `user_id` (FK), `camera_id` (FK). PK composta por (user_id, camera_id).

## 4. Requisitos Funcionais (FR)
* **FR01 (Autenticação):** O sistema deve permitir login de usuários usando email e senha, retornando um token JWT.
* **FR02 (Gestão de Admin):** O administrador deve poder cadastrar novos tutores, cadastrar câmeras e vincular o acesso de câmeras específicas a tutores específicos.
* **FR03 (Dashboard do Tutor):** O tutor autenticado deve visualizar apenas as câmeras às quais tem permissão de acesso.
* **FR04 (Streaming ao Vivo):** O sistema deve carregar um player de vídeo compatível com LL-HLS reproduzindo o arquivo `.m3u8` correspondente à câmera selecionada.
* **FR05 (Ingest Seguro):** O backend deve possuir um Webhook (`/api/video/auth-publish`) para validar se o DVR do Pet Hotel tem autorização para transmitir via RTMP para o servidor SRS, validando uma chave (Stream Key).

## 5. Requisitos Não Funcionais (NFR) e Segurança
* **NFR01 (Baixa Latência):** O delay da transmissão de vídeo não deve ultrapassar a margem natural do LL-HLS (idealmente abaixo de 5-7 segundos).
* **NFR02 (Design Responsivo):** A interface deve ser "Mobile First", focada na usabilidade em smartphones, visto que será um PWA.
* **NFR03 (Proteção de Rotas):** Rotas do backend devem exigir token JWT via header `Authorization: Bearer <token>`. Rotas do frontend devem redirecionar usuários não logados para a tela de login.
* **NFR04 (Variáveis de Ambiente):** Nenhuma credencial (senhas de banco, JWT Secret, chaves RTMP) pode ser inserida diretamente no código (hardcoded). O sistema depende estritamente do arquivo `.env`.

## 6. Regras de Negócio
* **RN01:** Um "Tutor" nunca pode ter acesso ao painel de administração ou criar novos usuários.
* **RN02:** Se o acesso de um Tutor a uma câmera for revogado no banco de dados, o player de vídeo do lado do cliente deve ter o fluxo interrompido/negado na próxima requisição.
* **RN03:** O servidor SRS (`srs.conf`) está configurado para aceitar requisições de domínios cruzados (CORS habilitado) para permitir que o Vite/PWA carregue o vídeo em ambiente de desenvolvimento e produção.

## 7. Diretrizes para Agentes de IA (AI Coding Guidelines)
*As regras abaixo servem como contrato estrito para geração de código neste projeto:*
1. **Stack Visual:** Ao criar novos componentes de UI, utilize *exclusivamente* Tailwind CSS e componentes do Shadcn UI baseados no Radix UI. Não introduza bibliotecas de CSS-in-JS (como Styled Components).
2. **Utilitários:** Para mesclar classes do Tailwind, sempre utilize a função `cn` localizada em `components/ui/utils.ts`.
3. **Gerenciamento de Pacotes:** Não utilize o Deno. O projeto roda estritamente com o ecossistema Node.js via `npm`. Não introduza versões fixadas de pacotes nos imports de arquivos `.tsx` (Exemplo Errado: `import { X } from "lucide-react@0.487.0"` / Exemplo Correto: `import { X } from "lucide-react"`).
4. **Segurança de Código:** Nunca exponha portas de banco de dados diretamente ao público em produção e garanta que todas as consultas ao banco de dados no Node.js utilizem consultas parametrizadas (Prepared Statements via `pg`) para evitar SQL Injection.
5. **Comunicação de API:** O Frontend (`localhost:5173`) deve sempre se comunicar com o Backend (`localhost:3000`) utilizando as variáveis expostas pelo Vite (ex: `import.meta.env.VITE_API_URL`).