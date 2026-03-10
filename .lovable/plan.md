

# Correção: Altura uniforme dos cards na /home (desktop)

## Causa raiz

Nos grids de "Destaques" e "Em alta nos canais", os containers `motion.div` e `button` não preenchem a célula do grid. Quando o título ocupa 1 vs 2 linhas, o card encolhe, gerando desalinhamento na linha.

## Correção (1 arquivo: `src/pages/Home.tsx`)

### Seção "Destaques" (linhas 143-179)

| Elemento | Antes | Depois |
|---|---|---|
| `motion.div` (L143) | sem classe de altura | adicionar `lg:h-full` |
| `button` (L144-146) | `w-full text-left group` | adicionar `lg:h-full` |
| Inner card `div` (L148) | `flex gap-3 p-3.5 ...` | adicionar `lg:h-full` |

A coluna de texto (L149) já tem `flex flex-col justify-between` — os metadados já ficam na base quando o card preenche a célula.

### Seção "Em alta nos canais" (linhas 203-233)

| Elemento | Antes | Depois |
|---|---|---|
| `motion.div` (L203) | sem classe de altura | adicionar `lg:h-full` |
| `button` (L204-206) | `w-full text-left group` | adicionar `lg:h-full` |
| Inner card `div` (L208) | `flex gap-3 p-3.5 ...` | adicionar `lg:h-full` |
| Text column `div` (L209) | `flex-1 min-w-0` | adicionar `lg:flex lg:flex-col lg:justify-between` |

Na seção de discussões, a coluna de texto precisa de `flex-col justify-between` para empurrar os metadados (curtidas, comentários, data) para a base do card quando houver espaço extra.

## Resultado
- Cards da mesma linha terão altura idêntica (grid stretch + h-full)
- Metadados alinhados na mesma posição vertical
- Mobile inalterado (todas as classes usam `lg:`)
- Nenhuma outra página afetada

