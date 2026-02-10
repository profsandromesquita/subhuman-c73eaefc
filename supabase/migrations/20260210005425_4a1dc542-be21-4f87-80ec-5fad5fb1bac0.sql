
CREATE TABLE public.podcast_listens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  podcast_id UUID NOT NULL REFERENCES public.podcasts(id) ON DELETE CASCADE,
  progress_seconds INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_podcast UNIQUE(user_id, podcast_id)
);

ALTER TABLE public.podcast_listens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own listens" ON public.podcast_listens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own listens" ON public.podcast_listens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listens" ON public.podcast_listens
  FOR UPDATE USING (auth.uid() = user_id);
