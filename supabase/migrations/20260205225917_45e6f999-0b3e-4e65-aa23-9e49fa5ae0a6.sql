-- Create lexical search function (Full-Text Search without embeddings)
CREATE OR REPLACE FUNCTION search_rag_chunks_lexical(
  query_text text,
  match_count integer DEFAULT 10,
  filter_tags text[] DEFAULT NULL,
  filter_layer text DEFAULT NULL,
  include_constitution boolean DEFAULT true
)
RETURNS TABLE (
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
SET search_path = 'public'
AS $$
DECLARE
  search_query tsquery;
BEGIN
  -- Build tsquery from user input (handles Portuguese)
  search_query := plainto_tsquery('portuguese', query_text);
  
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
      WHEN d.layer = 'constituicao' THEN 1000.0::real -- Constitution always max rank
      ELSE ts_rank(to_tsvector('portuguese', c.content), search_query)
    END as rank
  FROM rag_chunks c
  JOIN rag_documents d ON c.document_id = d.id
  WHERE 
    d.status = 'indexed'
    AND (
      -- Always include constitution documents if requested
      (include_constitution AND d.layer = 'constituicao')
      OR (
        -- Lexical match with tsquery
        to_tsvector('portuguese', c.content) @@ search_query
        AND (filter_tags IS NULL OR c.tags && filter_tags)
        AND (filter_layer IS NULL OR d.layer = filter_layer)
      )
    )
  ORDER BY 
    -- Constitution always first
    CASE WHEN d.layer = 'constituicao' THEN 0 WHEN d.layer = 'nucleo' THEN 1 ELSE 2 END,
    c.priority DESC,
    rank DESC
  LIMIT match_count;
END;
$$;

-- Create index on content for Full-Text Search performance
CREATE INDEX IF NOT EXISTS idx_rag_chunks_content_fts 
ON rag_chunks USING gin(to_tsvector('portuguese', content));