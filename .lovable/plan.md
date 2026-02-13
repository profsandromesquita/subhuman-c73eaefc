

# Ajuste de UX/UI no Assistente de IA

## Problema

Na tela de boas-vindas do chat, o conteudo esta centralizado verticalmente com `justify-center` e `h-full` dentro de um container flex. Em telas com pouca altura (mobile), o texto "Como posso ajudar?" fica cortado atras do header fixo, pois o conteudo nao tem scroll e tenta se centralizar em um espaco insuficiente.

## Solucao

Modificar o container do estado vazio (sem mensagens) no arquivo `src/pages/AIAssistant.tsx`:

1. Remover `h-full` e `justify-center` do container do estado vazio para que o conteudo flua naturalmente do topo
2. Adicionar `pt-6` como padding-top para dar espaco abaixo do header
3. O container pai (`flex-1 overflow-y-auto`) ja possui scroll habilitado, entao o conteudo ficara rolavel automaticamente quando exceder a altura disponivel

## Detalhe tecnico

**Arquivo:** `src/pages/AIAssistant.tsx`

Alterar a div do estado vazio (linha onde esta `messages.length === 0`):

De:
```
<div className="flex flex-col items-center justify-center h-full gap-6">
```

Para:
```
<div className="flex flex-col items-center gap-6 pt-6">
```

Isso remove a centralizacao vertical forcada e permite que o conteudo comece abaixo do header, com scroll natural quando necessario.

