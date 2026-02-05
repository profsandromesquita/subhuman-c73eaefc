import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Domain vocabulary for auto-tagging (only used when no manual tags provided)
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
  'tokens': ['pricing', 'tecnico'],
  'embedding': ['embedding', 'rag'],
  'rag': ['rag', 'retrieval'],
  'prompt': ['prompting'],
  'agent': ['agentes', 'automacao'],
  'api': ['api', 'integracao'],
  'produtividade': ['produtividade'],
  'marketing': ['marketing'],
  'automação': ['automacao'],
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
  for (let i = 0; i < Math.min(5, lines.length); i++) { // Only check first 5 lines
    if (lines[i].trim() === '---') {
      startIndex = i;
      break;
    }
  }
  
  if (startIndex === -1) {
    console.log("No frontmatter opening --- found");
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
    console.log("No frontmatter closing --- found");
    return { metadata: {}, body: cleanContent, hasFrontmatter: false };
  }
  
  // Extract YAML content
  const yamlLines = lines.slice(startIndex + 1, endIndex);
  const body = lines.slice(endIndex + 1).join('\n').trim();
  
  console.log(`Frontmatter found: lines ${startIndex + 1} to ${endIndex + 1}`);
  console.log("YAML lines:", yamlLines);
  
  // Parse YAML (simple key: value parser)
  const metadata: Record<string, unknown> = {};
  
  for (const line of yamlLines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) continue; // Skip empty/comments
    
    const colonIndex = trimmedLine.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = trimmedLine.substring(0, colonIndex).trim();
    let value: string | string[] | number = trimmedLine.substring(colonIndex + 1).trim();
    
    if (!key || value === '') continue;
    
    // Handle arrays like ["tag1", "tag2"] or ['tag1', 'tag2']
    if (value.startsWith('[') && value.endsWith(']')) {
      const arrayContent = value.slice(1, -1);
      value = arrayContent
        .split(',')
        .map(item => item.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } 
    // Handle quoted strings
    else if ((value.startsWith('"') && value.endsWith('"')) || 
             (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // Handle numbers
    else if (!isNaN(Number(value)) && value !== '') {
      value = Number(value);
    }
    
    metadata[key] = value;
    console.log(`Parsed: ${key} = ${JSON.stringify(value)}`);
  }
  
  return { metadata, body, hasFrontmatter: true };
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

// Extract auto-tags from content (only when no manual tags)
function extractAutoTags(content: string, limit = 12): string[] {
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
    const { content } = await req.json();
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: "Conteúdo é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Received content length:", content.length);
    console.log("First 200 chars:", content.substring(0, 200));

    // Parse frontmatter from content (ROBUST parser)
    const { metadata, body, hasFrontmatter } = parseFrontmatter(content);
    
    console.log("Has frontmatter:", hasFrontmatter);
    console.log("Parsed metadata:", JSON.stringify(metadata));
    
    // Extract values with STRICT fallbacks
    const title = metadata.title && String(metadata.title).trim() 
      ? String(metadata.title).trim() 
      : "Documento sem título";
    
    let layer = String(metadata.layer || "biblioteca").toLowerCase();
    
    // Validate layer
    if (!["constituicao", "nucleo", "biblioteca"].includes(layer)) {
      console.log(`Invalid layer "${layer}", defaulting to biblioteca`);
      layer = "biblioteca";
    }
    
    const priority = Number(metadata.priority) || 50;
    
    // Tags: use MANUAL tags if provided, otherwise auto-generate
    const manualTags = Array.isArray(metadata.tags) ? metadata.tags.map(t => String(t).trim()).filter(Boolean) : [];
    
    let finalTags: string[];
    if (manualTags.length > 0) {
      // Manual tags provided - use ONLY these
      finalTags = manualTags;
      console.log("Using manual tags only:", finalTags);
    } else {
      // No manual tags - auto-generate from body
      finalTags = extractAutoTags(body);
      console.log("Auto-generated tags:", finalTags);
    }

    // Generate slug
    const slug = generateSlug(title) + "-" + Date.now();

    console.log(`Saving document: title="${title}", layer="${layer}", priority=${priority}, tags=[${finalTags.join(', ')}]`);

    // Insert document with PENDING status (NO automatic chunking)
    const { data: newDoc, error: insertError } = await supabaseAdmin
      .from("rag_documents")
      .insert({
        title,
        slug,
        layer,
        priority,
        source_content: content,
        status: "pending",
        tags: finalTags,
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

    console.log(`Document saved with ID: ${newDoc.id}, title: ${newDoc.title}, layer: ${newDoc.layer}`);

    return new Response(
      JSON.stringify({
        success: true,
        documentId: newDoc.id,
        title: newDoc.title,
        layer: newDoc.layer,
        priority: newDoc.priority,
        tags: newDoc.tags,
        status: "pending",
        message: "Documento salvo. Use 'Gerar Chunks' para criar os fragmentos.",
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
