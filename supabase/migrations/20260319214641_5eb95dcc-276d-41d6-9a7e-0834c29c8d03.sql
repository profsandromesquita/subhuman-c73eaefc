
CREATE TABLE public.platform_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  total_likes integer NOT NULL DEFAULT 0,
  total_comments integer NOT NULL DEFAULT 0,
  total_saves integer NOT NULL DEFAULT 0,
  total_members integer NOT NULL DEFAULT 0,
  total_articles integer NOT NULL DEFAULT 0,
  total_podcasts integer NOT NULL DEFAULT 0,
  total_posts integer NOT NULL DEFAULT 0
);

ALTER TABLE public.platform_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view platform stats"
  ON public.platform_stats
  FOR SELECT
  TO public
  USING (true);

INSERT INTO public.platform_stats (total_likes, total_comments, total_saves, total_members, total_articles, total_podcasts, total_posts)
VALUES (0, 0, 0, 0, 0, 0, 0);
