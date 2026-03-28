import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============ TYPES ============
interface RAGChunk { id: string; content: string; document_title: string; layer: string; priority: number; rank?: number; }
interface SpaceUpdate { id: string; title: string; slug: string; content: string; published_at: string; spaces: { name: string; slug: string }; }
interface ChannelPost { id: string; title: string | null; content: string; created_at: string; author_id: string | null; channels: { name: string; slug: string }; author_name?: string; }
interface Channel { id: string; name: string; description: string | null; access_type: string; slug: string | null; }
interface Podcast { id: string; title: string; slug: string; description: string | null; published_at: string; spaces: { name: string; slug: string } | null; }
interface UserProfile { 
  full_name: string | null; city: string | null; state: string | null; 
  occupation_type: string | null; job_title: string | null; company_name: string | null; 
  industry: string | null; ai_experience_level: string | null; goals: string | null; 
}

// ============ CACHE (Tarefa 6) ============
const cache = new Map<string, { data: unknown; ts: number }>();

async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < ttlMs) {
    return entry.data as T;
  }
  const data = await fn();
  cache.set(key, { data, ts: Date.now() });
  return data;
}

// ============ DATA FETCHERS ============
// deno-lint-ignore no-explicit-any
async function fetchChannelsCatalog(db: any): Promise<Channel[]> {
  return cached("channels_catalog", 5 * 60_000, async () => {
    const { data } = await db.from("channels").select("id, name, description, access_type, slug").eq("is_active", true).order("sort_order");
    return (data || []) as Channel[];
  });
}

// deno-lint-ignore no-explicit-any
async function fetchUserProfile(db: any, userId: string): Promise<UserProfile | null> {
  return cached(`profile_${userId}`, 5 * 60_000, async () => {
    const { data, error } = await db
      .from("profiles")
      .select("full_name, city, state, occupation_type, job_title, company_name, industry, ai_experience_level, goals")
      .eq("id", userId).single();
    if (error) { console.error("Profile fetch error:", error); return null; }
    return data as UserProfile;
  });
}

// deno-lint-ignore no-explicit-any
async function fetchRecentPodcasts(db: any): Promise<Podcast[]> {
  return cached("recent_podcasts", 5 * 60_000, async () => {
    const ago = new Date(); ago.setDate(ago.getDate() - 60);
    const { data, error } = await db.from("podcasts")
      .select("id, title, slug, description, published_at, spaces(name, slug)")
      .eq("is_published", true).gte("published_at", ago.toISOString())
      .order("published_at", { ascending: false }).limit(8); // Tarefa 4: 15→8
    if (error) { console.error("Podcasts fetch error:", error); return []; }
    return (data || []) as Podcast[];
  });
}

// deno-lint-ignore no-explicit-any
async function fetchRecentPosts(db: any): Promise<SpaceUpdate[]> {
  return cached("recent_posts", 5 * 60_000, async () => {
    const ago = new Date(); ago.setDate(ago.getDate() - 30);
    const { data } = await db.from("space_updates")
      .select("id, title, slug, content, published_at, spaces!inner(name, slug)")
      .eq("is_published", true).gte("published_at", ago.toISOString())
      .order("published_at", { ascending: false }).limit(5); // Tarefa 4: 15→5
    return (data || []) as SpaceUpdate[];
  });
}

