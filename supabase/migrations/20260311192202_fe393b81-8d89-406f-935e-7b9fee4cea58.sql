-- Índice para contagem diária eficiente
CREATE INDEX IF NOT EXISTS idx_rag_query_logs_user_daily 
ON rag_query_logs (user_id, created_at DESC);

-- Função de verificação de limite
CREATE OR REPLACE FUNCTION public.check_ai_daily_limit(p_user_id uuid)
RETURNS TABLE(tier text, daily_limit int, used_today int, allowed boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tier text;
  v_limit int;
  v_used int;
BEGIN
  -- 1. Resolve tier (mesma prioridade do frontend)
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role IN ('admin','moderator')) THEN
    v_tier := 'admin';
  ELSIF EXISTS (SELECT 1 FROM subscriptions WHERE user_id = p_user_id AND status = 'active' AND plan_type = 'lifetime') THEN
    v_tier := 'lifetime';
  ELSIF EXISTS (SELECT 1 FROM subscriptions WHERE user_id = p_user_id AND status = 'active' AND plan_type = 'yearly') THEN
    v_tier := 'yearly';
  ELSIF EXISTS (SELECT 1 FROM subscriptions WHERE user_id = p_user_id AND status = 'active' AND plan_type = 'monthly') THEN
    v_tier := 'monthly';
  ELSIF EXISTS (SELECT 1 FROM subscriptions WHERE user_id = p_user_id AND plan_type = 'trial' AND status = 'active' AND expires_at > now()) THEN
    v_tier := 'trial';
  ELSIF EXISTS (
    SELECT 1 FROM subscriptions WHERE user_id = p_user_id AND status = 'active' AND plan_type = 'promo'
  ) OR EXISTS (
    SELECT 1 FROM coupon_redemptions WHERE user_id = p_user_id
  ) THEN
    v_tier := 'coupon';
  ELSIF EXISTS (
    SELECT 1 FROM event_purchases WHERE user_id = p_user_id AND status = 'active'
  ) AND NOT EXISTS (
    SELECT 1 FROM subscriptions WHERE user_id = p_user_id AND status = 'active'
  ) THEN
    v_tier := 'student';
  ELSE
    v_tier := 'freemium';
  END IF;

  -- 2. Limite por tier
  v_limit := CASE v_tier
    WHEN 'admin' THEN 999
    WHEN 'lifetime' THEN 25
    WHEN 'yearly' THEN 20
    WHEN 'monthly' THEN 10
    WHEN 'trial' THEN 3
    WHEN 'coupon' THEN 2
    WHEN 'student' THEN 1
    ELSE 1  -- freemium
  END;

  -- 3. Contagem do dia (fuso Brasília)
  SELECT COUNT(*)::int INTO v_used
  FROM rag_query_logs
  WHERE rag_query_logs.user_id = p_user_id
    AND created_at >= (now() AT TIME ZONE 'America/Sao_Paulo')::date::timestamptz;

  -- 4. Retorno
  RETURN QUERY SELECT v_tier, v_limit, v_used, (v_used < v_limit);
END;
$$;