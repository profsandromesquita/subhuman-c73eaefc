

# Plano: Fase 1 — Mudanças no banco de dados para Eventos

## Pré-requisitos confirmados
- `generate_slug(title)` já existe
- `set_slug_on_insert()` trigger function já existe (usada em `space_updates` e `podcasts`)
- `update_updated_at_column()` trigger function já existe
- `is_admin_or_moderator()` já existe

## Migration única com 3 operações sequenciais

### Operação 1: Corrigir slugs + UNIQUE constraint

```sql
-- 1a. Preencher slugs vazios usando generate_slug()
UPDATE public.events
SET slug = public.generate_slug(title)
WHERE slug IS NULL OR slug = '';

-- 1b. Resolver slugs duplicados (adicionar sufixo -1, -2, etc.)
WITH dupes AS (
  SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) as rn
  FROM public.events
)
UPDATE public.events e
SET slug = e.slug || '-' || (d.rn - 1)
FROM dupes d
WHERE e.id = d.id AND d.rn > 1;

-- 1c. Alterar default de '' para NULL
ALTER TABLE public.events ALTER COLUMN slug DROP DEFAULT;

-- 1d. Adicionar constraint UNIQUE + índice
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);

-- 1e. Trigger para auto-gerar slug em novos eventos
CREATE TRIGGER set_event_slug_on_insert
  BEFORE INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_slug_on_insert();
```

### Operação 2: Criar tabela `event_materials`

```sql
CREATE TABLE public.event_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('video', 'ebook', 'photo', 'slide')),
  title text NOT NULL,
  description text,
  url text NOT NULL,
  thumbnail_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_materials_event_id ON public.event_materials(event_id);
CREATE INDEX idx_event_materials_type ON public.event_materials(event_id, type);

CREATE TRIGGER update_event_materials_updated_at
  BEFORE UPDATE ON public.event_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### Operação 3: RLS na `event_materials`

```sql
ALTER TABLE public.event_materials ENABLE ROW LEVEL SECURITY;

-- SELECT: autenticados veem materiais de eventos publicados+ativos
CREATE POLICY "Authenticated users can view materials of published events"
  ON public.event_materials FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_materials.event_id
    AND events.is_published = true AND events.is_active = true
  ));

-- INSERT/UPDATE/DELETE: apenas admins/moderators
CREATE POLICY "Admins can insert event materials"
  ON public.event_materials FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can update event materials"
  ON public.event_materials FOR UPDATE TO authenticated
  USING (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can delete event materials"
  ON public.event_materials FOR DELETE TO authenticated
  USING (public.is_admin_or_moderator(auth.uid()));
```

## Escopo

- **1 migration** com as 3 operações em sequência
- **Zero alterações frontend** — nenhum arquivo `.tsx`, `.ts` ou hook modificado
- Reutiliza funções existentes: `generate_slug`, `set_slug_on_insert`, `update_updated_at_column`, `is_admin_or_moderator`

