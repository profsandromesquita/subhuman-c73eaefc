-- Recriar view sem SECURITY DEFINER (usar SECURITY INVOKER que é o padrão)
DROP VIEW IF EXISTS public.channel_stats;

CREATE VIEW public.channel_stats 
WITH (security_invoker = true)
AS
SELECT 
  channel_id,
  COUNT(DISTINCT id) as posts_count,
  COUNT(DISTINCT author_id) as members_count,
  MAX(created_at) as last_activity
FROM public.channel_posts
WHERE is_moderated = false
GROUP BY channel_id;

-- Grant access
GRANT SELECT ON public.channel_stats TO anon, authenticated;