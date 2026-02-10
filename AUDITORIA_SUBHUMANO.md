# AUDITORIA COMPLETA — PLATAFORMA SUBHUMANO

**Data:** 10/02/2026
**Auditor:** Claude Code (Opus 4.6)
**Escopo:** Análise completa de performance, segurança e arquitetura
**Foco principal:** Lentidão ao carregar páginas de cards de artigos e artigos individuais

---

## SUMÁRIO EXECUTIVO

A plataforma Subhumano é um projeto React/Vite/Supabase bem estruturado com code splitting, lazy loading e React Query. Porém, **a lentidão reportada nas páginas de artigos é causada por problemas críticos de data fetching**: queries em cascata (waterfall), contagem de likes/comentários feita no client-side baixando todas as linhas, ausência de paginação, e conteúdo HTML completo trafegado desnecessariamente nos cards. Além disso, foram encontradas **vulnerabilidades de segurança nas Edge Functions** que precisam de correção urgente.

---

## PARTE 1 — PROBLEMAS DE PERFORMANCE (Causa da Lentidão)

### P1. CONTAGEM DE LIKES/COMMENTS FEITA NO CLIENT-SIDE [CRÍTICO]

**Arquivos:** `src/hooks/usePosts.ts:60-87`, `src/hooks/usePosts.ts:140-153`, `src/hooks/usePosts.ts:320-346`

**Problema:** Em vez de usar `COUNT(*)` no Supabase (ou uma database view), os hooks baixam **TODAS as linhas** de `update_likes` e `update_comments` para contar no JavaScript. Se um espaço tem 100 artigos com 50 likes cada, são 5.000 linhas trafegadas só para exibir números.

```typescript
// PROBLEMA: Busca TODAS as linhas de likes para contar no JS
const [likesResult, commentsResult] = await Promise.all([
  supabase.from("update_likes").select("update_id").in("update_id", updateIds),
  supabase.from("update_comments").select("update_id").in("update_id", updateIds),
]);
// Depois conta manualmente com forEach...
```

**Correção:** Criar uma **database view** ou **RPC function** no Supabase que retorna os counts já agregados:

```sql
-- Opção 1: View materializada
CREATE VIEW space_updates_with_counts AS
SELECT
  su.*,
  COALESCE(lc.likes_count, 0) as likes_count,
  COALESCE(cc.comments_count, 0) as comments_count
FROM space_updates su
LEFT JOIN (
  SELECT update_id, COUNT(*) as likes_count
  FROM update_likes GROUP BY update_id
) lc ON lc.update_id = su.id
LEFT JOIN (
  SELECT update_id, COUNT(*) as comments_count
  FROM update_comments GROUP BY update_id
) cc ON cc.update_id = su.id;

-- Opção 2: RPC function
CREATE FUNCTION get_space_updates_feed(p_space_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS TABLE(...) AS $$
  -- Query otimizada com JOINs e contagens
$$ LANGUAGE sql STABLE;
```

**Impacto:** Este é o **maior gargalo de performance**. Reduz drasticamente o volume de dados transferidos e o tempo de processamento.

---

### P2. QUERIES EM CASCATA NO PostDetail.tsx [CRÍTICO]

**Arquivo:** `src/pages/PostDetail.tsx:89-177`

**Problema:** A função `fetchPostData` faz **6 queries sequenciais** ao Supabase, uma esperando a outra terminar:

1. Busca space por slug → espera
2. Busca post por slug → espera
3. Busca author profile → espera
4. Busca likes count → espera
5. Busca media → espera
6. Busca comments → espera

Cada query leva ~100-300ms. No total: **600ms-1.8s só de queries sequenciais**.

```typescript
// Query 1: space
const { data: spaceData } = await supabase.from("spaces").select("id").eq("slug", spaceSlug).single();
// Query 2: post (depende da 1)
const { data: postData } = await supabase.from("space_updates").select(...).eq("space_id", spaceData.id);
// Query 3: author (depende da 2)
const { data: profile } = await supabase.from("profiles").select(...).eq("id", postData.author_id);
// Queries 4, 5, 6: poderiam ser paralelas mas são sequenciais
```

