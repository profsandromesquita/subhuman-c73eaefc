
-- VIEW: Contagens agregadas de likes/comments por space_update
CREATE OR REPLACE VIEW public.space_update_stats AS
SELECT
  su.id AS update_id,
  COALESCE(l.likes_count, 0)::bigint AS likes_count,
  COALESCE(c.comments_count, 0)::bigint AS comments_count
FROM public.space_updates su
LEFT JOIN (
  SELECT update_id, COUNT(*)::bigint AS likes_count
  FROM public.update_likes
  GROUP BY update_id
) l ON l.update_id = su.id
LEFT JOIN (
  SELECT update_id, COUNT(*)::bigint AS comments_count
  FROM public.update_comments
  GROUP BY update_id
) c ON c.update_id = su.id;

-- VIEW: Contagens agregadas de likes/comments por channel_post
CREATE OR REPLACE VIEW public.channel_post_stats AS
SELECT
  cp.id AS post_id,
  COALESCE(l.likes_count, 0)::bigint AS likes_count,
  COALESCE(c.comments_count, 0)::bigint AS comments_count
FROM public.channel_posts cp
LEFT JOIN (
  SELECT post_id, COUNT(*)::bigint AS likes_count
  FROM public.channel_post_likes
  GROUP BY post_id
) l ON l.post_id = cp.id
LEFT JOIN (
  SELECT post_id, COUNT(*)::bigint AS comments_count
  FROM public.channel_post_comments
  GROUP BY post_id
) c ON c.post_id = cp.id;

-- Coluna read_time_minutes em space_updates
ALTER TABLE public.space_updates ADD COLUMN IF NOT EXISTS read_time_minutes integer;

-- Trigger para calcular read_time automaticamente
CREATE OR REPLACE FUNCTION public.calculate_read_time()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.content IS NOT NULL AND NEW.content != '' THEN
    NEW.read_time_minutes := GREATEST(1, CEIL(array_length(regexp_split_to_array(trim(NEW.content), '\s+'), 1)::numeric / 200));
  ELSE
    NEW.read_time_minutes := 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_read_time_on_upsert
  BEFORE INSERT OR UPDATE OF content ON public.space_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_read_time();

-- Backfill dados existentes
UPDATE public.space_updates
SET read_time_minutes = GREATEST(1, CEIL(array_length(regexp_split_to_array(trim(COALESCE(content, '')), '\s+'), 1)::numeric / 200))
WHERE read_time_minutes IS NULL;

-- RPC para contagem de notificações não lidas (Problema 11)
CREATE OR REPLACE FUNCTION public.get_unread_notifications_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (
      -- User-specific unread
      SELECT COUNT(*)::integer FROM public.notifications
      WHERE user_id = p_user_id AND is_read = false
    ) + (
      -- Global unread (user_id IS NULL and not in notification_reads)
      SELECT COUNT(*)::integer FROM public.notifications n
      WHERE n.user_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.notification_reads nr
        WHERE nr.notification_id = n.id AND nr.user_id = p_user_id
      )
    ),
    0
  );
$$;
