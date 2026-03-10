

# Consistência de altura dos cards em `/podcast`

## Causa raiz

Na grid de `/podcast`, o wrapper `Link` e o `Card` não preenchem a célula do grid. Quando títulos têm 1 vs 2 linhas, ou quando um card tem badge de espaço e outro não, a altura varia.

Em `/highlights`, o mesmo problema potencial existe mas é menos visível porque a maioria dos cards tem thumbnail e badge. Em `/home`, isso já foi corrigido adicionando `lg:h-full` aos wrappers.

## Correção (1 arquivo: `src/components/podcast/PodcastCard.tsx`)

| Elemento | Antes | Depois |
|---|---|---|
| `Link` (L33) | `className="block"` | `className="block lg:h-full"` |
| `Card` (L34) | `className="relative p-3 lg:p-4 ..."` | adicionar `lg:h-full` |
| Inner flex `div` (L35) | `className="flex gap-3"` | adicionar `lg:h-full` |

A coluna de texto (L37) já tem `flex flex-col justify-between` — os metadados já ficam ancorados na base quando o card preenche a célula.

## Resultado
- Cards da mesma linha terão altura idêntica (grid stretch + h-full cascade)
- Metadados alinhados na mesma posição vertical
- Mobile inalterado (todas as classes usam `lg:`)
- Nenhuma outra página afetada

