import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const periodStart = sevenDaysAgo.toISOString();
    const periodEnd = now.toISOString();

    // 1. Fetch rag_query_logs (last 7 days)
    const { data: queryLogs, error: queryErr } = await supabase
      .from("rag_query_logs")
      .select("query, intent, chunks_count")
      .gte("created_at", periodStart)
      .order("created_at", { ascending: false })
      .limit(200);

    if (queryErr) {
      console.error("Error fetching query logs:", queryErr);
    }

    // 2. Fetch channel_posts with channel name (last 7 days)
    const { data: channelPosts, error: postsErr } = await supabase
      .from("channel_posts")
      .select("id, title, content, channel_id, channels(name)")
      .gte("created_at", periodStart)
      .eq("is_moderated", false)
      .order("created_at", { ascending: false })
      .limit(200);

    if (postsErr) {
      console.error("Error fetching channel posts:", postsErr);
    }

    // 3. Fetch channel_post_comments (last 7 days)
    const postIds = (channelPosts || []).map((p: any) => p.id);
    let comments: any[] = [];
    if (postIds.length > 0) {
      const { data: commentData, error: commentsErr } = await supabase
        .from("channel_post_comments")
        .select("content, post_id")
        .in("post_id", postIds)
        .limit(500);

      if (commentsErr) {
        console.error("Error fetching comments:", commentsErr);
      }
      comments = commentData || [];
    }

    // 4. Fetch spaces for context
    const { data: spaces } = await supabase
      .from("spaces")
      .select("name, slug")
      .eq("is_active", true);

    // 5. Fetch channels for context
    const { data: channels } = await supabase
      .from("channels")
      .select("name, slug")
      .eq("is_active", true);

    // Build sources summary
    const queries = queryLogs || [];
    const posts = channelPosts || [];
    const queriesWithoutAnswer = queries.filter(
      (q: any) => q.chunks_count === 0 || q.chunks_count === null
    );

    // Group posts by channel
    const channelActivity: Record<string, { posts: number; comments: number }> = {};
    for (const post of posts) {
      const channelName = (post as any).channels?.name || "Desconhecido";
      if (!channelActivity[channelName]) {
        channelActivity[channelName] = { posts: 0, comments: 0 };
      }
      channelActivity[channelName].posts++;
    }
    for (const comment of comments) {
      const post = posts.find((p: any) => p.id === comment.post_id);
      const channelName = post ? (post as any).channels?.name || "Desconhecido" : "Desconhecido";
      if (!channelActivity[channelName]) {
        channelActivity[channelName] = { posts: 0, comments: 0 };
      }
      channelActivity[channelName].comments++;
    }

    const sourcesSummary = {
      total_queries: queries.length,
      total_channel_posts: posts.length,
      total_channel_comments: comments.length,
      queries_without_answer: queriesWithoutAnswer.length,
      top_channels_activity: Object.entries(channelActivity).map(
        ([name, stats]) => ({ name, ...stats })
      ),
    };

    // 6. Build prompt for LLM
    const systemPrompt = `Você é um Content Strategist especializado em Inteligência Artificial. Analise os dados de engajamento de uma plataforma de conteúdo sobre IA e sugira pautas de conteúdo.

A plataforma tem:
- Espaços (artigos): ${(spaces || []).map((s: any) => s.name).join(", ")}
- Canais (fórum): ${(channels || []).map((c: any) => c.name).join(", ")}
- Podcasts (episódios de áudio)
- Cursos (conteúdo educacional estruturado)

Responda APENAS com o JSON estruturado via tool calling.`;

    const userPrompt = `## Dados dos últimos 7 dias

### Perguntas dos usuários ao Assistente de IA (${queries.length} total, ${queriesWithoutAnswer.length} sem resposta):
${queries
  .map(
    (q: any) =>
      `- "${q.query}" (intent: ${q.intent || "N/A"}, chunks: ${q.chunks_count ?? 0})`
  )
  .join("\n")}

### Posts nos Canais (${posts.length} total):
${posts
  .slice(0, 50)
  .map(
    (p: any) =>
      `- [${(p as any).channels?.name}] ${p.title || ""}: ${(p.content || "").substring(0, 150)}`
  )
  .join("\n")}

### Comentários nos Canais (${comments.length} total):
${comments
  .slice(0, 50)
  .map((c: any) => `- ${(c.content || "").substring(0, 100)}`)
  .join("\n")}

### Atividade por Canal:
${Object.entries(channelActivity)
  .map(([name, stats]) => `- ${name}: ${stats.posts} posts, ${stats.comments} comentários`)
  .join("\n")}

Analise esses dados e sugira entre 5 e 15 ideias de conteúdo priorizadas, focando em:
1. Lacunas de conhecimento (perguntas sem resposta)
2. Temas recorrentes nas perguntas
3. Tendências de engajamento nos canais
4. Oportunidades para novos formatos (podcast, curso)`;

    // 7. Call LLM with tool calling
    const llmResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "submit_content_suggestions",
                description:
                  "Submete as sugestões de conteúdo analisadas a partir dos dados de engajamento.",
                parameters: {
                  type: "object",
                  properties: {
                    suggestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: {
                            type: "string",
                            description: "Título sugerido para o conteúdo",
                          },
                          type: {
                            type: "string",
                            enum: ["espaco", "canal", "podcast", "curso"],
                            description: "Tipo de conteúdo sugerido",
                          },
                          priority: {
                            type: "string",
                            enum: ["alta", "media", "baixa"],
                            description: "Prioridade da sugestão",
                          },
                          reasoning: {
                            type: "string",
                            description:
                              "Justificativa baseada nos dados analisados",
                          },
                          suggested_space: {
                            type: "string",
                            description:
                              "Slug do espaço sugerido (para tipo espaco)",
                          },
                          source_queries: {
                            type: "array",
                            items: { type: "string" },
                            description: "Queries de origem relacionadas",
                          },
                          source_channels: {
                            type: "array",
                            items: { type: "string" },
                            description: "Canais de origem relacionados",
                          },
                        },
                        required: [
                          "title",
                          "type",
                          "priority",
                          "reasoning",
                        ],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["suggestions"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "submit_content_suggestions" },
          },
        }),
      }
    );

    if (!llmResponse.ok) {
      const errText = await llmResponse.text();
      console.error("LLM error:", llmResponse.status, errText);
      
      if (llmResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (llmResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`LLM returned ${llmResponse.status}: ${errText}`);
    }

    const llmData = await llmResponse.json();
    
    let suggestions: any[] = [];
    let rawAnalysis = "";

    const toolCall = llmData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        suggestions = parsed.suggestions || [];
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
        rawAnalysis = toolCall.function.arguments;
      }
    } else {
      rawAnalysis = llmData.choices?.[0]?.message?.content || "";
    }

    // 8. Save to content_insights
    const { data: insight, error: insertErr } = await supabase
      .from("content_insights")
      .insert({
        period_start: periodStart,
        period_end: periodEnd,
        sources_summary: sourcesSummary,
        suggestions: suggestions,
        raw_analysis: rawAnalysis || null,
        status: "completed",
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Error saving insight:", insertErr);
      throw new Error(`Failed to save insight: ${insertErr.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, id: insight.id, suggestions_count: suggestions.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("content-intelligence error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
