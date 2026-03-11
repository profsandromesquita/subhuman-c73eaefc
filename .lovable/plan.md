

# Filtro de Score Mínimo nos Chunks RAG

Inserir um filtro entre o fallback por tags (linha 487) e o reranking (linha 490), descartando chunks com rank abaixo de um threshold configurável.

## Mudanças (arquivo único: `supabase/functions/ai-assistant/index.ts`)

### 1. Extrair `rag_score_threshold` do ragCfg (linha 452)

**Antes:**
```ts
const ragCfg = (config.metadata || {}) as { rag_top_k?: number; rag_enabled?: boolean; rag_rerank_enabled?: boolean };
```

**Depois:**
```ts
const ragCfg = (config.metadata || {}) as { rag_top_k?: number; rag_enabled?: boolean; rag_rerank_enabled?: boolean; rag_score_threshold?: number };
```

### 2. Adicionar filtro por score após fallback por tags (entre linhas 487 e 489)

**Antes:**
```ts
    // Tarefa 2: Semantic reranking (usa userQuery original para contexto, não keywords)
    let ragChunks = finalRawChunks;
    const shouldRerank = ragCfg.rag_rerank_enabled !== false && finalRawChunks.length > 3;
```

**Depois:**
```ts
    // Filtro de score mínimo — descarta chunks irrelevantes ANTES do reranking
    const scoreThreshold = ragCfg.rag_score_threshold ?? 0.05;
    const filteredChunks = finalRawChunks.filter(c =>
      (c.rank ?? 0) >= scoreThreshold || c.layer === 'constituicao'
    );
    if (filteredChunks.length < finalRawChunks.length) {
      console.log(`Score filter: ${finalRawChunks.length} → ${filteredChunks.length} chunks (threshold: ${scoreThreshold})`);
    }

    // Tarefa 2: Semantic reranking (usa userQuery original para contexto, não keywords)
    let ragChunks = filteredChunks;
    const shouldRerank = ragCfg.rag_rerank_enabled !== false && filteredChunks.length > 3;
```

### 3. Atualizar reranking e slice para usar `filteredChunks` (linhas 492-496)

**Antes:**
```ts
    if (shouldRerank) {
      ragChunks = await rerankChunks(userQuery, finalRawChunks, API_KEY);
    } else {
      ragChunks = finalRawChunks.slice(0, 5);
    }
```

**Depois:**
```ts
    if (shouldRerank) {
      ragChunks = await rerankChunks(userQuery, filteredChunks, API_KEY);
    } else {
      ragChunks = filteredChunks.slice(0, 5);
    }
```

### 4. Atualizar `hasRelevantRAG` para usar o mesmo threshold (linhas 500-501)

**Antes:**
```ts
    const hasRelevantRAG = nonConstitutionChunks.length > 0 && 
      nonConstitutionChunks.some(c => (c.rank ?? 0) >= 0.01);
```

**Depois:**
```ts
    const hasRelevantRAG = nonConstitutionChunks.length > 0 && 
      nonConstitutionChunks.some(c => (c.rank ?? 0) >= scoreThreshold);
```

## Resumo

- 4 edições pontuais no mesmo arquivo
- Nenhuma query SQL alterada
- Nenhuma lógica de reranking ou buildRAGContext alterada
- O threshold é configurável via campo `metadata.rag_score_threshold` da tabela `ai_assistant_config` (default 0.05)

