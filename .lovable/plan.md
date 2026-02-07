
# Correcao definitiva: Layout fixo do Assistente IA

## Problema raiz

O `AppLayout` envolve o conteudo do chat com `min-h-screen` e `pb-20` no `<main>`, criando uma pagina que pode rolar. O container interno do chat tenta impedir isso com `overflow-hidden`, mas o wrapper externo (AppLayout) ainda permite scroll da pagina inteira, fazendo o header "Subhumano IA" subir e sumir.

## Solucao

O AIAssistant precisa controlar toda a viewport, sem depender do padding do AppLayout. A correcao envolve duas mudancas:

### 1. Usar `AppLayout` sem o padding do BottomNav

Na pagina `AIAssistant.tsx`, passar `showNav={false}` ao `AppLayout` e incluir o `BottomNav` manualmente dentro do layout fixo. Isso elimina o `pb-20` do `<main>` que causa o scroll externo.

Porem, como o BottomNav ja esta incluso pelo AppLayout, uma alternativa mais simples e eficaz:

### Alternativa (preferida): Container fixo com `fixed inset-0`

Trocar a estrategia do container principal para usar posicionamento fixo que ocupa toda a tela, ignorando o scroll do AppLayout:

- Container principal: `fixed inset-0 flex flex-col bg-background z-10` (ocupa a viewport inteira)
- Manter header com `shrink-0`
- Manter mensagens com `flex-1 overflow-y-auto`  
- Input area: `shrink-0` com `pb-20` para compensar o BottomNav que fica por baixo

### Detalhes tecnicos

**Arquivo: `src/pages/AIAssistant.tsx`**

Linha 123 - Trocar:
```
<div className="flex flex-col h-[calc(100dvh-64px)] max-w-lg mx-auto overflow-hidden">
```
Por:
```
<div className="fixed inset-0 flex flex-col bg-background z-10 pt-safe">
  <div className="flex flex-col flex-1 max-w-lg mx-auto w-full overflow-hidden">
```

E fechar o div adicional antes do fechamento do AlertDialog.

Isso garante que:
- O container e fixo na viewport e nao pode ser rolado
- O `pt-safe` respeita a safe area do topo (notch)
- O `max-w-lg` centraliza o conteudo
- Apenas a area de mensagens (flex-1 overflow-y-auto) rola
- O header e o input ficam absolutamente estaticos
