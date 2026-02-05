-- Enable the pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- TABELA: rag_documents - Documentos Fonte
-- =====================================================
CREATE TABLE public.rag_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  layer text NOT NULL CHECK (layer IN ('constituicao', 'nucleo', 'biblioteca')),
  priority integer NOT NULL DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),
  source_content text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'indexed', 'error')),
  error_message text,
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_rag_documents_updated_at
  BEFORE UPDATE ON public.rag_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices
CREATE INDEX rag_documents_layer_idx ON public.rag_documents(layer);
CREATE INDEX rag_documents_status_idx ON public.rag_documents(status);
CREATE INDEX rag_documents_priority_idx ON public.rag_documents(priority DESC);
CREATE INDEX rag_documents_tags_idx ON public.rag_documents USING gin(tags);

-- =====================================================
-- TABELA: rag_chunks - Chunks Indexados com Embeddings
-- =====================================================
CREATE TABLE public.rag_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.rag_documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  token_count integer,
  tags text[] DEFAULT '{}',
  priority integer NOT NULL DEFAULT 50,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Índice para busca vetorial usando IVFFlat
CREATE INDEX rag_chunks_embedding_idx ON public.rag_chunks 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Índices auxiliares
CREATE INDEX rag_chunks_document_id_idx ON public.rag_chunks(document_id);
CREATE INDEX rag_chunks_priority_idx ON public.rag_chunks(priority DESC);
CREATE INDEX rag_chunks_tags_idx ON public.rag_chunks USING gin(tags);
CREATE UNIQUE INDEX rag_chunks_document_chunk_idx ON public.rag_chunks(document_id, chunk_index);

-- =====================================================
-- TABELA: rag_query_logs - Logs de Consultas (Métricas)
-- =====================================================
CREATE TABLE public.rag_query_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  query text NOT NULL,
  intent text,
  chunks_retrieved uuid[],
  chunks_count integer DEFAULT 0,
  response_tokens integer,
  latency_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX rag_query_logs_user_id_idx ON public.rag_query_logs(user_id);
CREATE INDEX rag_query_logs_created_at_idx ON public.rag_query_logs(created_at DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- rag_documents
ALTER TABLE public.rag_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage rag_documents" ON public.rag_documents
  FOR ALL USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Authenticated can read indexed documents" ON public.rag_documents
  FOR SELECT USING (status = 'indexed' AND auth.uid() IS NOT NULL);

-- rag_chunks
ALTER TABLE public.rag_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage rag_chunks" ON public.rag_chunks
  FOR ALL USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Authenticated users can read chunks" ON public.rag_chunks
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- rag_query_logs
ALTER TABLE public.rag_query_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all query logs" ON public.rag_query_logs
  FOR SELECT USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Users can view own query logs" ON public.rag_query_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated can insert query logs" ON public.rag_query_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- FUNÇÃO RPC: Busca Vetorial
-- =====================================================
CREATE OR REPLACE FUNCTION public.search_rag_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10,
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
  priority int,
  tags text[],
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_chunks AS (
    SELECT 
      c.id,
      c.document_id,
      d.title as document_title,
      d.layer,
      c.content,
      c.priority,
      c.tags,
      1 - (c.embedding <=> query_embedding) as similarity
    FROM rag_chunks c
    JOIN rag_documents d ON c.document_id = d.id
    WHERE 
      d.status = 'indexed'
      AND c.embedding IS NOT NULL
      AND (
        -- Always include constitution documents if requested
        (include_constitution AND d.layer = 'constituicao')
        OR (
          1 - (c.embedding <=> query_embedding) > match_threshold
          AND (filter_tags IS NULL OR c.tags && filter_tags)
          AND (filter_layer IS NULL OR d.layer = filter_layer)
        )
      )
  )
  SELECT * FROM ranked_chunks
  ORDER BY 
    -- Constitution always first
    CASE WHEN ranked_chunks.layer = 'constituicao' THEN 0 ELSE 1 END,
    ranked_chunks.priority DESC,
    ranked_chunks.similarity DESC
  LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.search_rag_chunks TO authenticated;