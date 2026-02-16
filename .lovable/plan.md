

# Transformar input do Assistente IA em textarea multi-linha

## O que muda

Trocar o `<Input>` (linha unica) por um `<Textarea>` com crescimento automatico ate 7 linhas. A tecla **Enter** fara quebra de linha no texto, e o envio sera feito exclusivamente pelo botao de enviar (icone de aviao).

## Alteracoes tecnicas

### Arquivo: `src/pages/AIAssistant.tsx`

1. **Trocar import**: Substituir `Input` por `Textarea` nos imports
2. **Trocar ref**: De `useRef<HTMLInputElement>` para `useRef<HTMLTextAreaElement>`
3. **Remover submit por Enter**: O `handleSubmit` continua no `<form onSubmit>`, mas o textarea NAO dispara submit com Enter (comportamento nativo do textarea -- Enter = quebra de linha)
4. **Substituir o componente no JSX** (linha 224):

```typescript
// ANTES
<Input ref={inputRef} value={input} onChange={...} placeholder="..." />

// DEPOIS
<Textarea
  ref={inputRef}
  value={input}
  onChange={e => setInput(e.target.value)}
  placeholder="Digite sua pergunta..."
  disabled={isLoading}
  className="flex-1 min-h-[44px] max-h-[168px] resize-none overflow-y-auto"
  rows={1}
/>
```

- `min-h-[44px]`: altura minima de 1 linha (igual ao input atual)
- `max-h-[168px]`: altura maxima de ~7 linhas (7 x 24px)
- `resize-none`: impede redimensionamento manual
- `overflow-y-auto`: scrollbar aparece somente apos 7 linhas
- `rows={1}`: comeca com 1 linha

5. **Auto-resize dinamico**: Adicionar logica para o textarea crescer automaticamente conforme o usuario digita, ate o maximo de 7 linhas:

```typescript
const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  setInput(e.target.value);
  // Auto-resize
  const el = e.target;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 168) + 'px';
};
```

6. **Reset altura ao enviar**: Apos enviar a mensagem, resetar a altura do textarea para 1 linha.

## Comportamento final

| Acao | Resultado |
|---|---|
| Digitar texto | Textarea cresce automaticamente ate 7 linhas |
| Pressionar Enter | Quebra de linha no texto |
| Texto passa de 7 linhas | Scrollbar vertical aparece |
| Clicar no botao enviar | Envia a mensagem |
| Apos envio | Textarea volta para 1 linha |

## Arquivo alterado

| Arquivo | Alteracao |
|---|---|
| `src/pages/AIAssistant.tsx` | Trocar Input por Textarea com auto-resize e Enter como quebra de linha |

