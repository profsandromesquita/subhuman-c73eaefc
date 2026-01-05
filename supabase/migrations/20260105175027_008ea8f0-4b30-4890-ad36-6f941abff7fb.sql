-- Add media fields to space_updates
ALTER TABLE space_updates ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE space_updates ADD COLUMN IF NOT EXISTS media_type text;

-- Create update_likes table
CREATE TABLE public.update_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id uuid NOT NULL REFERENCES space_updates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(update_id, user_id)
);

-- Create update_comments table
CREATE TABLE public.update_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id uuid NOT NULL REFERENCES space_updates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.update_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.update_comments ENABLE ROW LEVEL SECURITY;

-- RLS for update_likes
CREATE POLICY "Anyone can view likes" ON public.update_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert likes" ON public.update_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes" ON public.update_likes FOR DELETE USING (auth.uid() = user_id);

-- RLS for update_comments
CREATE POLICY "Anyone can view comments" ON public.update_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert comments" ON public.update_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.update_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.update_comments FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at on comments
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.update_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();