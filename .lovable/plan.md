
# Ajustes nos cards de podcast e cor de curtida nos canais

## Problemas identificados

1. **Cache desatualizado**: Ao curtir/comentar um podcast e voltar para `/podcasts`, os contadores nos cards nao atualizam porque as mutations em `usePodcasts.ts` (`useLikePodcast`, `useAddPodcastComment`) nao invalidam a query `podcast-stats`.

2. **Coracao sem cor vermelha**: O `PodcastCard` nao recebe informacao de `isLiked` do usuario, e o icone Heart nao tem estilo condicional vermelho.

3. **Icones so aparecem com interacao**: A logica atual no `PodcastCard` esconde os icones quando `likesCount` e `commentsCount` sao ambos 0. Devem sempre aparecer.

4. **Cor da curtida nos canais**: Em `ChannelDetail.tsx` (linha 260), o coracao preenchido nao tem `text-red-500`, ficando cinza.

## Alteracoes

### 1. `src/hooks/usePodcasts.ts` - Invalidar cache de stats

Nas mutations `useLikePodcast` e `useAddPodcastComment`, adicionar invalidacao da query `podcast-stats` no `onSuccess`:

```typescript
queryClient.invalidateQueries({ queryKey: ["podcast-stats"] });
```

### 2. `src/hooks/usePodcastStats.ts` - Incluir estado `isLiked` do usuario

Adicionar busca de quais podcasts o usuario logado curtiu, retornando `isLiked` junto com os contadores no Map.

### 3. `src/components/podcast/PodcastCard.tsx` - Tres ajustes

- Adicionar prop `isLikedByUser` (opcional, boolean)
- Remover a condicao que esconde os icones quando ambos sao 0 -- sempre renderizar Heart e ChatCircle com seus valores (mesmo que 0)
- Aplicar `text-red-500` e `weight="fill"` no Heart quando `isLikedByUser` for true

### 4. `src/pages/Podcasts.tsx` - Passar `isLikedByUser`

Passar a nova prop do stats para cada PodcastCard.

### 5. `src/pages/ChannelDetail.tsx` - Cor vermelha no coracao

Na linha 260, adicionar classe condicional `text-red-500` quando `post.is_liked` for true:

```tsx
<Heart className={`w-4 h-4 ${post.is_liked ? 'text-red-500' : ''}`} weight={post.is_liked ? "fill" : "regular"} />
```

## Resumo dos arquivos alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/usePodcasts.ts` | Invalidar `podcast-stats` nas mutations de like e comment |
| `src/hooks/usePodcastStats.ts` | Adicionar `isLiked` por usuario no retorno |
| `src/components/podcast/PodcastCard.tsx` | Sempre mostrar icones, cor vermelha no like |
| `src/pages/Podcasts.tsx` | Passar `isLikedByUser` ao PodcastCard |
| `src/pages/ChannelDetail.tsx` | Coracao vermelho quando curtido |
