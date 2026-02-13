
# Sprint 2: Pagina Publica de Eventos + Admin de Eventos

## Contexto

As tabelas `events`, `event_sessions` e `event_purchases` ja existem no banco com RLS configurado. O workshop "Crie seu software em 6h" ja foi inserido como seed. Agora precisamos criar a UI publica e o painel admin.

---

## Novos Arquivos

### 1. `src/hooks/useEvents.ts` -- Hook publico de eventos

Busca eventos publicados com suas sessoes, seguindo o padrao do `usePodcasts.ts`:

- `useEvents(filters)`: Query com filtros (modalidade, tipo, futuro/passado)
- `useEventSessions(eventId)`: Sessoes de um evento
- `useUserEventPurchases()`: Compras do usuario logado (para saber se ja adquiriu)
- Tipo `Event` exportado com campos da tabela + `sessions` como array

### 2. `src/hooks/useAdminEvents.ts` -- Hook admin CRUD

Seguindo o padrao de `usePodcasts.ts` (useAdminPodcasts, useCreatePodcast, etc.):

- `useAdminEvents()`: Lista todos os eventos (ativos e inativos)
- `useCreateEvent()`: Mutation para criar evento + sessoes
- `useUpdateEvent()`: Mutation para editar evento + sessoes
- `useDeleteEvent()`: Mutation para excluir evento
- `useEventPurchases(eventId)`: Lista inscritos de um evento

### 3. `src/pages/Events.tsx` -- Pagina publica `/events`

Layout seguindo o padrao de `Podcasts.tsx`:
- `AppLayout` com `BottomNav`
- Header: "Eventos" + Logo
- Subtitulo: "Workshops, palestras, mentorias e mais"

**Filtros** (chips horizontais com scroll):
- Periodo: Todos | Futuros | Passados
- Modalidade: Todos | Online | Presencial | Hibrido
- Tipo: Todos | Workshop | Palestra | Live | Mentoria | Curso
- Status: Todos | Inscrito | Nao inscrito

**Cards de evento**:
- Cover (se existir) ou fundo com icone
- Badges: tipo (ex: "Workshop") + modalidade (ex: "Online")
- Titulo, descricao resumida (2 linhas max)
- Datas das sessoes formatadas (ex: "7 e 14 de mar, 14h-17h")
- Preco: "R$ 19,90" ou "Gratuito" ou "Incluso no plano"
- Botao contextual:
  - Ja comprou ou assinante mensal+: "Acessar" (bg-green-600)
  - Nao comprou: "Adquirir - R$ 19,90" -> /plans
  - Evento passado: "Encerrado" (disabled)

**Estados**: loading (skeletons), empty, lista

### 4. `src/pages/admin/Events.tsx` -- Painel admin `/admin/events`

Seguindo exatamente o padrao de `src/pages/admin/Podcasts.tsx`:
- `AdminLayout` wrapper
- Header com titulo "Eventos" + botao "Novo Evento"
- `DataTable` com colunas: Evento (cover+titulo), Tipo, Modalidade, Preco, Status, Datas, Acoes (editar/excluir)
- Dialog modal para criar/editar com campos:
  - Titulo, Descricao (textarea)
  - Tipo (select: workshop/palestra/live/aula_ao_vivo/mentoria/curso)
  - Modalidade (select: online/presencial/hibrido)
  - Preco (input numerico) + toggle "Gratuito"
  - Localizacao (input texto)
  - Max participantes (input numerico, opcional)
  - URL de checkout (input texto)
  - ID oferta Ticto (input texto, opcional)
  - Sessoes: lista dinamica com botao "Adicionar sessao"
    - Data/hora inicio (datetime-local)
    - Data/hora fim (datetime-local)
    - URL da sala (input texto, opcional)
  - Botoes: "Salvar rascunho" e "Publicar"
- AlertDialog para confirmar exclusao

---

## Arquivos Modificados

### 5. `src/components/BottomNav.tsx`

Adicionar "Eventos" ao nav com icone `CalendarBlank` do Phosphor. Reorganizar para 7 itens ajustando `min-w` de `64px` para `52px` e texto de `10px` para `9px` para caber:

```typescript
import { CalendarBlank } from "@phosphor-icons/react";

// Inserir entre Canais e Perfil:
{ icon: CalendarBlank, label: "Eventos", path: "/events" },
```

### 6. `src/components/admin/AdminSidebar.tsx`

Adicionar "Eventos" ao array `contentNavItems`:
```typescript
import { CalendarCheck } from "@phosphor-icons/react";
{ title: 'Eventos', url: '/admin/events', icon: CalendarCheck },
```

### 7. `src/App.tsx`

Adicionar imports lazy e rotas:
- `const Events = lazy(() => import("./pages/Events"));`
- `const AdminEvents = lazy(() => import("./pages/admin/Events"));`
- Rota protegida: `<Route path="/events" element={<SubscriptionGuard><Events /></SubscriptionGuard>} />`
- Rota admin: `<Route path="/admin/events" element={<AdminGuard><AdminEvents /></AdminGuard>} />`

---

## Resumo

| Arquivo | Acao |
|---------|------|
| `src/hooks/useEvents.ts` | Criar -- hook publico com filtros |
| `src/hooks/useAdminEvents.ts` | Criar -- CRUD admin para eventos e sessoes |
| `src/pages/Events.tsx` | Criar -- pagina publica com filtros e cards |
| `src/pages/admin/Events.tsx` | Criar -- painel admin com DataTable e modal |
| `src/components/BottomNav.tsx` | Editar -- adicionar item Eventos |
| `src/components/admin/AdminSidebar.tsx` | Editar -- adicionar Eventos ao menu Conteudo |
| `src/App.tsx` | Editar -- adicionar rotas /events e /admin/events |

Nenhuma alteracao de banco necessaria -- as tabelas ja existem.
