# Plano de Implementacao: Funil de Vendas SubHumano

Este e um projeto grande que envolve mudancas no banco de dados, novas paginas, sistema de permissoes e integracao com o funil de vendas. Sera dividido em 5 fases sequenciais.

---

## Visao Geral da Arquitetura de Permissoes

O sistema atual opera com um modelo simples: `SubscriptionGuard` verifica se o usuario tem assinatura `active` ou `trial`. Tudo ou nada. O novo modelo exige 7 niveis de acesso granular baseado em:

- Status da assinatura (none, trial, active, expired)
- Tipo do plano (null, trial, monthly, yearly, lifetime)
- Presenca de cupom resgatado (promo_coupons / coupon_redemptions)
- Compras individuais de eventos (nova tabela)
- Papel administrativo (user_roles)

```text
Nivel       | Assinatura  | Plano       | Cupom | Evento Comprado
------------|-------------|-------------|-------|-----------------
Freemium    | none/expired| null        | Nao   | Nao
Cupom       | promo ativo | promo       | Sim   | -
Aluno       | none/expired| null        | Nao   | Sim (workshop)
Trial       | active      | trial       | -     | Sim (workshop)
Mensal      | active      | monthly     | -     | -
Anual       | active      | yearly      | -     | -
Vitalicio   | active      | lifetime    | -     | -
```

---

## FASE 0 -- Banco de Dados (Pre-requisito)

### Nova tabela: `events`

Armazena workshops, palestras, lives, aulas ao vivo, mentorias e cursos.

```sql
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'workshop',
    -- workshop, palestra, live, aula_ao_vivo, mentoria, curso
  modality TEXT NOT NULL DEFAULT 'online',
    -- online, presencial, hibrido
  price NUMERIC(10,2) DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT false,
  cover_url TEXT,
  location TEXT, -- sala virtual ou endereco fisico
  max_participants INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_published BOOLEAN NOT NULL DEFAULT false,
  checkout_url TEXT, -- URL do Ticto para compra individual
  ticto_offer_id TEXT, -- ID da oferta Ticto
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  slug TEXT NOT NULL DEFAULT ''
);

-- Sessoes/datas do evento (um evento pode ter varias datas)
CREATE TABLE public.event_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  session_url TEXT, -- link da sala virtual
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compras/inscricoes de eventos por usuario
CREATE TABLE public.event_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, refunded
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  external_id TEXT, -- ID da transacao Ticto
  UNIQUE(user_id, event_id)
);
```

RLS:

- `events`: Leitura publica para publicados, CRUD para admin
- `event_sessions`: Leitura publica para eventos publicados, CRUD para admin
- `event_purchases`: Usuarios veem suas compras, admins veem todas, usuarios inserem proprias

### Alteracao na tabela `subscriptions`

Adicionar suporte ao plano `lifetime` (vitalicio). Nenhuma alteracao de schema necessaria -- o campo `plan_type` ja e TEXT livre. Apenas garantir que `expires_at = NULL` para lifetime (acesso permanente).

---

## FASE 1 -- Landing Page

### 1.1 Sexto card na secao "Nossos Espacos"

**Arquivo**: `src/components/landing/LandingSpaces.tsx`

Adicionar um sexto card ao array `spaces` com icone `GraduationCap` (lucide-react):

```typescript
{
  icon: GraduationCap,
  name: "Aulas ao Vivo e Workshops",
  description: "Workshops praticos, palestras, lives, mentorias coletivas e cursos ministrados por especialistas. Aprenda fazendo com projetos reais e suporte ao vivo.",
}
```

Grid muda de 3 colunas para comportar 6 cards (2x3 no desktop, 2x3 no tablet, 1x6 mobile).

### 1.2 Nova secao de Eventos agendados

**Novo arquivo**: `src/components/landing/LandingEvents.tsx`

Secao posicionada ANTES de "Voce pode estar pensando..." (LandingProblem vem depois de LandingSpaces na ordem atual, mas o pedido diz "antes de LandingProblem/LandingMethod").

Analisando a ordem atual:

