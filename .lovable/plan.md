

# Plano: Remover MediaSource, usar apenas blob

## Arquivo único: `src/hooks/useArticleTTS.ts`

### Mudança

Substituir `generateAndPlayChunk` (que hoje tem branch MediaSource + fallback blob) pela versão simplificada que usa apenas `response.blob()` + `HTMLAudioElement`. Adiciona `ontimeupdate` para progresso granular durante reprodução de cada chunk.

Remover também o helper `setupAudioEvents` que foi criado para o path MediaSource — a lógica de `onended`/`onerror` fica inline na nova função.

### O que não muda

- Imports, tipos, `splitIntoChunks`, `stop`, `play`, `pause`, refs, cleanup — tudo permanece
- Nenhum outro arquivo alterado