**Correção:**
- Queries 1 e 2 podem ser unificadas (JOIN space na query do post)
- Queries 3, 4, 5, 6 devem rodar em paralelo com `Promise.all()`
- Melhor ainda: criar uma **RPC function** que retorna tudo em 1 chamada

```typescript
// CORREÇÃO: Unificar query 1+2 e paralelizar o resto
const { data: postData } = await supabase
  .from("space_updates")
  .select(`*, spaces!inner(id, name, slug)`)
  .eq("spaces.slug", spaceSlug)
  .eq("slug", postSlug)
  .eq("is_published", true)
  .single();

// Paralelizar as demais
const [author, likesCount, media, comments] = await Promise.all([
  fetchAuthor(postData.author_id),
  fetchLikesCount(postData.id),
  fetchMedia(postData.id),
  fetchComments(postData.id),
]);
```

---

### P3. PostDetail NÃO USA React Query [CRÍTICO]

**Arquivo:** `src/pages/PostDetail.tsx:66-76`

**Problema:** PostDetail usa `useState` + `useEffect` manuais em vez de React Query. Isso significa:
- **Sem cache**: toda vez que o usuário volta ao artigo, refaz todas as queries
- **Sem stale-while-revalidate**: mostra loading em vez de dados em cache
- **Sem invalidação inteligente**: não se beneficia do sistema de cache global

```typescript
// PROBLEMA: Estado manual sem cache
const [isLoading, setIsLoading] = useState(true);
const [post, setPost] = useState<Post | null>(null);
useEffect(() => {
  fetchPostData(); // Sempre refaz do zero
}, [spaceSlug, postSlug]);
```

**Correção:** Migrar para React Query hooks dedicados:

```typescript
const { data: post, isLoading } = useQuery({
  queryKey: ['post', spaceSlug, postSlug],
  queryFn: () => fetchPostBySlug(spaceSlug, postSlug),
  staleTime: 1000 * 60 * 5,
});
```

---

### P4. Highlights.tsx TAMBÉM NÃO USA React Query [ALTO]

**Arquivo:** `src/pages/Highlights.tsx:67-175`

**Problema:** A página Highlights repete o mesmo antipadrão: `useState` + `useEffect` com fetch manual. Cada mudança de filtro de data dispara um fetch completo sem cache.

**Correção:** Migrar para um hook React Query com a key incluindo o filtro:

```typescript
const { data: highlights } = useQuery({
  queryKey: ['highlights-page', selectedFilter, user?.id],
  queryFn: () => fetchHighlights(selectedFilter, user.id),
});
```

---

### P5. CAMPO `content` CARREGADO NAS LISTAGENS DE CARDS [ALTO]

**Arquivos:** `src/hooks/usePosts.ts:48-50`, `src/hooks/usePosts.ts:122-131`

**Problema:** As queries de listagem (cards) incluem o campo `content` que contém o HTML completo do artigo. Esse campo pode ter **10-50KB por artigo**. Para uma lista de 50 artigos = **500KB-2.5MB de dados desnecessários**.

```typescript
// PROBLEMA: Busca "content" para exibir em cards que NÃO mostram o conteúdo
.select("id, title, slug, content, thumbnail_url, ...")
```

O `content` é usado apenas para `estimateReadTime()` — que pode ser pré-calculado.

**Correção:** Remover `content` das queries de listagem e pré-calcular `read_time`:
- Adicionar coluna `read_time_minutes` na tabela `space_updates`
- Calcular no INSERT/UPDATE via trigger ou na Edge Function
- Remover `content` do SELECT das listagens

---

### P6. AUSÊNCIA TOTAL DE PAGINAÇÃO [ALTO]

**Arquivos:** `src/hooks/usePosts.ts` (todos os hooks), `src/pages/Highlights.tsx`, `src/pages/SpaceDetail.tsx`

**Problema:** Nenhuma listagem implementa paginação. O `useSpaceUpdates` carrega TODOS os artigos de um espaço de uma vez. Quando um espaço crescer para centenas de artigos, a página ficará inutilizável.

**Correção:** Implementar infinite scroll ou paginação:

```typescript
export function useSpaceUpdates(spaceId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ["space-updates", spaceId],
    queryFn: async ({ pageParam = 0 }) => {
      const PAGE_SIZE = 20;
      const { data } = await supabase
        .from("space_updates_with_counts") // usar a view
        .select("id, title, slug, thumbnail_url, likes_count, comments_count, read_time_minutes")
        .eq("space_id", spaceId)
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      return data;
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage?.length === 20 ? allPages.length * 20 : undefined,
  });
}
```

