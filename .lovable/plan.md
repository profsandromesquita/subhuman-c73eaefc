

# Fix: Input de comentário flutuando acima do rodapé no desktop

## Problema

O input de comentário usa `fixed bottom-[4.5rem]` em todas as resoluções. No mobile isso compensa a BottomNav (h-16 = 4rem). No **desktop**, a BottomNav está oculta (`lg:hidden`), então o `bottom-[4.5rem]` cria um vazio de 72px entre o input e o rodapé da página — exatamente o que as imagens mostram.

## Correção

**Arquivo:** `src/pages/ChannelPostDetail.tsx`, linha 526

Trocar:
```
className="fixed bottom-[4.5rem] left-0 right-0 bg-background border-t p-4 pb-safe z-40"
```
Por:
```
className="fixed bottom-[4.5rem] lg:bottom-0 left-0 right-0 bg-background border-t p-4 pb-safe z-40"
```

`lg:bottom-0` posiciona o input rente ao rodapé no desktop (onde não há BottomNav). No mobile, `bottom-[4.5rem]` continua compensando a BottomNav.

Além disso, no desktop o input deve respeitar a sidebar (`lg:ml-56`):

```
className="fixed bottom-[4.5rem] lg:bottom-0 left-0 right-0 lg:left-56 bg-background border-t p-4 pb-safe z-40"
```

Escopo: apenas linha 526 de `src/pages/ChannelPostDetail.tsx`.

