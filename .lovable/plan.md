

# Plano: Corrigir persistência de mídia na edição de publicação de canal

## Causa raiz

No `CreateChannelPost.tsx`, o modo de edição (linhas 148-168) atualiza apenas `title`, `content` e `updated_at` na tabela `channel_posts`. **A mídia não é tocada** — não há exclusão da mídia antiga nem inserção da nova na tabela `channel_post_media`. O usuário vê a troca na UI, mas ao salvar, a mídia antiga permanece no banco.

No modo de criação existe `saveMediaToPost`, mas não há equivalente para deletar e re-salvar no modo de edição.

## Correção

### 1. Adicionar função `deleteMediaFromPost` no `useMediaUpload.ts`

Similar ao existente `deleteMediaFromSpaceUpdate`:

```typescript
const deleteMediaFromPost = async (postId: string) => {
  await supabase.from("channel_post_media").delete().eq("post_id", postId);
};
```

### 2. Atualizar fluxo de edição no `CreateChannelPost.tsx`

Após o update do post (linha 157), adicionar:

```typescript
// Deletar mídia antiga e salvar nova
await deleteMediaFromPost(postId);
if (media.length > 0) {
  await saveMediaToPost(postId, media);
}
```

### Arquivos impactados

| Arquivo | Alteração |
|---|---|
| `src/hooks/useMediaUpload.ts` | Adicionar `deleteMediaFromPost` e exportá-la |
| `src/pages/CreateChannelPost.tsx` | Chamar delete + save de mídia no bloco de edição |

### Risco
Baixo. A abordagem "delete all + re-insert" é a mesma usada para `space_update_media`. A RLS já permite que o autor delete suas próprias mídias.

