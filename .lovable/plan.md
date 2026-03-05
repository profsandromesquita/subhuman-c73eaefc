

# Plano: Liberar curtida para usuarios Freemium

## Diagnostico

O bloqueio esta em `src/hooks/useUserAccess.ts`, linha 34: `canLike: false` no tier `freemium`. Isso impacta:

1. **Artigos** (`src/pages/PostDetail.tsx`, linha 285): usa `canLike` para decidir se chama `handleLikeToggle` ou `showAccessPrompt`
2. **Canais** (`src/pages/ChannelPostDetail.tsx`, linha 486): usa `canLike` para decidir se chama `handleLikePost` ou mostra toast de erro
3. **Podcasts** (`src/pages/PodcastDetail.tsx`): nao usa `canLike` — ja permite curtir para qualquer usuario logado (sem restricao)

## Alteracao necessaria

**Unico arquivo**: `src/hooks/useUserAccess.ts`

Alterar linha 34 de `canLike: false` para `canLike: true` no tier `freemium`.

Tambem alterar o tier `student` (linha 64) de `canLike: false` para `canLike: true`, ja que segue a mesma logica de usuario sem assinatura mas com acesso parcial.

Nenhuma outra alteracao e necessaria — os componentes ja consomem `canLike` corretamente e vao respeitar o novo valor automaticamente. As RLS policies do banco ja permitem que qualquer usuario autenticado insira e delete likes.

## Impacto

- Apenas a permissao `canLike` muda para `freemium` e `student`
- Nenhuma outra permissao e alterada
- Nenhum outro arquivo precisa ser modificado

