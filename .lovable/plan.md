

# Plano: 3 correções no ArticleTTSPlayer

## Correção 1 — `src/hooks/useArticleTTS.ts`
Reescrever completamente com abordagem de chunks por sentença (~200 chars cada). Inclui `splitIntoChunks`, `getBestVoice` (prioriza "Luciana" e vozes brasileiras), `speakChunk` recursivo, refs para chunks/currentChunk/isCancelled. Rate alterada para 1.05.

## Correção 2 — `src/utils/htmlToSpeechText.ts`
Substituir linhas 17-21: em vez de sempre adicionar `. `, só adicionar ponto quando o texto do bloco não termina com pontuação (`[.!?]`).

## Correção 3 — `src/components/article/ArticleTTSPlayer.tsx` + `src/index.css`

**ArticleTTSPlayer**: Adicionar `useEffect` que, quando `isActive && isMobile`, seta CSS variable `--tts-player-height: 72px` e classe `tts-player-active` no body. Cleanup no return.

**CommentInput** usa `fixed bottom-0`. O TTS player usa `fixed bottom-16`. Quando ambos estão visíveis, o CommentInput fica atrás do player.

**index.css**: Adicionar regra que empurra o CommentInput para cima quando o player está ativo:
```css
body.tts-player-active .fixed.bottom-0 {
  bottom: var(--tts-player-height, 72px);
}
```

Alternativa mais segura — usar seletor mais específico baseado no container do CommentInput (`fixed bottom-0 left-0 right-0` com `border-t`).

## Arquivos alterados
1. `src/hooks/useArticleTTS.ts` — reescrita completa
2. `src/utils/htmlToSpeechText.ts` — linhas 17-21
3. `src/components/article/ArticleTTSPlayer.tsx` — adicionar useEffect + import
4. `src/index.css` — adicionar 1 regra CSS

