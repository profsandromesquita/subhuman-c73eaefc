# Plano: TTS para artigos com Web Speech API

Atenção em dois pontos durante a implementação:   
  
1. Confirme que a prop `canReadFullArticles` já está disponível no escopo do `PostContent.tsx` antes de usá-la na condição do player. Se não estiver, use a mesma origem que já controla a exibição do corpo do artigo.   
  
2. No `createPortal` do mobile (barra fixa no bottom): verifique se já existe algum elemento `fixed bottom-0` no layout global ou no `PostDetail`. Se houver, ajuste o `z-index` e o `bottom` do player para não sobrepor elementos existentes.   
  
Fora isso, implemente exatamente conforme o plano descrito a seguir.

## Resumo

4 novos arquivos + 1 arquivo alterado. Zero mudanças no banco ou backend.

## Arquivos novos

### 1. `src/utils/htmlToSpeechText.ts`

Utilitário que converte HTML do Tiptap em texto puro para TTS. Remove `img`, `iframe`, `video`, `audio`, `figure`, `code`, `pre`. Adiciona pausas (`.` ) após headings, parágrafos e list items. Normaliza espaços.

### 2. `src/hooks/useArticleTTS.ts`

Hook com estados `idle | loading | playing | paused | error | unsupported`. Usa `SpeechSynthesisUtterance` com voz `pt-BR`, rate 0.95. Expõe `play`, `pause`, `stop`, `progress` (0-100 via `onboundary`). Cleanup automático no unmount via `speechSynthesis.cancel()`.

### 3. `src/components/article/ArticleTTSPlayer.tsx`

Props: `htmlContent`, `articleTitle`. Chama `htmlToSpeechText` internamente.

**Estado idle**: botão discreto `▶ Ouvir artigo` com ícone `Headphones` (Phosphor).

**Estado playing/paused**: mini-player inline com:

- Botão play/pause
- Título truncado
- Barra de progresso (`Progress` component existente)
- Botão X (stop)

**Mobile**: quando playing, renderiza barra fixa no bottom via `createPortal`.
**Desktop**: sempre inline.

Não renderiza nada se `!isSupported`.

### 4. Integração em `src/components/post/PostContent.tsx`

Inserir `ArticleTTSPlayer` entre o divider (linha 231) e o bloco de conteúdo (linha 233). Renderizar apenas se `content` não vazio e `canReadFullArticles` é true.

```tsx
{/* Divider */}
<div className="w-full h-px bg-border/60 mb-8" />

{/* TTS Player */}
{canReadFullArticles && content && (
  <ArticleTTSPlayer htmlContent={content} articleTitle={title} />
)}

{/* Content */}
```

## Arquivos alterados

- `src/components/post/PostContent.tsx` — adicionar import + 3 linhas de JSX entre divider e conteúdo

## Escopo

- 4 novos arquivos, 1 alterado
- Zero: banco, migrations, Edge Functions, RLS, PodcastPlayer, usePostDetail