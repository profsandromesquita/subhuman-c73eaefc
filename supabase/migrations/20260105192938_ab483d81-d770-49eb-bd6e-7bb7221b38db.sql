-- Tabela para mídias dos posts de canais
CREATE TABLE public.channel_post_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.channel_posts(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'audio', 'document', 'youtube')),
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  youtube_id TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.channel_post_media ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Anyone can view media" ON public.channel_post_media
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert media" ON public.channel_post_media
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own media" ON public.channel_post_media
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.channel_posts 
      WHERE id = post_id AND author_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own media" ON public.channel_post_media
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.channel_posts 
      WHERE id = post_id AND author_id = auth.uid()
    )
  );

-- Criar bucket para mídia dos canais
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'channel-media',
  'channel-media',
  true,
  52428800,
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3',
    'application/pdf'
  ]
);

-- Políticas de acesso ao storage
CREATE POLICY "Public read access for channel media" ON storage.objects
  FOR SELECT USING (bucket_id = 'channel-media');

CREATE POLICY "Authenticated users can upload to channel media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'channel-media' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update own channel media files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'channel-media' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own channel media files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'channel-media' AND auth.uid()::text = (storage.foldername(name))[1]
  );