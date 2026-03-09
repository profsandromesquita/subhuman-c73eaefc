

# Correção: Cards uniformes na página /spaces (desktop)

## Problema
Os cards em `/spaces` têm altura variável porque título e descrição crescem livremente. A ação "Ver publicações" não fica alinhada na base entre cards da mesma linha.

Os cards na Home (`/home`) usam um componente diferente (compact buttons) que já são uniformes — não precisam de alteração.

## Correção (1 arquivo: `src/pages/Spaces.tsx`)

### Alterações no `renderCard` (linhas 46-77):

1. **Outer `motion.div`** — adicionar `lg:h-full` para que preencha a célula do grid
2. **Card container div** (linha 47) — adicionar `lg:h-full lg:flex lg:flex-col` para que o card ocupe toda a altura da célula
3. **Inner padding div** (linha 48) — adicionar `lg:flex-1 lg:flex lg:flex-col` para distribuir o espaço interno
4. **Content area** (div com flex items-start gap-4, linha 49) — adicionar `lg:flex-1` para que ocupe o espaço disponível acima da ação
5. **Título h3** (linha 55) — adicionar `truncate` para truncar com reticências no desktop
6. **Descrição p** (linha 66) — adicionar `line-clamp-2` para limitar a 2 linhas com reticências
7. **Link "Ver publicações"** (linha 69) — adicionar `lg:mt-auto` para fixá-lo na base do card

Todas as classes usam `lg:` prefix ou são seguras para mobile (`truncate`, `line-clamp-2` melhoram ambos).

## Resultado
- Cards da mesma linha terão altura idêntica (grid + h-full + flex-col)
- Títulos longos truncados com `...`
- Descrições limitadas a 2 linhas
- "Ver publicações" sempre alinhado na base
- Mobile inalterado (classes `lg:` não aplicam)

