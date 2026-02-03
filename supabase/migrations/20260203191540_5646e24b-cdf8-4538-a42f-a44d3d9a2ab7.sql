-- View para estatísticas de canais (evita buscar 1000+ posts no cliente)
CREATE OR REPLACE VIEW public.channel_stats AS
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