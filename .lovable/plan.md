

# Plano: Fase 2 — Página de detalhe de evento + refatoração

## Verificação: SubscriptionGuard

`SubscriptionGuard` apenas exige login (não bloqueia freemium). Pode ser usado normalmente na rota do EventDetail.

## Mudanças

### 1. Novo arquivo: `src/hooks/useEventDetail.ts`

Hook `useEventBySlug(slug)` usando `useQuery`:
- Busca evento por slug (`is_published=true`, `is_active=true`)
- Busca sessions por `event_id`
- Busca materials por `event_id`, ordenados por `sort_order`
- Retorna `{ event, materials, isLoading, error }`

### 2. Novo arquivo: `src/lib/constants/events.ts`

Extrair de `Events.tsx`:
- `typeLabels`, `modalityLabels` (maps)
- `formatSessionDates` (função)

### 3. Novo arquivo: `src/components/events/EventActionButtons.tsx`

Extrair de `Events.tsx`:
- `useEventActions` (hook interno)
- `ActionButtons` (componente)

Renomear export para `EventActionButtons`. Recebe `event`, `isPurchased`, `stopPropagation?`, `size?` (para permitir botões maiores na página de detalhe).

### 4. Novo arquivo: `src/pages/EventDetail.tsx`

Estrutura (baseada no padrão PodcastDetail):
- `AppLayout` wrapper
- Botão voltar → `/events`
- Cover image full-width
- Badges (tipo, modalidade, encerrado)
- Título h1
- Descrição (whitespace-pre-line)
- Metadados (datas, local, capacidade, preço)
- `EventActionButtons` (tamanho maior)
- Seção "Materiais do Evento" — só renderiza se `materials.length > 0`
  - Cards com ícone por tipo, título, descrição, thumbnail, link
- Estados: loading (skeleton), erro, não encontrado

### 5. Arquivo alterado: `src/App.tsx`

Adicionar rota:
```
<Route path="/events/:eventSlug" element={<SubscriptionGuard><EventDetail /></SubscriptionGuard>} />
```

### 6. Arquivo alterado: `src/pages/Events.tsx`

- Importar `useNavigate`, constantes e `EventActionButtons` dos novos arquivos
- Remover definições locais de `typeLabels`, `modalityLabels`, `formatSessionDates`, `useEventActions`, `ActionButtons`
- `EventCard`: remover prop `onOpenDetail`, usar `navigate(`/events/${event.slug}`)`
- Remover: `EventDetailModal`, estado `selectedEvent`, import de `Dialog`/`DialogContent`/etc.
- Manter: filtros, listagem, layout, tudo o resto

## Escopo

- **4 novos arquivos**, **2 alterados** (`App.tsx`, `Events.tsx`)
- Zero mudanças em banco, migrations, RLS, edge functions

