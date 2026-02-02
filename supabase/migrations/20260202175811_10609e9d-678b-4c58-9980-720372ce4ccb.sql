-- Create table for space update media (similar to channel_post_media)
CREATE TABLE IF NOT EXISTS public.space_update_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id uuid NOT NULL REFERENCES public.space_updates(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_name text,
  file_size integer,
  mime_type text,
  youtube_id text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.space_update_media ENABLE ROW LEVEL SECURITY;

-- Anyone can view space update media
CREATE POLICY "Anyone can view space update media"
  ON public.space_update_media FOR SELECT USING (true);

-- Admins can manage space update media
CREATE POLICY "Admins can manage space update media"
  ON public.space_update_media FOR ALL
  USING (is_admin_or_moderator(auth.uid()));