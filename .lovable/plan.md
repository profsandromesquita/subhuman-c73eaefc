

# Melhorias na Experiencia de Podcast: Progresso, Retomada e Status Visual

## Problemas Identificados

1. Os hooks `useTrackPodcastListen` e `useListenedPodcasts` usam `as any` no nome da tabela `podcast_listens`, mesmo ela existindo nos types gerados. Isso pode causar falhas silenciosas.
2. `useListenedPodcasts` so busca podcasts com `completed = true`, ignorando os em progresso.
3. O `PodcastPlayer` nao carrega o progresso salvo ao abrir — sempre comeca do zero.
4. O `PodcastCard` nao mostra barra de progresso visual — so tem o check verde (que depende de dados que podem nao estar chegando).

## Solucao

### 1. Corrigir hooks em `src/hooks/usePodcasts.ts`

- Remover `as any` de todas as referencias a `podcast_listens` (a tabela ja existe nos types)
- Alterar `useListenedPodcasts` para buscar TODOS os registros do usuario (nao apenas `completed = true`), retornando `podcast_id`, `completed` e `progress_seconds`
- Criar novo hook `usePodcastProgress(podcastId)` que busca o progresso salvo de um episodio especifico (para usar no player ao abrir)

### 2. Retomar de onde parou no `PodcastPlayer`

- Adicionar novo hook `usePodcastProgress` que busca `progress_seconds` do banco
- No `PodcastPlayer`, receber `initialProgress` como prop
- No `PodcastDetail`, buscar o progresso salvo e passa-lo ao player
- No `useEffect` de `loadedmetadata`, setar `audio.currentTime` para o progresso salvo (se existir e nao for completo)

### 3. Barra de progresso visual no `PodcastCard`

- Receber `progressPercent` (0-100) como prop no `PodcastCard`
- Mostrar uma barra fina (h-1) na parte inferior do card indicando quanto foi ouvido
- Se `completed`, mostrar o check verde (ja implementado)
- Se em progresso (progressPercent > 0 e < 100), mostrar a barra parcial

### 4. Integrar tudo na pagina `Podcasts.tsx`

- Alterar `useListenedPodcasts` para retornar todos os registros (com e sem completed)
- Construir mapa de progresso por podcast_id
- Passar `progressPercent` e `isListened` para cada `PodcastCard`

---

## Detalhes Tecnicos

### Arquivos alterados

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/usePodcasts.ts` | Remover `as any`, alterar `useListenedPodcasts` para buscar todos, criar `usePodcastProgress` |
| `src/components/podcast/PodcastCard.tsx` | Adicionar prop `progressPercent` e barra visual de progresso |
| `src/components/podcast/PodcastPlayer.tsx` | Aceitar `initialProgress` e setar currentTime no load |
| `src/pages/PodcastDetail.tsx` | Buscar progresso salvo e passar ao player |
| `src/pages/Podcasts.tsx` | Calcular e passar progressPercent para cada card |

### Hook `usePodcastProgress`
```typescript
export function usePodcastProgress(podcastId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["podcast-progress", podcastId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("podcast_listens")
        .select("progress_seconds, completed")
        .eq("user_id", user!.id)
        .eq("podcast_id", podcastId!)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!podcastId,
  });
}
```

### Barra de progresso no PodcastCard
Uma barra fina colorida (bg-blue-500 ou bg-green-500 se completo) na base do card, ocupando a porcentagem correspondente da largura.

### Retomada no PodcastPlayer
```typescript
// Ao carregar o audio, setar posicao inicial
const handleLoadedMetadata = () => {
  setDuration(audio.duration);
  if (initialProgress && initialProgress > 0 && initialProgress < audio.duration - 5) {
    audio.currentTime = initialProgress;
    setCurrentTime(initialProgress);
  }
};
```

