import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Domain vocabulary for auto-tagging
const DOMAIN_VOCABULARY: Record<string, string[]> = {
  // Modelos OpenAI
  'gpt-5': ['openai', 'gpt', 'chatbot', 'llm'],
  'gpt-4': ['openai', 'gpt', 'chatbot', 'llm'],
  'gpt-4o': ['openai', 'gpt', 'chatbot', 'llm', 'multimodal'],
  'o1': ['openai', 'reasoning', 'llm'],
  'dall-e': ['openai', 'imagem', 'geracao'],
  'whisper': ['openai', 'audio', 'transcricao'],
  
  // Modelos Anthropic
  'claude': ['anthropic', 'chatbot', 'llm'],
  'claude-3': ['anthropic', 'chatbot', 'llm'],
  'sonnet': ['anthropic', 'chatbot', 'llm'],
  'opus': ['anthropic', 'chatbot', 'llm'],
  'haiku': ['anthropic', 'chatbot', 'llm'],
  
  // Modelos Google
  'gemini': ['google', 'multimodal', 'llm'],
  'gemini-2': ['google', 'multimodal', 'llm'],
  'bard': ['google', 'chatbot', 'llm'],
  'palm': ['google', 'llm'],
  
  // Modelos Meta
  'llama': ['meta', 'opensource', 'llm'],
  'llama-3': ['meta', 'opensource', 'llm'],
  
  // Modelos Mistral
  'mistral': ['mistral', 'opensource', 'llm'],
  'mixtral': ['mistral', 'opensource', 'llm', 'moe'],
  
  // Capacidades
  'código': ['programacao', 'dev', 'codigo'],
  'programação': ['programacao', 'dev', 'codigo'],
  'imagem': ['visao', 'multimodal', 'geracao'],
  'áudio': ['voz', 'multimodal', 'audio'],
  'vídeo': ['video', 'multimodal'],
  'visão': ['visao', 'multimodal'],
  
  // Conceitos técnicos
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
  
  // Aplicações
  'produtividade': ['aplicacao', 'produtividade'],
  'marketing': ['aplicacao', 'negocio', 'marketing'],
  'vendas': ['aplicacao', 'negocio', 'vendas'],
  'automação': ['aplicacao', 'dev', 'automacao'],
  'atendimento': ['aplicacao', 'negocio', 'atendimento'],
  'educação': ['aplicacao', 'educacao'],
  'saúde': ['aplicacao', 'saude'],
  'jurídico': ['aplicacao', 'juridico'],
  'financeiro': ['aplicacao', 'financeiro'],
  
  // Conceitos gerais
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
  
  const yamlContent = match[1];
  const body = match[2];
  
  // Simple YAML parser for basic frontmatter
  const metadata: Record<string, unknown> = {};
  const lines = yamlContent.split('\n');
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = line.substring(0, colonIndex).trim();
    let value: string | string[] | number = line.substring(colonIndex + 1).trim();
    
    // Handle arrays like ["tag1", "tag2"]
    if (value.startsWith('[') && value.endsWith(']')) {
      const arrayContent = value.slice(1, -1);
      value = arrayContent.split(',').map(item => 
        item.trim().replace(/^["']|["']$/g, '')
      ).filter(Boolean);
    } 
    // Handle quoted strings
    else if ((value.startsWith('"') && value.endsWith('"')) || 
             (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // Handle numbers
    else if (!isNaN(Number(value))) {
      value = Number(value);
    }
    
    metadata[key] = value;
  }
  
  return { metadata, body };
}

// Generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove duplicate hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 80);
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

// Generate embedding using Lovable AI Gateway
async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    // Use OpenAI text-embedding-3-small through the gateway
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
      const errorText = await response.text();
      console.error("Embedding API error:", response.status, errorText);
      return null;
    }
    
    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (error) {
    console.error("Error generating embedding:", error);
    return null;
  }
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

    // Verify user is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

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
    const { content, documentId } = await req.json();
    
    if (!content && !documentId) {
      return new Response(
        JSON.stringify({ error: "Conteúdo ou ID do documento é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let docId: string;
    let docContent: string;
    let docMetadata: Record<string, unknown>;

    // If documentId is provided, fetch existing document for re-indexing
    if (documentId) {
      const { data: existingDoc, error: fetchError } = await supabaseAdmin
        .from("rag_documents")
        .select("*")
        .eq("id", documentId)
        .single();

      if (fetchError || !existingDoc) {
        return new Response(
          JSON.stringify({ error: "Documento não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      docId = existingDoc.id;
      docContent = existingDoc.source_content;
      docMetadata = {
        title: existingDoc.title,
        layer: existingDoc.layer,
        priority: existingDoc.priority,
        tags: existingDoc.tags,
      };

      // Update status to processing
      await supabaseAdmin
        .from("rag_documents")
        .update({ status: "processing", error_message: null })
        .eq("id", docId);

      // Delete existing chunks
      await supabaseAdmin
        .from("rag_chunks")
        .delete()
        .eq("document_id", docId);
    } else {
      // New document - parse frontmatter
      const { metadata, body } = parseFrontmatter(content);
      
      const title = String(metadata.title || "Documento sem título");
      const layer = String(metadata.layer || "biblioteca");
      const priority = Number(metadata.priority) || 50;
      const manualTags = Array.isArray(metadata.tags) ? metadata.tags : [];
      
      // Validate layer
      if (!["constituicao", "nucleo", "biblioteca"].includes(layer)) {
        return new Response(
          JSON.stringify({ error: "Layer inválido. Use: constituicao, nucleo ou biblioteca" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate slug
      const slug = generateSlug(title) + "-" + Date.now();

      // Extract auto-tags
      const autoTags = extractAutoTags(body);
      const allTags = [...new Set([...manualTags, ...autoTags])];

      // Insert document with pending status
      const { data: newDoc, error: insertError } = await supabaseAdmin
        .from("rag_documents")
        .insert({
          title,
          slug,
          layer,
          priority,
          source_content: content,
          status: "processing",
          tags: allTags,
          created_by: userId,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Erro ao salvar documento" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      docId = newDoc.id;
      docContent = body;
      docMetadata = { title, layer, priority, tags: allTags };
    }

    // Chunk the content
    const { body: parsedBody } = parseFrontmatter(docContent);
    const chunks = chunkContent(parsedBody);
    
    console.log(`Processing document ${docId}: ${chunks.length} chunks to create`);
    console.log(`Document layer: ${docMetadata.layer}, priority: ${docMetadata.priority}`);

    // Process chunks and generate embeddings
    const chunkRecords = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkContent = chunks[i];
      const embedding = await generateEmbedding(chunkContent, LOVABLE_API_KEY);
      
      if (!embedding) {
        console.warn(`Failed to generate embedding for chunk ${i}`);
        continue;
      }

      // Extract tags specific to this chunk
      const chunkTags = extractAutoTags(chunkContent);
      const tokenCount = Math.ceil(chunkContent.length / 4);

      console.log(`Chunk ${i}: Generated embedding with ${embedding.length} dimensions`);

      chunkRecords.push({
        document_id: docId,
        chunk_index: i,
        content: chunkContent,
        embedding: `[${embedding.join(',')}]`, // Format correctly for pgvector
        token_count: tokenCount,
        tags: chunkTags,
        priority: Number(docMetadata.priority) || 50,
      });
    }

    // Insert chunks
    console.log(`Attempting to insert ${chunkRecords.length} chunks for document ${docId}`);
    
    if (chunkRecords.length > 0) {
      const { data: insertedChunks, error: chunksError } = await supabaseAdmin
        .from("rag_chunks")
        .insert(chunkRecords)
        .select("id");

      if (chunksError) {
        console.error("Chunks insert error:", JSON.stringify(chunksError));
        await supabaseAdmin
          .from("rag_documents")
          .update({ status: "error", error_message: chunksError.message })
          .eq("id", docId);

        return new Response(
          JSON.stringify({ error: "Erro ao salvar chunks", details: chunksError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log(`Successfully inserted ${insertedChunks?.length || 0} chunks`);
    } else {
      console.warn("No chunks were created - embedding generation may have failed");
      
      // If no chunks were created, mark as error
      await supabaseAdmin
        .from("rag_documents")
        .update({ 
          status: "error", 
          error_message: "Nenhum chunk foi criado. Verifique se o conteúdo é válido e tente novamente." 
        })
        .eq("id", docId);

      return new Response(
        JSON.stringify({ 
          error: "Nenhum chunk criado - geração de embeddings pode ter falhado",
          documentId: docId,
          chunksCreated: 0
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update document status to indexed
    await supabaseAdmin
      .from("rag_documents")
      .update({ status: "indexed" })
      .eq("id", docId);

    return new Response(
      JSON.stringify({
        success: true,
        documentId: docId,
        chunksCreated: chunkRecords.length,
        message: `Documento indexado com ${chunkRecords.length} chunks`,
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
