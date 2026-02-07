
# Correcao: Input do chat fixo e scroll apenas na area de mensagens

## Problema
A pagina inteira do chat rola quando o usuario toca fora da area de mensagens. O header "Subhumano IA" desaparece para cima e a area do input se move, criando uma experiencia ruim no mobile. Isso acontece porque:

1. O `AppLayout` envolve tudo em um `min-h-screen` com `pb-20`, permitindo scroll na pagina inteira
2. A area de input usa `pb-20` como espacamento mas nao esta realmente fixa na tela
3. O container principal do chat (`h-[calc(100dvh-64px)]`) compete com o scroll do `AppLayout`

## Solucao

### Arquivo: `src/pages/AIAssistant.tsx`

1. **Desabilitar o padding do BottomNav no AppLayout** passando a prop adequada ou ajustando o container principal para ocupar a viewport inteira com `overflow-hidden` no wrapper externo

2. **Fixar a area de input** na parte inferior da tela usando `fixed bottom-0` ou tornando o container flex rigido com `overflow-hidden`

3. **Garantir que apenas a area de mensagens tenha scroll** (`overflow-y-auto` apenas no div de mensagens, `overflow-hidden` no container pai)

### Mudancas especificas:

**Container principal** (linha 123):
```
// De:
<div className="flex flex-col h-[calc(100dvh-64px)] max-w-lg mx-auto pb-safe">

// Para:
<div className="flex flex-col h-[calc(100dvh-64px)] max-w-lg mx-auto overflow-hidden">
```

**Area de input** (linha 253):
```
// De:
<div className="px-4 py-3 pb-20 border-t border-border bg-background">

// Para:
<div className="px-4 py-3 pb-20 border-t border-border bg-background shrink-0">
```

**Header** (linha 125): adicionar `shrink-0` para nunca comprimir:
```
<div className="px-4 py-4 border-b border-border shrink-0">
```

O `overflow-hidden` no container pai impede que a pagina inteira role. O `shrink-0` no header e no input garante que eles mantenham seu tamanho fixo. Apenas a area de mensagens (que ja tem `flex-1 overflow-y-auto`) ira rolar.
