## Documento de Requisitos do Produto (PRD) — Pet Monitor PWA## 1. Visão Geral e Contexto
O Pet Monitor PWA é um sistema web progressivo (PWA) desenvolvido para um Pet Hotel. O objetivo central é permitir que os tutores acompanhem seus animais de estimação ao vivo através de câmeras instaladas em áreas específicas (ex: Hospedagem, Recreação, Banho e Tosa).
O sistema gerencia o Ingest de vídeo via RTMP a partir de um gravador/DVR e distribui o stream em LL-HLS (Low Latency HLS) para garantir o menor atraso possível na transmissão ao vivo diretamente pelo navegador, eliminando a necessidade de instalação de aplicativos nativos.

## 2. Arquitetura e Stack Tecnológica (Tech Stack)
O projeto é completamente conteinerizado via Docker (Docker Compose) e planejado para alta compatibilidade e portabilidade.
## Frontend (PWA)

* Framework: React 19 + TypeScript + Vite.
* Estilização: Tailwind CSS v4 + Shadcn UI (Componentes Radix UI + Lucide React).
* Player de Vídeo: Tag nativa <video> do HTML5 controlada e alimentada diretamente pela biblioteca pura hls.js rodando em Modo de Baixa Latência (lowLatencyMode: true). Interface gráfica inteiramente customizada via Tailwind.
* Container: Node 20 Alpine (Porta exposta: 5173).

## Backend (API)

* Framework: Node.js + Express.
* Segurança e Middlewares: JWT (Autenticação), bcrypt (Hash de senhas), CORS, Helmet.
* Container: Node 20 Alpine (Porta exposta: 3000).

## Banco de Dados

* SGBD: PostgreSQL 15 Alpine.
* Driver Node: pg (Pool de conexões protegidas por Prepared Statements).

## Servidor de Mídia (Video Streaming)

* Software: SRS (Simple Realtime Server) v5.
* Protocolo de Entrada (Ingest): RTMP (Porta 1935).
* Protocolo de Saída (Playback): HTTP / LL-HLS (Porta 8080).

## 3. Modelo de Dados (Database Schema)
O banco de dados relacional baseado no init.sql possui as seguintes tabelas:

* users: id, name, email, password, role ('admin' ou 'tutor'), phone, status, is_super_admin, created_at, updated_at.
* pets: id, name, species, breed, age, tutor_id (FK), services (JSONB), check_in, check_out, status, created_at, updated_at.
* rtmp_config: id, server_url.
* rtmp_cameras: id (PK VARCHAR), name, stream_key, status, playable_url.
* audit_logs: id, entity_type, entity_id, action, changes (JSONB), performed_by (FK), performed_at.

## 4. Status Atual da Implementação## Backend

* Completo com fluxos de autenticação e registro transacional de tutor+pet.
* Hooks de validação do SRS (auth-publish) operacionais.
* Endpoints administrativos estruturados para listagem, edição e exclusão lógica.

## Frontend

* LoginScreen: Funcional e integrado.
* AdminDashboard: Listagens e cadastros operacionais.
* TutorDashboard: Exibe informações do pet e carrega as transmissões ao vivo usando a tag nativa <video> HTML5 combinada com hls.js.

## PWA & Infraestrutura

* Estrutura do PWA configurada através do vite-plugin-pwa.
* Docker Compose configurado para orquestração local.

## 5. Configuração e Variáveis de Ambiente (.env)

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

# Frontend (exposto pelo Vite — aponta para o IP público da AWS)
VITE_API_URL=http://18.229.158.162:3000

# SRS / DVR
PUBLIC_IP=18.229.158.162
DVR_IP=192.168.1.100
DVR_USER=admin
DVR_PASS=admin
DVR_CHANNEL=1

## 6. Plano de Controle (Backlog de Tarefas Atômicas)

* Regra de Ouro: Execute e valide uma única tarefa por vez. Não avance sem realizar o commit correspondente.

# Módulo 0: Saneamento e Limpeza de Código

* [x] Tarefa 0.1: Executar npm uninstall react-player no terminal do frontend para remover a dependência morta do package.json.
* [x] Tarefa 0.2: Ajustar o arquivo srs.conf alterando os parâmetros da seção hls para hls_fragment 1; ou hls_fragment 2; e hls_window 5; visando habilitar o empacotamento de baixa latência no servidor de mídia.

# Módulo 1: Otimização do Player de Vídeo e Latência

* [x] Tarefa 1.1: Alterar a inicialização da instância do Hls no arquivo TutorDashboard.tsx modificando o parâmetro para lowLatencyMode: true e adicionando liveSyncDurationCount: 2 para forçar o sincronismo agressivo com o tempo real.
* [ ] Tarefa 1.2: Customizar a interface visual do player no TutorDashboard.tsx. Remover o atributo nativo controls do elemento <video> e criar uma barra de ferramentas sobreposta elegante utilizando classes do Tailwind CSS e ícones do lucide-react (Play/Pause, Mute/Volume e Tela Cheia).
* [ ] Tarefa 1.3: Adicionar a funcionalidade "Tirar Print" na barra customizada do player, utilizando a API de Canvas do HTML5 para capturar o frame atual do elemento <video> e disparar o download imediato da imagem gerada.

# Módulo 2: Integração de Recursos Administrativos

* [ ] Tarefa 2.1: Conectar os botões de ação de exclusão presentes no AdminDashboard.tsx ao componente modal DeleteConfirmDialog.tsx e integrar com as rotas de exclusão lógica já existentes no backend (DELETE /api/tutors/:id e DELETE /api/pets/:id).

# Módulo 3: PWA e Infraestrutura de Produção

* [ ] Tarefa 3.1: Adicionar arquivos de imagem reais válidos para pwa-192x192.png e pwa-512x512.png no diretório frontend/public/ para sanar as pendências de manifesto do PWA.
* [ ] Tarefa 3.2: Configurar um Proxy Reverso via Nginx integrado ao Certbot para a entrega de HTTPS em ambiente de produção (requisito obrigatório para o funcionamento de PWAs).

# 7. Diretrizes para Agentes de IA (AI Coding Guidelines)

* Stack Visual: Novas implementações de interface devem utilizar exclusivamente Tailwind CSS e componentes estruturados do Shadcn UI (Radix UI). Não introduzir CSS-in-JS.
* Utilitários de Estilo: Para mesclar e condicionar classes do Tailwind, use sempre a função unificada cn localizada em components/ui/utils.ts.
* Ecossistema: O projeto é gerenciado estritamente através do ecossistema Node.js via npm. Não fixar versões diretamente nos escopos de importação de arquivos .tsx.
* Segurança de Dados: Consultas ao banco PostgreSQL em ambiente de backend devem utilizar exclusivamente consultas parametrizadas (Prepared Statements via módulo pg). Nunca expor portas relacionais publicamente.
* Comunicação de API: Chamadas de rede partindo do Frontend devem referenciar a variável exposta import.meta.env.VITE_API_URL. Nunca codificar URLs fixas (hardcoded).
* Padronização de Commits: Toda alteração concluída e validada com sucesso deve ser acompanhada do fornecimento de uma mensagem descritiva clara nos moldes do Conventional Commits: feat(escopo): descrição ou fix(escopo): descrição.
