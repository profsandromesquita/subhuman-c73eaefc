import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Domain vocabulary (same as generate-chunks) ──────────────────────
const DOMAIN_VOCABULARY: Record<string, string[]> = {
  "gpt-5": ["openai", "gpt", "llm"],
  "gpt-4": ["openai", "gpt", "llm"],
  claude: ["anthropic", "llm"],
  gemini: ["google", "llm"],
  llama: ["meta", "opensource", "llm"],
  mistral: ["mistral", "opensource", "llm"],
  código: ["programacao", "dev"],
  programação: ["programacao", "dev"],
  imagem: ["visao", "multimodal"],
  áudio: ["audio", "multimodal"],
  vídeo: ["video", "multimodal"],
  embedding: ["embedding", "rag"],
  rag: ["rag", "retrieval"],
  prompt: ["prompting"],
  agent: ["agentes", "automacao"],
  api: ["api", "integracao"],
};

function extractAutoTags(content: string, limit = 8): string[] {
  const contentLower = content.toLowerCase();
  const tags = new Set<string>();
  for (const [keyword, relatedTags] of Object.entries(DOMAIN_VOCABULARY)) {
    if (contentLower.includes(keyword.toLowerCase())) {
      relatedTags.forEach((tag) => {
        if (tags.size < limit) tags.add(tag);
      });
    }
    if (tags.size >= limit) break;
  }
  return Array.from(tags);
}

function chunkContent(
  content: string,
  maxTokens = 600,
  overlapTokens = 100
): string[] {
  const charsPerToken = 4;
  const maxChars = maxTokens * charsPerToken;
  const overlapChars = overlapTokens * charsPerToken;
  const chunks: string[] = [];
  const paragraphs = content.split(/\n\n+/);
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    if (trimmed.length > maxChars) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }
      const sentences = trimmed.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        if ((currentChunk + " " + sentence).length > maxChars) {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
            const words = currentChunk.split(/\s+/);
            const overlapWords = Math.floor(overlapChars / 6);
            currentChunk = words.slice(-overlapWords).join(" ");
          }
        }
        currentChunk = currentChunk
          ? currentChunk + " " + sentence
          : sentence;
      }
    } else if (
      (currentChunk + "\n\n" + trimmed).length > maxChars
    ) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        const words = currentChunk.split(/\s+/);
        const overlapWords = Math.floor(overlapChars / 6);
        currentChunk =
          words.slice(-overlapWords).join(" ") + "\n\n" + trimmed;
      } else {
        currentChunk = trimmed;
      }
    } else {
      currentChunk = currentChunk
        ? currentChunk + "\n\n" + trimmed
        : trimmed;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
}

// ── Helpers ──────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function buildSourceContent(
  article: { title: string; slug: string; published_at: string; content: string },
  space: { name: string; slug: string }
): string {
  const date = new Date(article.published_at).toLocaleDateString("pt-BR");
  const body = stripHtml(article.content || "");
  return `Artigo publicado no espaço ${space.name} em ${date}.\nTítulo: ${article.title}\nURL: /spaces/${space.slug}/post/${article.slug}\n\n${body}`;
}