1. Hero
2. SocialProof
3. Problem ("Voce pode estar pensando..." NAO e esta secao)
4. Spaces
5. Features
6. Method ("Voce pode estar pensando..." -- esta e a secao correta)
7. Author
8. FAQ
9. CTA

A secao "Voce pode estar pensando..." corresponde a `LandingMethod`. A nova secao de eventos sera inserida ENTRE `LandingFeatures` e `LandingMethod`.

Conteudo: Card do workshop "Crie seu software em 6h usando IA (Mesmo sem saber programar)" com:

- Titulo do evento
- Badge "Workshop" + Badge "Online"
- Preco R$ 19,90
- Datas: 7 e 14 de marco de 2026, 14h-17h
- Botao "Garantir minha vaga" levando para /plans
- Design dark seguindo paleta do Subhumano

**Arquivo modificado**: `src/pages/Landing.tsx` -- importar e posicionar `LandingEvents` entre Features e Method.

---

## FASE 2 -- Pagina de Eventos

### 2.1 Nova pagina: `/events`

**Novo arquivo**: `src/pages/Events.tsx`

Pagina com:

- Header com titulo "Eventos"
- Filtros: data (futuro/passado), modalidade (online/presencial/hibrido), tipo (workshop/palestra/live/mentoria/curso), status (inscrito/nao inscrito)
- Lista de cards de eventos com:
  - Cover/thumbnail
  - Badge de tipo + modalidade
  - Titulo, descricao resumida
  - Datas das sessoes
  - Preco ou "Incluso no plano"
  - Botao de acao contextual:
    - Se ja comprou ou assinante mensal+: "Acessar" (verde)
    - Se nao comprou e nao e assinante: "Adquirir -- R$ 19,90" -> /plans
    - Se evento passado: "Encerrado" (desabilitado)

**Novo arquivo**: `src/hooks/useEvents.ts`

Hook para buscar eventos do banco com filtros.

### 2.2 Navegacao

Adicionar "Eventos" ao `BottomNav` com icone `CalendarBlank` (Phosphor), path `/events`.

Reorganizar BottomNav para 7 itens (ajustar layout) OU substituir um item existente. Sugestao: manter 6 itens no bottom nav e mover "Eventos" para dentro da tela Inicio ou como sub-item. Alternativa: usar o icone `Calendar` no lugar.

**Decisao**: Adicionar ao BottomNav como 7o item causa problemas de espaco em telas pequenas. Melhor abordagem: adicionar como item no nav com reorganizacao para caber, ou colocar como secao acessivel via Home.

### 2.3 Rota protegida

**Arquivo**: `src/App.tsx` -- adicionar rota `/events`.

No novo modelo Freemium, a pagina Eventos e VISIVEL para todos (inclusive freemium), mas o acesso ao conteudo do evento depende da compra/assinatura. Portanto a rota NAO deve usar `SubscriptionGuard` tradicional.

### 2.4 Seed do workshop

Inserir via SQL o workshop inicial:

```sql
INSERT INTO events (title, description, event_type, modality, price, is_published, slug, checkout_url)
VALUES (
  'Crie seu software em 6h usando IA (Mesmo sem saber programar)',
  'Workshop pratico onde voce vai criar um software completo usando ferramentas de IA...',
  'workshop', 'online', 19.90, true,
  'crie-seu-software-em-6h-usando-ia',
  'https://checkout.ticto.app/WORKSHOP_OFFER_ID'
);

INSERT INTO event_sessions (event_id, starts_at, ends_at, session_url)
VALUES
  ((SELECT id FROM events WHERE slug = 'crie-seu-software-em-6h-usando-ia'),
   '2026-03-07 14:00:00-03', '2026-03-07 17:00:00-03', NULL),
  ((SELECT id FROM events WHERE slug = 'crie-seu-software-em-6h-usando-ia'),
   '2026-03-14 14:00:00-03', '2026-03-14 17:00:00-03', NULL);
```

---

## FASE 3 -- Painel Admin de Eventos

### 3.1 Nova pagina admin: `/admin/events`

**Novo arquivo**: `src/pages/admin/Events.tsx`

Funcionalidades:

- Listagem de todos os eventos (ativos e inativos)
- Criacao de novo evento (formulario completo: titulo, descricao, tipo, modalidade, preco, datas/sessoes, URL de checkout, cover)
- Edicao de evento existente
- Ativar/desativar/publicar evento
- Visualizar inscritos por evento

