

# Plano de Correção Definitivo: Sistema RAG sem Embeddings Vetoriais

## Causa Raiz Confirmada

O **Lovable AI Gateway NÃO suporta modelos de embedding**. A lista de modelos permitidos é exclusivamente de modelos de chat/geração de texto:

```
allowed models: [
  openai/gpt-5-mini, openai/gpt-5, openai/gpt-5-nano, openai/gpt-5.2,
  google/gemini-2.5-pro, google/gemini-2.5-flash, google/gemini-2.5-flash-lite,
  google/gemini-2.5-flash-image, google/gemini-3-pro-preview, 
  google/gemini-3-flash-preview, google/gemini-3-pro-image-preview
]
```

Nenhum modelo de embedding (como `text-embedding-3-small`, `ada-002`, etc.) está disponível. Isso significa que a abordagem atual de RAG com busca vetorial **não pode funcionar** sem uma chave de API externa.

---

## Solucao: Sistema de Busca Hibrido (Lexical + Prioridade por Camadas)

Vou implementar um sistema de RAG que funciona **SEM embeddings**, usando:

1. **Busca textual (Full-Text Search)** com PostgreSQL `tsvector`/`tsquery`
2. **Priorização por camadas** (constituicao > nucleo > biblioteca)
3. **Filtragem por tags** para relevância contextual

---

## Mudancas Tecnicas

### 1. Atualizar Edge Function `ingest-document`

**Remover**: Toda a lógica de geração de embeddings
**Adicionar**: Indexação de chunks sem embedding (persistir texto para busca lexical)

```text
Antes:
- Gerar embedding para cada chunk
- Se falhar, descartar chunk
- Só inserir chunks com embedding

Depois:
- Gerar chunks de texto
- Inserir TODOS os chunks (sem embedding)
- Marcar documento como 'indexed' após inserir chunks
```

### 2. Atualizar Edge Function `search-chunks`

**Remover**: Busca por similaridade vetorial
**Adicionar**: Busca Full-Text Search (FTS) com PostgreSQL

```sql
-- Nova busca lexical
SELECT * FROM rag_chunks
WHERE to_tsvector('portuguese', content) @@ plainto_tsquery('portuguese', $query)
ORDER BY 
  CASE WHEN layer = 'constituicao' THEN 0 WHEN layer = 'nucleo' THEN 1 ELSE 2 END,
  priority DESC,
  ts_rank(to_tsvector('portuguese', content), plainto_tsquery('portuguese', $query)) DESC
LIMIT 10;
```

### 3. Atualizar Edge Function `ai-assistant`

**Ajustar**: Chamada de busca para usar o novo sistema lexical (sem alterações na interface)

### 4. Atualizar Funcao RPC `search_rag_chunks`

**Substituir**: Busca vetorial por busca Full-Text Search

```sql
CREATE OR REPLACE FUNCTION search_rag_chunks(
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
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.document_id,
    d.title as document_title,
    d.layer,
    c.content,
    c.priority,
    c.tags,
    ts_rank(to_tsvector('portuguese', c.content), plainto_tsquery('portuguese', query_text)) as rank
  FROM rag_chunks c
  JOIN rag_documents d ON c.document_id = d.id
  WHERE 
    d.status = 'indexed'
    AND (
      (include_constitution AND d.layer = 'constituicao')
      OR (
        to_tsvector('portuguese', c.content) @@ plainto_tsquery('portuguese', query_text)
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
$$;
```

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/ingest-document/index.ts` | Remover logica de embeddings, inserir chunks diretamente |
| `supabase/functions/search-chunks/index.ts` | Substituir busca vetorial por Full-Text Search |
| `supabase/functions/ai-assistant/index.ts` | Ajustar chamada de busca (interface mantida) |
| Migracao SQL | Criar/atualizar RPC `search_rag_chunks` para busca lexical |

---

## Vantagens desta Abordagem

1. **Funciona imediatamente** - Não depende de API de embeddings externa
2. **Sem custo adicional** - Usa apenas PostgreSQL nativo
3. **Performance boa** - Full-Text Search do PostgreSQL é otimizado
4. **Mantém hierarquia** - Constituição sempre tem prioridade máxima
5. **Compatível com futuro** - Se embeddings forem adicionados ao gateway, podemos evoluir

---

## Limitacoes (transparencia)

- Busca lexical é menos "inteligente" que busca vetorial
- Sinônimos e paráfrases não são capturados automaticamente
- Requer que termos de busca estejam presentes no texto

**Mitigação**: A Constituição sempre será incluída nos resultados (via `include_constitution = true`), garantindo que o assistente mantenha sua identidade.

---

## Fluxo Apos Implementacao

1. Indexar documento Constituição (vai funcionar)
2. Chunks serão criados na tabela `rag_chunks`
3. Assistente IA buscará via Full-Text Search
4. Constituição sempre presente nas respostas

