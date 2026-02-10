

# Otimizacao de Performance — Analise e Plano de Correcao

## Analise dos 14 Problemas

### PROBLEMA 1: Contagem de likes/comments no client-side
**Status: CONFIRMADO**
- `usePosts.ts:60-87` — `useSpaceUpdates` baixa TODAS as linhas de `update_likes` e `update_comments` com `.select("update_id").in("update_id", updateIds)` e conta manualmente no JS
- `usePosts.ts:140-153` — `useHighlights` repete o mesmo padrao
- `usePosts.ts:320-346` — `useRecentDiscussions` faz o mesmo com `channel_post_likes` e `channel_post_comments`
- **Impacto real**: Se 50 posts tem 50 likes cada = 2.500 linhas trafegadas so para contar. Alem disso, o Supabase tem limite de 1000 linhas por query, entao contagens acima disso serao ERRADAS silenciosamente
- **Correcao viavel**: Criar database views com contagens agregadas. Seguro — nao altera dados, apenas leitura

### PROBLEMA 2: Queries em cascata no PostDetail.tsx
**Status: PARCIALMENTE CONFIRMADO**
- Linhas 95-176: Sao 5 queries sequenciais (space -> post -> author -> likes -> media), seguidas de `fetchComments()` que faz mais 3
- Porem, a query de likes (linha 157) ja usa `{ count: "exact", head: true }` — ou seja, so no PostDetail a contagem e feita corretamente
- **Impacto real**: ~500ms-1.5s de latencia sequencial desnecessaria
- **Correcao viavel**: Unificar space+post em 1 query (JOIN ja existe via `.select("spaces(...)"`), paralelizar author+likes+media+comments com `Promise.all()`. Seguro

### PROBLEMA 3: PostDetail nao usa React Query
**Status: CONFIRMADO**
- Linhas 66-76: usa `useState` + `useEffect` manuais
- Toda navegacao de volta ao artigo refaz todas as queries do zero
- **Correcao viavel**: Migrar para React Query. Seguro — melhora UX com cache

### PROBLEMA 4: Highlights.tsx nao usa React Query
**Status: CONFIRMADO**
- `src/pages/Highlights.tsx:67-175`: usa `useState` + `useEffect` com fetch manual
- Nota: A Home page usa o hook `useHighlights()` (que usa React Query), mas a pagina `/highlights` tem implementacao separada e duplicada
- **Correcao viavel**: Criar hook `useHighlightsFiltered(filter)` com React Query. Seguro

### PROBLEMA 5: Campo `content` nas listagens
**Status: CONFIRMADO**
- `usePosts.ts:49` — `useSpaceUpdates` inclui `content` no SELECT
- `usePosts.ts:124-125` — `useHighlights` tambem inclui `content`
- `content` e usado em `SpaceDetail.tsx:178` para `estimateReadTime(update.content)` — funcao que conta palavras
- **Impacto real**: Artigos com HTML rico podem ter 10-50KB cada
- **Correcao viavel**: Adicionar coluna `read_time_minutes` calculada por trigger no INSERT/UPDATE, remover `content` dos SELECTs de listagem. Seguro — nao quebra nada se o trigger preencher o campo

### PROBLEMA 6: Ausencia de paginacao
**Status: CONFIRMADO**
- `useSpaceUpdates` nao tem `.limit()` nem paginacao
- `useHighlights` tem `.limit(50)` — OK para agora
- `useRecentDiscussions` tem `.limit(50)` — OK para agora
- `Highlights.tsx` (pagina) nao tem limite
- **Impacto real**: Medio por agora (poucos artigos), mas critico conforme cresce
- **Correcao viavel**: Adicionar `.limit(30)` + infinite scroll com `useInfiniteQuery`. Seguro

### PROBLEMA 7: Font via @import (render-blocking)
**Status: CONFIRMADO**
- `src/index.css:1`: `@import url('https://fonts.googleapis.com/css2?family=DM+Sans...')`
- `index.html` nao tem `<link>` nem `preconnect` para Google Fonts
- **Correcao viavel**: Mover para `<link rel="preconnect">` + `<link rel="stylesheet">` no `index.html`. Trivial e seguro

### PROBLEMA 8: Imagens sem lazy loading
**Status: CONFIRMADO**
- `Home.tsx:189` — `<img src={highlight.thumbnail_url}` sem `loading="lazy"`
- `SpaceDetail.tsx:188` — mesma situacao
- `PostContent.tsx:69` — imagem hero (esta acima do fold, NAO deve ter lazy)
- **Correcao viavel**: Adicionar `loading="lazy"` nas listagens (cards). Seguro

### PROBLEMA 9: GradientOrbs com blur(120px)
**Status: CONFIRMADO**
- `GradientOrbs.tsx`: 3 divs de 500x500px com `blur-[120px]` em `position: fixed`
- Em mobile causa repaint caro a cada scroll
- **Correcao viavel**: Adicionar `will-change-transform` para promover a GPU layer, ou renderizar apenas em desktop. Seguro

### PROBLEMA 10: Dupla chamada useSubscription()
**Status: CONFIRMADO**
- `SubscriptionGuard.tsx:13` chama `useSubscription()`
- `AppLayout.tsx:12` chama `useSubscription()` novamente
- **Impacto real**: BAIXO — React Query cacheia a query, entao nao ha fetch duplicado. Mas ha re-renders desnecessarios
- **Correcao viavel**: Passar status via props/context. Seguro mas baixa prioridade

### PROBLEMA 11: useUnreadNotificationsCount com 3 queries sequenciais
**Status: CONFIRMADO**
- Linhas 232-260: 3 queries sequenciais (count user unread -> fetch ALL global notifs -> fetch read statuses)
- Roda a cada 30 segundos (`staleTime: 30s`)
- **Impacto real**: Medio. A query de globais busca TODAS as notificacoes globais sem limite
- **Correcao viavel**: Criar RPC function no banco. Seguro

