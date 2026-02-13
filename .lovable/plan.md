
# Ajustes: Selos Premium e Filtros de Eventos

## Problema 1: Selos Premium nao aparecem

O componente `PremiumBadge` existe, e o `useUserAccess` retorna `hasPremiumBadge` para o usuario logado. Porem, os selos precisam aparecer para **outros** usuarios (autores de posts, comentaristas, resultados de busca). Atualmente, nenhum componente busca o plano de assinatura de outros usuarios para exibir o selo.

### Solucao

Criar um hook utilitario `useUserBadge(userId)` que consulta a tabela `subscriptions` para determinar se um usuario tem selo azul (yearly) ou dourado (lifetime). Depois, integrar o `PremiumBadge` nos 4 locais:

**Novo arquivo:** `src/hooks/useUserBadge.ts`
- Recebe um `userId` (string ou undefined)
- Faz query em `subscriptions` filtrando `user_id`, `status = 'active'`, `plan_type in ('yearly', 'lifetime')`
- Retorna `'blue' | 'gold' | null`
- Usa `staleTime` de 5 minutos para cache

**Arquivos modificados:**

1. **`src/components/post/PostContent.tsx`** (autor do artigo)
   - Importar `useUserBadge` e `PremiumBadge`
   - Chamar `useUserBadge(author?.id)` para obter o tipo de selo
   - Renderizar `PremiumBadge` ao lado do nome do autor na area de meta info

2. **`src/components/post/CommentItem.tsx`** (avatar dos comentarios)
   - Importar `useUserBadge` e `PremiumBadge`
   - Chamar `useUserBadge(userId)` para cada comentario
   - Renderizar `PremiumBadge` ao lado do nome do comentarista

3. **`src/pages/ChannelPostDetail.tsx`** (autor do post de canal + comentarios)
   - Para o autor do post: buscar badge via `useUserBadge(post.author_id)`
   - Para cada comentario no `renderComment`: criar um sub-componente `ChannelComment` que use `useUserBadge`
   - Renderizar `PremiumBadge` ao lado dos nomes

4. **`src/pages/Search.tsx`** (resultados de busca de usuarios)
   - Importar `useUserBadge` e `PremiumBadge`
   - Criar sub-componente `SearchResultCard` para cada resultado, que chama `useUserBadge` quando o tipo for "user"
   - Renderizar `PremiumBadge` ao lado do nome

5. **`src/components/post/AuthorModal.tsx`** (modal de perfil)
   - Importar `useUserBadge` e `PremiumBadge`
   - Chamar `useUserBadge(author.id)` dentro do modal
   - Renderizar `PremiumBadge` ao lado do nome no modal

---

## Problema 2: Filtros da pagina de Eventos

Atualmente os filtros usam chips horizontais (`FilterChips`). A solicitacao e mudar para menus suspensos (dropdowns/selects).

### Solucao

**Arquivo modificado:** `src/pages/Events.tsx`
- Remover o componente `FilterChips`
- Substituir os 3 blocos de filtros por 3 componentes `Select` (do Radix/shadcn) em uma linha horizontal
- Cada select tera as mesmas opcoes que os chips atuais:
  - Periodo: Todos, Futuros, Passados
  - Modalidade: Todos, Online, Presencial, Hibrido
  - Tipo: Todos, Workshop, Palestra, Live, Mentoria, Curso
- Estilizar com fundo `bg-card`, texto `text-foreground`, e borda `border-border`
- Garantir que o `SelectContent` tenha `bg-card` e `z-50` para nao ficar transparente

---

## Ordem de implementacao

1. Criar `useUserBadge.ts`
2. Integrar badge em `PostContent.tsx`, `CommentItem.tsx`, `AuthorModal.tsx`
3. Integrar badge em `ChannelPostDetail.tsx` (extrair sub-componente para comentarios)
4. Integrar badge em `Search.tsx` (extrair sub-componente)
5. Refatorar filtros em `Events.tsx` para dropdowns
