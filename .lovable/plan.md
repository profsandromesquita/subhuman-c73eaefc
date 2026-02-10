
# Correcao de Problemas na Arquitetura

## Analise dos 4 Problemas

### PROBLEMA 1: Padroes de Data Fetching Inconsistentes
**Status: PARCIALMENTE RESOLVIDO nas otimizacoes anteriores, mas 2 paginas criticas ainda persistem**

Apos as correcoes da Fase 1-3, os seguintes arquivos JA foram migrados para React Query:
- `PostDetail.tsx` — usa `usePostDetail()` (React Query)
- `Highlights.tsx` — usa `useHighlightsFiltered()` (React Query + useInfiniteQuery)
- `usePosts.ts` — todos os hooks ja usam React Query

Porem, 2 paginas de usuario continuam com `useState + useEffect` manual:
- **`ChannelPostDetail.tsx` (646 linhas)** — usa `useState/useEffect` com `fetchPost()`, `fetchMedia()`, `fetchComments()`, `checkUserLiked()` sequenciais, sem cache
- **`PodcastDetail.tsx` (404 linhas)** — ja usa `usePodcastBySlug()` (React Query) para dados basicos, mas `fetchEngagementData()` e `fetchComments()` sao manuais com `useEffect`

As paginas admin (`admin/Users.tsx`, `admin/Subscriptions.tsx`, etc.) tambem usam `useEffect` manual, mas como sao acessadas apenas por administradores com baixo volume de uso, a migracao nao e prioritaria.

**Correcao proposta**: Criar hooks React Query dedicados para `ChannelPostDetail` e `PodcastDetail` (engagement + comments), seguindo o mesmo padrao do `usePostDetail`.

**Viabilidade**: Alta. O padrao ja existe implementado. Risco baixo pois sao refatoracoes isoladas.

---

### PROBLEMA 2: Ausencia de React.StrictMode
**Status: CONFIRMADO**

`src/main.tsx` nao envolve a arvore com `<React.StrictMode>`. O StrictMode ajuda a detectar:
- Effects com cleanup ausente (re-executa effects em dev)
- APIs legadas/deprecated
- Side effects impuros em renders

**Nota importante**: Adicionar StrictMode em producao nao tem nenhum efeito — ele so atua em modo de desenvolvimento. Portanto, e seguro adicionar sem impacto no usuario final.

**Risco**: Em desenvolvimento, effects que rodam 2x podem causar chamadas duplicadas ao Supabase. Isso e intencional — expoe bugs que existem mas estao ocultos. O `AuthContext` ja esta protegido com `useRef` para idempotencia, entao nao havera problemas ali.

**Correcao proposta**: Adicionar `<StrictMode>` envolvendo `<AuthProvider>` no `main.tsx`.

**Viabilidade**: Trivial e seguro.

---

### PROBLEMA 3: Vite sem Otimizacoes de Build
**Status: CONFIRMADO**

O `vite.config.ts` nao tem nenhuma configuracao de build. Isso significa:
- Todos os vendors (React, Radix, Supabase, TipTap, Framer Motion) ficam em um unico bundle JS
- Sem compressao gzip/brotli
- Sem controle de chunks

**Correcao proposta**: Adicionar `manualChunks` para separar vendors em bundles menores:

```text
vendor-react: react, react-dom, react-router-dom (~140KB)
vendor-ui: @radix-ui/* (~80KB)
vendor-editor: @tiptap/* (~120KB) — so carregado em paginas de edicao
vendor-supabase: @supabase/supabase-js (~60KB)
vendor-motion: framer-motion (~60KB)
vendor-charts: recharts (~100KB) — so carregado no admin
```

Beneficio: O navegador cacheia cada chunk separadamente. Ao atualizar o app, so baixa os chunks que mudaram (o vendor-react raramente muda).

**Viabilidade**: Alta. E uma configuracao de build, nao muda comportamento em runtime. Risco: se um import dinamico nao for resolvido corretamente, pode gerar erro — mas isso e detectavel no build.

**Nota**: Compressao gzip/brotli normalmente e feita pelo servidor/CDN (Lovable Cloud ja faz isso), entao nao e necessario adicionar plugin de compressao.

---