### PROBLEMA 12: Framer Motion em cada item da lista
**Status: PARCIALMENTE CONFIRMADO**
- Ja existe mitigacao: `MAX_STAGGER_ITEMS = 4` e `STAGGER_DELAY = 0.03` (muito curto)
- As listas sao curtas (5 highlights, 5 discussions, max ~50 updates)
- **Impacto real**: BAIXO com as mitigacoes ja aplicadas
- **Correcao**: Baixa prioridade. Pode-se adicionar `prefers-reduced-motion`

### PROBLEMA 13: PWA plugin nao configurado
**Status: CONFIRMADO**
- `vite-plugin-pwa` esta em `package.json` mas NAO esta em `vite.config.ts`
- `public/sw.js` existe mas e manual e basico
- **Correcao viavel**: Configurar VitePWA no vite.config.ts. Requer cuidado para nao quebrar o service worker existente

### PROBLEMA 14: IconPicker importa 35 icones
**Status: CONFIRMADO mas BAIXO impacto**
- `getIconComponent` e importado em Home, Spaces, SpaceDetail
- Porem, os icones Phosphor ja sao importados individualmente (named imports), entao tree-shaking funciona
- O problema real e que `Popover` e `Button` do IconPicker sao importados desnecessariamente
- **Correcao viavel**: Separar `getIconComponent` + `AVAILABLE_ICONS` em `src/lib/icons.ts`. Seguro

---

## Plano de Correcao — Dividido em 3 Fases

### FASE 1 — Correcoes Criticas de Data Fetching (maior impacto)

Foco: eliminar o problema de contagem client-side, cascata no PostDetail, e ausencia de React Query.

**1.1 — Criar database views para contagens agregadas**

Criar 2 views no banco:

```text
VIEW: space_update_stats
- update_id, likes_count, comments_count

VIEW: channel_post_stats  
- post_id, likes_count, comments_count
```

Isso elimina a necessidade de baixar todas as linhas de likes/comments.

**1.2 — Refatorar hooks em usePosts.ts**

- `useSpaceUpdates`: trocar batch fetch de likes/comments por JOIN com a view `space_update_stats`
- `useHighlights`: mesma correcao
- `useRecentDiscussions`: trocar por JOIN com `channel_post_stats`
- Remover `content` do SELECT das listagens (preparacao para 1.4)

**1.3 — Migrar PostDetail.tsx para React Query**

- Criar hook `usePostDetail(spaceSlug, postSlug)` com React Query
- Unificar query de space+post (eliminar 1a query separada)
- Paralelizar author+likes+media+comments com `Promise.all()`
- Manter optimistic updates para like/save

**1.4 — Adicionar coluna read_time_minutes**

- Migration: adicionar `read_time_minutes INTEGER` na tabela `space_updates`
- Trigger: calcular automaticamente no INSERT/UPDATE
- Backfill: popular dados existentes
- Remover `content` do SELECT nas listagens

**1.5 — Migrar Highlights.tsx para React Query**

- Criar hook `useHighlightsFiltered(filter)` usando React Query com queryKey incluindo o filtro
- Eliminar o fetch manual duplicado

---

### FASE 2 — Otimizacoes de Rede e Rendering

**2.1 — Fonte Google via preconnect**

- Adicionar no `index.html`:
```text
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="..." />
```
- Remover `@import` do `index.css`

**2.2 — Lazy loading de imagens**

- Adicionar `loading="lazy"` em todas as `<img>` de cards (Home, SpaceDetail, Highlights, Podcasts)
- Adicionar `width` e `height` para evitar layout shift

**2.3 — Otimizar GradientOrbs**

- Adicionar `will-change-transform` nos divs com blur
- Ocultar em mobile com `hidden md:block`

**2.4 — Otimizar useUnreadNotificationsCount**

- Criar RPC function `get_unread_notifications_count(user_id)` que faz tudo em 1 query SQL
- Substituir as 3 queries sequenciais pela chamada RPC

**2.5 — Separar getIconComponent do IconPicker**

- Mover `getIconComponent` e `AVAILABLE_ICONS` para `src/lib/icons.ts`
- IconPicker continua importando de la, mas paginas de listagem so importam o necessario

---

### FASE 3 — Paginacao e PWA (escala futura)

**3.1 — Paginacao no useSpaceUpdates**

- Adicionar `.limit(20)` inicial
- Migrar para `useInfiniteQuery` com infinite scroll
- Implementar no SpaceDetail

**3.2 — Paginacao no Highlights**

- Adicionar `.limit(20)` com "carregar mais"

**3.3 — Configurar vite-plugin-pwa**

- Adicionar VitePWA ao vite.config.ts com estrategia de cache
- Remover sw.js manual

**3.4 — prefers-reduced-motion**

- Adicionar media query para desabilitar animacoes Framer Motion
- Baixa prioridade, impacto minimo

---

## Estimativa de Impacto

| Fase | Reducao estimada de latencia | Reducao de dados trafegados |
|------|------------------------------|----------------------------|
| Fase 1 | 40-60% nas listagens, 50-70% no PostDetail | 80-90% (contagens + content) |
| Fase 2 | 200-400ms no primeiro render (font), melhora perceived perf | 10-20% (lazy images) |
| Fase 3 | Escala — evita degradacao com crescimento | Proporcional ao limite |

**Recomendacao**: Implementar Fase 1 primeiro (maior retorno). Fase 2 pode ser feita em seguida. Fase 3 pode ser agendada para quando o volume de conteudo crescer significativamente.

