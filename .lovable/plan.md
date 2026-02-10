

# Fase 3: Paginacao com useInfiniteQuery

## Resumo

Migrar `useSpaceUpdates` e `useHighlightsFiltered` de `useQuery` (carrega tudo de uma vez) para `useInfiniteQuery` (carrega por paginas com infinite scroll). Isso garante que a plataforma escale sem degradar a performance conforme o volume de conteudo cresce.

## Arquivos Alterados

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/usePosts.ts` | Migrar `useSpaceUpdates` para `useInfiniteQuery` com `.range()` |
| `src/pages/Highlights.tsx` | Migrar `useHighlightsFiltered` para `useInfiniteQuery` com `.range()` |
| `src/pages/SpaceDetail.tsx` | Consumir dados paginados + adicionar botao "Carregar mais" com scroll trigger |

## Detalhes Tecnicos

### 1. `useSpaceUpdates` em `usePosts.ts`

Trocar `useQuery` por `useInfiniteQuery` com paginas de 20 itens:

- Usar `.range(from, to)` no Supabase para paginacao offset-based
- `getNextPageParam` retorna a proxima pagina se a pagina atual retornou 20 itens (PAGE_SIZE)
- O retorno muda de `SpaceUpdate[]` para `InfiniteData<{ items: SpaceUpdate[], nextPage: number | undefined }>`
- Stats e user likes continuam sendo buscados em batch para cada pagina (nao ha regressao)
- Invalidacoes existentes (`queryKey: ["space-updates"]`) continuam funcionando

```text
Estrutura da query:
- pageParam = 0, 1, 2...
- range = (pageParam * 20, pageParam * 20 + 19)
- hasNextPage = page.length === 20
```

### 2. `SpaceDetail.tsx`

- Consumir `useInfiniteQuery` com `data.pages.flatMap(p => p.items)`
- Contador de atualizacoes: usar tamanho total do flatMap (visivel ao usuario)
- Adicionar componente de "Carregar mais" no final da lista:
  - Intersection Observer via `useRef` + `useEffect` para trigger automatico ao rolar
  - Fallback: botao "Carregar mais" clicavel
  - Loading state: skeleton durante fetch da proxima pagina
  - Quando `!hasNextPage`: nao mostra nada (fim da lista)

### 3. `useHighlightsFiltered` em `Highlights.tsx`

Mesma abordagem:
- `useInfiniteQuery` com `.range()` e paginas de 20 itens
- queryKey inclui o filtro selecionado: `["highlights-filtered", filter, user?.id]`
- Ao trocar o filtro de data, React Query reseta automaticamente (queryKey diferente)
- Botao "Carregar mais" no final da lista com Intersection Observer

### 4. Componente InfiniteScrollTrigger (reutilizavel)

Criar um pequeno componente interno (inline ou em arquivo separado) que usa `IntersectionObserver` para chamar `fetchNextPage()` automaticamente quando o usuario rola ate o final:

```text
<InfiniteScrollTrigger 
  hasNextPage={hasNextPage} 
  isFetchingNextPage={isFetchingNextPage} 
  fetchNextPage={fetchNextPage} 
/>
```

Renderiza:
- Se `isFetchingNextPage`: skeleton de loading
- Se `hasNextPage && !isFetchingNextPage`: div invisivel observada pelo IntersectionObserver
- Se `!hasNextPage`: nada

### 5. Impacto nas mutacoes existentes

As mutacoes de like/comment (`useLikeSpaceUpdate`, `useAddSpaceUpdateComment`) ja invalidam `queryKey: ["space-updates"]` e `queryKey: ["highlights"]`. Com `useInfiniteQuery`, a invalidacao funciona igual — React Query refaz todas as paginas ja carregadas. Nenhuma mudanca necessaria nas mutacoes.

## Riscos e Mitigacoes

- **Risco**: Stats batch fetch pode falhar se page tiver 0 items -> mitigado com early return se `updates.length === 0`
- **Risco**: Contagem "X atualizacoes" no header do SpaceDetail nao reflete o total real (so os carregados) -> aceitavel, pode-se adicionar count total via `.select('*', { count: 'exact', head: true })` se necessario
- **Risco**: Mudanca de filtro no Highlights resetar scroll -> comportamento esperado e correto

