
# Plano de Otimização de Performance

## Diagnóstico Completo

Após análise detalhada do código, identifiquei **5 causas principais** da lentidão nas páginas `/home`, `/spaces/*`, `/podcasts` e `/channels`:

---

## Problema 1: Requisições em Cascata (Waterfall Requests)

### Descrição
As páginas executam múltiplas requisições sequenciais que dependem umas das outras, criando um efeito cascata:

**Home.tsx (linha 30-33):**
```typescript
const { data: highlights } = useHighlights();      // Espera auth
const { data: discussions } = useRecentDiscussions(); // Espera auth
const { data: subscribedSpaces } = useSubscribedSpaces(); // Espera auth
const { data: unreadCount } = useUnreadNotificationsCount(); // Espera auth
```

**useHighlights (usePosts.ts linha 100-188):**
1. Busca inscrições do usuário
2. Depois busca updates dos espaços
3. Depois busca likes/comments (2 queries paralelas)
4. **Total: 4 requisições em cascata**

**useChannels (useChannels.ts linha 19-89):**
1. Busca plano do usuário
2. Depois busca canais
3. Depois busca todos os posts para calcular estatísticas
4. **Total: 3 requisições em cascata**

### Impacto
Cada requisição adiciona ~100-300ms de latência. Cascatas de 3-4 níveis resultam em 500ms-1.2s apenas para dados.

---

## Problema 2: Cálculo de Estatísticas Ineficiente no Cliente

### Descrição
O hook `useChannels` busca **até 1000 posts** apenas para contar membros e posts por canal:

**useChannels.ts (linha 48-61):**
```typescript
const { data: allPosts } = await supabase
  .from("channel_posts")
  .select("id, channel_id, author_id, created_at")
  .in("channel_id", channelIds)
  .limit(1000);  // Baixa 1000 registros para contar no JS
```

### Impacto
- Transferência desnecessária de dados (pode ser >100KB)
- Processamento pesado no cliente para contagens

---

## Problema 3: Animações Staggered Excessivas

### Descrição
Cada card tem animação individual com delay incremental:

**Home.tsx (linha 177-178):**
```typescript
<motion.div
  transition={{ delay: 0.1 + index * 0.05 }}
```

**Channels.tsx (linha 106):**
```typescript
transition={{ delay: index * 0.05 }}
```

### Impacto
Com 10 itens: último card só aparece após 500ms+ de delays acumulados. Manipulação frequente do DOM (visível no session_replay).

---

## Problema 4: Página Spaces.tsx Não Usa React Query

### Descrição
A página Spaces usa `useEffect` + `useState` ao invés de React Query:

**Spaces.tsx (linha 33-58):**
```typescript
useEffect(() => {
  fetchSpaces();
}, []);
// ...
const fetchSpaces = async () => { ... setSpaces(data) }
```

### Impacto
- Sem cache entre navegações
- Recarrega dados toda vez que a página é acessada
- Não se beneficia do staleTime de 5 minutos configurado

---

## Problema 5: useSubscription Não Usa React Query

### Descrição
O hook `useSubscription` usa `useState` + `useEffect` manual:

**useSubscription.ts (linha 19-127):**
```typescript
const [status, setStatus] = useState(...);
const [hasChecked, setHasChecked] = useState(false);
// ...
useEffect(() => {
  checkSubscription();
}, [...]);
```

### Impacto
- AppLayout carrega esse hook em TODA página
- Sem cache = requisição repetida em cada navegação
- Bloqueia renderização até `hasChecked = true`

---

## Plano de Otimização

### Fase 1: Migrar para React Query (Alto Impacto)

#### 1.1 Refatorar `useSubscription`
**Arquivo:** `src/hooks/useSubscription.ts`

Substituir implementação manual por React Query:
```typescript
export function useSubscription() {
  const { user } = useAuth();
  
  const { data, isLoading } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan_type, status, expires_at')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return sub;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
  // Calcular status derivado...
}
```

#### 1.2 Refatorar página `Spaces.tsx`
**Arquivo:** `src/pages/Spaces.tsx`

Substituir `useEffect` + `useState` por:
```typescript
const { data: spaces, isLoading } = useSpaces();
const { data: subscriptions } = useUserSpaceSubscriptions();
```

Criar novo hook `useUserSpaceSubscriptions` em `useSpaces.ts`.

