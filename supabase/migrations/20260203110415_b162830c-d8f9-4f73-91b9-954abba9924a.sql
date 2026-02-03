-- Criar tabela de podcasts
CREATE TABLE public.podcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid REFERENCES public.spaces(id) ON DELETE SET NULL,
  author_id uuid,
  title text NOT NULL,
  description text,
  audio_url text NOT NULL,
  cover_url text,
  duration_seconds integer,
  tags text[] DEFAULT '{}',
  is_published boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.podcasts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view published podcasts"
ON public.podcasts FOR SELECT
USING (is_published = true);

CREATE POLICY "Admins can view all podcasts"
ON public.podcasts FOR SELECT
USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can insert podcasts"
ON public.podcasts FOR INSERT
WITH CHECK (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can update podcasts"
ON public.podcasts FOR UPDATE
USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can delete podcasts"
ON public.podcasts FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_podcasts_updated_at
  BEFORE UPDATE ON public.podcasts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Criar bucket de storage para podcast media
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('podcast-media', 'podcast-media', true, 104857600);

-- Policies do bucket
CREATE POLICY "Anyone can view podcast media"
ON storage.objects FOR SELECT
USING (bucket_id = 'podcast-media');

CREATE POLICY "Admins can upload podcast media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'podcast-media' 
  AND is_admin_or_moderator(auth.uid())
);

CREATE POLICY "Admins can update podcast media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'podcast-media' 
  AND is_admin_or_moderator(auth.uid())
);

CREATE POLICY "Admins can delete podcast media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'podcast-media' 
  AND is_admin_or_moderator(auth.uid())
);