### PROBLEMA 4: AuthProvider Potencial Race Condition
**Status: MITIGADO, MAS CORRECAO SIMPLES E RECOMENDADA**

O codigo atual:
1. Registra `onAuthStateChange` listener
2. Chama `getSession()`
3. Ambos podem chamar `setLoading(false)`

O cenario de race condition: se `onAuthStateChange` dispara ANTES de `getSession()` resolver, o estado pode ficar inconsistente por um frame. Na pratica, o `useRef(currentUserIdRef)` ja protege contra duplicacao de user, e o `setLoading(false)` em ambos os caminhos garante que o loading sempre resolve.

Porem, existe um cenario sutil: se `getSession()` retorna `null` (sem sessao) e `setLoading(false)` e chamado, e entao `onAuthStateChange` dispara com uma sessao (token refreshed), o usuario pode ver um flash de "nao autenticado" antes de ver o conteudo.

**Correcao proposta**: Adicionar um flag `initialSessionChecked` via `useRef` para garantir que `setLoading(false)` so e chamado APOS `getSession()` resolver, e que `onAuthStateChange` so atualiza o loading se a sessao inicial ja foi verificada.

**Viabilidade**: Alta. Mudanca isolada no AuthContext, sem impacto em outros componentes.

---

## Plano de Correcao

### Etapa 1 — StrictMode + AuthProvider (rapido, baixo risco)

**1.1 — Adicionar React.StrictMode no main.tsx**
- Envolver `<AuthProvider>` com `<StrictMode>`

**1.2 — Corrigir race condition no AuthProvider**
- Adicionar `useRef<boolean>(false)` para `initialSessionChecked`
- `onAuthStateChange`: so chama `setLoading(false)` se `initialSessionChecked.current === true`
- `getSession().then()`: seta `initialSessionChecked.current = true` e chama `setLoading(false)`
- Isso garante a ordem: getSession resolve primeiro, listener atualiza depois

### Etapa 2 — Otimizacoes de Build no Vite

**2.1 — Adicionar manualChunks no vite.config.ts**
- Separar vendors em chunks: react, ui (radix), editor (tiptap), supabase, motion, charts
- Isso melhora cache do navegador e reduz re-downloads em atualizacoes

### Etapa 3 — Migrar ChannelPostDetail e PodcastDetail para React Query

**3.1 — Criar hook `useChannelPostDetail(postId)`**
- Mover `fetchPost`, `fetchMedia`, `fetchComments`, `checkUserLiked` para um unico hook React Query
- Paralelizar queries com `Promise.all()`
- Eliminar `useState/useEffect` manuais do componente

**3.2 — Criar hook de engagement+comments para PodcastDetail**
- `PodcastDetail` ja usa `usePodcastBySlug()` para dados basicos
- Criar `usePodcastEngagement(podcastId)` para likes, saves, e comments
- Ou integrar no hook existente `usePodcasts.ts`

### Detalhes Tecnicos

**AuthProvider corrigido (pseudocodigo)**:
```text
const initialSessionChecked = useRef(false);

onAuthStateChange((event, session) => {
  setSession(session);
  if (newUserId !== currentUserIdRef.current) {
    currentUserIdRef.current = newUserId;
    setUser(session?.user ?? null);
  }
  // So resolve loading se getSession ja rodou
  if (initialSessionChecked.current) {
    setLoading(false);
  }
});

getSession().then(({ data: { session } }) => {
  setSession(session);
  // ...user logic...
  initialSessionChecked.current = true;
  setLoading(false);
});
```

**manualChunks (vite.config.ts)**:
```text
manualChunks(id) {
  if (id.includes('node_modules')) {
    if (id.includes('react-dom') || id.includes('react-router')) return 'vendor-react';
    if (id.includes('@radix-ui')) return 'vendor-ui';
    if (id.includes('@tiptap')) return 'vendor-editor';
    if (id.includes('@supabase')) return 'vendor-supabase';
    if (id.includes('framer-motion')) return 'vendor-motion';
    if (id.includes('recharts')) return 'vendor-charts';
  }
}
```

**useChannelPostDetail hook**: Seguira o mesmo padrao do `usePostDetail` ja implementado — uma unica queryFn que faz todas as queries em paralelo e retorna um objeto unificado com post, media, comments, likes, e estado de like do usuario.
