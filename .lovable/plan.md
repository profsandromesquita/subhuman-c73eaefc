

# Correcao de UX/UI -- Safe Area nas paginas de Mensagens

## Problema

As paginas **Mensagens** (`/messages`) e **Conversa** (`/messages/:recipientId`) nao utilizam a classe `pt-safe` que reserva espaco para a barra de status do dispositivo (relogio, bateria, Dynamic Island). No iPhone, o header com o botao de voltar fica coberto pela interface do sistema, impossibilitando o clique.

## Solucao

Aplicar a mesma correcao ja utilizada em outras paginas do projeto (PostDetail, Login, Register, AIAssistant, etc.): adicionar a classe utilitaria `pt-safe` que aplica `padding-top: env(safe-area-inset-top)`.

## Alteracoes

### 1. `src/pages/ConversationDetail.tsx` (linha 86)

O container principal nao tem `pt-safe`. Adicionar a classe ao `div` raiz:

```
// De:
<div className="flex flex-col h-[100dvh] bg-background">

// Para:
<div className="flex flex-col h-[100dvh] bg-background pt-safe">
```

### 2. `src/pages/Messages.tsx`

Esta pagina usa `AppLayout`, que ja aplica `pt-safe`. Portanto, **nao precisa de alteracao** -- o problema e exclusivo da tela de conversa individual.

## Resumo

- **1 arquivo alterado**: `ConversationDetail.tsx`
- **1 classe adicionada**: `pt-safe`
- Mesma abordagem validada em PostDetail, AIAssistant, Login, Register e outras paginas do projeto
