
# Correcao: Atualizacao de Posts Apos Publicacao nos Canais

## Causa Raiz

O arquivo `src/pages/CreateChannelPost.tsx` cria/edita posts e navega de volta para a pagina do canal, mas **nunca invalida o cache do React Query**. A query `useChannelPosts` (query key: `["channel-posts", channelId]`) usa o `staleTime` padrao de 5 minutos, entao o usuario ve dados antigos ate o cache expirar.

## Solucao

Invalidar as queries relevantes no `CreateChannelPost.tsx` imediatamente apos criar ou editar um post com sucesso, **antes** de navegar.

## Mudancas

**Arquivo**: `src/pages/CreateChannelPost.tsx`

1. Importar `useQueryClient` do `@tanstack/react-query`
2. Obter a instancia com `const queryClient = useQueryClient()`
3. Apos criar ou editar um post com sucesso, invalidar as queries:

```text
// Apos criacao bem-sucedida:
queryClient.invalidateQueries({ queryKey: ["channel-posts", channelId] });
queryClient.invalidateQueries({ queryKey: ["channels"] });
queryClient.invalidateQueries({ queryKey: ["recent-discussions"] });

// Apos edicao bem-sucedida:
queryClient.invalidateQueries({ queryKey: ["channel-posts", channelId] });
queryClient.invalidateQueries({ queryKey: ["channel-post-detail", postId] });
```

As invalidacoes sao chamadas **antes** do `navigate()` para garantir que quando o usuario chegar na pagina do canal, o React Query ja estara buscando dados frescos.

## Resumo

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/CreateChannelPost.tsx` | Adicionar invalidacao de cache apos criar/editar post |

Nenhum outro arquivo sera modificado.