// deno-lint-ignore no-explicit-any
async function fetchRecentChannelPosts(db: any): Promise<ChannelPost[]> {
  return cached("recent_channel_posts", 2 * 60_000, async () => {
    const ago = new Date(); ago.setDate(ago.getDate() - 7);
    const { data: posts } = await db.from("channel_posts")
      .select("id, title, content, created_at, author_id, channels!inner(name, slug)")
      .eq("is_moderated", false).gte("created_at", ago.toISOString())
      .order("created_at", { ascending: false }).limit(10); // Tarefa 4: 20→10
    if (!posts?.length) return [];
    const authorIds = [...new Set(posts.map((p: ChannelPost) => p.author_id).filter(Boolean))] as string[];
    const profilesMap: Record<string, string> = {};
    if (authorIds.length) {
      const { data: profiles } = await db.from("profiles").select("id, full_name").in("id", authorIds);
      profiles?.forEach((p: { id: string; full_name: string | null }) => { profilesMap[p.id] = p.full_name || "Usuário"; });
    }
    return posts.map((p: ChannelPost) => ({ ...p, author_name: p.author_id ? (profilesMap[p.author_id] || "Usuário") : "Usuário" }));
  });
}

// ============ SYNONYM NORMALIZATION (Correção 2) ============
// Resolve aliases comuns ANTES do FTS para corrigir "ChatGPT" → "GPT"
const AI_SYNONYMS: Record<string, string> = {
  "chatgpt": "gpt",
  "chat gpt": "gpt",
  "chat-gpt": "gpt",
  "openai gpt": "gpt openai",
  "gpt 5": "gpt",
  "chatgpt4": "gpt-4 gpt4",
  "chatgpt3": "gpt-3 gpt3",
  "grok": "grok xai",
  "claude": "claude anthropic",
  "gemini": "gemini google",
  "bard": "gemini google bard",
  "copilot": "copilot microsoft",
  "llama": "llama meta",
  "mistral": "mistral ai",
  "deepseek": "deepseek ai",
};

function normalizeSynonyms(query: string): string {
  let normalized = query.toLowerCase();
  for (const [alias, replacement] of Object.entries(AI_SYNONYMS)) {
    // Usa word boundary para não substituir "gpt4" em "gpt4o" por ex
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    normalized = normalized.replace(new RegExp(`\\b${escaped}\\b`, "g"), replacement);
  }
  return normalized;
}

// ============ KEYWORD EXTRACTION (Correção 1 — limiar 80→30, Correção 4 — prompt melhorado) ============
// Para mensagens > 30 chars, extrai termos técnicos antes do FTS
// Evita que websearch_to_tsquery gere 28 tokens em AND
async function extractSearchQuery(userMessage: string, apiKey: string): Promise<string> {
  const trimmed = userMessage.trim();
  // CORREÇÃO 1: limiar reduzido de 80 → 30 chars
  // "Quais as características do chatgpt 5.2?" (47 chars) agora passa pela extração
  if (trimmed.length <= 30) return trimmed;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            // CORREÇÃO 4: prompt explica conversão ChatGPT → GPT-X.X
            content: `Você é um extrator de palavras-chave para busca em base de conhecimento sobre IA.
Dado uma mensagem do usuário, extraia APENAS os 3-5 termos técnicos mais importantes.
REGRAS:
- Preserve versões exatas: "GPT-5.2", "Claude-3.5", "Gemini-2.0" (mantenha o hífen!)
- IMPORTANTE: "ChatGPT" e "ChatGPT-X.X" devem ser convertidos para "GPT-X.X openai". Exemplo: "ChatGPT 5.2" → "GPT-5.2 openai"
- Inclua nomes de modelos, empresas, tecnologias, versões
- Retorne APENAS os termos separados por espaço, sem explicação
- Máximo 10 palavras total
EXEMPLOS:
"Quero criar um GPT personalizado especialista em requisitos usando modelo 5.2 Thinking" → "GPT-5.2 thinking model openai requisitos"
"Como o Claude da Anthropic se compara ao ChatGPT para programação?" → "Claude Anthropic GPT programação comparação"
"Quais as características do chatgpt 5.2?" → "GPT-5.2 openai características"
"O que é o ChatGPT 5.3?" → "GPT-5.3 openai system card"`
          },
          { role: "user", content: trimmed.substring(0, 500) }
        ],
        max_tokens: 50,
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      console.warn("extractSearchQuery failed:", res.status, "— using truncated original");
      return trimmed.substring(0, 100);
    }

    const data = await res.json();
    const extracted = data.choices?.[0]?.message?.content?.trim();
    if (extracted && extracted.length > 0 && extracted.length <= 200) {
      console.log(`Query extracted: "${trimmed.substring(0, 50)}..." → "${extracted}"`);
      return extracted;
    }
  } catch (e) {
    console.warn("extractSearchQuery error:", e);
  }

  // Fallback: usa os primeiros 100 chars da mensagem original
  return trimmed.substring(0, 100);
}

