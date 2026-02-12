
# Correção: Avatar e Nome Clicável nos Comentários

## Problemas Identificados

### 1. Avatar não aparece nos comentários de artigos
- O hook `usePostDetail.ts` busca apenas `id, full_name` dos perfis dos comentaristas (linha 128) -- falta `avatar_url`
- O componente `CommentItem` não recebe nem renderiza avatar -- usa sempre o ícone genérico `User`
- O componente `CommentSection` também não passa dados de avatar

### 2. Nome do comentarista não é clicável (artigos)
- Em `CommentItem.tsx` linha 131: `<span className="font-semibold text-sm">{authorName}</span>` -- texto puro, sem interatividade
- Não há integração com `AuthorModal` para mostrar o card do perfil

### 3. Nome do comentarista não é clicável (canais)
- Em `ChannelPostDetail.tsx` linha 254: `<span className="text-sm font-medium">{comment.author_name}</span>` -- texto puro
- Já tem o avatar renderizado corretamente (Avatar com `comment.author_avatar`)

---

## Plano de Correção

### Etapa 1: Buscar avatar_url no hook de artigos

**Arquivo: `src/hooks/usePostDetail.ts`**

- Linha 128: Alterar query de `"id, full_name"` para `"id, full_name, avatar_url"`
- Linha 136: Alterar o `profilesMap` para guardar `{ full_name, avatar_url }` em vez de apenas `full_name`
- Alterar o tipo `PostComment` para incluir `avatarUrl?: string | null`
- Mapear `avatar_url` ao construir cada comentário

### Etapa 2: Adicionar avatar e nome clicável no CommentItem

**Arquivo: `src/components/post/CommentItem.tsx`**

- Adicionar prop `avatarUrl?: string | null` na interface
- Substituir o ícone `User` genérico por `Avatar` + `AvatarImage` + `AvatarFallback` (mesmo padrão do ChannelPostDetail)
- Tornar o nome clicável: ao clicar, buscar perfil no banco e abrir `AuthorModal`
- Importar `AuthorModal`, `Avatar`, `AvatarImage`, `AvatarFallback` e `supabase`

### Etapa 3: Propagar avatarUrl pelo CommentSection

**Arquivo: `src/components/post/CommentSection.tsx`**

- Adicionar `avatarUrl?: string | null` nas interfaces `Comment` e `Reply`
- Passar `avatarUrl` para o componente `CommentItem`

### Etapa 4: Nome clicável nos comentários dos canais

**Arquivo: `src/pages/ChannelPostDetail.tsx`**

- Na função `renderComment` (linha 254): Substituir o `<span>` do nome do autor por um `<button>` que busca o perfil pelo `user_id` e abre o `AuthorModal`

---

## Resumo das Alterações

| Arquivo | O que muda |
|---------|------------|
| `src/hooks/usePostDetail.ts` | Buscar `avatar_url` dos perfis; incluir no PostComment |
| `src/components/post/CommentSection.tsx` | Adicionar `avatarUrl` nas interfaces e propagar para CommentItem |
| `src/components/post/CommentItem.tsx` | Renderizar Avatar real; nome clicável com AuthorModal |
| `src/pages/ChannelPostDetail.tsx` | Nome do comentarista clicável com AuthorModal |
