
-- Fix RAG lexical search: websearch_to_tsquery + hyphen normalization
CREATE OR REPLACE FUNCTION public.search_rag_chunks_lexical(
  query_text text,
  match_count integer DEFAULT 10,
  filter_tags text[] DEFAULT NULL::text[],
  filter_layer text DEFAULT NULL::text,
  include_constitution boolean DEFAULT true
)
RETURNS TABLE(
  id uuid,
  document_id uuid,
  document_title text,
  layer text,
  content text,
  priority integer,
  tags text[],
  rank real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  search_query tsquery;
  normalized_text text;
BEGIN
  -- Bug Fix 1: Normalize hyphens before tokenizing
  -- 'GPT-5.2' -> 'GPT 5.2' so tokens match user queries without hyphen
  normalized_text := regexp_replace(query_text, '([A-Za-z0-9])-([A-Za-z0-9])', '\1 \2', 'g');
  
  -- Bug Fix 2: Use websearch_to_tsquery instead of plainto_tsquery
  -- websearch_to_tsquery supports OR logic and phrases, much more flexible than AND-only plainto_tsquery
  BEGIN
    search_query := websearch_to_tsquery('portuguese', normalized_text);
  EXCEPTION WHEN OTHERS THEN
    -- Fallback: try simple plainto for safety
    BEGIN
      search_query := plainto_tsquery('portuguese', normalized_text);
    EXCEPTION WHEN OTHERS THEN
      -- Last resort: use english dictionary
      search_query := plainto_tsquery('english', normalized_text);
    END;
  END;

  RETURN QUERY
  SELECT 
    c.id,
    c.document_id,
    d.title as document_title,
    d.layer,
    c.content,
    c.priority,
    c.tags,
    CASE 
      WHEN d.layer = 'constituicao' THEN 1000.0::real
      ELSE ts_rank(
        -- Also normalize hyphens in indexed content for matching
        to_tsvector('portuguese', regexp_replace(c.content, '([A-Za-z0-9])-([A-Za-z0-9])', '\1 \2', 'g')),
        search_query
      )
    END as rank
  FROM rag_chunks c
  JOIN rag_documents d ON c.document_id = d.id
  WHERE 
    d.status = 'indexed'
    AND (
      -- Always include constitution documents if requested
      (include_constitution AND d.layer = 'constituicao')
      OR (
        -- Lexical match with normalized content and websearch_to_tsquery
        to_tsvector('portuguese', regexp_replace(c.content, '([A-Za-z0-9])-([A-Za-z0-9])', '\1 \2', 'g')) @@ search_query
        AND (filter_tags IS NULL OR c.tags && filter_tags)
        AND (filter_layer IS NULL OR d.layer = filter_layer)
      )
    )
  ORDER BY 
    CASE WHEN d.layer = 'constituicao' THEN 0 WHEN d.layer = 'nucleo' THEN 1 ELSE 2 END,
    c.priority DESC,
    rank DESC
  LIMIT match_count;
END;
$function$;