function buildTags(spaceSlug: string, title: string): string[] {
  const stopWords = new Set([
    "o","a","os","as","de","do","da","dos","das","em","no","na","nos","nas",
    "um","uma","uns","umas","por","para","com","como","que","se","e","ou",
    "mas","ao","à","às","pelo","pela","pelos","pelas","este","esta","esse",
    "essa","aquele","aquela","isso","isto","aquilo","sobre","entre","até",
  ]);
  const words = title
    .toLowerCase()
    .replace(/[^a-záàâãéèêíïóôõúç0-9\s-]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
  const unique = [...new Set(["artigo", spaceSlug, ...words])];
  return unique.slice(0, 8);
}

// ── Index a single article ───────────────────────────────────────────

interface ArticleRow {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  space_id: string;
  published_at: string;
  is_published: boolean;
  spaces: { name: string; slug: string };
}

async function indexSingleArticle(
  db: ReturnType<typeof createClient>,
  article: ArticleRow,
  userId: string
): Promise<{ document_id: string; chunks_count: number }> {
  const space = article.spaces;
  const sourceContent = buildSourceContent(
    { title: article.title, slug: article.slug, published_at: article.published_at, content: article.content || "" },
    space
  );
  const tags = buildTags(space.slug, article.title);
  const docSlug = `article-${space.slug}-${article.slug}`;
  const metadata = {
    source_type: "article",
    article_id: article.id,
    space_id: article.space_id,
    space_slug: space.slug,
    published_at: article.published_at,
  };

  // Check if rag_document already exists for this article
  const { data: existingDocs } = await db
    .from("rag_documents")
    .select("id")
    .eq("metadata->>article_id", article.id)
    .limit(1);

  let documentId: string;

  if (existingDocs && existingDocs.length > 0) {
    documentId = existingDocs[0].id;
    // Update existing document
    await db
      .from("rag_documents")
      .update({
        source_content: sourceContent,
        title: `[Artigo] ${article.title}`,
        tags,
        metadata,
        status: "processing",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);
    // Delete old chunks
    await db.from("rag_chunks").delete().eq("document_id", documentId);
    console.log(`Updated existing RAG document ${documentId} for article ${article.id}`);
  } else {
    // Create new document
    const { data: newDoc, error: insertErr } = await db
      .from("rag_documents")
      .insert({
        title: `[Artigo] ${article.title}`,
        slug: docSlug,
        layer: "biblioteca",
        priority: 65,
        source_content: sourceContent,
        tags,
        metadata,
        status: "processing",
        created_by: userId,
      })
      .select("id")
      .single();
    if (insertErr || !newDoc) throw new Error(`Insert doc failed: ${insertErr?.message}`);
    documentId = newDoc.id;
    console.log(`Created new RAG document ${documentId} for article ${article.id}`);
  }

  // Generate chunks
  const chunks = chunkContent(sourceContent);
  if (chunks.length === 0) {
    await db
      .from("rag_documents")
      .update({ status: "error", error_message: "Conteúdo vazio após processamento" })
      .eq("id", documentId);
    return { document_id: documentId, chunks_count: 0 };
  }

  const chunkRecords = chunks.map((text, i) => {
    const autoTags = extractAutoTags(text);
    const combinedTags = [...new Set([...tags, ...autoTags])].slice(0, 15);
    return {
      document_id: documentId,
      chunk_index: i,
      content: text,
      embedding: null,
      token_count: Math.ceil(text.length / 4),
      tags: combinedTags,
      priority: 65,
    };
  });

  const { error: chunksErr } = await db.from("rag_chunks").insert(chunkRecords);
  if (chunksErr) {
    await db
      .from("rag_documents")
      .update({ status: "error", error_message: chunksErr.message })
      .eq("id", documentId);
    throw new Error(`Chunks insert failed: ${chunksErr.message}`);
  }

  await db
    .from("rag_documents")
    .update({ status: "indexed", updated_at: new Date().toISOString() })
    .eq("id", documentId);

  console.log(`Indexed article "${article.title}" → ${chunks.length} chunks`);
  return { document_id: documentId, chunks_count: chunks.length };
}

// ── Main handler ─────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const db = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify admin/moderator
    const { data: roleData } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "moderator"]);

    if (!roleData || roleData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Acesso restrito a administradores" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    // ── Backfill mode ────────────────────────────────────────────────
    if (body.action === "backfill") {
      const { data: articles, error: artErr } = await db
        .from("space_updates")
        .select("id, title, slug, content, space_id, published_at, is_published, spaces!inner(name, slug)")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (artErr) throw new Error(`Fetch articles failed: ${artErr.message}`);

      // Get existing article RAG documents
      const { data: existingDocs } = await db
        .from("rag_documents")
        .select("metadata")
        .eq("metadata->>source_type", "article");

      const indexedArticleIds = new Set(
        (existingDocs || []).map((d: any) => d.metadata?.article_id).filter(Boolean)
      );

      let indexed = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const article of articles || []) {
        if (indexedArticleIds.has(article.id)) {
          skipped++;
          continue;
        }
        try {
          await indexSingleArticle(db, article as ArticleRow, user.id);
          indexed++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${article.title}: ${msg}`);
          console.error(`Error indexing article ${article.id}:`, msg);
        }
      }

      console.log(`Backfill complete: ${indexed} indexed, ${skipped} skipped, ${errors.length} errors`);

      return new Response(
        JSON.stringify({ success: true, indexed, skipped, errors }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Single article mode ──────────────────────────────────────────
    const { article_id } = body;
    if (!article_id) {
      return new Response(
        JSON.stringify({ error: "article_id ou action é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: article, error: fetchErr } = await db
      .from("space_updates")
      .select("id, title, slug, content, space_id, published_at, is_published, spaces!inner(name, slug)")
      .eq("id", article_id)
      .single();

    if (fetchErr || !article) {
      return new Response(
        JSON.stringify({ error: "Artigo não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!article.is_published) {
      return new Response(
        JSON.stringify({ error: "Artigo não está publicado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await indexSingleArticle(db, article as ArticleRow, user.id);

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
