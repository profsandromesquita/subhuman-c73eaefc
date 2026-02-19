CREATE TABLE public.content_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  sources_summary JSONB NOT NULL DEFAULT '{}',
  suggestions JSONB NOT NULL DEFAULT '[]',
  raw_analysis TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.content_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage content_insights"
  ON public.content_insights FOR ALL
  USING (is_admin_or_moderator(auth.uid()));