import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Types
interface RAGChunk { id: string; content: string; document_title: string; layer: string; priority: number; similarity: number; }
interface SpaceUpdate { id: string; title: string; content: string; published_at: string; spaces: { name: string; slug: string }; }
interface ChannelPost { id: string; title: string | null; content: string; created_at: string; author_id: string | null; channels: { name: string; slug: string }; author_name?: string; }
interface Channel { id: string; name: string; description: string | null; access_type: string; slug: string | null; }

// Generate embedding using Lovable AI Gateway
async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.embedding || null;
  } catch { return null; }
}

// Fetch channels catalog
// deno-lint-ignore no-explicit-any
async function fetchChannelsCatalog(db: any): Promise<Channel[]> {
  const { data } = await db.from("channels").select("id, name, description, access_type, slug").eq("is_active", true).order("sort_order");
  return (data || []) as Channel[];
}

// Search RAG chunks
// deno-lint-ignore no-explicit-any
async function searchRAGChunks(query: string, apiKey: string, db: any, cfg: { rag_threshold?: number; rag_top_k?: number; rag_enabled?: boolean }): Promise<RAGChunk[]> {
  if (cfg.rag_enabled === false) return [];
  const emb = await generateEmbedding(query, apiKey);
  if (!emb) return [];
  const { data } = await db.rpc("search_rag_chunks", {
    query_embedding: `[${emb.join(',')}]`,
    match_threshold: cfg.rag_threshold ?? 0.5,
    match_count: cfg.rag_top_k ?? 8,
    include_constitution: true,
  });
  return (data || []) as RAGChunk[];
}

// Fetch recent posts
// deno-lint-ignore no-explicit-any
async function fetchRecentPosts(db: any): Promise<SpaceUpdate[]> {
  const ago = new Date(); ago.setDate(ago.getDate() - 30);
  const { data } = await db.from("space_updates").select("id, title, content, published_at, spaces!inner(name, slug)")
    .eq("is_published", true).gte("published_at", ago.toISOString()).order("published_at", { ascending: false }).limit(15);
  return (data || []) as SpaceUpdate[];
}

// Fetch channel posts (2-step to avoid join error)
// deno-lint-ignore no-explicit-any
async function fetchRecentChannelPosts(db: any): Promise<ChannelPost[]> {
  const ago = new Date(); ago.setDate(ago.getDate() - 7);
  const { data: posts } = await db.from("channel_posts").select("id, title, content, created_at, author_id, channels!inner(name, slug)")
    .eq("is_moderated", false).gte("created_at", ago.toISOString()).order("created_at", { ascending: false }).limit(20);
  if (!posts?.length) return [];
  const authorIds = [...new Set(posts.map((p: ChannelPost) => p.author_id).filter(Boolean))] as string[];
  const profilesMap: Record<string, string> = {};
  if (authorIds.length) {
    const { data: profiles } = await db.from("profiles").select("id, full_name").in("id", authorIds);
    profiles?.forEach((p: { id: string; full_name: string | null }) => { profilesMap[p.id] = p.full_name || "Usuário"; });
  }
  return posts.map((p: ChannelPost) => ({ ...p, author_name: p.author_id ? (profilesMap[p.author_id] || "Usuário") : "Usuário" }));
}

// Build context strings
function buildRAGContext(chunks: RAGChunk[]): string {
  if (!chunks.length) return "";
  const constitution = chunks.filter(c => c.layer === "constituicao");
  const other = chunks.filter(c => c.layer !== "constituicao");
  let ctx = "";
  if (constitution.length) { ctx += "=== IDENTIDADE E DIRETRIZES ===\n\n" + constitution.map(c => c.content).join("\n\n") + "\n\n"; }
  if (other.length) { ctx += "=== CONHECIMENTO RELEVANTE ===\n\n" + other.map(c => `[${c.document_title}]\n${c.content}`).join("\n\n") + "\n\n"; }
  return ctx;
}

function buildChannelsContext(channels: Channel[]): string {
  if (!channels.length) return "";
  const labels: Record<string, string> = { open: "aberto", subscribers: "assinantes", premium: "premium" };
  return "\n=== CANAIS (FÓRUNS) DA COMUNIDADE ===\n" + channels.map(c => `- **${c.name}** (${labels[c.access_type] || c.access_type})${c.description ? `: ${c.description}` : ""}`).join("\n") + "\n\nIMPORTANTE: Canais são internos. NÃO invente Discord/LinkedIn.\n";
}

