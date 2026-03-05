# Subhumano — Visão Geral da Aplicação

## O que é

Plataforma de conteúdo sobre Inteligência Artificial voltada para profissionais que querem acompanhar o mercado de IA com foco estratégico. O posicionamento é "menos ruído, mais sinal" — curadoria de informação validada por quem constrói IA na prática.

**Stack:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui + Supabase + Framer Motion

---

## Modelo de Acesso

| Nível | Descrição |
|-------|-----------|
| Visitante | Acessa apenas a Landing page e páginas públicas |
| Trial (7 dias) | Acesso completo por 7 dias via checkout Ticto |
| Assinante Mensal | R$ 29,90/mês — acesso a todos os espaços e canais |
| Assinante Anual | R$ 239,90/ano — inclui badge exclusivo |
| Vitalício | R$ 1.000 — acesso permanente |
| Premium | Acesso a canais e conteúdos exclusivos premium |

Pagamentos processados via **Ticto** com webhook para ativação automática.

---

## Estrutura de Navegação

### Navegação Principal (BottomNav — mobile)
```
Início → Espaços → Podcast → IA → Canais → Eventos → Perfil
```

### Rotas Públicas
- `/` — Landing page (entry point para campanhas)
- `/login`, `/register`, `/forgot-password`, `/reset-password`
- `/verify-email`
- `/plans` — Página de planos e checkout
- `/privacidade`, `/termos`, `/contato`
- `/payment-success`

### Rotas Protegidas (requer assinatura ativa)
- `/home` — Feed principal
- `/highlights` — Destaques da semana
- `/spaces` — Lista de espaços temáticos
- `/spaces/:slug` — Feed de um espaço
- `/spaces/:slug/post/:slug` — Artigo completo
- `/podcasts` — Lista de episódios
- `/podcasts/:slug` — Player de podcast
- `/channels` — Lista de canais da comunidade
- `/channels/:id` — Feed de um canal
- `/channels/:id/post/:id` — Post de canal
- `/ai-assistant` — Chat com IA
- `/events` — Eventos e workshops
- `/messages` — Mensagens diretas
- `/messages/:id` — Conversa individual
- `/notifications` — Central de notificações
- `/search` — Busca de pessoas e empresas
- `/profile` — Perfil e configurações
- `/profile/personal` — Dados pessoais/empresa
- `/profile/security` — Senha e segurança
- `/profile/notifications` — Preferências de notificação
- `/profile/settings` — Configurações do app
- `/profile/saved` — Conteúdos salvos
- `/company/:slug` — Perfil público de empresa

### Rotas Admin
- `/admin` — Dashboard com métricas
- `/admin/users` — Gestão de usuários
- `/admin/subscriptions` — Gestão de assinaturas
- `/admin/spaces` — Gestão de espaços
- `/admin/content` — Publicação de conteúdo
- `/admin/podcasts` — Gestão de podcasts
- `/admin/channels` — Gestão de canais
- `/admin/events` — Gestão de eventos
- `/admin/coupons` — Cupons promocionais
- `/admin/moderation` — Moderação de comentários
- `/admin/intelligence` — Content Intelligence (IA)
- `/admin/rag/*` — Gestão de documentos RAG
- `/admin/settings/*` — Configurações do sistema

---

## Páginas e Funcionalidades

### Landing (`/`)
Página de conversão para campanhas de marketing. Seções:
- Hero com headline, CTA e carrossel de mockups de celular
- Social proof (logos de parceiros: CESAR, Fiocruz, IFCE)
- Problema (por que o mercado de IA é confuso)
- Espaços disponíveis
- Features da plataforma
- Eventos em destaque
- Método/metodologia
- Autor/criador
- FAQ
- CTA final + Footer
- Sticky bottom CTA (mobile)
- Shader background animado + gradient orbs

### Home (`/home`)
Feed personalizado do usuário logado. Seções:
- Header com atalhos para Salvos, Mensagens e Notificações (com badges de não lidos)
- **Destaques da semana** — posts em alta dos espaços inscritos
- **Em alta nos canais** — discussões recentes com mais engajamento
- **Seus espaços** — grid 2 colunas com espaços inscritos e contagem de atualizações
- Onboarding modal para novos usuários sem espaços selecionados
- Banner de permissão de push notifications