---

### P7. FONT GOOGLE CARREGADA VIA @import (RENDER-BLOCKING) [MÉDIO]

**Arquivo:** `src/index.css:1`

**Problema:** A fonte DM Sans é carregada via `@import url(...)` dentro do CSS, que é **render-blocking** — o navegador precisa baixar o CSS, parsear, encontrar o @import, baixar a fonte, e só depois renderizar.

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:...');
```

**Correção:** Mover para `<link>` com `preconnect` no `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:..." />
```

---

### P8. IMAGENS SEM LAZY LOADING NEM OTIMIZAÇÃO [MÉDIO]

**Arquivos:** `src/pages/Home.tsx:186-190`, `src/pages/SpaceDetail.tsx:186-190`, `src/components/post/PostContent.tsx:69-71`

**Problema:** As thumbnails nos cards são carregadas com `<img>` simples sem `loading="lazy"` e sem redimensionamento. Uma thumb de 80x80px pode baixar uma imagem de 1920x1080.

```html
<!-- PROBLEMA: Imagem full-size para um card de 80x80px -->
<img src={highlight.thumbnail_url} className="w-20 h-20 object-cover" />
```

**Correção:**
- Adicionar `loading="lazy"` em todas as imagens abaixo do fold
- Usar Supabase Image Transformation para servir thumbnails no tamanho correto
- Adicionar `width` e `height` para evitar layout shift

```html
<img
  src={`${highlight.thumbnail_url}?width=160&height=160&resize=cover`}
  loading="lazy"
  width={80}
  height={80}
  className="w-20 h-20 object-cover"
/>
```

---

### P9. GradientOrbs COM blur(120px) FIXO NA LANDING [MÉDIO]

**Arquivo:** `src/components/landing/GradientOrbs.tsx`

**Problema:** 3 elementos `<div>` de 500x500px com `blur-[120px]` em posição `fixed`. O CSS `filter: blur()` com valores altos em elementos grandes é extremamente pesado para a GPU, especialmente em dispositivos móveis. Por serem `fixed`, são re-composited em cada scroll.

**Correção:**
- Usar `will-change: transform` para promover a camada
- Substituir `filter: blur()` por imagens PNG pré-processadas com blur
- Ou usar `backdrop-filter` com contenção
- Alternativamente, renderizar apenas em desktop com media query

---

### P10. SubscriptionGuard + AppLayout: DUPLA CHAMADA useSubscription() [MÉDIO]

**Arquivos:** `src/components/SubscriptionGuard.tsx:13`, `src/components/AppLayout.tsx:12`

**Problema:** Toda página protegida passa por `SubscriptionGuard` que chama `useSubscription()`, e depois renderiza `AppLayout` que chama `useSubscription()` novamente. Embora React Query cacheie, isso duplica a lógica de loading state e pode causar re-renders desnecessários.

**Correção:** Extrair o resultado de useSubscription para um contexto compartilhado ou passar via props do Guard para o Layout.

---

### P11. useUnreadNotificationsCount FAZ 3 QUERIES SEQUENCIAIS [MÉDIO]

**Arquivo:** `src/hooks/useNotifications.ts:223-264`

**Problema:** A contagem de notificações não lidas faz 3 queries sequenciais:
1. Count de notificações do usuário
2. Busca TODAS as notificações globais
3. Busca read statuses

Isso roda na Home a cada 30 segundos.

**Correção:** Criar uma RPC function no Supabase:

```sql
CREATE FUNCTION get_unread_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*) FROM (
    SELECT id FROM notifications WHERE user_id = p_user_id AND is_read = false
    UNION ALL
    SELECT n.id FROM notifications n
    WHERE n.user_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM notification_reads nr
      WHERE nr.notification_id = n.id AND nr.user_id = p_user_id
    )
  ) sub;
