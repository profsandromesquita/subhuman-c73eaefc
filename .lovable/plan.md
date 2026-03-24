

# Plano: Fase 3 — CRUD de materiais no admin de eventos

## Resumo

Adicionar seção "Materiais" no formulário do admin de eventos, seguindo o mesmo padrão das sessions (cards inline, add/remove, replace on save).

## Mudanças

### 1. Hook `useAdminEvents.ts` — adicionar materials ao fluxo

- Adicionar `MaterialInput` interface (type, title, description, url, thumbnail_url, sort_order, is_free)
- Adicionar `materials: MaterialInput[]` ao `CreateEventInput`
- Em `useCreateEvent`: após inserir sessions, inserir materials na tabela `event_materials`
- Em `useUpdateEvent`: após replace de sessions, fazer replace de materials (delete + insert)

### 2. Admin `Events.tsx` — FormData + UI

**FormData:**
- Adicionar campo `materials` ao interface e ao `emptyForm` (array vazio)

**openEditModal:**
- Buscar materials do evento via `supabase.from("event_materials").select("*").eq("event_id", event.id).order("sort_order")`
- Popular `formData.materials` com os dados carregados

**Helpers (mesmo padrão de sessions):**
- `addMaterial()` — push novo material com defaults (type: 'video', sort_order: materials.length)
- `removeMaterial(index)` — filter by index
- `updateMaterial(index, field, value)` — map and update

**handleSubmit:**
- Passar `formData.materials` no payload (filtrar items sem title ou url)

**UI — nova seção após sessions (antes dos botões de ação):**
- Cabeçalho: "Materiais" + botão "+ Adicionar Material"
- Cards com: Select tipo (video/ebook/photo/slide), Input título, Input URL, Textarea descrição, Input thumbnail_url, Input sort_order (number), Switch is_free
- Botão X para remover (mesmo estilo das sessions)
- Mensagem "Nenhum material adicionado" quando vazio

## Arquivos alterados

- `src/hooks/useAdminEvents.ts` — MaterialInput + persistência
- `src/pages/admin/Events.tsx` — FormData + UI de materiais

## Escopo

Zero mudanças em: banco, RLS, página pública, hook useEventDetail, Events.tsx público

