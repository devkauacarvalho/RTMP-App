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

Stack Visual: Novas implementações de interface devem utilizar exclusivamente Tailwind CSS e componentes estruturados do Shadcn UI (Radix UI). Não introduzir CSS-in-JS.

Utilitários de Estilo: Para mesclar e condicionar classes do Tailwind, use sempre a função unificada cn localizada em components/ui/utils.ts.

Ecossistema: O projeto é gerenciado estritamente através do ecossistema Node.js via npm. Não fixar versões diretamente nos escopos de importação de arquivos .tsx.

Segurança de Dados: Consultas ao banco PostgreSQL em ambiente de backend devem utilizar exclusivamente consultas parametrizadas (Prepared Statements via módulo pg). Nunca expor portas relacionais publicamente.

Comunicação de API: Chamadas de rede partindo do Frontend devem referenciar a variável exposta import.meta.env.VITE_API_URL. Nunca codificar URLs fixas (hardcoded).

Padronização de Commits: Toda alteração concluída e validada com sucesso deve ser acompanhada do fornecimento de uma mensagem descritiva clara nos moldes do Conventional Commits: feat(escopo): descrição ou fix(escopo): descrição.
---

## 7. Plano de Controle e Pendências (Backlog)

### Módulo 0: Saneamento e Limpeza de Código
* [x] Tarefa 0.1: Executar npm uninstall react-player no terminal do frontend para remover a dependência morta do package.json.
* [x] Tarefa 0.2: Ajustar o arquivo srs.conf alterando os parâmetros da seção hls para hls_fragment 1; ou hls_fragment 2; e hls_window 5; visando habilitar o empacotamento de baixa latência no servidor de mídia.

### Módulo 1: Otimização do Player de Vídeo e Latência
* [x] Tarefa 1.1: Alterar a inicialização da instância do Hls no arquivo TutorDashboard.tsx modificando o parâmetro para lowLatencyMode: true e adicionando liveSyncDurationCount: 2 para forçar o sincronismo agressivo com o tempo real.
* [x] Tarefa 1.2: Customizar a interface visual do player no TutorDashboard.tsx. Remover o atributo nativo controls do elemento `<video>` e criar uma barra de ferramentas sobreposta elegante utilizando classes do Tailwind CSS e ícones do lucide-react. (Botão de volume oculto via comentário).
* [x] Tarefa 1.3: Adicionar a funcionalidade "Tirar Print" na barra customizada do player, utilizando a API de Canvas do HTML5 para capturar o frame atual do elemento `<video>` e disparar o download imediato da imagem gerada.

### Módulo 2: Integração de Recursos Administrativos
* [x] Tarefa 2.1: Conectar os botões de ação de exclusão presentes no AdminDashboard.tsx ao componente modal DeleteConfirmDialog.tsx e integrar com as rotas de exclusão lógica já existentes no backend (DELETE /api/tutors/:id e DELETE /api/pets/:id).

### Módulo 3: PWA, Infraestrutura e Monitoramento
* [x] Tarefa 3.1: Adicionar arquivos de imagem reais válidos para pwa-192x192.png e pwa-512x512.png no diretório frontend/public/ para sanar as pendências de manifesto do PWA.
* [x] Tarefa 3.2: Configurar um Proxy Reverso via Nginx integrado ao Certbot para a entrega de HTTPS em ambiente de produção (requisito obrigatório para o funcionamento de PWAs).
* [x] Tarefa 3.3: Validar latência do SRS com múltiplos acessos simultâneos (Testes de carga).
* [x] Tarefa 3.4: Implementar logs detalhados no ingest para depurar quedas de sinal.

### Módulo 4: Redesign Premium da Tela do Tutor & Galeria de Fotos
* [ ] Tarefa 4.1: Refatorar o layout principal do TutorDashboard.tsx substituindo a estrutura linear por navegação via componente `Tabs` do Shadcn UI. Criar quatro abas: "Resumo & Pets", "Câmeras ao Vivo", "Galeria de Fotos" e "Suporte & Contato".
* [ ] Tarefa 4.2: Aplicar estética Glassmorphism premium ao TutorDashboard.tsx utilizando gradientes (`bg-gradient-to-br`), bordas translúcidas (`border-white/20`), backdrop blur (`backdrop-blur-xl`) e sombras refinadas nas cards e containers.
* [ ] Tarefa 4.3: Implementar chaveador de tema Dark/Light no header do TutorDashboard.tsx. Persistir a preferência no `localStorage` e aplicar a classe `dark` no container raiz. O tema escuro deve usar tons profundos de azul/violeta (`slate-950`, `indigo-950`).
* [ ] Tarefa 4.4: Adicionar suporte a Zoom Digital no componente CameraView. Implementar controles de zoom (+/-) na barra de ferramentas do player que apliquem `transform: scale()` com transição suave no container do `<video>`.
* [ ] Tarefa 4.5: Adicionar botão de Picture-in-Picture (PiP) na barra de ferramentas do CameraView. Utilizar a API nativa `video.requestPictureInPicture()` para destacar o vídeo em tela flutuante do navegador.
* [ ] Tarefa 4.6: Substituir o comportamento atual do botão "Tirar Print" no CameraView. Em vez de disparar download imediato, abrir um Popover (Radix/Shadcn) estilo menu de reações com opções de molduras temáticas: "🐾 Patas de Amor", "👑 Estrela Pet", "🏨 Hotel Paradise" e "🚫 Original (sem moldura)".
* [ ] Tarefa 4.7: Implementar a lógica de composição de molduras via API Canvas do HTML5. Ao selecionar uma moldura no Popover, desenhar a sobreposição gráfica correspondente sobre o frame capturado do `<video>` e salvar a imagem resultante (base64) no estado da galeria em vez de disparar download.
* [ ] Tarefa 4.8: Criar a aba "Galeria de Fotos" no TutorDashboard.tsx com grid responsivo exibindo thumbnails das fotos capturadas. Persistir os dados (base64, data de captura, moldura aplicada) no `localStorage` do navegador.
* [ ] Tarefa 4.9: Adicionar visualizador Lightbox (modal Dialog do Shadcn) na galeria, permitindo abrir a foto em tamanho cheio ao clicar no thumbnail. Incluir botões de "Download" (salvar no dispositivo) e "Excluir" (remover do localStorage e atualizar a lista).
* [ ] Tarefa 4.10: Adicionar micro-interações e animações de transição suaves (hover effects, fade-in nas abas, scale nos botões) em todos os elementos interativos do TutorDashboard.tsx para garantir uma experiência de uso premium e dinâmica.