$$ LANGUAGE sql STABLE;
```

---

### P12. FRAMER MOTION EM CADA ITEM DA LISTA [BAIXO]

**Arquivos:** `src/pages/Home.tsx`, `src/pages/SpaceDetail.tsx`, `src/pages/Highlights.tsx`

**Problema:** Cada card individual tem um `<motion.div>` com animação `initial/animate`. Para listas longas, isso cria muitos nós de animação que consomem memória e CPU.

**Correção:**
- Usar `AnimatePresence` + `motion.div` apenas no container
- Aplicar CSS animations em vez de Framer Motion para stagger simples
- Limitar animações a dispositivos que suportam (`prefers-reduced-motion`)

---

### P13. PWA PLUGIN NÃO CONFIGURADO NO VITE [BAIXO]

**Arquivos:** `package.json` (tem `vite-plugin-pwa`), `vite.config.ts` (não usa)

**Problema:** O `vite-plugin-pwa` está instalado mas não é usado no `vite.config.ts`. O Service Worker em `public/sw.js` é manual e não faz cache de assets. Resultado: nenhum asset é cacheado offline.

**Correção:** Configurar o plugin no Vite para cache de assets estáticos:

```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          { urlPattern: /^https:\/\/.*supabase.*/, handler: 'NetworkFirst' },
          { urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/, handler: 'CacheFirst' },
        ],
      },
    }),
  ],
});
```

---

### P14. IconPicker IMPORTA 35 ÍCONES EM TODA RENDERIZAÇÃO DE CARD [BAIXO]

**Arquivo:** `src/components/admin/IconPicker.tsx`

**Problema:** `getIconComponent()` é importado em `Home.tsx`, `Spaces.tsx`, `SpaceDetail.tsx`. Isso puxa o módulo inteiro com 35 ícones do Phosphor. Embora tree-shaking ajude, o módulo ainda é grande.

**Correção:** Mover `getIconComponent` e `AVAILABLE_ICONS` para um arquivo separado (`src/lib/icons.ts`) e garantir que o IconPicker (com Popover e Button) não seja importado nas páginas de listagem.

---

## PARTE 2 — PROBLEMAS DE SEGURANÇA

### S1. CORS `"*"` EM TODAS AS EDGE FUNCTIONS [CRÍTICO]

**Arquivos:** Todas as 10 Edge Functions

**Problema:** `"Access-Control-Allow-Origin": "*"` permite que qualquer site faça requests às funções.

**Correção:** Restringir ao domínio da aplicação:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://subhumano.ia.br",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

---

### S2. WEBHOOK SEM VERIFICAÇÃO DE ASSINATURA [CRÍTICO]

**Arquivo:** `supabase/functions/ticto-webhook/index.ts`

**Problema:** O webhook da Ticto aceita qualquer request sem verificar assinatura HMAC. Um atacante pode enviar payloads forjados para criar assinaturas gratuitas.

**Correção:** Implementar verificação HMAC-SHA256 com shared secret:

```typescript
const signature = req.headers.get('x-ticto-signature');
const expectedSignature = await hmacSHA256(body, TICTO_SECRET);
if (signature !== expectedSignature) {
  return new Response('Invalid signature', { status: 401 });
}
```

---

### S3. TOKEN JWT HARDCODED EM TRIGGER DO BANCO [CRÍTICO]

**Arquivo:** Migration que contém `notify_space_update_published()`

**Problema:** O token Supabase está embutido diretamente no código SQL do trigger.

**Correção:** Usar `current_setting('app.settings.service_key')` ou chamar via pg_net com token de uma tabela de secrets.

---

### S4. verify-password SEM RATE LIMITING [ALTO]

**Arquivo:** `supabase/functions/verify-password/index.ts`

**Problema:** Endpoint permite tentativas ilimitadas de login, viabilizando ataques de força bruta.

**Correção:** Implementar rate limiting por IP usando KV store ou tabela:

```typescript
const ip = req.headers.get('x-forwarded-for');
const attempts = await getRecentAttempts(ip, email);
if (attempts > 5) {
  return new Response('Too many attempts', { status: 429 });
}
```

---

### S5. RACE CONDITION NO redeem-coupon [ALTO]

**Arquivo:** `supabase/functions/redeem-coupon/index.ts:169-218`

**Problema:** Duas requisições simultâneas podem resgatar o mesmo cupom além do limite porque o incremento de `current_uses` não é atômico.

**Correção:** Usar UPDATE com condição WHERE atômica:

```sql
UPDATE promo_coupons
SET current_uses = current_uses + 1
WHERE id = $1 AND current_uses < max_uses
RETURNING *;
```

---

### S6. DADOS SENSÍVEIS LOGADOS NAS EDGE FUNCTIONS [ALTO]

**Arquivos:** `ticto-webhook/index.ts:49`, `send-daily-digest/index.ts`

**Problema:** Payloads com emails, nomes e CPF de clientes são logados em plain text.

**Correção:** Implementar log sanitization — reduzir logs para IDs e status, nunca PII.

---

### S7. TypeScript com strict: false [MÉDIO]

**Arquivo:** `tsconfig.app.json`

**Problema:** `strict: false`, `noImplicitAny: false`, `strictNullChecks: false` desabilitam proteções contra erros comuns em runtime. Isso permite `null` / `undefined` não tratados que causam crashes.

**Evidência:** Múltiplos `as any` no código (`src/hooks/usePosts.ts:159,166,167`, `src/pages/SpaceDetail.tsx:141`).

**Correção:** Habilitar progressivamente:
1. Começar com `strictNullChecks: true`
2. Depois `noImplicitAny: true`
3. Por fim `strict: true`

---

### S8. PROFILES PÚBLICOS PARA TODOS [BAIXO]

**Arquivo:** Migration RLS de profiles

**Problema:** Qualquer pessoa pode SELECT todos os profiles, permitindo enumeração de usuários.

**Correção:** Restringir SELECT para usuários autenticados apenas:

```sql
CREATE POLICY "Only authenticated can view profiles"
ON profiles FOR SELECT TO authenticated USING (true);
```

---

## PARTE 3 — PROBLEMAS DE ARQUITETURA

### A1. PADRÕES DE DATA FETCHING INCONSISTENTES

**Problema:** Três padrões diferentes coexistem:
- **React Query hooks** (usePosts.ts, useSpaces.ts) — com cache
- **useEffect + fetch manual** (PostDetail.tsx, Highlights.tsx) — sem cache
- **Supabase direto em componentes** (PostDetail.tsx:95-170) — sem abstração

**Correção:** Padronizar tudo em React Query hooks. Cada entidade deve ter seu próprio hook.

---

### A2. AUSÊNCIA DE React.StrictMode

**Arquivo:** `src/main.tsx`

**Problema:** O app não usa `<React.StrictMode>`, o que mascara side effects e problemas de cleanup em development.

**Correção:** Envolver em StrictMode:

```typescript
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

