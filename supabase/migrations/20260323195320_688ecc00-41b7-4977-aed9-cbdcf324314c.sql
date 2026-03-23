
-- Corrigir slugs vazios restantes (se houver)
UPDATE public.events
SET slug = public.generate_slug(title)
WHERE slug IS NULL OR slug = '';

-- Resolver duplicados
WITH dupes AS (
  SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) as rn
  FROM public.events
)
UPDATE public.events e
SET slug = e.slug || '-' || (d.rn - 1)
FROM dupes d
WHERE e.id = d.id AND d.rn > 1;

-- Remover default vazio
ALTER TABLE public.events ALTER COLUMN slug DROP DEFAULT;

-- Criar índice UNIQUE
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
