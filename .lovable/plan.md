
# Plano de Correção: Atualização Automática de Cards de Artigos

## Diagnóstico Completo

### Causa Raiz Identificada

O problema tem **duas causas principais**:

**1. Falta de Invalidação de Cache nas Mutações de Space Updates**

A página `PostDetail.tsx` (artigos de espaços) usa chamadas diretas ao Supabase e estado local, sem utilizar o React Query para mutações. Quando o usuário curte ou comenta:

```typescript
// PostDetail.tsx - linha 257-287
const handleLikeToggle = async () => {
  // Atualiza apenas estado LOCAL
  setIsLiked(!isLiked);
  setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
  
  // Faz a mutação no banco
  await supabase.from("update_likes").insert/delete(...)
  
  // ❌ NÃO invalida o cache do React Query
}
```

**2. Configuração do Cache Impede Refetch Automático**

```typescript
// src/lib/queryClient.ts
{
  staleTime: 1000 * 60 * 5,        // 5 min - dados "frescos"
  refetchOnWindowFocus: false,     // ❌ Não atualiza ao voltar
}
```

Resultado: Os dados ficam em cache por 5 minutos e não são revalidados quando o usuário navega de volta para a Home.

### Comparativo: Canais vs Espaços

| Funcionalidade | Channel Posts | Space Updates |
|----------------|---------------|---------------|
| Hook de like | `useLikeChannelPost()` | ❌ Nenhum |
| Invalidação de cache | ✅ Sim | ❌ Não |
| Atualiza listagens | ✅ Sim | ❌ Não |

---

## Solução Proposta

### Estratégia Multi-Camada

1. **Criar hooks de mutação para Space Updates** (similar aos Channel Posts)
2. **Invalidar cache nas páginas de detalhe após interações**
3. **Habilitar `refetchOnWindowFocus` para queries críticas**
4. **Implementar Pull-to-Refresh na Home** (opcional, segunda fase)

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/hooks/usePosts.ts` | Adicionar `useLikeSpaceUpdate` e `useCommentSpaceUpdate` |
| `src/pages/PostDetail.tsx` | Usar os novos hooks com invalidação |
| `src/pages/ChannelPostDetail.tsx` | Adicionar invalidação de cache nas interações |
| `src/lib/queryClient.ts` | Ajustar `refetchOnWindowFocus` seletivamente |

---

## Implementação Detalhada

### 1. Novos Hooks em `usePosts.ts`

```typescript
// Hook para curtir space update (artigo)
export function useLikeSpaceUpdate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ updateId, isLiked }: { updateId: string; isLiked: boolean }) => {
      if (!user) throw new Error("User not authenticated");

      if (isLiked) {
        await supabase
          .from("update_likes")
          .delete()
          .eq("update_id", updateId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("update_likes")
          .insert({ update_id: updateId, user_id: user.id });
      }
    },
    onSuccess: () => {
      // Invalida todas as queries que mostram contagem de likes
      queryClient.invalidateQueries({ queryKey: ["highlights"] });
      queryClient.invalidateQueries({ queryKey: ["space-updates"] });
    },
  });
}

// Hook para adicionar comentário em space update
export function useAddSpaceUpdateComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      updateId,
      content,
      parentId,
    }: {
      updateId: string;
      content: string;
      parentId?: string;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("update_comments").insert({
        update_id: updateId,
        user_id: user.id,
        content,
        parent_id: parentId || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["highlights"] });
      queryClient.invalidateQueries({ queryKey: ["space-updates"] });
    },
  });
}
```

### 2. Atualizar `PostDetail.tsx`

Substituir as chamadas diretas ao Supabase pelos hooks:

```typescript
// Antes (linha 257-287)
const handleLikeToggle = async () => {
  setIsLiked(!isLiked);
  await supabase.from("update_likes")...
}

// Depois
const likeMutation = useLikeSpaceUpdate();