// ============ RAG SEARCH (Tarefa 2 - Reranking Semântico) ============
// deno-lint-ignore no-explicit-any
async function searchRAGChunks(query: string, db: any, cfg: { rag_top_k?: number; rag_enabled?: boolean }): Promise<RAGChunk[]> {
  if (cfg.rag_enabled === false) return [];
  const { data, error } = await db.rpc("search_rag_chunks_lexical", {
    query_text: query,
    match_count: 15, // Fetch more for reranking
    include_constitution: false, // Tarefa 3: handled separately
  });
  if (error) { console.error("RAG search error:", error); return []; }
  return (data || []) as RAGChunk[];
}

// ============ TAG FALLBACK SEARCH (Correção 3) ============
// Quando FTS retorna 0, busca por sobreposição de tags nos documentos
// Documentos GPT-5.2 têm tags ["llm", "openai", "gpt-5.2"] — encontrável mesmo sem match lexical
// deno-lint-ignore no-explicit-any
async function searchByTags(query: string, db: any): Promise<RAGChunk[]> {
  // Extrai tokens com pelo menos 2 chars, incluindo tokens com hífen
  const rawTokens = query.toLowerCase().split(/\s+/).filter(t => t.length >= 2);
  // Também adiciona variantes com hífen: "5.2" → "gpt-5.2" etc
  const tokens = [...new Set(rawTokens)];
  if (!tokens.length) return [];

  try {
    const { data, error } = await db
      .from("rag_chunks")
      .select("id, content, document_id, priority, rag_documents!inner(title, layer, status, tags)")
      .eq("rag_documents.status", "indexed")
      .overlaps("rag_documents.tags", tokens)
      .limit(10);

    if (error) { console.error("Tag fallback error:", error); return []; }

    return (data || []).map((row: { id: string; content: string; priority: number; rag_documents: { title: string; layer: string; tags: string[] } }) => ({
      id: row.id,
      content: row.content,
      document_title: row.rag_documents?.title || "",
      layer: row.rag_documents?.layer || "",
      priority: row.priority,
      rank: 0.1, // low rank — tag match only
    })) as RAGChunk[];
  } catch (e) {
    console.error("Tag fallback exception:", e);
    return [];
  }
}

