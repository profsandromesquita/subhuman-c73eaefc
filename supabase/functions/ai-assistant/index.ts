import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Types
interface RAGChunk { id: string; content: string; document_title: string; layer: string; priority: number; rank?: number; }
interface SpaceUpdate { id: string; title: string; slug: string; content: string; published_at: string; spaces: { name: string; slug: string }; }
interface ChannelPost { id: string; title: string | null; content: string; created_at: string; author_id: string | null; channels: { name: string; slug: string }; author_name?: string; }
interface Channel { id: string; name: string; description: string | null; access_type: string; slug: string | null; }
interface Podcast { id: string; title: string; slug: string; description: string | null; published_at: string; spaces: { name: string; slug: string } | null; }
interface UserProfile { 
  full_name: string | null; 
  city: string | null; 
  state: string | null; 
  occupation_type: string | null; 
  job_title: string | null; 
  company_name: string | null; 
  industry: string | null; 
  ai_experience_level: string | null; 
  goals: string | null; 
}

// Fetch channels catalog
// deno-lint-ignore no-explicit-any
async function fetchChannelsCatalog(db: any): Promise<Channel[]> {
  const { data } = await db.from("channels").select("id, name, description, access_type, slug").eq("is_active", true).order("sort_order");
  return (data || []) as Channel[];
}

// Fetch user profile for personalization
// deno-lint-ignore no-explicit-any
async function fetchUserProfile(db: any, userId: string): Promise<UserProfile | null> {
  const { data, error } = await db
    .from("profiles")
    .select("full_name, city, state, occupation_type, job_title, company_name, industry, ai_experience_level, goals")
    .eq("id", userId)
    .single();
  
  if (error) {
    console.error("Profile fetch error:", error);
    return null;
  }
  return data as UserProfile;
}

// Fetch recent podcasts
// deno-lint-ignore no-explicit-any
async function fetchRecentPodcasts(db: any): Promise<Podcast[]> {
  const ago = new Date(); 
  ago.setDate(ago.getDate() - 60); // Last 60 days for podcasts
  
  const { data, error } = await db
    .from("podcasts")
    .select("id, title, slug, description, published_at, spaces(name, slug)")
    .eq("is_published", true)
    .gte("published_at", ago.toISOString())
    .order("published_at", { ascending: false })
    .limit(15);
  
  if (error) {
    console.error("Podcasts fetch error:", error);
    return [];
  }
  return (data || []) as Podcast[];
}

// Search RAG chunks using LEXICAL search (no embeddings)
// deno-lint-ignore no-explicit-any
async function searchRAGChunks(query: string, db: any, cfg: { rag_top_k?: number; rag_enabled?: boolean }): Promise<RAGChunk[]> {
  if (cfg.rag_enabled === false) return [];
  
  const { data, error } = await db.rpc("search_rag_chunks_lexical", {
    query_text: query,
    match_count: cfg.rag_top_k ?? 8,
    include_constitution: true,
  });
  
  if (error) {
    console.error("RAG search error:", error);
    return [];
  }
  
  return (data || []) as RAGChunk[];
}

