import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RedeemRequest {
  code: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Validate authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.log("No authorization header");
      return new Response(
        JSON.stringify({ error: "Você precisa estar logado para resgatar um cupom" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Parse request body
    const { code } = (await req.json()) as RedeemRequest;
    
    if (!code || typeof code !== "string") {
      console.log("Invalid code provided:", code);
      return new Response(
        JSON.stringify({ error: "Código do cupom é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanCode = code.trim().toUpperCase();
    console.log("Processing coupon:", cleanCode);

    // 3. Initialize Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client with user context for auth
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for bypassing RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Get authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      console.log("User auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Sessão inválida. Faça login novamente." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User authenticated:", user.id);

    // 5. Check if user already redeemed ANY promo coupon (lifetime limit)
    const { data: existingRedemption, error: redemptionCheckError } = await supabaseAdmin
      .from("coupon_redemptions")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (redemptionCheckError) {
      console.error("Redemption check error:", redemptionCheckError);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar histórico de cupons" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingRedemption) {
      console.log("User already used a coupon:", existingRedemption.id);
      return new Response(
        JSON.stringify({ error: "Você já utilizou um cupom promocional anteriormente" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Check if user has active subscription
    const { data: activeSubscription, error: subCheckError } = await supabaseAdmin
      .from("subscriptions")
      .select("id, plan_type, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (subCheckError) {
      console.error("Subscription check error:", subCheckError);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar assinatura" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (activeSubscription) {
      console.log("User has active subscription:", activeSubscription.plan_type);
      return new Response(
        JSON.stringify({ error: "Você já possui uma assinatura ativa" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Fetch and validate coupon
    const { data: coupon, error: couponError } = await supabaseAdmin
      .from("promo_coupons")
      .select("*")
      .eq("code", cleanCode)
      .eq("is_active", true)
      .maybeSingle();

    if (couponError) {
      console.error("Coupon fetch error:", couponError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar cupom" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!coupon) {
      console.log("Coupon not found or inactive:", cleanCode);
      return new Response(
        JSON.stringify({ error: "Cupom inválido ou inativo" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Coupon found:", coupon.id, "uses:", coupon.current_uses, "/", coupon.max_uses);

    // 8. Check if coupon expired
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      console.log("Coupon expired:", coupon.expires_at);
      return new Response(
        JSON.stringify({ error: "Este cupom expirou" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 9. Check if coupon reached max uses
    if (coupon.current_uses >= coupon.max_uses) {
      console.log("Coupon max uses reached");
      return new Response(
        JSON.stringify({ error: "Este cupom já foi utilizado o máximo de vezes permitido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 10. Calculate subscription dates
    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + coupon.days_granted * 24 * 60 * 60 * 1000);

    console.log("Creating subscription:", startsAt.toISOString(), "to", expiresAt.toISOString());

    // 11. Create subscription
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan_type: coupon.plan_type,
        status: "active",
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        provider: "coupon",
        external_id: coupon.code,
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error("Subscription create error:", subscriptionError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar assinatura" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Subscription created:", subscription.id);

    // 12. Create redemption record
    const { error: redemptionError } = await supabaseAdmin
      .from("coupon_redemptions")
      .insert({
        coupon_id: coupon.id,
        user_id: user.id,
        subscription_id: subscription.id,
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null,
        user_agent: req.headers.get("user-agent") || null,
      });

    if (redemptionError) {
      console.error("Redemption record error:", redemptionError);
      // Don't fail the request, subscription was already created
    }

    // 13. Increment coupon usage
    const { error: updateError } = await supabaseAdmin
      .from("promo_coupons")
      .update({ current_uses: coupon.current_uses + 1 })
      .eq("id", coupon.id);

    if (updateError) {
      console.error("Coupon usage update error:", updateError);
      // Don't fail the request, subscription was already created
    }

    console.log("Coupon redeemed successfully for user:", user.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cupom resgatado! Você ganhou ${coupon.days_granted} dias de acesso.`,
        subscription: {
          id: subscription.id,
          plan_type: subscription.plan_type,
          expires_at: subscription.expires_at,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