// Semantic reranking via LLM tool calling
async function rerankChunks(query: string, chunks: RAGChunk[], apiKey: string): Promise<RAGChunk[]> {
  if (chunks.length <= 3) return chunks; // Not worth reranking few results
  
  const chunkSummaries = chunks.slice(0, 12).map((c, i) => 
    `[${i}] ${c.document_title}: ${c.content.substring(0, 150)}`
  ).join("\n");

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Você é um ranqueador de relevância. Dado uma query e chunks, retorne os índices dos chunks mais relevantes." },
          { role: "user", content: `Query: "${query}"\n\nChunks:\n${chunkSummaries}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "rank_chunks",
            description: "Retorna os índices dos chunks mais relevantes para a query, ordenados por relevância.",
            parameters: {
              type: "object",
              properties: {
                ranked_indices: {
                  type: "array",
                  items: { type: "integer" },
                  description: "Índices dos chunks mais relevantes (máximo 5), do mais para o menos relevante"
                }
              },
              required: ["ranked_indices"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "rank_chunks" } },
      }),
    });

    if (!res.ok) {
      console.error("Rerank failed:", res.status);
      return chunks.slice(0, 5);
    }

    const data = await res.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return chunks.slice(0, 5);

    const { ranked_indices } = JSON.parse(toolCall.function.arguments);
    const reranked = (ranked_indices as number[])
      .filter((i: number) => i >= 0 && i < chunks.length)
      .slice(0, 5)
      .map((i: number) => chunks[i]);

    return reranked.length > 0 ? reranked : chunks.slice(0, 5);
  } catch (e) {
    console.error("Rerank error:", e);
    return chunks.slice(0, 5); // Fallback to first 5
  }
}

// ============ CONSTITUTION RELEVANCE (Tarefa 3) ============
const PLATFORM_KEYWORDS = [
  "subhumano", "plataforma", "espaço", "espaços", "canal", "canais", "podcast", "podcasts",
  "mentoria", "mentorias", "assinatura", "assinaturas", "plano", "planos", "como funciona",
  "o que oferece", "quem é", "sandro", "comunidade", "premium", "o que é isso", "sobre a plataforma",
  "funcionalidades", "recursos", "navegação", "como usar", "onde encontro"
];

function isConstitutionRelevant(query: string): boolean {
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return PLATFORM_KEYWORDS.some(kw => {
    const normalized = kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return q.includes(normalized);
  });
}

// Fetch constitution chunks separately when needed
// deno-lint-ignore no-explicit-any
async function fetchConstitutionChunks(db: any): Promise<RAGChunk[]> {
  return cached("constitution_chunks", 10 * 60_000, async () => {
    const { data, error } = await db.rpc("search_rag_chunks_lexical", {
      query_text: "plataforma subhumano",
      match_count: 5,
      include_constitution: true,
      filter_layer: "constituicao",
    });
    if (error) { console.error("Constitution fetch error:", error); return []; }
    // Only return constitution layer chunks
    return ((data || []) as RAGChunk[]).filter(c => c.layer === "constituicao");
  });
}

// ============ CONTEXT BUILDERS (Tarefa 4 - Otimizado) ============
function buildRAGContext(chunks: RAGChunk[], constitutionChunks: RAGChunk[], maxChunkChars = 2000): string {
  const truncate = (text: string) => text.length > maxChunkChars ? text.substring(0, maxChunkChars) + "..." : text;
  let ctx = "";
  if (constitutionChunks.length) {
    ctx += "[IDENTIDADE E DIRETRIZES]\n" + constitutionChunks.map(c => truncate(c.content)).join("\n\n") + "\n\n";
  }
  const nonConst = chunks.filter(c => c.layer !== "constituicao");
  if (nonConst.length) {
    ctx += "[BASE DE CONHECIMENTO]\n" + nonConst.map(c => `[${c.document_title}]\n${truncate(c.content)}`).join("\n\n") + "\n\n";
  }
  return ctx;
}

function buildChannelsContext(channels: Channel[]): string {
  if (!channels.length) return "";
  const labels: Record<string, string> = { open: "aberto", subscribers: "assinantes", premium: "premium" };
  return "\n[CANAIS DA PLATAFORMA]\n" + channels.map(c => `- ${c.name} (${labels[c.access_type] || c.access_type})`).join("\n") + "\nNÃO invente Discord/LinkedIn.\n";
}

function buildUserContext(profile: UserProfile | null): string {
  if (!profile?.full_name) return "";
  const firstName = profile.full_name.split(" ")[0];
  let ctx = `\n[PERFIL DO USUÁRIO]\nNome: ${firstName}`;
  if (profile.city && profile.state) ctx += ` | ${profile.city}/${profile.state}`;
  if (profile.job_title) ctx += ` | ${profile.job_title}`;
  if (profile.ai_experience_level) ctx += ` | Nível IA: ${profile.ai_experience_level}`;
  if (profile.goals) ctx += `\nObjetivos: ${profile.goals}`;
  ctx += `\nChame pelo nome: ${firstName}\n`;
  return ctx;
}

function buildPodcastContext(podcasts: Podcast[]): string {
  if (!podcasts.length) return "";
  return "\n[PODCASTS RECENTES — últimos 8 episódios publicados nos últimos 60 dias]\n" + podcasts.map(p => {
    const date = new Date(p.published_at).toLocaleDateString("pt-BR");
    const desc = p.description ? ` - ${p.description.substring(0, 100)}` : "";
    return `🎙️ [${p.title}](/podcasts/${p.slug}) ${date}${desc}`;
  }).join("\n") + "\n";
}

function buildPlatformContext(posts: SpaceUpdate[], chPosts: ChannelPost[]): string {
  let ctx = "";
  if (posts.length) {
    ctx += "\n[ARTIGOS RECENTES — últimos 5 artigos publicados nos últimos 30 dias]\n" + posts.slice(0, 5).map(p => {
      const d = new Date(p.published_at).toLocaleDateString("pt-BR");
      const spaceSlug = p.spaces?.slug || "geral";
      return `[${p.spaces?.name}] [${p.title}](/spaces/${spaceSlug}/post/${p.slug || p.id}) - ${d}\n${p.content?.replace(/<[^>]*>/g, '').substring(0, 100)}`;
    }).join("\n\n") + "\n";
  }
  if (chPosts.length) {
    ctx += "\n[DISCUSSÕES RECENTES]\n" + chPosts.slice(0, 5).map(p => {
      const d = new Date(p.created_at).toLocaleDateString("pt-BR");
      return `[${p.channels?.name}] @${p.author_name} ${d}: ${p.content?.replace(/<[^>]*>/g, '').substring(0, 80)}`;
    }).join("\n") + "\n";
  }
  return ctx;
}

// Tarefa 4: Compactado
const PLATFORM_STRUCTURE = `[ESTRUTURA DA PLATAFORMA]
1. ESPAÇOS (/spaces): Artigos e tutoriais dos administradores
2. CANAIS (/channels): Fóruns da comunidade
3. PODCASTS (/podcasts): Episódios de áudio sobre IA
4. MENTORIAS: Sessões com Prof. Sandro Mesquita
Links: Artigos → /spaces/{slug}/post/{slug} | Podcasts → /podcasts/{slug}
"fóruns/dúvidas" → CANAIS | "artigos/tutoriais" → ESPAÇOS | "áudio" → PODCASTS`;

const ANTI_HALLUCINATION = `\n[REGRAS DE SEGURANÇA]
1. NÃO invente Discord/LinkedIn/Telegram
2. Use APENAS links que aparecem no contexto
3. Se não souber: "Não encontrei na base de conhecimento"
4. NÃO invente nomes, datas ou especificações`;

// Bug Fix 3: RAG_FALLBACK harmonizado — não instrui a negar existência de docs
const RAG_FALLBACK = `\n[AVISO DE BUSCA]
A busca automática na base de conhecimento não retornou resultados específicos para esta consulta.
IMPORTANTE: Isso pode ser uma limitação técnica da busca, NÃO necessariamente ausência do dado.
INSTRUÇÕES:
1. Responda com seu conhecimento geral sobre o tema, deixando CLARO que é conhecimento geral
2. NÃO afirme que um modelo, versão ou informação "não está na base" — isso pode ser impreciso
3. Se não tiver certeza sobre algo específico, diga "Não tenho essa informação confirmada"
4. Mencione que a base de conhecimento do Subhumano pode ter mais detalhes nos Espaços (/spaces)
5. NUNCA invente especificações técnicas, datas de lançamento ou capacidades de modelos`;

// ============ MAIN HANDLER ============
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const startTime = Date.now(); // Tarefa 5: timing

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
    if (!config) {
      return new Response(JSON.stringify({ error: "Assistente não configurado" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!API_KEY) {
      return new Response(JSON.stringify({ error: "API não configurada" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userQuery = [...messages].reverse().find((m: { role: string }) => m.role === "user")?.content || "";
    const ragCfg = (config.metadata || {}) as { rag_top_k?: number; rag_enabled?: boolean; rag_rerank_enabled?: boolean; rag_score_threshold?: number; max_history_messages?: number; max_system_chars?: number; max_chunk_chars?: number };

    // Token budgeting: trim history
    const maxHistoryMessages = (ragCfg.max_history_messages as number) ?? 20;
    const trimmedMessages = messages.length > maxHistoryMessages
      ? messages.slice(-maxHistoryMessages)
      : messages;
    if (messages.length > maxHistoryMessages) {
      console.log(`[TOKEN BUDGET] History trimmed: ${messages.length} → ${trimmedMessages.length} messages`);
    }

    // Tarefa 3: Check if constitution is relevant
    const needsConstitution = isConstitutionRelevant(userQuery);

    // CORREÇÃO 2: Normaliza sinônimos ANTES de extrair keywords e ANTES do FTS
    // "chatgpt 5.2" → "gpt 5.2" para que o FTS encontre documentos que usam "GPT-5.2"
    const normalizedUserQuery = normalizeSynonyms(userQuery);

    // CORREÇÃO 1+4: Extract focused keywords (agora com limiar 30 e prompt melhorado)
    // "Quais as características do chatgpt 5.2?" (47 chars, já normalizado para "gpt 5.2") 
    // → extractSearchQuery() → "GPT-5.2 openai características"
    const searchQuery = await extractSearchQuery(normalizedUserQuery, API_KEY);

    // Parallel fetches with cache (Tarefa 6)
    const [rawRagChunks, recentPosts, channelPosts, channels, podcasts, userProfile, constitutionChunks] = await Promise.all([
      searchRAGChunks(searchQuery, db, ragCfg),
      fetchRecentPosts(db),
      fetchRecentChannelPosts(db),
      fetchChannelsCatalog(db),
      fetchRecentPodcasts(db),
      fetchUserProfile(db, user.id),
      needsConstitution ? fetchConstitutionChunks(db) : Promise.resolve([]),
    ]);

    // CORREÇÃO 3: Fallback por tags quando FTS retornou 0 resultados
    // Documentos GPT-5.2 têm tags ["llm", "openai", "gpt-5.2"] → encontrável via overlaps
    let finalRawChunks = rawRagChunks;
    if (rawRagChunks.length === 0 && ragCfg.rag_enabled !== false) {
      console.log(`FTS returned 0 results for "${searchQuery}" — trying tag fallback...`);
      const tagResults = await searchByTags(searchQuery, db);
      if (tagResults.length > 0) {
        console.log(`Tag fallback found ${tagResults.length} chunks`);
        finalRawChunks = tagResults;
      }
    }

    // Filtro de score mínimo — descarta chunks irrelevantes ANTES do reranking
    const scoreThreshold = ragCfg.rag_score_threshold ?? 0.05;
    const filteredChunks = finalRawChunks.filter(c =>
      (c.rank ?? 0) >= scoreThreshold || c.layer === 'constituicao'
    );
    if (filteredChunks.length < finalRawChunks.length) {
      console.log(`Score filter: ${finalRawChunks.length} → ${filteredChunks.length} chunks (threshold: ${scoreThreshold})`);
    }

    // Tarefa 2: Semantic reranking (usa userQuery original para contexto, não keywords)
    let ragChunks = filteredChunks;
    const shouldRerank = ragCfg.rag_rerank_enabled !== false && filteredChunks.length > 3;
    if (shouldRerank) {
      ragChunks = await rerankChunks(userQuery, filteredChunks, API_KEY);
    } else {
      ragChunks = filteredChunks.slice(0, 5);
    }

    // Tarefa 7: Check if RAG returned relevant results
    const nonConstitutionChunks = ragChunks.filter(c => c.layer !== "constituicao");
    const hasRelevantRAG = nonConstitutionChunks.length > 0 && 
      nonConstitutionChunks.some(c => (c.rank ?? 0) >= scoreThreshold);

    console.log(`Context: ${ragChunks.length} RAG (reranked: ${shouldRerank}), constitution: ${needsConstitution}(${constitutionChunks.length}), ${recentPosts.length} posts, ${channelPosts.length} discussions, ${channels.length} channels, ${podcasts.length} podcasts, profile: ${userProfile?.full_name || 'anon'}, latency: ${Date.now() - startTime}ms, normalized: "${normalizedUserQuery.substring(0, 60)}", searchQuery: "${searchQuery}"`);

    // Tarefa 5: Log RAG query
    try {
      await db.from("rag_query_logs").insert({
        user_id: user.id,
        query: userQuery.substring(0, 500),
        chunks_retrieved: ragChunks.map(c => c.id),
        chunks_count: ragChunks.length,
        latency_ms: Date.now() - startTime,
        intent: needsConstitution ? "platform" : "general",
      });
    } catch (logErr) {
      console.error("Log error (non-fatal):", logErr);
    }

    // Build system message (Tarefa 4: Otimizado)
    const now = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
    let sysMsg = `Data: ${now}\n\n${PLATFORM_STRUCTURE}\n`;
    sysMsg += buildUserContext(userProfile);
    if (config.system_prompt) sysMsg += "\n[INSTRUÇÕES DO ASSISTENTE]\n" + config.system_prompt + "\n";
    if (config.system_instruction) sysMsg += "[INSTRUÇÕES ADICIONAIS]\n" + config.system_instruction + "\n";
    const maxChunkChars = (ragCfg.max_chunk_chars as number) ?? 2000;
    sysMsg += buildRAGContext(ragChunks, constitutionChunks, maxChunkChars);
    
    // Tarefa 7: Add fallback warning if no relevant RAG
    if (!hasRelevantRAG && !needsConstitution) {
      sysMsg += RAG_FALLBACK;
    }
    
    sysMsg += buildChannelsContext(channels);
    sysMsg += buildPodcastContext(podcasts);
    sysMsg += buildPlatformContext(recentPosts, channelPosts);
    sysMsg += ANTI_HALLUCINATION;
    sysMsg += "\n\nResponda em português brasileiro. Siga estritamente as regras definidas em [INSTRUÇÕES DO ASSISTENTE] e [INSTRUÇÕES ADICIONAIS].";

    // Token budgeting: truncate system message
    const maxSysMsgChars = (ragCfg.max_system_chars as number) ?? 30000;
    if (sysMsg.length > maxSysMsgChars) {
      console.log(`[TOKEN BUDGET] sysMsg truncated: ${sysMsg.length} → ${maxSysMsgChars} chars`);
      sysMsg = sysMsg.substring(0, maxSysMsgChars);
    }

    const model = config.model || "google/gemini-3-flash-preview";
    const isOpenAI = model.startsWith("openai/");
    // deno-lint-ignore no-explicit-any
    const body: Record<string, any> = { model, messages: [{ role: "system", content: sysMsg }, ...trimmedMessages], stream: true };
    if (!isOpenAI) {
      body.temperature = Number(config.temperature) || 0.7;
      body.top_p = Number(config.top_p) || 0.9;
    }
    body[isOpenAI ? "max_completion_tokens" : "max_tokens"] = config.max_tokens || 2048;

    console.log(`[TOKEN DEBUG] sysMsg: ${sysMsg.length} chars (~${Math.round(sysMsg.length/4)} tokens) | history: ${trimmedMessages.length} msgs (original: ${messages.length}), ${JSON.stringify(trimmedMessages).length} chars (~${Math.round(JSON.stringify(trimmedMessages).length/4)} tokens)`);

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
