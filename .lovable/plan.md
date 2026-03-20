

# Fix: Layout do input de comentário na página de post do canal

## Problema

O input de comentário (linha 526) usa `fixed bottom-20` — posicionado a 80px do fundo. O container scrollável (linha 350) usa `pb-32` (128px). A combinação faz o conteúdo rolar por baixo do input em telas menores, e o `bottom-20` não considera a BottomNav que pode ter altura variável nem o safe-area em iOS.

## Correção

**Arquivo:** `src/pages/ChannelPostDetail.tsx`

### 1. Input fixo — alinhar com bottom nav (linha 526)

Trocar:
```
className="fixed bottom-20 left-0 right-0 bg-background border-t p-4"
```
Por:
```
className="fixed bottom-[4.5rem] left-0 right-0 bg-background border-t p-4 pb-safe z-40"
```

`bottom-[4.5rem]` (72px) alinha melhor com a BottomNav padrão, `pb-safe` cobre iOS, `z-40` garante sobreposição.

### 2. Container scrollável — aumentar padding inferior (linha 350)

Trocar:
```
className="max-w-lg mx-auto px-4 pt-4 pb-32"
```
Por:
```
className="max-w-lg mx-auto px-4 pt-4 pb-44"
```

`pb-44` (176px) dá espaço suficiente para input (~64px) + BottomNav (~72px) + respiro.

### Escopo

- Apenas `src/pages/ChannelPostDetail.tsx`, linhas 350 e 526.
- Sem mudanças em lógica, outros componentes ou outras páginas.