### Espaços (`/spaces`)
Catálogo de espaços temáticos. Funcionalidades:
- Lista separada em "Seus espaços" e "Explorar"
- Toggle de inscrição por espaço (botão + / check)
- Ícone dinâmico por espaço
- Link para ver atualizações do espaço

**Espaços disponíveis:** Produtividade, Marketing, Programação, Audiovisual, Estilo de Vida

### SpaceDetail (`/spaces/:slug`)
Feed de artigos de um espaço específico. Funcionalidades:
- Frase de impacto por espaço (taglines hardcoded)
- Cards de artigos com thumbnail, título, likes, comentários, tempo de leitura
- Indicador de vídeo no thumbnail
- Infinite scroll com paginação
- Navegação para artigo completo

### PostDetail (`/spaces/:slug/post/:slug`)
Leitura de artigo completo. Funcionalidades:
- Header com botão salvar e título
- Banner de "Conheça o Subhumano" para visitantes não logados
- Thumbnail/hero image ou vídeo
- Conteúdo rich text (HTML sanitizado com DOMPurify)
- Galeria de mídia
- Engajamento: likes e comentários com contagem
- Seção de comentários com replies aninhados
- Likes em comentários
- Edição e exclusão de comentários próprios
- Menções (@usuário) nos comentários
- Paywall para usuários sem assinatura
- Estimativa de tempo de leitura

### Podcasts (`/podcasts`)
Lista de episódios de podcast. Funcionalidades:
- Filtro por espaço temático
- Cards com thumbnail, título, duração, progresso de escuta
- Indicador de episódio já ouvido
- Likes e comentários por episódio

### PodcastDetail (`/podcasts/:slug`)
Player de podcast completo com:
- Player de áudio com controles
- Progresso salvo por usuário
- Comentários e likes

### Canais (`/channels`)
Comunidade de discussão. Funcionalidades:
- Lista de canais com ícone, descrição, membros, posts e última atividade
- Badge de acesso: Premium (amarelo) ou Assinantes (padrão)
- Lock icon para canais sem acesso
- Navegação para feed do canal

### ChannelDetail (`/channels/:id`)
Feed de posts de um canal. Funcionalidades:
- Criação de posts (texto + mídia)
- Likes e comentários
- Edição/exclusão de posts próprios

### AI Assistant (`/ai-assistant`)
Chat com IA especializada em modelos de IA. Funcionalidades:
- Interface de chat com histórico de mensagens
- Sugestões de perguntas iniciais
- Lista de capacidades do assistente
- Renderização de Markdown nas respostas
- Copiar resposta
- Nova conversa (limpa histórico)
- Bloqueado para não assinantes
- Integrado com RAG (documentos da plataforma)

### Eventos (`/events`)
Agenda de eventos. Funcionalidades:
- Filtros por período (todos/futuros/passados), modalidade e tipo
- Cards com cover, tipo, modalidade, datas, localização, vagas
- Botão de ação contextual: Acessar / Adquirir / Encerrado
- Preço ou "Incluso no plano" para assinantes
- Integração com checkout Ticto para eventos pagos

### Mensagens (`/messages`)
Sistema de mensagens diretas. Funcionalidades:
- Lista de conversas com preview da última mensagem e não lidos
- Busca de usuários para iniciar conversa
- Navegação para conversa individual

### Notificações (`/notifications`)
Central de notificações do usuário.

### Busca (`/search`)
Busca de pessoas e empresas. Funcionalidades:
- Filtros: Todos / Pessoas / Empresas
- Cards com avatar, nome, cargo/bio, badge premium
- Modal de perfil do autor ao clicar

### Planos (`/plans`)
Página de conversão e checkout. Funcionalidades:
- Tabs: Assinaturas / Workshops (quando há eventos pagos)
- Card de trial gratuito (7 dias) para novos usuários
- Seleção de plano com radio visual
- Checkout via Ticto com email e ID do usuário
- Resgate de cupom promocional
- Modal de oferta de trial ao tentar sair

