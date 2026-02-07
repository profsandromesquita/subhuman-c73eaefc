

# Auditoria Tecnica - Subhumano

## Resumo Executivo

O projeto esta em boa saude geral. A arquitetura segue padroes modernos com React, lazy loading, TanStack Query com batch fetching, e um design system coerente em dark mode. As principais oportunidades de melhoria estao em: codigo duplicado (funcao `formatTime` repetida em 5+ arquivos), tipagem frouxa com uso de `any` em joins do Supabase, e a pagina `PostDetail.tsx` que usa estado local + fetch manual ao inves do padrao React Query usado no restante do projeto.

---

## Problemas Identificados vs. Solucao Proposta

| # | Problema | Severidade | Solucao |
|---|----------|-----------|---------|
| 1 | **`formatTime()` duplicada em 5+ arquivos** (Home, Channels, SpaceDetail, ChannelDetail, etc.) | Media | Extrair para `src/lib/formatTime.ts` e importar em todos os arquivos |
| 2 | **PostDetail.tsx usa `useState` + `useEffect` para fetch** ao inves de React Query. Nao tem cache, nao tem staleTime, faz waterfall de requests (space -> post -> author -> likes -> media -> comments) | Alta | Refatorar para hooks com `useQuery`, similar ao padrao de `usePosts.ts` |
| 3 | **Uso excessivo de `as any`** nos joins do Supabase (ex: `(update.spaces as any)?.name`, `(post.channels as any)?.name`) | Media | Definir tipos para as respostas de join do Supabase ou criar interfaces intermediarias |
| 4 | **Profile.tsx usa fetch manual** ao inves de React Query para buscar perfil | Media | Criar `useProfile()` hook com React Query para consistencia e cache |
| 5 | **AIAssistant.tsx: links hardcoded `text-blue-400`** nos componentes de markdown | Baixa | Substituir por `text-primary` ou token do design system |
| 6 | **ChannelDetail.tsx: stagger delay `index * 0.05`** sem limite MAX_STAGGER_ITEMS | Baixa | Adicionar `Math.min(index, MAX_STAGGER_ITEMS)` como nas outras paginas |
| 7 | **SubscriptionGuard renderiza children escondidos** durante loading (`opacity-0 pointer-events-none`) | Media | Isso monta todos os componentes filhos e dispara queries desnecessarias. Usar skeleton puro ou null |
| 8 | **`useUnreadNotificationsCount` faz 3 queries sequenciais** para contar notificacoes nao lidas | Media | Mover logica para uma view ou RPC no banco |
| 9 | **Font family divergente**: CSS define `DM Sans`, mas o design system pede `Inter` | Baixa | Alinhar com stakeholder - atualmente usa DM Sans consistentemente no codigo, mas a spec pede Inter |
| 10 | **Dois sistemas de toast coexistem**: `@/hooks/use-toast` (Radix) e `sonner` | Baixa | Padronizar em um unico sistema (sonner e mais simples) |

---

## Detalhes Tecnicos por Pilar

### 1. Arquitetura de Componentes

**Pontos fortes:**
- Lazy loading em todas as paginas (bom code splitting)
- `AppLayout` como wrapper consistente com BottomNav
- ErrorBoundary global
- Hooks dedicados por dominio (useSpaces, usePosts, useChannels)

**Problemas:**
- `PostDetail.tsx` (615 linhas) tem toda a logica de fetch, like, save, comment inline. Deveria delegar para hooks
- `ChannelDetail.tsx` duplica a logica de `iconMap` que ja existe em `Channels.tsx`
- `formatTime` duplicada: Home.tsx, Channels.tsx, SpaceDetail.tsx, ChannelDetail.tsx

### 2. Performance

**Pontos fortes:**
- Batch fetching com `Promise.all` em usePosts, useChannels (sem N+1)
- `channel_stats` view para stats agregados
- `MAX_STAGGER_ITEMS` limita animacoes
- staleTime de 5min no queryClient

**Problemas:**
- `PostDetail.tsx` faz requests em waterfall (sequenciais): space -> post -> author -> likes -> media -> comments
- `SubscriptionGuard` monta children em modo invisivel, disparando todas as queries dos componentes filhos antes mesmo de confirmar a assinatura
- `useUnreadNotificationsCount` faz 3 queries separadas onde uma RPC ou view resolveria em 1
- `useSubscribedSpaces` busca todos os `space_updates` para contar (sem `count: 'exact'`)

### 3. Boas Praticas de Codigo

**Pontos fortes:**
- TypeScript em todo o projeto
- useCallback para funcoes de auth
- Separacao clara entre contexto (AuthContext) e hook (useAuth)
- Optimistic updates em likes e saves

**Problemas:**
- 15+ usos de `as any` nos hooks de dados
- `PostDetail.tsx` mistura fetch, estado local e logica de negocio num unico componente
- Dois sistemas de toast ativos (Radix toast + Sonner)
- `useAIAssistant` usa `fetch` direto em vez de abstrair chamada a edge function

### 4. UX/UI Consistency

**Pontos fortes:**
- Paleta dark consistente em todas as telas
- Icones Phosphor (outline) usados uniformemente
- Mobile-first com max-w-lg
- BottomNav presente em todas as telas autenticadas
- Safe area utilities para dispositivos com notch

**Problemas:**
- `text-blue-400` / `text-blue-300` hardcoded no AIAssistant (links do markdown)
- DM Sans vs Inter (spec pede Inter, codigo usa DM Sans)
- Landing.tsx usa `border border-border` em cards de features (spec diz "sem bordas visiveis em cards")

---

## Plano de Implementacao (por prioridade)

### Prioridade Alta (impacto direto em performance e manutencao)

1. **Extrair `formatTime` para utilitario compartilhado**
   - Criar `src/lib/formatTime.ts`
   - Substituir em Home, Channels, SpaceDetail, ChannelDetail
   - Estimativa: rapido, sem risco

2. **Refatorar `PostDetail.tsx` para usar React Query**
   - Criar `usePostDetail(spaceSlug, postSlug)` hook
   - Criar `usePostComments(postId)` hook
   - Paralelizar requests com `Promise.all`
   - Estimativa: medio, melhora performance e cache

3. **Corrigir SubscriptionGuard**
   - Nao renderizar children durante loading (usar null ou skeleton)
   - Previne queries desnecessarias antes da validacao

### Prioridade Media

4. **Criar `useProfile()` hook** para Profile.tsx
5. **Consolidar sistemas de toast** em Sonner unico
6. **Adicionar `Math.min` no stagger** de ChannelDetail

### Prioridade Baixa

7. Substituir `text-blue-400` por token do design system
8. Resolver divergencia de fonte (DM Sans vs Inter)
9. Eliminar `iconMap` duplicado entre Channels e ChannelDetail
10. Criar RPC/view para contagem de notificacoes nao lidas