const handleLikeToggle = async () => {
  // Optimistic update local
  setIsLiked(!isLiked);
  setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

  try {
    await likeMutation.mutateAsync({ 
      updateId: postId!, 
      isLiked 
    });
  } catch (error) {
    // Rollback
    setIsLiked(isLiked);
    setLikesCount(prev => isLiked ? prev + 1 : prev - 1);
  }
};
```

Da mesma forma para `handleSubmitComment`:

```typescript
const commentMutation = useAddSpaceUpdateComment();

const handleSubmitComment = async (content: string, parentId?: string) => {
  await commentMutation.mutateAsync({
    updateId: postId!,
    content,
    parentId,
  });
  await fetchComments();
};
```

### 3. Atualizar `ChannelPostDetail.tsx`

Adicionar invalidação para `recent-discussions` após interações:

```typescript
import { useQueryClient } from "@tanstack/react-query";

// Dentro do componente
const queryClient = useQueryClient();

const handleLikePost = async () => {
  // ... código existente de like ...
  
  // Adicionar no final:
  queryClient.invalidateQueries({ queryKey: ["recent-discussions"] });
  queryClient.invalidateQueries({ queryKey: ["channel-posts"] });
};

const handleSubmitComment = async () => {
  // ... código existente ...
  
  // Adicionar após sucesso:
  queryClient.invalidateQueries({ queryKey: ["recent-discussions"] });
};
```

### 4. Habilitar Refetch Seletivo no `queryClient.ts`

Em vez de mudar o padrão global, podemos adicionar opções nos hooks específicos que precisam de dados mais frescos:

```typescript
// Em useHighlights()
return useQuery({
  queryKey: ["highlights", user?.id],
  queryFn: async () => { ... },
  enabled: !!user,
  refetchOnWindowFocus: true,  // ADICIONAR
  staleTime: 1000 * 60 * 2,    // Reduzir para 2 minutos
});

// Em useRecentDiscussions()
return useQuery({
  queryKey: ["recent-discussions", user?.id],
  queryFn: async () => { ... },
  enabled: !!user,
  refetchOnWindowFocus: true,  // ADICIONAR
  staleTime: 1000 * 60 * 2,    // Reduzir para 2 minutos
});
```

---

## Fluxo Após Correção

```text
1. Usuário abre artigo
   ↓
2. Curte o artigo (handleLikeToggle)
   ↓
3. useLikeSpaceUpdate.mutateAsync() executa
   ↓
4. onSuccess: queryClient.invalidateQueries(["highlights"])
   ↓
5. Usuário volta para Home
   ↓
6. useHighlights() detecta dados stale
   ↓
7. Refetch automático busca dados atualizados
   ↓
8. Card mostra contagem correta ✓
```

---

## Resumo das Mudanças

| Arquivo | Linhas Aprox. | Mudanças |
|---------|---------------|----------|
| `src/hooks/usePosts.ts` | +50 | 2 novos hooks de mutação |
| `src/pages/PostDetail.tsx` | ~30 | Usar hooks + invalidação |
| `src/pages/ChannelPostDetail.tsx` | ~15 | Adicionar invalidação |
| | | (opcional: refetchOnWindowFocus nos hooks) |

---

## Resultado Esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Curtir artigo e voltar | Card mostra contagem antiga | Card atualizado |
| Comentar e voltar | Card mostra contagem antiga | Card atualizado |
| Pull-to-refresh | Não funciona | Dados atualizados (com refetch) |
| Navegar entre telas | Cache de 5 min | Invalidação imediata |

---

## Seção Técnica

### Queries Afetadas

As seguintes query keys serão invalidadas após interações:

**Para Space Updates:**
- `["highlights", userId]`
- `["space-updates", spaceId, userId]`

**Para Channel Posts:**
- `["channel-posts", channelId, userId]`
- `["recent-discussions", userId]`

### Considerações de Performance

A invalidação seletiva garante que apenas as queries relevantes sejam refetchadas, evitando requisições desnecessárias. O `staleTime` de 2 minutos para queries da Home é um bom equilíbrio entre performance e dados frescos.
