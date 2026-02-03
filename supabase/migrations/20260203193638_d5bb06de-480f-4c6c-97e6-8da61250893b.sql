-- =============================================
-- PODCAST ENGAGEMENT SYSTEM
-- =============================================

-- 1. Podcast Likes
CREATE TABLE public.podcast_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id UUID NOT NULL REFERENCES public.podcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(podcast_id, user_id)
);

ALTER TABLE public.podcast_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view podcast likes"
  ON public.podcast_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert podcast likes"
  ON public.podcast_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own podcast likes"
  ON public.podcast_likes FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Podcast Comments
CREATE TABLE public.podcast_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id UUID NOT NULL REFERENCES public.podcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.podcast_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.podcast_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view podcast comments"
  ON public.podcast_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert podcast comments"
  ON public.podcast_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own podcast comments"
  ON public.podcast_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own podcast comments"
  ON public.podcast_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_podcast_comments_updated_at
  BEFORE UPDATE ON public.podcast_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Podcast Comment Likes
CREATE TABLE public.podcast_comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.podcast_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

ALTER TABLE public.podcast_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view podcast comment likes"
  ON public.podcast_comment_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert podcast comment likes"
  ON public.podcast_comment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own podcast comment likes"
  ON public.podcast_comment_likes FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Saved Podcasts
CREATE TABLE public.saved_podcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id UUID NOT NULL REFERENCES public.podcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(podcast_id, user_id)
);

ALTER TABLE public.saved_podcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved podcasts"
  ON public.saved_podcasts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can save podcasts"
  ON public.saved_podcasts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave own podcasts"
  ON public.saved_podcasts FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_podcast_likes_podcast_id ON public.podcast_likes(podcast_id);
CREATE INDEX idx_podcast_likes_user_id ON public.podcast_likes(user_id);
CREATE INDEX idx_podcast_comments_podcast_id ON public.podcast_comments(podcast_id);
CREATE INDEX idx_podcast_comments_parent_id ON public.podcast_comments(parent_id);
CREATE INDEX idx_podcast_comment_likes_comment_id ON public.podcast_comment_likes(comment_id);
CREATE INDEX idx_saved_podcasts_user_id ON public.saved_podcasts(user_id);