### Perfil (`/profile`)
Hub de configurações do usuário. Seções:
- Avatar, nome e tipo de conta (Pessoal/Empresa)
- Assinatura (abre modal com detalhes do plano)
- Busca de pessoas
- Mensagens (com badge de não lidos)
- Conteúdos salvos
- Dados pessoais ou dados da empresa
- Senha e segurança
- Preferências de notificação
- Configurações do app
- Logout

---

## Componentes Globais

| Componente | Função |
|------------|--------|
| `AppLayout` | Wrapper com BottomNav e TrialBanner |
| `BottomNav` | Navegação inferior com 7 itens e indicador animado |
| `SubscriptionGuard` | Redireciona para /plans se sem assinatura ativa |
| `OnboardingModal` | Modal para novos usuários escolherem espaços |
| `TrialBanner` | Banner de dias restantes no trial |
| `PushPermissionBanner` | Solicita permissão de notificações push |
| `AuthPromptDialog` | Dialog para convidar login |
| `SubscriptionModal` | Modal com detalhes da assinatura atual |
| `ContentPaywall` | Bloqueio de conteúdo premium |
| `ErrorBoundary` | Captura erros globais |

---

## Tipos de Conta

- **Pessoal** — usuário individual
- **Empresa** — conta corporativa com CNPJ, site, membros da equipe e perfil público em `/company/:slug`

---

## Sistema de Badges

Usuários e empresas podem ter badges visuais baseados no tipo de assinatura (PremiumBadge component).

---

## Infraestrutura Backend (Supabase)

### Edge Functions
| Função | Propósito |
|--------|-----------|
| `ai-assistant` | Proxy para LLM com contexto RAG |
| `auth-email-hook` | Templates de email customizados |
| `content-intelligence` | Análise de conteúdo com IA |
| `generate-chunks` | Chunking de documentos para RAG |
| `ingest-document` | Ingestão de documentos no RAG |
| `search-chunks` | Busca semântica no RAG |
| `redeem-coupon` | Resgate de cupons promocionais |
| `send-daily-digest` | Email diário de destaques |
| `send-push-notification` | Envio de push notifications |
| `send-user-notification` | Notificações in-app |
| `ticto-webhook` | Webhook de pagamentos Ticto |
| `verify-password` | Verificação de senha atual |
| `get-vapid-public-key` | Chave pública para Web Push |

### Principais Tabelas
- `profiles` — dados de usuários
- `spaces` — espaços temáticos
- `space_updates` — artigos/posts dos espaços
- `update_likes` / `update_comments` — engajamento
- `channels` / `channel_posts` — comunidade
- `podcasts` — episódios de podcast
- `events` / `event_sessions` — eventos
- `notifications` — notificações
- `messages` — mensagens diretas
- `subscriptions` — assinaturas ativas
- `promo_coupons` — cupons
- `saved_updates` — conteúdos salvos
- `rag_documents` / `rag_chunks` — base de conhecimento da IA

---

## Pontos de Melhoria Identificados (Frontend)

### UX / Navegação
- Layout fixo em `max-w-lg` (mobile-first) — sem aproveitamento de tela em desktop
- BottomNav com 7 itens fica apertado em telas pequenas
- Sem sidebar ou topnav para desktop
- Sem breadcrumbs nas páginas de detalhe
- Sem transições de página (apenas animações de entrada por seção)

### Leitura / Tipografia
- Artigos sem sumário/índice para textos longos
- Sem modo de leitura focado (sem distrações)
- Sem controle de tamanho de fonte
- Tempo de leitura estimado apenas no SpaceDetail, não no PostDetail header

### Animações
- Framer Motion já em uso com stagger em listas
- Sem transições de rota (page transitions)
- Sem skeleton screens em todas as páginas (algumas usam, outras não)
- GradientOrbs com blur pesado na landing (impacto em GPU mobile)

### Informação
- Home sem indicação de conteúdo novo desde última visita
- SpaceDetail sem filtros (por data, tipo, popularidade)
- Eventos sem calendário visual
- Podcasts sem fila de reprodução

### Performance (já documentado em AUDITORIA_SUBHUMANO.md)
- Queries em cascata no PostDetail
- Contagem de likes/comentários no client-side
- Campo `content` carregado nas listagens
- Sem paginação em algumas listagens
