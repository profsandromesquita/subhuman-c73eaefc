

# Plano: Timeout + Retry no TTS, remover warm-up

## 1. `src/hooks/useArticleTTS.ts` — substituição completa

Reescrever com a função `fetchTTSWithRetry` que:
- Usa `AbortController` com timeout de 20s
- Retenta até 2x em caso de timeout (`AbortError`) ou erro de rede (`TypeError`)
- Log de retry no console
- Mantém blob + HTMLAudioElement, sem MediaSource

Resto do hook permanece igual (chunks, play/pause/stop, progress via `ontimeupdate`, cleanup).

## 2. `src/components/article/ArticleTTSPlayer.tsx` — remover warm-up

Remover o `useEffect` de warm-up (linhas ~22-42) e o import de `supabase` que só era usado por ele.

## Arquivos alterados

1. `src/hooks/useArticleTTS.ts` — substituição completa
2. `src/components/article/ArticleTTSPlayer.tsx` — remover useEffect warm-up + import supabase

