

# Correcao: "Em alta nos canais" sempre vazio

## Causa raiz

A query `useRecentDiscussions` (linha 290 de `src/hooks/usePosts.ts`) usa um join PostgREST que nao funciona:

```typescript
profiles:author_id(full_name)
```

A tabela `channel_posts` **nao possui nenhuma foreign key** definida (nem para `profiles`, nem para `channels`). Quando o PostgREST tenta resolver esse join, retorna um erro 400 (relationship not found). O `try/catch` implicito do React Query captura o erro e a query retorna vazio. Resultado: o estado vazio "Nenhuma discussao em alta no momento" e exibido permanentemente.

O hook `useChannelPosts` (que funciona na pagina Canais) **nao usa esse join** -- ele busca profiles separadamente via `.in("id", authorIds)`, por isso funciona.

Alem disso, o `channels!inner(name, slug)` tambem pode falhar pela mesma razao (sem FK), porem o PostgREST pode inferi-lo pelo nome da tabela se houver uma relacao implicita. De qualquer forma, a abordagem segura e buscar separadamente.

## Solucao

### 1. Refatorar `useRecentDiscussions` (`src/hooks/usePosts.ts`)

**Remover os joins problematicos** e buscar profiles e channels separadamente (mesmo padrao do `useChannelPosts` que ja funciona):

```typescript
// ANTES (quebrado):
.select(`
  id, title, content, created_at, channel_id, author_id,
  channels!inner(name, slug),
  profiles:author_id(full_name)
`)

// DEPOIS (funcional):
.select("id, title, content, created_at, channel_id, author_id")
```

Depois, buscar profiles e channels em paralelo:

```typescript
const authorIds = [...new Set(posts.map(p => p.author_id).filter(Boolean))];
const channelIds = [...new Set(posts.map(p => p.channel_id))];

const [profilesResult, channelsResult, statsResult, mediaResult, userLikesResult] = 
  await Promise.all([
    authorIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", authorIds)
      : Promise.resolve({ data: [] }),
    supabase.from("channels").select("id, name, slug").in("id", channelIds),
    // ... stats, media, likes (sem alteracao)
  ]);
```

### 2. Adicionar logica de fallback

Se nenhum post tiver engajamento (likes + comments > 0), a query ja retorna os mais recentes por ordem cronologica (o sort atual faz isso como desempate). O problema real e a query falhando, nao a logica de ranking.

Porem, para garantir que a secao **nunca fique vazia** enquanto existirem posts, adicionar um fallback:

- Se a busca dos ultimos 30 dias retornar vazio, repetir sem filtro de data (buscar os 5 mais recentes de qualquer epoca).
- Se ainda assim nao houver posts, ai sim exibir o estado vazio.

### 3. Tornar a secao visivel para usuarios nao logados

Atualmente `enabled: !!user` (linha 356) impede a query para visitantes. Mudar para `enabled: true` e simplesmente nao buscar `user likes` se nao houver usuario. Isso permite que visitantes vejam a atividade da comunidade (engajamento).

**Nota sobre RLS**: A tabela `channel_posts` ja tem a policy "Anyone can view non-moderated posts" com `USING (is_moderated = false)`, entao posts de canais com `access_type = 'subscribers'` sao visiveis na listagem. O controle de acesso ao conteudo completo e feito no `ChannelDetail`, nao na listagem da Home. Isso e aceitavel para a secao "Em alta" que mostra apenas titulo e preview.

## Arquivos a editar

1. **`src/hooks/usePosts.ts`** (funcao `useRecentDiscussions`, linhas 276-360):
   - Remover joins de `channels` e `profiles` do select
   - Buscar profiles e channels separadamente em paralelo
   - Adicionar fallback: se 30 dias vazio, buscar sem filtro de data
   - Mudar `enabled: !!user` para `enabled: true`
   - Ajustar `is_liked` para retornar `false` quando nao ha usuario

2. **`src/pages/Home.tsx`** (linhas 222-230):
   - Remover o bloco que exige login para ver discussoes (ja que agora funciona sem usuario)
   - Manter o restante da renderizacao inalterado

## Impacto

- Nenhuma migration de banco necessaria (o problema e no frontend)
- Nenhuma alteracao de RLS necessaria
- A pagina Canais continua funcionando como antes (usa `useChannelPosts`, nao afetado)
- Adiciona ~1 query extra (channels) mas remove 2 joins problematicos, resultando em mais estabilidade

