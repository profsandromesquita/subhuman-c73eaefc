
# Plano de Implementação: Sistema RAG para o Subhumano

## Visão Geral

Este plano implementa um sistema RAG (Retrieval-Augmented Generation) completo para o Assistente IA da plataforma Subhumano, permitindo respostas baseadas em conhecimento especializado sobre Inteligência Artificial, modelos LLM, tecnologia e inovação.

---

## Arquitetura do Sistema

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUXO DE INGESTÃO                                   │
│                                                                             │
│  Admin Upload → Parse YAML/MD → Chunking → Embedding → Save to DB          │
│       │              │              │           │            │              │
│       ▼              ▼              ▼           ▼            ▼              │
│  [Markdown]   [Frontmatter]   [Chunks]    [Vectors]   [rag_chunks]          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUXO DE CONSULTA                                   │
│                                                                             │
│  User Query → Query Embedding → Vector Search → Rank → Prompt Assembly → LLM│
│       │              │               │           │           │           │  │
│       ▼              ▼               ▼           ▼           ▼           ▼  │
│  [Message]     [Embedding]      [RPC Call]   [Chunks]   [Context]   [Response]│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## FASE 1: Estrutura de Banco de Dados

### 1.1 Tabela `rag_documents` - Documentos Fonte

Armazena os documentos originais com metadados.

```sql
CREATE TABLE rag_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  layer text NOT NULL CHECK (layer IN ('constituicao', 'nucleo', 'biblioteca')),
  priority integer NOT NULL DEFAULT 50,
  source_content text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'indexed', 'error')),
  error_message text,
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 1.2 Tabela `rag_chunks` - Chunks Indexados

Armazena os chunks com embeddings para busca vetorial.

```sql
CREATE TABLE rag_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES rag_documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding vector(768),  -- Dimensão para google/embedding-001
  token_count integer,
  tags text[] DEFAULT '{}',
  priority integer NOT NULL DEFAULT 50,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Índice para busca vetorial usando IVFFlat
CREATE INDEX rag_chunks_embedding_idx ON rag_chunks 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Índices auxiliares
CREATE INDEX rag_chunks_document_id_idx ON rag_chunks(document_id);
CREATE INDEX rag_chunks_priority_idx ON rag_chunks(priority DESC);
CREATE INDEX rag_chunks_tags_idx ON rag_chunks USING gin(tags);
```

### 1.3 Tabela `rag_query_logs` - Logs de Consultas (Métricas)

```sql
CREATE TABLE rag_query_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  query text NOT NULL,
  intent text,
  chunks_retrieved uuid[],
  response_tokens integer,
  latency_ms integer,
  created_at timestamptz DEFAULT now()
);
```

### 1.4 Políticas RLS

```sql
-- rag_documents: Admins gerenciam, sistema lê
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage rag_documents" ON rag_documents
  FOR ALL USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "System can read indexed documents" ON rag_documents
  FOR SELECT USING (status = 'indexed');

-- rag_chunks: Admins gerenciam, assinantes leem
ALTER TABLE rag_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage rag_chunks" ON rag_chunks
  FOR ALL USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Authenticated users can read chunks" ON rag_chunks
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- rag_query_logs: Admins veem tudo, usuários veem próprios
ALTER TABLE rag_query_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all query logs" ON rag_query_logs
  FOR SELECT USING (is_admin_or_moderator(auth.uid()));

CREATE POLICY "Users can view own query logs" ON rag_query_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert query logs" ON rag_query_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 1.5 Função de Busca Vetorial (RPC)

```sql
CREATE OR REPLACE FUNCTION search_rag_chunks(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10,
  filter_tags text[] DEFAULT NULL,
  filter_layer text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
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
  SELECT 
    c.id,
    c.document_id,
    c.content,
    c.priority,
    c.tags,
    1 - (c.embedding <=> query_embedding) as similarity
  FROM rag_chunks c
  JOIN rag_documents d ON c.document_id = d.id
  WHERE 
    d.status = 'indexed'
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
    AND (filter_tags IS NULL OR c.tags && filter_tags)
    AND (filter_layer IS NULL OR d.layer = filter_layer)
  ORDER BY 
    c.priority DESC,
    similarity DESC
  LIMIT match_count;
END;
$$;
```

---

## FASE 2: Edge Functions

### 2.1 `ingest-document` - Ingestão de Documentos

Processa documentos Markdown com frontmatter YAML:

**Funcionalidades:**
1. Parse frontmatter YAML (title, layer, priority, tags)
2. Chunking inteligente (400-800 tokens, 50-100 overlap)
3. Geração de embeddings via Lovable AI
4. Extração automática de tags baseada em vocabulário do domínio
5. Salvamento no banco com status tracking

**Estrutura do documento esperado:**
```yaml
---
title: "GPT-5: O Modelo mais Avançado da OpenAI"
layer: nucleo
priority: 85
tags: ["openai", "gpt-5", "llm", "chat"]
---

# Conteúdo em Markdown aqui...
```

**Vocabulário de domínio (auto-tagging):**
```typescript
const DOMAIN_VOCABULARY = {
  // Modelos
  'gpt-5': ['openai', 'gpt', 'chatbot'],
  'claude': ['anthropic', 'chatbot'],
  'gemini': ['google', 'multimodal'],
  
  // Capacidades
  'código': ['programacao', 'dev'],
  'imagem': ['visao', 'multimodal'],
  'áudio': ['voz', 'multimodal'],
  
  // Conceitos
  'tokens': ['pricing', 'contexto'],
  'temperatura': ['parametros', 'config'],
  'fine-tuning': ['treinamento', 'customizacao'],
  
  // Aplicações
  'produtividade': ['aplicacao', 'uso'],
  'marketing': ['aplicacao', 'negocio'],
  'automação': ['aplicacao', 'dev']
};
```

