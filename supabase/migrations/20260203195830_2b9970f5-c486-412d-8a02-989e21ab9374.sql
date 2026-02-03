-- Função para converter título em slug
CREATE OR REPLACE FUNCTION public.generate_slug(title TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  result := lower(title);
  -- Remove acentos
  result := translate(result, 
    'àáâãäåèéêëìíîïòóôõöùúûüýÿñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÑÇ',
    'aaaaaaeeeeiiiiooooouuuuyyncAAAAAAEEEEIIIIOOOOOUUUUYYNC');
  -- Remove caracteres especiais, mantém apenas letras, números e espaços
  result := regexp_replace(result, '[^a-z0-9\s-]', '', 'g');
  -- Substitui espaços por hifens
  result := regexp_replace(result, '\s+', '-', 'g');
  -- Remove hifens duplicados
  result := regexp_replace(result, '-+', '-', 'g');
  -- Remove hifens no inicio e fim
  result := trim(both '-' from result);
  -- Limita a 80 caracteres para URLs limpas
  result := left(result, 80);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Adicionar coluna slug em space_updates
ALTER TABLE public.space_updates 
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Adicionar coluna slug em podcasts
ALTER TABLE public.podcasts 
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Trigger para gerar slug automaticamente no INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.set_slug_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Criar triggers (drop se existirem primeiro para evitar duplicação)
DROP TRIGGER IF EXISTS trigger_space_updates_slug ON public.space_updates;
CREATE TRIGGER trigger_space_updates_slug
  BEFORE INSERT OR UPDATE ON public.space_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_slug_on_insert();

DROP TRIGGER IF EXISTS trigger_podcasts_slug ON public.podcasts;
CREATE TRIGGER trigger_podcasts_slug
  BEFORE INSERT OR UPDATE ON public.podcasts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_slug_on_insert();

-- Gerar slugs para artigos existentes
UPDATE public.space_updates 
SET slug = public.generate_slug(title)
WHERE slug IS NULL;

-- Gerar slugs para podcasts existentes
UPDATE public.podcasts 
SET slug = public.generate_slug(title)
WHERE slug IS NULL;

-- Tornar NOT NULL após migração
ALTER TABLE public.space_updates 
  ALTER COLUMN slug SET NOT NULL;

ALTER TABLE public.podcasts 
  ALTER COLUMN slug SET NOT NULL;

-- Criar índices únicos para garantir slugs únicos por espaço/global
CREATE UNIQUE INDEX IF NOT EXISTS idx_space_updates_slug ON public.space_updates(space_id, slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_podcasts_slug ON public.podcasts(slug);