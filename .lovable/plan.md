

# Plano: Blocos semânticos para TTS + ajuste de naturalidade

## Resumo

3 arquivos alterados. A mudança principal é trocar a estratégia de chunking por caractere para chunking por parágrafo/bloco HTML, preservando a estrutura natural do texto.

## 1. `src/utils/htmlToSpeechText.ts` — reescrita completa

Adicionar nova função `htmlToSpeechBlocks(html): string[]` que extrai cada bloco semântico (`h1-h6`, `p`, `li`, `blockquote`) como item separado do array. Manter `htmlToSpeechText` como wrapper que junta os blocos (compatibilidade).

Fallback: se nenhum bloco estruturado for encontrado, divide o texto puro por sentenças.

## 2. `src/hooks/useArticleTTS.ts` — reescrita completa

- Assinatura muda de `useArticleTTS(text: string)` para `useArticleTTS(blocks: string[])`
- Remove `splitIntoChunks` (não mais necessário)
- `speakBlock` usa `blocks[index]` diretamente (prop, não ref)
- Rate alterada de `1.05` para `0.92` para tom mais natural
- Lógica de fila recursiva mantida (speakBlock → onend → speakBlock(next))
- `play` usa `blocks.length` em vez de `text`

## 3. `src/components/article/ArticleTTSPlayer.tsx` — 2 linhas

- Import: trocar `htmlToSpeechText` por `htmlToSpeechBlocks`
- useMemo: `htmlToSpeechBlocks(htmlContent)` em vez de `htmlToSpeechText(htmlContent)`
- Hook call: passa array ao `useArticleTTS`

## Arquivos alterados

1. `src/utils/htmlToSpeechText.ts` — reescrita
2. `src/hooks/useArticleTTS.ts` — reescrita
3. `src/components/article/ArticleTTSPlayer.tsx` — import + useMemo (2 linhas)

