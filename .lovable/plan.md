

# Padronizar grid de cards em páginas com sidebar contextual

## Análise

Páginas com sidebar lateral contextual no desktop:

| Página | Layout | Grid dos cards | Problema |
|---|---|---|---|
| `/home` | `lg:grid-cols-[1fr_280px]` | `lg:grid-cols-2 xl:grid-cols-3` | 3 colunas comprime cards |
| `/spaces/:slug` (SpaceDetail) | `lg:grid-cols-[1fr_260px]` | `lg:grid-cols-2 xl:grid-cols-3` | 3 colunas comprime cards |
| `/channels/:id` (ChannelDetail) | `lg:grid-cols-[1fr_260px]` | Sem grid (lista vertical) | Não afetado |

Páginas sem sidebar (como `/highlights`, `/events`, `/spaces`, `/channels`) usam a largura total e podem manter 3 colunas.

## Correção

Remover `xl:grid-cols-3` dos grids de cards nas duas páginas afetadas. Isso limita a 2 colunas máximo, que é o correto para o espaço disponível com sidebar.

### `src/pages/Home.tsx`
- **Linha 141** (Destaques): `lg:grid-cols-2 xl:grid-cols-3` → `lg:grid-cols-2`
- **Linha 201** (Em alta nos canais): `lg:grid-cols-2 xl:grid-cols-3` → `lg:grid-cols-2`

### `src/pages/SpaceDetail.tsx`
- **Linha 114** (Feed): `lg:grid-cols-2 xl:grid-cols-3` → `lg:grid-cols-2`

### Não alterados
- `/highlights` — sem sidebar, mantém 3 colunas
- `/channels/:id` — sem grid de cards (lista vertical)
- `/events`, `/spaces`, `/channels`, `/podcasts` — sem sidebar contextual

## Resultado
- Cards legíveis em páginas com sidebar
- 2 colunas max no desktop com sidebar
- 1 coluna no mobile (inalterado)
- 3 colunas preservadas em páginas full-width

