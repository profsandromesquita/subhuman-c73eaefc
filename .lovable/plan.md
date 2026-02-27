

# Corrigir textarea de mensagens para expandir automaticamente

## Problema

A caixa de texto em `ConversationDetail.tsx` (mensagens diretas) usa um `<textarea>` nativo com `rows={1}` fixo e sem logica de auto-expansao. O usuario so consegue digitar em uma linha.

## Solucao

Aplicar o mesmo padrao do Assistente de IA (`AIAssistant.tsx`), que usa o componente `Textarea` do shadcn com auto-resize dinamico baseado no `scrollHeight`.

## Alteracoes em `src/pages/ConversationDetail.tsx`

1. Importar o componente `Textarea` de `@/components/ui/textarea`
2. Adicionar um `ref` para o textarea (`inputRef`)
3. Criar funcao `handleInputChange` que:
   - Atualiza o texto (com limite de 500 caracteres)
   - Ajusta a altura automaticamente: `el.style.height = 'auto'` seguido de `el.style.height = Math.min(el.scrollHeight, 120) + 'px'`
4. Substituir o `<textarea>` nativo pelo componente `Textarea` com as classes: `flex-1 min-h-[44px] max-h-[120px] resize-none overflow-y-auto py-2.5 bg-input rounded-lg px-4 text-sm`
5. Resetar a altura ao enviar mensagem (`inputRef.current.style.height = '44px'`)

### Resultado

O campo de texto expandira automaticamente conforme o usuario digita (ate 120px de altura), igual ao comportamento do Assistente de IA, e voltara ao tamanho original apos enviar.
