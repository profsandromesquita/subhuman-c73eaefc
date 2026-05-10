
-- 1) subscriptions: drop overly broad badge policy + add SECURITY DEFINER RPC for badge tier
DROP POLICY IF EXISTS "Authenticated users can view active subscriptions for badges" ON public.subscriptions;

CREATE OR REPLACE FUNCTION public.get_user_badge(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT plan_type
  FROM public.subscriptions
  WHERE user_id = _user_id
    AND status = 'active'
    AND plan_type IN ('yearly','lifetime')
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_badge(uuid) TO anon, authenticated;

-- 2) saved_updates: drop public count policy, add SECURITY DEFINER RPC for count
DROP POLICY IF EXISTS "Anyone can count saves" ON public.saved_updates;

CREATE OR REPLACE FUNCTION public.get_saved_updates_count(_update_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::bigint FROM public.saved_updates WHERE update_id = _update_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_saved_updates_count(uuid) TO anon, authenticated;

-- 3) companies.cnpj: revoke column-level SELECT from anon/authenticated (owner reads via RPC)
REVOKE SELECT (cnpj) ON public.companies FROM anon, authenticated;

-- 4) storage article-audio: require service_role for write/update
DROP POLICY IF EXISTS "article-audio-service-write" ON storage.objects;
DROP POLICY IF EXISTS "article-audio-service-update" ON storage.objects;

CREATE POLICY "article-audio-service-write"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'article-audio');

CREATE POLICY "article-audio-service-update"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'article-audio')
WITH CHECK (bucket_id = 'article-audio');

-- 5) realtime.messages: scope subscriptions per-user (private channels: user:<uid>)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'realtime' AND tablename = 'messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can read own user channel" ON realtime.messages';
    EXECUTE $p$
      CREATE POLICY "Authenticated can read own user channel"
      ON realtime.messages FOR SELECT
      TO authenticated
      USING (
        realtime.topic() = ('user:' || auth.uid()::text)
      )
    $p$;

    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can broadcast to own user channel" ON realtime.messages';
    EXECUTE $p$
      CREATE POLICY "Authenticated can broadcast to own user channel"
      ON realtime.messages FOR INSERT
      TO authenticated
      WITH CHECK (
        realtime.topic() = ('user:' || auth.uid()::text)
      )
    $p$;
  END IF;
END$$;
