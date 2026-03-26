

# Plano: Warm-up + Streaming no TTS

## 1. `src/components/article/ArticleTTSPlayer.tsx`

- Adicionar `import { supabase } from "@/integrations/supabase/client"`
- Adicionar `useEffect` de warm-up após linha 18 (após `useIsMobile`): faz `setTimeout` de 1s, então envia `{ text: ' ' }` para a Edge Function com JWT. Falha silenciosa. Cleanup cancela o timer.

## 2. `src/hooks/useArticleTTS.ts`

Substituir `generateAndPlayChunk` (linhas 90-155) pela versão com MediaSource:

- Se `MediaSource` disponível e suporta `audio/mpeg` e `response.body` existe:
  - Cria `MediaSource` → `URL.createObjectURL` → `new Audio(url)`
  - No `sourceopen`: cria `SourceBuffer('audio/mpeg')`, lê stream via `reader.read()` loop
  - Aguarda `updateend` antes de cada `appendBuffer`
  - Chama `endOfStream()` quando `done`
  - Inicia `audio.play()` assim que o sourceopen dispara (áudio começa com primeiros bytes)
- Else (Safari iOS fallback): mantém lógica atual com `response.blob()`
- Ambos os paths compartilham `onended` → próximo chunk e `onerror` → status error

## Arquivos alterados

1. `src/components/article/ArticleTTSPlayer.tsx` — import + useEffect warm-up
2. `src/hooks/useArticleTTS.ts` — generateAndPlayChunk com MediaSource + fallback