### 2.2 `search-chunks` - Busca de Chunks

**Funcionalidades:**
1. Recebe query do usuário
2. Gera embedding da query via Lovable AI
3. Executa busca vetorial via RPC
4. Aplica re-ranking por prioridade
5. Retorna chunks ordenados

### 2.3 Atualização do `ai-assistant`

Modificar a edge function existente para:
1. Chamar `search-chunks` internamente
2. Montar prompt com camadas de conhecimento
3. Incluir CONSTITUIÇÃO sempre (priority >= 100)
4. Adicionar chunks relevantes ao contexto
5. Registrar consulta em `rag_query_logs`

**Ordem de montagem do prompt:**
```text
1. IDENTIDADE (Constituição - sempre presente)
   └── Manifesto, valores, tom de voz, limites

2. INSTRUÇÕES DE RESPOSTA
   └── Como formatar, o que evitar, estilo

3. CONTEXTO RAG (Chunks recuperados)
   └── Ordenados por priority + similarity

4. HISTÓRICO DA CONVERSA
   └── Mensagens anteriores do usuário

5. PERGUNTA ATUAL
   └── Última mensagem do usuário
```

---

## FASE 3: Interface Admin

### 3.1 Nova Página: `/admin/rag/documents` - Gestão de Documentos

**Funcionalidades:**
- Lista de documentos com status (pending, processing, indexed, error)
- Upload de arquivo Markdown ou input de texto
- Botão de re-indexação individual
- Exclusão com confirmação
- Filtros por layer, status, tags

### 3.2 Nova Página: `/admin/rag/chunks` - Visualização de Chunks

**Funcionalidades:**
- Tabela com busca e filtros
- Preview do conteúdo do chunk
- Indicador de prioridade visual
- Agrupamento por documento
- Estatísticas de uso

### 3.3 Nova Página: `/admin/rag/test` - Teste de RAG

**Funcionalidades:**
- Input para query de teste
- Visualização dos chunks retornados
- Scores de similaridade
- Preview do prompt montado
- Botão para enviar ao LLM e ver resposta

### 3.4 Atualização: `/admin/settings/ai-assistant` - Adicionar aba RAG

**Novos campos:**
- Threshold de similaridade (slider 0.3-0.8)
- TopK padrão (3-15)
- Habilitar/desabilitar RAG
- Configuração do vocabulário de domínio

---

## FASE 4: Arquivos a Criar/Modificar

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/ingest-document/index.ts` | Edge function para ingestão |
| `supabase/functions/search-chunks/index.ts` | Edge function para busca vetorial |
| `src/pages/admin/rag/Documents.tsx` | Página de gestão de documentos |
| `src/pages/admin/rag/Chunks.tsx` | Página de visualização de chunks |
| `src/pages/admin/rag/Test.tsx` | Página de teste de RAG |
| `src/hooks/useRAGDocuments.ts` | Hook para CRUD de documentos |
| `src/hooks/useRAGChunks.ts` | Hook para chunks |
| `src/hooks/useRAGSearch.ts` | Hook para busca de teste |

### Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `supabase/functions/ai-assistant/index.ts` | Integrar busca RAG antes de chamar LLM |
| `src/components/admin/AdminSidebar.tsx` | Adicionar menu "Base de Conhecimento RAG" |
| `src/pages/admin/settings/AIAssistant.tsx` | Adicionar aba de configurações RAG |
| `src/App.tsx` | Adicionar rotas /admin/rag/* |
| `supabase/config.toml` | Registrar novas edge functions |

---

## FASE 5: Documento de Constituição (Inicial)

Criar documento seed com a identidade do Subhumano:

```markdown
---
title: "Constituição do Subhumano"
layer: constituicao
priority: 100
tags: ["identidade", "manifesto", "regras"]
---

# Identidade do Subhumano

Você é o assistente oficial da plataforma Subhumano, especializado em 
Inteligência Artificial e tecnologia.

## Propósito

Desmistificar e democratizar o conhecimento sobre IA, ajudando pessoas 
a entenderem e utilizarem modelos de linguagem de forma prática.

## Tom de Voz

- Acessível e descontraído, nunca arrogante
- Técnico quando necessário, didático sempre
- Entusiasmado com IA, mas realista sobre limitações

## Regras Absolutas

1. NUNCA inventar informações sobre modelos ou preços
2. SEMPRE indicar quando não souber algo
3. Priorizar informações da base de conhecimento
4. Responder em português brasileiro
```

---

## Estimativa de Esforço

| Fase | Componentes | Complexidade |
|------|-------------|--------------|
| Fase 1 | Banco de dados + RPC | Média |
| Fase 2 | Edge functions (3) | Alta |
| Fase 3 | Interface admin (3 páginas) | Média |
| Fase 4 | Integração + hooks | Média |
| Fase 5 | Seed documents | Baixa |

---

## Dependências Técnicas

1. **Extensão pgvector** - Para busca vetorial (já disponível no Supabase)
2. **Lovable AI Gateway** - Para gerar embeddings (modelo: text-embedding-3-small ou equivalente)
3. **Parser YAML** - js-yaml para frontmatter

---

## Próximos Passos após Aprovação

1. Criar migração com tabelas e função RPC
2. Implementar edge function `ingest-document`
3. Implementar edge function `search-chunks`
4. Modificar `ai-assistant` para usar RAG
5. Criar páginas admin
6. Inserir documento de Constituição
7. Testar fluxo completo

