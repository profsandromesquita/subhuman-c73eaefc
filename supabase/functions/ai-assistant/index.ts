 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 serve(async (req) => {
   // Handle CORS preflight
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
   }
 
   try {
     // Get auth header
     const authHeader = req.headers.get("Authorization");
     if (!authHeader?.startsWith("Bearer ")) {
       return new Response(
         JSON.stringify({ error: "Não autorizado" }),
         { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Create Supabase client with user's token
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
     const supabase = createClient(supabaseUrl, supabaseAnonKey, {
       global: { headers: { Authorization: authHeader } },
     });
 
     // Verify user authentication
     const token = authHeader.replace("Bearer ", "");
     const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
     if (claimsError || !claimsData?.claims) {
       console.error("Auth error:", claimsError);
       return new Response(
         JSON.stringify({ error: "Token inválido" }),
         { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const userId = claimsData.claims.sub;
     console.log("User authenticated:", userId);
 
     // Parse request body
     const { messages } = await req.json();
     if (!messages || !Array.isArray(messages)) {
       return new Response(
         JSON.stringify({ error: "Mensagens inválidas" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Fetch assistant configuration using service role
     const supabaseAdmin = createClient(
       supabaseUrl,
       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
     );
 
     const { data: config, error: configError } = await supabaseAdmin
       .from("ai_assistant_config")
       .select("*")
       .eq("is_active", true)
       .single();
 
     if (configError || !config) {
       console.error("Config error:", configError);
       return new Response(
         JSON.stringify({ error: "Assistente não configurado" }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     console.log("Using model:", config.model, "temperature:", config.temperature);
 
     // Build system message with knowledge base
     const systemMessage = `${config.system_prompt}
 
 ${config.system_instruction || ""}
 
 BASE DE CONHECIMENTO:
 ${JSON.stringify(config.knowledge_base, null, 2)}`;
 
      // Build request body with correct token parameter based on model
      const modelName = config.model || "google/gemini-3-flash-preview";
      const isOpenAIModel = modelName.startsWith("openai/");

     const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
     if (!LOVABLE_API_KEY) {
       console.error("LOVABLE_API_KEY not configured");
       return new Response(
         JSON.stringify({ error: "Chave de API não configurada" }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
      // Build request body
      const requestBody: Record<string, unknown> = {
        model: modelName,
        messages: [
          { role: "system", content: systemMessage },
          ...messages,
        ],
        stream: true,
        temperature: Number(config.temperature) || 0.7,
      };

      // Add correct token parameter based on model provider
      if (isOpenAIModel) {
        requestBody.max_completion_tokens = config.max_tokens || 2048;
      } else {
        requestBody.max_tokens = config.max_tokens || 2048;
      }

      // Call Lovable AI Gateway with streaming
     const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
       method: "POST",
       headers: {
         Authorization: `Bearer ${LOVABLE_API_KEY}`,
         "Content-Type": "application/json",
       },
        body: JSON.stringify(requestBody),
     });
 
     if (!aiResponse.ok) {
       const errorText = await aiResponse.text();
       console.error("AI Gateway error:", aiResponse.status, errorText);
 
       if (aiResponse.status === 429) {
         return new Response(
           JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
           { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
 
       if (aiResponse.status === 402) {
         return new Response(
           JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o suporte." }),
           { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
 
       return new Response(
         JSON.stringify({ error: "Erro ao processar sua mensagem" }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Return streaming response
     return new Response(aiResponse.body, {
       headers: {
         ...corsHeaders,
         "Content-Type": "text/event-stream",
         "Cache-Control": "no-cache",
         "Connection": "keep-alive",
       },
     });
   } catch (error) {
     console.error("Unexpected error:", error);
     return new Response(
       JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });