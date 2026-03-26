-- Etapa 1: Adiciona coluna audio_url na tabela space_updates
ALTER TABLE public.space_updates ADD COLUMN IF NOT EXISTS audio_url text NULL;

-- Índice parcial para backfill (artigos publicados sem áudio)
CREATE INDEX IF NOT EXISTS idx_space_updates_audio_url
  ON public.space_updates (audio_url)
  WHERE audio_url IS NULL AND is_published = true;

-- Etapa 2: Bucket público para MP3 de artigos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'article-audio',
  'article-audio',
  true,
  52428800,
  ARRAY['audio/mpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Política: leitura pública
CREATE POLICY "article-audio-public-read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'article-audio');

-- Política: escrita via service role (Edge Function)
CREATE POLICY "article-audio-service-write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'article-audio');

CREATE POLICY "article-audio-service-update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'article-audio');