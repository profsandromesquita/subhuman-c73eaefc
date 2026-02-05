import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Domain vocabulary for auto-tagging
const DOMAIN_VOCABULARY: Record<string, string[]> = {
  'gpt-5': ['openai', 'gpt', 'chatbot', 'llm'],
  'gpt-4': ['openai', 'gpt', 'chatbot', 'llm'],
  'gpt-4o': ['openai', 'gpt', 'chatbot', 'llm', 'multimodal'],
  'o1': ['openai', 'reasoning', 'llm'],
  'dall-e': ['openai', 'imagem', 'geracao'],
  'whisper': ['openai', 'audio', 'transcricao'],
  'claude': ['anthropic', 'chatbot', 'llm'],
  'claude-3': ['anthropic', 'chatbot', 'llm'],
  'sonnet': ['anthropic', 'chatbot', 'llm'],
  'opus': ['anthropic', 'chatbot', 'llm'],
  'haiku': ['anthropic', 'chatbot', 'llm'],
  'gemini': ['google', 'multimodal', 'llm'],
  'gemini-2': ['google', 'multimodal', 'llm'],
  'bard': ['google', 'chatbot', 'llm'],
  'palm': ['google', 'llm'],
  'llama': ['meta', 'opensource', 'llm'],
  'llama-3': ['meta', 'opensource', 'llm'],
  'mistral': ['mistral', 'opensource', 'llm'],
  'mixtral': ['mistral', 'opensource', 'llm', 'moe'],
  'código': ['programacao', 'dev', 'codigo'],
  'programação': ['programacao', 'dev', 'codigo'],
  'imagem': ['visao', 'multimodal', 'geracao'],
  'áudio': ['voz', 'multimodal', 'audio'],
  'vídeo': ['video', 'multimodal'],
  'visão': ['visao', 'multimodal'],
  'tokens': ['pricing', 'contexto', 'tecnico'],
  'contexto': ['contexto', 'tecnico'],
  'temperatura': ['parametros', 'config', 'tecnico'],
  'fine-tuning': ['treinamento', 'customizacao', 'tecnico'],
  'fine tuning': ['treinamento', 'customizacao', 'tecnico'],
  'embedding': ['embedding', 'rag', 'tecnico'],
  'rag': ['rag', 'tecnico', 'retrieval'],
  'prompt': ['prompting', 'tecnico'],
  'agent': ['agentes', 'tecnico', 'automacao'],
  'agente': ['agentes', 'tecnico', 'automacao'],
  'api': ['api', 'integracao', 'tecnico'],
  'produtividade': ['aplicacao', 'produtividade'],
  'marketing': ['aplicacao', 'negocio', 'marketing'],
  'vendas': ['aplicacao', 'negocio', 'vendas'],
  'automação': ['aplicacao', 'dev', 'automacao'],
  'atendimento': ['aplicacao', 'negocio', 'atendimento'],
  'educação': ['aplicacao', 'educacao'],
  'saúde': ['aplicacao', 'saude'],
  'jurídico': ['aplicacao', 'juridico'],
  'financeiro': ['aplicacao', 'financeiro'],
  'inteligência artificial': ['ia', 'conceito'],
  'machine learning': ['ml', 'conceito', 'tecnico'],
  'deep learning': ['dl', 'conceito', 'tecnico'],
  'neural': ['neural', 'conceito', 'tecnico'],
  'transformer': ['transformer', 'arquitetura', 'tecnico'],
};

// Parse YAML frontmatter from markdown content
function parseFrontmatter(content: string): { metadata: Record<string, unknown>; body: string } {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return { metadata: {}, body: content };
  }
  
  return { metadata: {}, body: match[2] };
}

// Extract auto-tags from content based on domain vocabulary
function extractAutoTags(content: string): string[] {
  const contentLower = content.toLowerCase();
  const tags = new Set<string>();
  
  for (const [keyword, relatedTags] of Object.entries(DOMAIN_VOCABULARY)) {
    if (contentLower.includes(keyword.toLowerCase())) {
      relatedTags.forEach(tag => tags.add(tag));
    }
  }
  
  return Array.from(tags);
}

// Split content into chunks with overlap
function chunkContent(content: string, maxTokens = 600, overlapTokens = 100): string[] {
  // Approximate: 1 token ≈ 4 characters for Portuguese
  const charsPerToken = 4;
  const maxChars = maxTokens * charsPerToken;
  const overlapChars = overlapTokens * charsPerToken;
  
  const chunks: string[] = [];
  
  // Split by paragraphs first
  const paragraphs = content.split(/\n\n+/);
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    if (!trimmedParagraph) continue;
    
    // If paragraph alone exceeds max, split it by sentences
    if (trimmedParagraph.length > maxChars) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      // Split by sentences
      const sentences = trimmedParagraph.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        if ((currentChunk + ' ' + sentence).length > maxChars) {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
            // Keep overlap
            const words = currentChunk.split(/\s+/);
            const overlapWords = Math.floor(overlapChars / 6); // Avg word length
            currentChunk = words.slice(-overlapWords).join(' ');
          }
        }
        currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence;
      }
    } 
    // Check if adding paragraph exceeds max
    else if ((currentChunk + '\n\n' + trimmedParagraph).length > maxChars) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        // Keep some overlap from previous chunk
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
  
  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify admin authentication
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

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Check admin role using service role client
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

    // Parse request body
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

    // Parse content and generate chunks
    const { body } = parseFrontmatter(document.source_content);
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

    // Build chunk records (lexical mode - no embeddings)
    const chunkRecords = chunks.map((chunkText, i) => {
      const chunkTags = extractAutoTags(chunkText);
      const tokenCount = Math.ceil(chunkText.length / 4);

      return {
        document_id: documentId,
        chunk_index: i,
        content: chunkText,
        embedding: null, // Lexical mode - no embeddings
        token_count: tokenCount,
        tags: chunkTags,
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
