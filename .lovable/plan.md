

# Plano: Fix duplicação de listas + chunking maior no TTS

## 1. `src/utils/htmlToSpeechText.ts` — reescrita completa

- Função interna `extractBlocks`: ignora `<p>` filhos diretos de `<li>` (causa da duplicação no Tiptap)
- `htmlToSpeechBlocks` agrupa blocos em chunks de até 3000 chars (menos utterances = menos cold starts = leitura mais fluida)
- Mantém `htmlToSpeechText` como wrapper de compatibilidade

## 2. `src/hooks/useArticleTTS.ts` — 1 linha

- Alterar `utterance.rate` de `0.92` para `1.0`

## Arquivos alterados

1. `src/utils/htmlToSpeechText.ts` — reescrita
2. `src/hooks/useArticleTTS.ts` — linha do rate

