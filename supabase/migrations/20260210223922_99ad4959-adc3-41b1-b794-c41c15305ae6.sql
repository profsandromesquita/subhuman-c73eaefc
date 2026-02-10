
-- Fix views to use security_invoker (respects RLS of querying user)
ALTER VIEW public.space_update_stats SET (security_invoker = on);
ALTER VIEW public.channel_post_stats SET (security_invoker = on);
