

# Correção: Cards de /events uniformes no desktop

## Análise

O `EventCard` (linha 170) já possui `h-full flex flex-col` e `mt-auto` na área de ação. Imagens já usam `h-40 lg:h-52`. Título e descrição já têm `line-clamp-2`. Datas e localização já têm `truncate`.

O problema residual está em:

1. **Badges com `flex-wrap`** (linha 183) — quando há 3 badges (tipo + modalidade + "Encerrado"), a segunda linha de badges aumenta a altura do card em relação aos vizinhos
2. **Descrição condicional** — quando `event.description` é `null`, o card não renderiza o `<p>`, mas `mt-auto` compensa isso (OK)
3. **Participantes condicionais** — idem, compensado por `mt-auto` (OK)

## Correção (1 arquivo: `src/pages/Events.tsx`)

### Linha 183 — Badges
De: `flex gap-2 flex-wrap`
Para: `flex gap-2 flex-wrap lg:flex-nowrap lg:overflow-hidden`

Impede que badges quebrem para segunda linha no desktop, mantendo a altura uniforme.

### Linha 197 — Título
De: `line-clamp-2`
Para: `line-clamp-1 lg:line-clamp-2`

Reforço: no mobile 1 linha, desktop até 2 — mantém consistência máxima. (Alternativa: manter `line-clamp-2` em ambos se preferir.)

Na verdade, o plano original pede truncar título — vou manter `line-clamp-2` que já existe. Está correto.

### Resumo das alterações

| Local | Antes | Depois |
|---|---|---|
| Badges (L183) | `flex gap-2 flex-wrap` | `flex gap-2 flex-wrap lg:flex-nowrap lg:overflow-hidden` |

Isso é a única mudança necessária. O restante da estrutura já está corretamente implementada com `h-full`, `flex-col`, `mt-auto`, `line-clamp-2`, `truncate`, e `h-40 lg:h-52`.

## Arquivo alterado
- `src/pages/Events.tsx` (1 linha)

