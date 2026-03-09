

# Correção: Botões desalinhados nos cards de /events

## Causa raiz

Linha 182 do `Events.tsx`:
```tsx
<div className="p-4 space-y-3 flex-1 flex flex-col">
```

O `space-y-3` aplica `margin-top: 0.75rem` via seletor `> :not([hidden]) ~ :not([hidden])`, que **sobrescreve** o `mt-auto` (linha 230) do bloco de ação. Resultado: o `mt-auto` não empurra o bloco de ação para a base do card.

## Correção (1 arquivo: `src/pages/Events.tsx`)

**Linha 182** — trocar `space-y-3` por `gap-3`:

De:
```tsx
<div className="p-4 space-y-3 flex-1 flex flex-col">
```
Para:
```tsx
<div className="p-4 gap-3 flex-1 flex flex-col">
```

`gap` funciona nativamente com flexbox e **não interfere** com `mt-auto`, pois não aplica `margin-top` nos filhos. O espaçamento visual permanece idêntico (0.75rem entre itens), mas agora `mt-auto` funciona corretamente, fixando o bloco de ação na base de todos os cards.

## Resultado
- Botões alinhados na mesma posição vertical em todos os cards da linha
- Espaçamento interno idêntico ao atual
- Mobile inalterado
- 1 linha alterada

