import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Generate embedding using Lovable AI Gateway
async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });
    
    if (!response.ok) {
      console.error("Embedding API error:", response.status);
      return null;
    }
    
    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (error) {
    console.error("Error generating embedding:", error);
    return null;
  }
}

interface RAGChunk {
  id: string;
  content: string;
  document_title: string;
  layer: string;
  priority: number;
  similarity: number;
}

interface SpaceUpdate {
  id: string;
  title: string;
  content: string;
  published_at: string;
  spaces: { name: string; slug: string };
}

interface ChannelPost {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  channels: { name: string; slug: string };
  profiles: { full_name: string } | null;
}

// Search for relevant RAG chunks
async function searchRAGChunks(
  query: string,
  apiKey: string,
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  config: { rag_threshold?: number; rag_top_k?: number; rag_enabled?: boolean }
): Promise<{ chunks: RAGChunk[]; error?: string }> {
  const ragEnabled = config.rag_enabled !== false;
  if (!ragEnabled) {
    return { chunks: [] };
  }

  const queryEmbedding = await generateEmbedding(query, apiKey);
  if (!queryEmbedding) {
    console.warn("Failed to generate query embedding, skipping RAG");
    return { chunks: [] };
  }

  try {
    const { data: chunks, error } = await supabaseAdmin.rpc("search_rag_chunks", {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      match_threshold: config.rag_threshold ?? 0.5,
      match_count: config.rag_top_k ?? 8,
      filter_tags: null,
      filter_layer: null,
      include_constitution: true,
    });

    if (error) {
      console.error("RAG search error:", error);
      return { chunks: [], error: error.message };
    }

    return { chunks: (chunks || []) as RAGChunk[] };
  } catch (error) {
    console.error("RAG search exception:", error);
    return { chunks: [], error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Fetch recent published posts from platform
async function fetchRecentPosts(
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  limit = 15
): Promise<SpaceUpdate[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabaseAdmin
      .from("space_updates")
      .select("id, title, content, published_at, spaces!inner(name, slug)")
      .eq("is_published", true)
      .gte("published_at", thirtyDaysAgo.toISOString())
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching recent posts:", error);
      return [];
    }

    return (data || []) as SpaceUpdate[];
  } catch (error) {
    console.error("Exception fetching posts:", error);
    return [];
  }
}

// Fetch recent channel discussions
async function fetchRecentChannelPosts(
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  limit = 20
): Promise<ChannelPost[]> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabaseAdmin
      .from("channel_posts")
      .select("id, title, content, created_at, channels!inner(name, slug), profiles:author_id(full_name)")
      .eq("is_moderated", false)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching channel posts:", error);
      return [];
    }

    return (data || []) as ChannelPost[];
  } catch (error) {
    console.error("Exception fetching channel posts:", error);
    return [];
  }
}

// Build context from RAG chunks
function buildRAGContext(chunks: RAGChunk[]): string {
  if (!chunks || chunks.length === 0) {
    return "";
  }

  // Separate constitution chunks from others
  const constitutionChunks = chunks.filter(c => c.layer === "constituicao");
  const otherChunks = chunks.filter(c => c.layer !== "constituicao");

  let context = "";

  // Constitution always first
  if (constitutionChunks.length > 0) {
    context += "=== IDENTIDADE E DIRETRIZES (SEMPRE SEGUIR) ===\n\n";
    for (const chunk of constitutionChunks) {
      context += `${chunk.content}\n\n`;
    }
  }

  // Other relevant chunks
  if (otherChunks.length > 0) {
    context += "=== CONHECIMENTO RELEVANTE ===\n\n";
    for (const chunk of otherChunks) {
      context += `[${chunk.document_title}]\n${chunk.content}\n\n`;
    }
  }

  return context.trim();
}

// Build context from recent platform content
function buildPlatformContext(posts: SpaceUpdate[], channelPosts: ChannelPost[]): string {
  let context = "";

  if (posts.length > 0) {
    context += "\n\n=== POSTS RECENTES NA PLATAFORMA ===\n\n";
    for (const post of posts.slice(0, 10)) {
      const date = new Date(post.published_at).toLocaleDateString("pt-BR");
      const spaceName = post.spaces?.name || "Espaço";
      // Summarize content (first 300 chars)
      const summary = post.content?.replace(/<[^>]*>/g, '').substring(0, 300) || "";
      context += `[${spaceName}] "${post.title}" - ${date}\n`;
      context += `Resumo: ${summary}...\n\n`;
    }
  }

  if (channelPosts.length > 0) {
    context += "\n\n=== DISCUSSÕES RECENTES NOS CANAIS ===\n\n";
    for (const post of channelPosts.slice(0, 10)) {
      const date = new Date(post.created_at).toLocaleDateString("pt-BR");
      const channelName = post.channels?.name || "Canal";
      const authorName = post.profiles?.full_name || "Usuário";
      // Summarize content (first 200 chars)
      const summary = post.content?.replace(/<[^>]*>/g, '').substring(0, 200) || "";
      context += `[${channelName}] @${authorName} - ${date}\n`;
      if (post.title) context += `Título: ${post.title}\n`;
      context += `${summary}...\n\n`;
    }
  }

  return context;
}

