import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Domain vocabulary for auto-tagging chunks
const DOMAIN_VOCABULARY: Record<string, string[]> = {
  'gpt-5': ['openai', 'gpt', 'llm'],
  'gpt-4': ['openai', 'gpt', 'llm'],
  'claude': ['anthropic', 'llm'],
  'gemini': ['google', 'llm'],
  'llama': ['meta', 'opensource', 'llm'],
  'mistral': ['mistral', 'opensource', 'llm'],
  'código': ['programacao', 'dev'],
  'programação': ['programacao', 'dev'],
  'imagem': ['visao', 'multimodal'],
  'áudio': ['audio', 'multimodal'],
  'vídeo': ['video', 'multimodal'],
  'embedding': ['embedding', 'rag'],
  'rag': ['rag', 'retrieval'],
  'prompt': ['prompting'],
  'agent': ['agentes', 'automacao'],
  'api': ['api', 'integracao'],
};

/**
 * ROBUST Frontmatter Parser
 * Handles:
 * - BOM characters at start
 * - Whitespace before/after ---
 * - Different line endings (\r\n, \n)
 * - Blank lines in frontmatter
 */
function parseFrontmatter(content: string): { 
  metadata: Record<string, unknown>; 
  body: string;
  hasFrontmatter: boolean;
} {
  // Remove BOM if present
  let cleanContent = content.replace(/^\uFEFF/, '');
  
  // Normalize line endings
  cleanContent = cleanContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Split into lines
  const lines = cleanContent.split('\n');
  
  // Find opening --- (allow leading whitespace)
  let startIndex = -1;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    if (lines[i].trim() === '---') {
      startIndex = i;
      break;
    }
  }
  
  if (startIndex === -1) {
    return { metadata: {}, body: cleanContent, hasFrontmatter: false };
  }
  
  // Find closing ---
  let endIndex = -1;
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIndex = i;
      break;
    }
  }
  
  if (endIndex === -1) {
    return { metadata: {}, body: cleanContent, hasFrontmatter: false };
  }
  
  // Extract body WITHOUT frontmatter
  const body = lines.slice(endIndex + 1).join('\n').trim();
  
  console.log(`Frontmatter removed: body starts at line ${endIndex + 2}, length ${body.length}`);
  
  return { metadata: {}, body, hasFrontmatter: true };
}

// Extract auto-tags from content
function extractAutoTags(content: string, limit = 8): string[] {
  const contentLower = content.toLowerCase();
  const tags = new Set<string>();
  
  for (const [keyword, relatedTags] of Object.entries(DOMAIN_VOCABULARY)) {
    if (contentLower.includes(keyword.toLowerCase())) {
      relatedTags.forEach(tag => {
        if (tags.size < limit) tags.add(tag);
      });
    }
    if (tags.size >= limit) break;
  }
  
  return Array.from(tags);
}

// Split content into chunks with overlap
function chunkContent(content: string, maxTokens = 600, overlapTokens = 100): string[] {
  const charsPerToken = 4;
  const maxChars = maxTokens * charsPerToken;
  const overlapChars = overlapTokens * charsPerToken;
  
  const chunks: string[] = [];
  const paragraphs = content.split(/\n\n+/);
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    if (!trimmedParagraph) continue;
    
    if (trimmedParagraph.length > maxChars) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      const sentences = trimmedParagraph.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        if ((currentChunk + ' ' + sentence).length > maxChars) {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
            const words = currentChunk.split(/\s+/);
            const overlapWords = Math.floor(overlapChars / 6);
            currentChunk = words.slice(-overlapWords).join(' ');
          }
        }
        currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence;
      }
    } 
    else if ((currentChunk + '\n\n' + trimmedParagraph).length > maxChars) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        const words = currentChunk.split(/\s+/);
        const overlapWords = Math.floor(overlapChars / 6);
        currentChunk = words.slice(-overlapWords).join(' ') + '\n\n' + trimmedParagraph;
      } else {
        currentChunk = trimmedParagraph;
      }
    } else {
      currentChunk = currentChunk ? currentChunk + '\n\n' + trimmedParagraph : trimmedParagraph;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "moderator"]);

    if (!roleData || roleData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Acesso restrito a administradores" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { documentId } = await req.json();
    
    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "ID do documento é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch document
    const { data: document, error: fetchError } = await supabaseAdmin
      .from("rag_documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (fetchError || !document) {
      return new Response(
        JSON.stringify({ error: "Documento não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating chunks for document: ${document.id} (${document.title})`);

    // Update status to processing
    await supabaseAdmin
      .from("rag_documents")
      .update({ status: "processing", error_message: null })
      .eq("id", documentId);

    // Delete existing chunks for this document
    const { error: deleteError } = await supabaseAdmin
      .from("rag_chunks")
      .delete()
      .eq("document_id", documentId);

    if (deleteError) {
      console.error("Error deleting existing chunks:", deleteError);
    }

    // Parse content - REMOVE FRONTMATTER before chunking
    const { body, hasFrontmatter } = parseFrontmatter(document.source_content);
    
    console.log(`Content parsed. Had frontmatter: ${hasFrontmatter}. Body length: ${body.length}`);
    console.log(`Body first 200 chars: ${body.substring(0, 200)}`);
    
    const chunks = chunkContent(body);
    
    console.log(`Generated ${chunks.length} chunks for document ${documentId}`);

    if (chunks.length === 0) {
      await supabaseAdmin
        .from("rag_documents")
        .update({ status: "error", error_message: "Conteúdo vazio após processamento" })
        .eq("id", documentId);

      return new Response(
        JSON.stringify({ error: "Conteúdo vazio", documentId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Document tags (manual tags from frontmatter)
    const documentTags: string[] = Array.isArray(document.tags) ? document.tags : [];

    // Build chunk records
    const chunkRecords = chunks.map((chunkText, i) => {
      // Auto-tags for this specific chunk
      const autoTags = extractAutoTags(chunkText);
      
      // Combine document tags + chunk auto-tags, dedupe, limit to 15
      const combinedTags = [...new Set([...documentTags, ...autoTags])].slice(0, 15);
      
      const tokenCount = Math.ceil(chunkText.length / 4);

      return {
        document_id: documentId,
        chunk_index: i,
        content: chunkText,
        embedding: null, // Lexical mode
        token_count: tokenCount,
        tags: combinedTags,
        priority: document.priority || 50,
      };
    });

    // Insert all chunks
    const { data: insertedChunks, error: chunksError } = await supabaseAdmin
      .from("rag_chunks")
      .insert(chunkRecords)
      .select("id");

    if (chunksError) {
      console.error("Chunks insert error:", JSON.stringify(chunksError));
      await supabaseAdmin
        .from("rag_documents")
        .update({ status: "error", error_message: chunksError.message })
        .eq("id", documentId);

      return new Response(
        JSON.stringify({ error: "Erro ao salvar chunks", details: chunksError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Successfully inserted ${insertedChunks?.length || 0} chunks`);

    // Update document status to indexed
    await supabaseAdmin
      .from("rag_documents")
      .update({ status: "indexed", updated_at: new Date().toISOString() })
      .eq("id", documentId);

    return new Response(
      JSON.stringify({
        success: true,
        documentId,
        chunksCreated: chunkRecords.length,
        message: `${chunkRecords.length} chunks gerados com sucesso`,
      }),
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
