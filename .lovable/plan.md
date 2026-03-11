

# Enforcement de Limite Diário de IA no Backend

## PARTE 1: Migração SQL — Função + Índice

Uma única migração cria o índice e a função `check_ai_daily_limit`.

```sql
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
```

## PARTE 2: Edge Function — Inserção do check

No `supabase/functions/ai-assistant/index.ts`, inserir o bloco de verificação entre a validação do JWT (linha 433) e o parsing de messages (linha 435).

### Antes (linhas 430-435):
```ts
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { messages } = await req.json();
```

### Depois:
```ts
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ============ DAILY LIMIT CHECK ============
    const dbService = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: limitCheck, error: limitError } = await dbService.rpc('check_ai_daily_limit', { p_user_id: user.id });
    if (limitError) {
      console.error("Limit check error:", limitError);
    } else if (limitCheck?.[0] && !limitCheck[0].allowed) {
      const lc = limitCheck[0];
      console.log(`AI limit reached: user=${user.id} tier=${lc.tier} used=${lc.used_today}/${lc.daily_limit}`);
      return new Response(JSON.stringify({
        error: "Limite diário atingido",
        tier: lc.tier,
        daily_limit: lc.daily_limit,
        used_today: lc.used_today,
        message: `Você atingiu o limite de ${lc.daily_limit} consultas por dia do plano ${lc.tier}. Faça upgrade para aumentar seu limite.`
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { messages } = await req.json();
```

### Nota sobre `dbService`

A Edge Function já cria um service role client na linha 440 (`const db = createClient(...)`). Para evitar duplicação, o bloco de limit check será posicionado **após** a linha 440 e usará `db` em vez de criar um novo client. O resultado final será:

```ts
    // linha 440 existente
    const db = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ============ DAILY LIMIT CHECK ============
    const { data: limitCheck, error: limitError } = await db.rpc('check_ai_daily_limit', { p_user_id: user.id });
    if (limitError) {
      console.error("Limit check error:", limitError);
    } else if (limitCheck?.[0] && !limitCheck[0].allowed) {
      const lc = limitCheck[0];
      console.log(`AI limit reached: user=${user.id} tier=${lc.tier} used=${lc.used_today}/${lc.daily_limit}`);
      return new Response(JSON.stringify({
        error: "Limite diário atingido",
        tier: lc.tier,
        daily_limit: lc.daily_limit,
        used_today: lc.used_today,
        message: `Você atingiu o limite de ${lc.daily_limit} consultas por dia do plano ${lc.tier}. Faça upgrade para aumentar seu limite.`
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // linha 441 existente
    const { data: config } = await db.from("ai_assistant_config")...
```

Porém, a linha 440 (`const db = ...`) está **depois** do `req.json()` (linha 435). Para que o check ocorra antes de qualquer processamento, precisamos reordenar: mover `const db` e o limit check para logo após a validação do user, antes de `req.json()`.

### Sequência final real (linhas 430-450):

```ts
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const db = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ============ DAILY LIMIT CHECK ============
    const { data: limitCheck, error: limitError } = await db.rpc('check_ai_daily_limit', { p_user_id: user.id });
    if (limitError) {
      console.error("Limit check error:", limitError);
    } else if (limitCheck?.[0] && !limitCheck[0].allowed) {
      const lc = limitCheck[0];
      console.log(`AI limit reached: user=${user.id} tier=${lc.tier} used=${lc.used_today}/${lc.daily_limit}`);
      return new Response(JSON.stringify({
        error: "Limite diário atingido",
        tier: lc.tier,
        daily_limit: lc.daily_limit,
        used_today: lc.used_today,
        message: `Você atingiu o limite de ${lc.daily_limit} consultas por dia do plano ${lc.tier}. Faça upgrade para aumentar seu limite.`
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { messages } = await req.json();
    if (!messages?.length) {
      return new Response(JSON.stringify({ error: "Mensagens inválidas" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: config } = await db.from("ai_assistant_config").select("*").eq("is_active", true).single();
    // ... resto inalterado
```

A antiga `const db = createClient(...)` da linha 440 é removida (movida para cima).

## Resumo

| Componente | Ação |
|---|---|
| Migração SQL | Cria `idx_rag_query_logs_user_daily` + função `check_ai_daily_limit` |
| Edge Function | Move `db` para cima, insere bloco de limit check antes de `req.json()` |
| Frontend | Nenhuma alteração |