// Get current date in Brazilian Portuguese
function getCurrentDateBR(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric',
    timeZone: 'America/Sao_Paulo'
  };
  return now.toLocaleDateString('pt-BR', options);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Chave de API não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the last user message for RAG search
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
    const userQuery = lastUserMessage?.content || "";

    // Search RAG chunks
    const ragConfig = config.metadata as { rag_threshold?: number; rag_top_k?: number; rag_enabled?: boolean } || {};
    const { chunks: ragChunks, error: ragError } = await searchRAGChunks(
      userQuery,
      LOVABLE_API_KEY,
      supabaseAdmin,
      ragConfig
    );

    if (ragError) {
      console.warn("RAG search had an error but continuing:", ragError);
    }

    console.log(`RAG search returned ${ragChunks.length} chunks for query: "${userQuery.substring(0, 50)}..."`);

    // Fetch platform content in parallel
    const [recentPosts, channelPosts] = await Promise.all([
      fetchRecentPosts(supabaseAdmin, 15),
      fetchRecentChannelPosts(supabaseAdmin, 20),
    ]);

    console.log(`Platform content: ${recentPosts.length} posts, ${channelPosts.length} channel discussions`);

    // Build RAG context
    const ragContext = buildRAGContext(ragChunks);
    
    // Build platform context
    const platformContext = buildPlatformContext(recentPosts, channelPosts);

    // Build system message with knowledge base and RAG context
    // Priority: Current Date > RAG Constitution > System Prompt > RAG Knowledge > Platform Content
    let systemMessage = "";
    
    // 0. Current date (always first for temporal awareness)
    const currentDate = getCurrentDateBR();
    systemMessage += `Data atual: ${currentDate}\n\n`;
    systemMessage += `REGRAS TEMPORAIS:\n`;
    systemMessage += `- Informações com datas anteriores a Janeiro de 2026 podem estar desatualizadas\n`;
    systemMessage += `- Sempre verifique a data das informações antes de citá-las\n`;
    systemMessage += `- Se não souber algo atual, admita que precisa de informações mais recentes\n\n`;

    // 1. System prompt (personality/instructions)
    if (config.system_prompt) {
      systemMessage += config.system_prompt + "\n\n";
    }

    // 2. System instruction (operational guidelines)
    if (config.system_instruction) {
      systemMessage += config.system_instruction + "\n\n";
    }

    // 3. RAG Context (Constitution + relevant knowledge) - PRIORITY SOURCE
    if (ragContext) {
      systemMessage += "---\n\n" + ragContext + "\n\n---\n\n";
    }
    
    // 4. Platform content (published posts + channel discussions)
    if (platformContext) {
      systemMessage += platformContext + "\n\n";
    }

    // 5. Legacy knowledge base (fallback if no RAG - should be phased out)
    if (config.knowledge_base && Object.keys(config.knowledge_base).length > 0 && ragChunks.length === 0) {
      systemMessage += "INFORMAÇÕES ADICIONAIS (base legada):\n" + JSON.stringify(config.knowledge_base, null, 2) + "\n\n";
    }

    // 6. Response guidelines - CRITICAL RULES
    systemMessage += `
DIRETRIZES DE RESPOSTA:
- Responda sempre em português brasileiro
- PRIORIZE informações da base de conhecimento RAG e posts da plataforma
- Se perguntarem sobre a plataforma Subhumano, cite a Constituição quando disponível
- Quando mencionar discussões, indique o canal e o autor se disponível
- Se não souber algo, admita honestamente - NUNCA invente especificações técnicas, preços ou datas
- Seja didático e acessível
- Evite jargões técnicos desnecessários
- Quando citar informações, mencione a fonte (documento RAG, post da plataforma ou canal)
`;

    // Build request body with correct token parameter based on model
    const modelName = config.model || "google/gemini-3-flash-preview";
    const isOpenAIModel = modelName.startsWith("openai/");
    
    console.log("Using model:", modelName, "isOpenAI:", isOpenAIModel, "RAG chunks:", ragChunks.length);

    const requestBody: Record<string, unknown> = {
      model: modelName,
      messages: [
        { role: "system", content: systemMessage },
        ...messages,
      ],
      stream: true,
    };

    // Add temperature only for non-OpenAI models (GPT-5 doesn't support custom temperature)
    if (!isOpenAIModel) {
      requestBody.temperature = Number(config.temperature) || 0.7;
    }

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

      // Try to parse error message from Gateway
      let errorMessage = "Erro ao processar sua mensagem";
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        // Use default error message
      }

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

      // Return the actual error status and message from Gateway
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: aiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the query for analytics (async, don't block response)
    const latencyMs = Date.now() - startTime;
    supabaseAdmin
      .from("rag_query_logs")
      .insert({
        user_id: userId,
        query: userQuery,
        chunks_retrieved: ragChunks.map(c => c.id),
        chunks_count: ragChunks.length,
        latency_ms: latencyMs,
      })
      .then(({ error }) => {
        if (error) console.warn("Failed to log RAG query:", error);
      });

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