### 3.2 Hook admin

**Novo arquivo**: `src/hooks/useAdminEvents.ts`

CRUD completo para eventos e sessoes.

### 3.3 Navegacao admin

**Arquivo**: `src/components/admin/AdminSidebar.tsx`

Adicionar "Eventos" ao grupo "Conteudo" com icone `CalendarCheck` (Phosphor):

```typescript
{ title: 'Eventos', url: '/admin/events', icon: CalendarCheck },
```

**Arquivo**: `src/App.tsx` -- adicionar rota admin `/admin/events` com `AdminGuard`.

---

## FASE 4 -- Pagina de Planos

### 4.1 Novos planos

**Arquivo**: `src/pages/Plans.tsx`

Adicionar ao array `plans`:

```typescript
{
  id: "workshop",
  name: "Workshop",
  price: "R$ 19,90",
  period: "pagamento unico",
  description: "Crie seu software em 6h usando IA",
  checkoutUrl: "https://checkout.ticto.app/WORKSHOP_OFFER_ID",
  features: [
    "Workshop pratico de 6 horas",
    "Aulas ao vivo dias 7 e 14/03",
    "Mesmo sem saber programar",
    "Certificado de participacao",
  ],
},
{
  id: "lifetime",
  name: "Vitalicio",
  price: "R$ 1.000,00",
  period: "pagamento unico",
  description: "Acesso permanente completo",
  badge: "Melhor custo-beneficio",
  checkoutUrl: "https://checkout.ticto.app/LIFETIME_OFFER_ID",
  features: [
    "Tudo do plano anual",
    "Acesso vitalicio sem renovacao",
    "Todos os workshops e cursos online",
    "Selo premium e canal exclusivo",
  ],
},
```

Reorganizar a UI para exibir os 4 opcoes de forma clara (workshop separado dos planos de assinatura).

---

## FASE 5 -- Sistema de Permissoes (a mais complexa)

### 5.1 Novo hook central: `useUserAccess`

**Novo arquivo**: `src/hooks/useUserAccess.ts`

Este hook centraliza TODA a logica de permissoes, substituindo verificacoes espalhadas:

```typescript
interface UserAccess {
  tier: 'freemium' | 'coupon' | 'student' | 'trial' | 'monthly' | 'yearly' | 'lifetime' | 'admin';
  
  // Permissoes granulares
  canReadFullArticles: boolean;      // false para freemium
  canReadFullChannelPosts: boolean;  // false para freemium
  canComment: boolean;               // false para freemium
  canLike: boolean;                  // false para freemium
  canListenPodcast: boolean;         // false para freemium
  canUseAI: boolean;                 // false para freemium
  aiDailyLimit: number;              // 0, 2, 10, unlimited
  canPostInChannels: boolean;        // false para freemium
  canViewMemberCards: boolean;       // false para freemium
  canAccessEvent: (eventId: string) => boolean;
  canAccessFreeEvents: boolean;      // palestras para cupom+
  canAccessAllOnlineEvents: boolean; // lifetime
  hasPremiumBadge: boolean;          // yearly e lifetime
  hasAccessToPremiumChannel: boolean;// yearly e lifetime
  loading: boolean;
}
```

Logica interna:

1. Busca assinatura ativa (ja existe em `useSubscription`)
2. Busca cupons resgatados do usuario (nova query)
3. Busca compras de eventos do usuario (nova query)
4. Verifica roles (admin/moderator bypass tudo)
5. Calcula tier e permissoes

### 5.2 Refatorar `SubscriptionGuard`

**Arquivo**: `src/components/SubscriptionGuard.tsx`

Atualmente redireciona para /plans se nao tem assinatura. No novo modelo:

- Usuarios freemium ACESSAM a plataforma (com restricoes visuais)
- O guard so bloqueia se nao estiver logado
- As restricoes sao aplicadas DENTRO dos componentes via `useUserAccess`

Novo comportamento:

- Se nao logado: redireciona para /login
- Se logado (qualquer nivel): renderiza children
- Cada componente individual aplica restricoes via `useUserAccess`