---

### A3. VITE SEM OTIMIZAÇÕES DE BUILD

**Arquivo:** `vite.config.ts`

**Problema:** Nenhuma configuração de:
- `build.rollupOptions.output.manualChunks` para separar vendors
- Plugin de compressão (gzip/brotli)
- `build.cssCodeSplit` para CSS splitting

**Correção:**

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', ...],
          'vendor-editor': ['@tiptap/react', '@tiptap/starter-kit', ...],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
});
```

---

### A4. AuthProvider POTENCIAL RACE CONDITION

**Arquivo:** `src/contexts/AuthContext.tsx:23-55`

**Problema:** `onAuthStateChange` e `getSession()` podem ambos chamar `setLoading(false)` e `setUser()`, potencialmente causando flash de conteúdo não autenticado.

**Correção:** Usar um flag para garantir que `getSession()` resolve primeiro:

```typescript
const initialized = useRef(false);
supabase.auth.getSession().then(({ data: { session } }) => {
  if (!initialized.current) {
    initialized.current = true;
    setUser(session?.user ?? null);
    setLoading(false);
  }
});
```

---

## PARTE 4 — PLANO DE CORREÇÃO PRIORIZADO

### FASE 1 — Correções Críticas de Performance (Maior impacto na lentidão)

| # | Ação | Arquivos | Impacto |
|---|------|----------|---------|
| 1 | Criar database view `space_updates_with_counts` com likes/comments pré-agregados | Nova migration SQL | Elimina download de milhares de rows |
| 2 | Criar RPC `get_post_detail` que retorna post+author+counts em 1 query | Nova migration SQL | Elimina 6 queries em cascata |
| 3 | Remover campo `content` das queries de listagem de cards | `usePosts.ts` | Reduz 50-90% do payload |
| 4 | Migrar PostDetail.tsx para React Query | `PostDetail.tsx` | Habilita cache de artigos |
| 5 | Migrar Highlights.tsx para React Query | `Highlights.tsx` | Habilita cache de destaques |
| 6 | Adicionar paginação (20 itens por página) | `usePosts.ts`, `SpaceDetail.tsx` | Evita carregar centenas de items |

### FASE 2 — Correções de Segurança Urgentes

| # | Ação | Arquivos | Impacto |
|---|------|----------|---------|
| 7 | Restringir CORS para domínio subhumano.ia.br | Todas as Edge Functions | Impede requests cross-origin maliciosos |
| 8 | Implementar verificação de assinatura no webhook Ticto | `ticto-webhook/index.ts` | Impede fraude de assinatura |
| 9 | Adicionar rate limiting no verify-password | `verify-password/index.ts` | Impede brute force |
| 10 | Corrigir race condition no redeem-coupon | `redeem-coupon/index.ts` | Impede uso duplo de cupom |
| 11 | Remover token hardcoded do trigger | Migration SQL | Remove credencial exposta |
| 12 | Sanitizar logs das Edge Functions | Todas as Edge Functions | Remove PII dos logs |

### FASE 3 — Otimizações de Performance Complementares

| # | Ação | Arquivos | Impacto |
|---|------|----------|---------|
| 13 | Mover @import de font para `<link preconnect>` | `index.css`, `index.html` | Elimina render-blocking |
| 14 | Adicionar `loading="lazy"` em todas as imagens de cards | Pages de listagem | Reduz carregamento inicial |
| 15 | Criar RPC `get_unread_count` para notificações | Nova migration SQL | Elimina 3 queries sequenciais |
| 16 | Otimizar GradientOrbs (substituir blur por imagem) | `GradientOrbs.tsx` | Reduz uso de GPU na landing |
| 17 | Configurar VitePWA para cache de assets | `vite.config.ts` | Cache offline de JS/CSS/imagens |
| 18 | Adicionar manualChunks no Vite build | `vite.config.ts` | Melhor cache de vendors |

### FASE 4 — Melhoria Contínua

| # | Ação | Arquivos | Impacto |
|---|------|----------|---------|
| 19 | Habilitar `strictNullChecks: true` no TypeScript | `tsconfig.app.json` | Previne crashes de null |
| 20 | Separar `getIconComponent` do `IconPicker` | Novo `src/lib/icons.ts` | Reduz bundle das pages |
| 21 | Unificar SubscriptionGuard + AppLayout | Components | Elimina hook duplicado |
| 22 | Adicionar `<React.StrictMode>` | `main.tsx` | Detecta problemas em dev |
| 23 | Padronizar todos os data fetches em React Query | Toda a aplicação | Consistência de cache |
| 24 | Restringir RLS de profiles para autenticados | Migration SQL | Protege lista de usuários |

---

## RESUMO DE IMPACTO ESPERADO

| Métrica | Antes (estimado) | Depois (estimado) |
|---------|:-----------------:|:------------------:|
| Tempo de carregamento SpaceDetail | 2-4s | 0.5-1s |
| Tempo de carregamento PostDetail | 3-5s | 0.8-1.5s |
| Payload de listagem (50 artigos) | 2-3MB | 100-200KB |
| Queries por página de artigo | 6 sequenciais | 1-2 paralelas |
| Cache hit em navegação back/forward | 0% | 90%+ |
| Vulnerabilidades de segurança críticas | 3 | 0 |

---

## NOTAS FINAIS

**O que já está BEM feito no projeto:**
- Code splitting com `React.lazy()` em todas as páginas
- React Query configurado com `staleTime` e `gcTime` sensatos no `queryClient.ts`
- RLS habilitado em TODAS as tabelas do Supabase
- 45+ índices de banco de dados cobrindo os principais padrões de query
- ErrorBoundary global para captura de erros
- Optimistic updates nas mutations de like/save
- DOMPurify para sanitização de HTML no PostContent
- AuthContext com ref para evitar re-renders desnecessários em token refresh

O projeto tem uma base sólida. As correções propostas focam nos gargalos específicos que causam a lentidão percebida e nas vulnerabilidades que precisam ser tratadas antes do lançamento em produção.