// Fetch recent posts
// deno-lint-ignore no-explicit-any
async function fetchRecentPosts(db: any): Promise<SpaceUpdate[]> {
  const ago = new Date(); ago.setDate(ago.getDate() - 30);
  const { data } = await db.from("space_updates")
    .select("id, title, slug, content, published_at, spaces!inner(name, slug)")
    .eq("is_published", true)
    .gte("published_at", ago.toISOString())
    .order("published_at", { ascending: false })
    .limit(15);
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

function buildUserContext(profile: UserProfile | null): string {
  if (!profile?.full_name) return "";
  
  // Extract first name
  const firstName = profile.full_name.split(" ")[0];
  
  let ctx = `\n=== CONTEXTO DO USUÁRIO ===\n`;
  ctx += `Nome: ${profile.full_name}\n`;
  ctx += `Primeiro nome: ${firstName}\n`;
  
  if (profile.city && profile.state) {
    ctx += `Localização: ${profile.city}, ${profile.state}\n`;
  }
  
  if (profile.job_title && profile.company_name) {
    ctx += `Profissão: ${profile.job_title} na ${profile.company_name}\n`;
  } else if (profile.job_title) {
    ctx += `Cargo: ${profile.job_title}\n`;
  } else if (profile.occupation_type) {
    ctx += `Ocupação: ${profile.occupation_type}\n`;
  }
  
  if (profile.industry) {
    ctx += `Setor: ${profile.industry}\n`;
  }
  
  if (profile.ai_experience_level) {
    ctx += `Nível de experiência com IA: ${profile.ai_experience_level}\n`;
  }
  
  if (profile.goals) {
    ctx += `Objetivos: ${profile.goals}\n`;
  }
  
  ctx += `\nIMPORTANTE: Chame o usuário pelo primeiro nome (${firstName}). Personalize recomendações com base no perfil.\n`;
  
  return ctx;
}

function buildPodcastContext(podcasts: Podcast[]): string {
  if (!podcasts.length) return "";
  
  return "\n=== PODCASTS RECENTES ===\n" + podcasts.map(p => {
    const date = new Date(p.published_at).toLocaleDateString("pt-BR");
    const spaceInfo = p.spaces ? ` [${p.spaces.name}]` : "";
    const desc = p.description ? `\nResumo: ${p.description.substring(0, 200)}...` : "";
    return `🎙️ "${p.title}"${spaceInfo} - ${date}\nLink: /podcasts/${p.slug}${desc}`;
  }).join("\n\n") + "\n";
}

function buildPlatformContext(posts: SpaceUpdate[], chPosts: ChannelPost[]): string {
  let ctx = "";
  if (posts.length) {
    ctx += "\n=== ARTIGOS RECENTES (ESPAÇOS) ===\n" + posts.slice(0, 10).map(p => {
      const d = new Date(p.published_at).toLocaleDateString("pt-BR");
      const spaceSlug = p.spaces?.slug || "geral";
      const postSlug = p.slug || p.id;
      return `[${p.spaces?.name}] "${p.title}" - ${d}\nLink: /spaces/${spaceSlug}/post/${postSlug}\n${p.content?.replace(/<[^>]*>/g, '').substring(0, 200)}...`;
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

1. ESPAÇOS (/spaces): Conteúdo editorial dos administradores (artigos, tutoriais, análises)
2. CANAIS (/channels): Fóruns da comunidade onde USUÁRIOS postam dúvidas e experiências
3. PODCASTS (/podcasts): Episódios de áudio com análises aprofundadas, debates e entrevistas sobre IA
4. MENTORIAS: Sessões ao vivo e personalizadas com o Expert Prof. Sandro Mesquita, especialista em aplicações práticas de IA para negócios e produtividade

REGRA DE NAVEGAÇÃO: 
- "fóruns/dúvidas/discussões" → CANAIS 
- "artigos/tutoriais/análises" → ESPAÇOS
- "áudio/episódios/ouvir" → PODCASTS

QUANDO O USUÁRIO PEDIR LINK DE CONTEÚDO:
- Forneça o link completo no formato Markdown: [Título](URL)
- Artigos: [Título do Artigo](/spaces/{space_slug}/post/{post_slug})
- Podcasts: [Título do Podcast](/podcasts/{podcast_slug})
`;

const ANTI_HALLUCINATION = `
=== REGRAS ANTI-ALUCINAÇÃO ===
1. NUNCA invente Discord/LinkedIn/Telegram como canais oficiais
2. Use APENAS canais listados no contexto
3. Se não souber, diga: "Não encontrei essa informação na base de conhecimento"
4. Não invente nomes de usuários, datas ou especificações
5. Para links, use APENAS slugs que aparecem no contexto
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
    const ragCfg = (config.metadata || {}) as { rag_top_k?: number; rag_enabled?: boolean };

    // Parallel fetches (using lexical search now) - including podcasts and user profile
    const [ragChunks, recentPosts, channelPosts, channels, podcasts, userProfile] = await Promise.all([
      searchRAGChunks(userQuery, db, ragCfg),
      fetchRecentPosts(db),
      fetchRecentChannelPosts(db),
      fetchChannelsCatalog(db),
      fetchRecentPodcasts(db),
      fetchUserProfile(db, user.id),
    ]);

    console.log(`Context: ${ragChunks.length} RAG, ${recentPosts.length} posts, ${channelPosts.length} discussions, ${channels.length} channels, ${podcasts.length} podcasts, profile: ${userProfile?.full_name || 'anonymous'}`);

    // Build system message
    const now = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
    let sysMsg = `Data: ${now}\n\n${PLATFORM_STRUCTURE}\n\n`;
    
    // Add user context first for personalization
    sysMsg += buildUserContext(userProfile);
    
    if (config.system_prompt) sysMsg += config.system_prompt + "\n\n";
    if (config.system_instruction) sysMsg += config.system_instruction + "\n\n";
    sysMsg += buildRAGContext(ragChunks);
    sysMsg += buildChannelsContext(channels);
    sysMsg += buildPodcastContext(podcasts);
    sysMsg += buildPlatformContext(recentPosts, channelPosts);
    sysMsg += ANTI_HALLUCINATION;
    sysMsg += "\n\nResponda em português brasileiro. Priorize a base RAG. Seja didático. Chame o usuário pelo nome.";

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
