
# Trocar icone de lixeira por botao "Nova conversa"

## Problema
O botao para limpar o chat usa o icone `Trash` (lixeira), que transmite uma percepcao negativa ao usuario. Deve ser substituido por algo que remeta a "iniciar nova conversa".

## Correcao

### Arquivo: `src/pages/AIAssistant.tsx`

Trocar o icone `Trash` pelo icone `ChatCircle` (ou `Plus`) com visual mais amigavel:

- Substituir `<Trash className="w-5 h-5" />` por `<Plus className="w-5 h-5" />` dentro do botao do header
- Adicionar um tooltip ou label acessivel com texto "Nova conversa"
- O icone `Plus` combinado com o formato circular ja comunica "iniciar algo novo"

Alternativa: usar o icone `ArrowCounterClockwise` (reiniciar) ou `ChatCircleDots` se preferir algo mais explicito.

### Mudanca especifica (linha ~147 do AIAssistant.tsx)

De:
```
<Trash className="w-5 h-5" />
```

Para:
```
<Plus className="w-5 h-5" />
```

E remover `Trash` da lista de imports do `@phosphor-icons/react` (ja tem `Plus` importado via sugestoes, mas confirmar).

Nenhuma outra mudanca necessaria — o comportamento (abrir AlertDialog de confirmacao) permanece identico.
