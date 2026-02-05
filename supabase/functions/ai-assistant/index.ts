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
      query_embedding: JSON.stringify(queryEmbedding),
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

// Build context from RAG chunks
function buildRAGContext(chunks: Array<{ content: string; document_title: string; layer: string; priority: number; similarity: number }>): string {
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

    // Build RAG context
    const ragContext = buildRAGContext(ragChunks);

    // Build system message with knowledge base and RAG context
    // Priority: RAG Constitution > System Prompt > RAG Knowledge > Legacy Knowledge Base
    let systemMessage = "";

    // 1. System prompt (personality/instructions)
    if (config.system_prompt) {
      systemMessage += config.system_prompt + "\n\n";
    }

    // 2. System instruction (operational guidelines)
    if (config.system_instruction) {
      systemMessage += config.system_instruction + "\n\n";
    }

    // 3. RAG Context (Constitution + relevant knowledge)
    if (ragContext) {
      systemMessage += "---\n\n" + ragContext + "\n\n---\n\n";
    }

    // 4. Legacy knowledge base (fallback if no RAG or for additional context)
    if (config.knowledge_base && Object.keys(config.knowledge_base).length > 0) {
      systemMessage += "INFORMAÇÕES ADICIONAIS:\n" + JSON.stringify(config.knowledge_base, null, 2) + "\n\n";
    }

    // 5. Response guidelines
    systemMessage += `
DIRETRIZES DE RESPOSTA:
- Responda sempre em português brasileiro
- Use as informações da base de conhecimento quando disponíveis
- Se não souber algo, admita honestamente
- Seja didático e acessível
- Evite jargões técnicos desnecessários
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
