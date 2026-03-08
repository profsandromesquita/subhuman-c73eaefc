-- Recriar space_update_stats sem security_invoker
CREATE OR REPLACE VIEW public.space_update_stats AS
SELECT su.id AS update_id,
  COALESCE(l.likes_count, 0) AS likes_count,
  COALESCE(c.comments_count, 0) AS comments_count
FROM space_updates su
LEFT JOIN (SELECT update_id, count(*) AS likes_count FROM update_likes GROUP BY update_id) l ON l.update_id = su.id
LEFT JOIN (SELECT update_id, count(*) AS comments_count FROM update_comments GROUP BY update_id) c ON c.update_id = su.id;

-- Recriar channel_post_stats sem security_invoker
CREATE OR REPLACE VIEW public.channel_post_stats AS
SELECT cp.id AS post_id,
  COALESCE(l.likes_count, 0) AS likes_count,
  COALESCE(c.comments_count, 0) AS comments_count
FROM channel_posts cp
LEFT JOIN (SELECT post_id, count(*) AS likes_count FROM channel_post_likes GROUP BY post_id) l ON l.post_id = cp.id
LEFT JOIN (SELECT post_id, count(*) AS comments_count FROM channel_post_comments GROUP BY post_id) c ON c.post_id = cp.id;