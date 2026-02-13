

# Correcao: Inconsistencia de Like na Home (Destaques)

## Causa raiz

A query `useHighlights` em `src/hooks/usePosts.ts` busca contagens de likes/comentarios da view `space_update_stats`, mas nunca consulta a tabela `update_likes` para verificar se o usuario logado curtiu cada post. O campo `is_liked` (que ja existe na interface `SpaceUpdate`) nunca e preenchido -- fica `undefined`.

Na Home (`src/pages/Home.tsx`), o icone Heart e renderizado sempre com estilo outline (linha 172), sem considerar `is_liked`.

## Solucao

### 1. Ajustar a query `useHighlights` (`src/hooks/usePosts.ts`, linhas 137-165)

Apos buscar os `updateIds`, adicionar uma consulta a tabela `update_likes` filtrando pelo `user.id`:

```typescript
// Fetch user's likes
const { data: userLikes } = await supabase
  .from("update_likes")
  .select("update_id")
  .eq("user_id", user.id)
  .in("update_id", updateIds);

const likedSet = new Set((userLikes || []).map(l => l.update_id));
```

Depois, no `map` que monta `highlightsData`, adicionar:

```typescript
is_liked: likedSet.has(update.id),
```

### 2. Ajustar a renderizacao na Home (`src/pages/Home.tsx`, linhas 170-174)

Alterar o icone Heart para refletir o estado `is_liked`:

```tsx
<Heart 
  className={`h-3.5 w-3.5 ${highlight.is_liked ? 'text-red-500' : ''}`}
  weight={highlight.is_liked ? "fill" : "regular"}
/>
```

### 3. Aplicar a mesma correcao para Discussions (bonus)

Verificar se `useRecentDiscussions` tem o mesmo problema com `channel_post_likes` e corrigir da mesma forma.

## Arquivos a editar

1. `src/hooks/usePosts.ts` -- adicionar query de `update_likes` em `useHighlights` (e possivelmente `useRecentDiscussions`)
2. `src/pages/Home.tsx` -- usar `highlight.is_liked` para estilo do Heart (e `discussion.is_liked` se aplicavel)

## Impacto

- Nenhuma alteracao de schema ou migration necessaria
- A tabela `update_likes` ja tem RLS permitindo SELECT publico
- Adiciona apenas 1 query extra (leve, filtra por user_id + IN de IDs)