### 5.3 Componente de Blur/Paywall

**Novo arquivo**: `src/components/ContentPaywall.tsx`

Componente reutilizavel que:

- Exibe as primeiras N linhas do conteudo
- Aplica blur gradient no restante
- Mostra botao "Desbloqueie este conteudo com seu Passe VIP" sobre o blur
- Botao leva para /plans

Usado em:

- `PostContent.tsx` (artigos): mostra titulo + 7 primeiras linhas
- Posts de canais: mostra titulo + 1a linha
- Podcasts: bloqueia player de audio
- IA: bloqueia input de envio

### 5.4 Alteracoes em componentes existentes


| Componente              | Alteracao                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `PostContent.tsx`       | Se freemium: renderizar paywall apos 7 linhas                                                                                           |
| `PostDetail.tsx`        | Se freemium: esconder CommentSection e CommentInput                                                                                     |
| `ChannelPostDetail.tsx` | Se freemium: paywall + esconder interacoes                                                                                              |
| `ChannelDetail.tsx`     | Se freemium: esconder botao "Nova publicacao"                                                                                           |
| `PodcastDetail.tsx`     | Se freemium: bloquear PodcastPlayer                                                                                                     |
| `AIAssistant.tsx`       | Se freemium: bloquear input; Se cupom: limitar 2/dia; Se mensal: limitar 10/dia; Se anula: limitar 15/dia; Se vitalicio: limitar 20/dia |
| `AuthorModal.tsx`       | Se freemium: nao abrir (mostrar prompt de upgrade)                                                                                      |
| `MentionText.tsx`       | Se freemium: nao tornar clicavel                                                                                                        |
| `CommentItem.tsx`       | Se freemium: esconder botoes curtir/responder                                                                                           |


### 5.5 Badge Premium

Para usuarios yearly adicionar badge visual azul e para usuários lifetime adicionar badge dourado:

- No perfil do usuario
- Nos comentarios
- Nos posts de canais

**Arquivo**: `src/components/ui/badge.tsx` ou novo `PremiumBadge.tsx`

---

## Ordem de Execucao Recomendada

Devido a complexidade, recomendo dividir a implementacao em sub-sprints:

**Sprint 1**: FASE 0 (banco) + FASE 1 (landing page)

- Criar tabelas de eventos no banco
- Atualizar landing page com 6o card e secao de eventos

**Sprint 2**: FASE 3 (admin) + FASE 2 (pagina eventos)

- Painel admin para gerenciar eventos
- Pagina publica de eventos
- Seed do workshop

**Sprint 3**: FASE 4 (planos)

- Adicionar workshop e vitalicio na pagina de planos

**Sprint 4**: FASE 5 (permissoes)

- Hook `useUserAccess`
- Refatorar `SubscriptionGuard`
- Componente `ContentPaywall`
- Aplicar restricoes em cada componente

---

## Riscos e Mitigacoes


| Risco                                                            | Mitigacao                                                                                                             |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Quebrar acesso de usuarios atuais ao refatorar SubscriptionGuard | Implementar permissoes de forma aditiva -- usuarios com assinatura ativa mantem acesso full antes de qualquer mudanca |
| BottomNav com muitos itens                                       | Limitar a 6 itens, colocar Eventos como secao acessivel via Home ou Perfil                                            |
| Integracao com Ticto para novos produtos                         | Reutilizar o webhook existente que ja diferencia ofertas por ID                                                       |
| Limites de IA por dia                                            | Usar tabela `rag_query_logs` existente para contar interacoes diarias                                                 |


---

## Estimativa de Arquivos

- **Novos**: ~8 arquivos (LandingEvents, Events page, admin Events, hooks useEvents, useAdminEvents, useUserAccess, ContentPaywall, PremiumBadge)
- **Modificados**: ~15 arquivos (Landing, Plans, App, BottomNav, AdminSidebar, SubscriptionGuard, PostContent, PostDetail, ChannelPostDetail, PodcastDetail, AIAssistant, AuthorModal, MentionText, CommentItem, ChannelDetail)
- **Migracoes SQL**: 1 (criacao de tabelas events, event_sessions, event_purchases + RLS + seed)