

# Plano: Adicionar filtro "Em alta" / "Mais recentes" na página Início

## O que muda

Adicionar um toggle de filtro nas duas seções principais da Home ("Destaques" e "Em alta nos canais") para alternar entre ordenação por engajamento (padrão atual) e por data (mais recentes).

## Implementação

### 1. Estado de filtro no `Home.tsx`

Adicionar um estado `feedSort` com duas opções: `"trending"` (padrão) e `"recent"`. Renderizar um par de botões estilo pill/chip acima das seções para alternar.

### 2. Novos hooks em `usePosts.ts`

- **`useRecentHighlights()`**: Igual ao `useHighlights()` mas ordena por `published_at` desc (sem reordenar por engajamento). Retorna os 5 mais recentes dos espaços inscritos.
- **`useRecentDiscussionsChronological()`**: Igual ao `useRecentDiscussions()` mas ordena por `created_at` desc (sem reordenar por engajamento). Retorna os 5 mais recentes.

### 3. UI do filtro

Dois botões pill no topo da área de conteúdo (abaixo do título desktop, acima da seção "Destaques"):

```text
[ 🔥 Em alta ]  [ 🕐 Mais recentes ]
```

- Estilo: `rounded-full`, fundo `bg-foreground text-background` quando ativo, `bg-secondary text-muted-foreground` quando inativo (mesmo padrão usado em `PodcastFilters.tsx`)
- Ícones: `TrendUp` para "Em alta", `Clock` para "Mais recentes"

### 4. Renderização condicional

- Quando `feedSort === "trending"`: usa `useHighlights()` + `useRecentDiscussions()` (comportamento atual)
- Quando `feedSort === "recent"`: usa `useRecentHighlights()` + `useRecentDiscussionsChronological()`
- Os títulos das seções mudam: "Destaques da semana" → "Atualizações recentes" e "Em alta nos canais" → "Últimas discussões"

### Arquivos impactados

| Arquivo | Alteração |
|---|---|
| `src/hooks/usePosts.ts` | Adicionar `useRecentHighlights()` e `useRecentDiscussionsChronological()` |
| `src/pages/Home.tsx` | Adicionar estado de filtro, botões de toggle, renderização condicional por modo |

### Risco
Baixo. Reutiliza queries existentes com ordenação diferente. Sem mudanças de banco.

