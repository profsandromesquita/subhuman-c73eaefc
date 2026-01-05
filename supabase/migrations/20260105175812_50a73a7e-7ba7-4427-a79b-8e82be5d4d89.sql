-- Add parent_id for nested replies in comments
ALTER TABLE public.update_comments ADD COLUMN parent_id uuid REFERENCES public.update_comments(id) ON DELETE CASCADE;

-- Create index for faster reply lookups
CREATE INDEX idx_update_comments_parent_id ON public.update_comments(parent_id);

-- Create comment_likes table
CREATE TABLE public.comment_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES public.update_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS on comment_likes
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for comment_likes
CREATE POLICY "Anyone can view comment likes"
ON public.comment_likes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert comment likes"
ON public.comment_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comment likes"
ON public.comment_likes FOR DELETE
USING (auth.uid() = user_id);

-- Create saved_updates table
CREATE TABLE public.saved_updates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  update_id uuid NOT NULL REFERENCES public.space_updates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(update_id, user_id)
);

-- Enable RLS on saved_updates
ALTER TABLE public.saved_updates ENABLE ROW LEVEL SECURITY;

-- RLS policies for saved_updates
CREATE POLICY "Users can view own saved updates"
ON public.saved_updates FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can save updates"
ON public.saved_updates FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave own updates"
ON public.saved_updates FOR DELETE
USING (auth.uid() = user_id);