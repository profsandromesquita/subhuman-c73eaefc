
# Correção do botão "Ver conversa" no toast

## Problema

Após enviar uma mensagem pelo AuthorModal, o toast com o botão "Ver conversa" aparece, mas clicar nele não navega para `/messages/:id`. Isso acontece porque o Dialog (modal) permanece aberto após o envio, e a navegação é bloqueada ou o modal captura o foco.

## Solução

No `handleSendMessage` em `src/components/post/AuthorModal.tsx`, fechar o modal (chamar `handleClose()`) **antes** de exibir o toast. Assim, quando o usuário clicar em "Ver conversa", o Dialog já estará fechado e a navegação ocorrerá normalmente.

## Arquivo alterado

**`src/components/post/AuthorModal.tsx`** -- Linhas 65-72

Reordenar para:
1. Limpar o formulário e fechar o modal primeiro
2. Depois exibir o toast com o botão de navegação

```
// Antes:
toast.success("Mensagem enviada!", { ... });
setMessageText("");
setShowMessageForm(false);

// Depois:
setMessageText("");
setShowMessageForm(false);
onClose();
toast.success("Mensagem enviada!", { ... });
```

Uma única alteração de 3 linhas reordenadas no mesmo arquivo.