### Fase 2: Mover Cálculos para o Banco (Alto Impacto)

#### 2.1 Criar View para Estatísticas de Canais
**Tipo:** Migration SQL

```sql
CREATE VIEW channel_stats AS
SELECT 
  channel_id,
  COUNT(DISTINCT id) as posts_count,
  COUNT(DISTINCT author_id) as members_count,
  MAX(created_at) as last_activity
FROM channel_posts
WHERE is_moderated = false
GROUP BY channel_id;
```

#### 2.2 Otimizar `useChannels`
**Arquivo:** `src/hooks/useChannels.ts`

Usar JOIN com a view ao invés de buscar 1000 posts:
```typescript
const { data } = await supabase
  .from("channels")
  .select(`
    *,
    stats:channel_stats(posts_count, members_count, last_activity)
  `)
  .eq("is_active", true);
```

### Fase 3: Reduzir Cascatas (Médio Impacto)

#### 3.1 Otimizar `useHighlights`
**Arquivo:** `src/hooks/usePosts.ts`

Combinar queries usando JOINs:
```typescript
const { data } = await supabase
  .from("space_updates")
  .select(`
    id, title, thumbnail_url, published_at, space_id,
    spaces!inner(name, slug),
    likes:update_likes(count),
    comments:update_comments(count)
  `)
  .in("space_id", spaceIds)
  .eq("is_published", true);
```

**Nota:** Requer verificar se o Supabase suporta agregação inline; caso contrário, manter batch mas em paralelo.

#### 3.2 Paralelizar Requisições na Home
**Arquivo:** `src/pages/Home.tsx`

As queries já são paralelas pelo React Query, mas podemos usar `useQueries` para agrupamento:
```typescript
const results = useQueries({
  queries: [
    { queryKey: ["highlights"], queryFn: ... },
    { queryKey: ["discussions"], queryFn: ... },
    { queryKey: ["subscribed-spaces"], queryFn: ... },
  ]
});
```

### Fase 4: Otimizar Animações (Médio Impacto)

#### 4.1 Limitar Animações Staggered
**Arquivos:** `Home.tsx`, `Channels.tsx`, `SpaceDetail.tsx`, `Spaces.tsx`

Alterar de:
```typescript
transition={{ delay: index * 0.05 }}
```

Para (máximo de 3-5 itens animados):
```typescript
transition={{ delay: Math.min(index, 4) * 0.03 }}
```

Ou usar `AnimatePresence` com `mode="popLayout"` para animações mais suaves.

#### 4.2 Usar `will-change` para Performance de GPU
**Arquivo:** `src/index.css`

Adicionar para elementos que animam frequentemente:
```css
.animate-card {
  will-change: transform, opacity;
}
```

### Fase 5: Prefetch e Preload (Baixo Impacto, Boa UX)

#### 5.1 Prefetch em Hover
**Arquivo:** `src/components/BottomNav.tsx`

```typescript
const prefetchSpaces = () => {
  queryClient.prefetchQuery({
    queryKey: ["spaces"],
    queryFn: fetchSpaces,
  });
};

<NavLink onMouseEnter={prefetchSpaces} to="/spaces">
```

---

## Resumo das Alterações

| Arquivo | Tipo de Alteração |
|---------|-------------------|
| `src/hooks/useSubscription.ts` | Refatorar para React Query |
| `src/pages/Spaces.tsx` | Refatorar para usar hooks existentes |
| `src/hooks/useSpaces.ts` | Adicionar hook `useUserSpaceSubscriptions` |
| `src/hooks/useChannels.ts` | Otimizar query com view/agregação |
| `src/hooks/usePosts.ts` | Combinar queries em `useHighlights` |
| `src/pages/Home.tsx` | Reduzir delays de animação |
| `src/pages/Channels.tsx` | Reduzir delays de animação |
| `src/pages/SpaceDetail.tsx` | Reduzir delays de animação |
| Migration SQL | Criar view `channel_stats` |

## Impacto Esperado

| Métrica | Antes | Depois |
|---------|-------|--------|
| Tempo de carregamento inicial | ~2-3s | ~800ms-1.2s |
| Requisições em cascata | 4-5 níveis | 1-2 níveis |
| Dados transferidos (Channels) | ~100KB+ | ~10KB |
| Re-fetch em navegação | Sempre | Apenas se stale |
| Tempo para interatividade | ~2s | ~600ms |