function buildPlatformContext(posts: SpaceUpdate[], chPosts: ChannelPost[]): string {
  let ctx = "";
  if (posts.length) {
    ctx += "\n=== POSTS RECENTES (ESPAÇOS) ===\n" + posts.slice(0, 10).map(p => {
      const d = new Date(p.published_at).toLocaleDateString("pt-BR");
      return `[${p.spaces?.name}] "${p.title}" - ${d}\n${p.content?.replace(/<[^>]*>/g, '').substring(0, 200)}...`;
    }).join("\n\n") + "\n";
  }
  if (chPosts.length) {
    ctx += "\n=== DISCUSSÕES RECENTES (CANAIS) ===\n" + chPosts.slice(0, 10).map(p => {
      const d = new Date(p.created_at).toLocaleDateString("pt-BR");
      return `[${p.channels?.name}] @${p.author_name} - ${d}\n${p.title ? `Título: ${p.title}\n` : ""}${p.content?.replace(/<[^>]*>/g, '').substring(0, 150)}...`;
    }).join("\n\n") + "\n";
  }
  return ctx;
}

const PLATFORM_STRUCTURE = `
=== ESTRUTURA DA PLATAFORMA SUBHUMANO ===

1. ESPAÇOS (/spaces): Conteúdo editorial dos administradores (artigos, tutoriais)
2. CANAIS (/channels): Fóruns da comunidade onde USUÁRIOS postam dúvidas e experiências

REGRA: "fóruns/dúvidas" → CANAIS | "artigos/tutoriais" → ESPAÇOS
`;

const ANTI_HALLUCINATION = `
=== REGRAS ANTI-ALUCINAÇÃO ===
1. NUNCA invente Discord/LinkedIn/Telegram como canais oficiais
2. Use APENAS canais listados no contexto
3. Se não souber, diga: "Não encontrei na base de conhecimento"
4. Não invente nomes de usuários, datas ou especificações
`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { messages } = await req.json();
    if (!messages?.length) {
      return new Response(JSON.stringify({ error: "Mensagens inválidas" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const db = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: config } = await db.from("ai_assistant_config").select("*").eq("is_active", true).single();
    if (!config) {
      return new Response(JSON.stringify({ error: "Assistente não configurado" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!API_KEY) {
      return new Response(JSON.stringify({ error: "API não configurada" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userQuery = [...messages].reverse().find((m: { role: string }) => m.role === "user")?.content || "";
    const ragCfg = (config.metadata || {}) as { rag_threshold?: number; rag_top_k?: number; rag_enabled?: boolean };

    // Parallel fetches
    const [ragChunks, recentPosts, channelPosts, channels] = await Promise.all([
      searchRAGChunks(userQuery, API_KEY, db, ragCfg),
      fetchRecentPosts(db),
      fetchRecentChannelPosts(db),
      fetchChannelsCatalog(db),
    ]);

    console.log(`Context: ${ragChunks.length} RAG, ${recentPosts.length} posts, ${channelPosts.length} discussions, ${channels.length} channels`);

    // Build system message
    const now = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
    let sysMsg = `Data: ${now}\n\n${PLATFORM_STRUCTURE}\n\n`;
    if (config.system_prompt) sysMsg += config.system_prompt + "\n\n";
    if (config.system_instruction) sysMsg += config.system_instruction + "\n\n";
    sysMsg += buildRAGContext(ragChunks);
    sysMsg += buildChannelsContext(channels);
    sysMsg += buildPlatformContext(recentPosts, channelPosts);
    sysMsg += ANTI_HALLUCINATION;
    sysMsg += "\n\nResponda em português brasileiro. Priorize a base RAG. Seja didático.";

    const model = config.model || "google/gemini-3-flash-preview";
    const isOpenAI = model.startsWith("openai/");
    const body: Record<string, unknown> = { model, messages: [{ role: "system", content: sysMsg }, ...messages], stream: true };
    if (!isOpenAI) body.temperature = Number(config.temperature) || 0.7;
    body[isOpenAI ? "max_completion_tokens" : "max_tokens"] = config.max_tokens || 2048;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Limite excedido" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Erro ao processar" }), { status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(aiRes.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
