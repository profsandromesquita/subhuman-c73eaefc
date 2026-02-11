
# Otimizacao do Assistente IA - 8 Tarefas

## Visao Geral

Conjunto de melhorias no pipeline do Assistente IA cobrindo configuracao, busca semantica, otimizacao de contexto, logging, cache, fallback e conversao de conteudo em conhecimento RAG.

---

## Tarefa 1: Temperature e Top-P no Painel Admin

**O que muda**: Adicionar controle de `top_p` na aba "Configuracoes" da pagina `/admin/settings/ai-assistant`.

**Detalhes tecnicos**:
- Migracao SQL: adicionar coluna `top_p numeric NOT NULL DEFAULT 0.9` na tabela `ai_assistant_config`
- Atualizar `src/pages/admin/settings/AIAssistant.tsx`: adicionar Slider para top_p (0.0 a 1.0, step 0.05) ao lado do slider de temperatura existente
- Atualizar `supabase/functions/ai-assistant/index.ts`: enviar `top_p` no body da requisicao ao gateway (apenas para modelos nao-OpenAI, mesma logica da temperatura)

> Nota: O slider de temperatura ja existe. A unica adicao real e o controle de top_p.

---

## Tarefa 2: Busca Semantica no RAG

**O que muda**: Usar embeddings para busca semantica em vez de busca lexical (Full-Text Search). A busca lexical fica como fallback.

**Detalhes tecnicos**:
- Criar edge function `generate-embedding/index.ts` que chama o Lovable AI Gateway com o modelo `google/gemini-2.5-flash` para gerar embeddings via tool calling (extrair vetor). Alternativa: usar a funcao `text-embedding` do gateway se disponivel, senao usar uma abordagem hibrida onde a busca lexical e enriquecida com reranking semantico usando o proprio LLM.

**Abordagem pragmatica (recomendada)**: Como o Lovable AI Gateway nao expoe um endpoint de embeddings dedicado, a melhor estrategia e implementar **reranking semantico** no edge function:
1. Busca lexical retorna top 15 chunks (ja funciona)
2. Enviar os 15 chunks + query ao LLM com tool calling para ranquear por relevancia (0-10)
3. Retornar os top 5-8 mais relevantes

Isso melhora significativamente a qualidade sem precisar de um modelo de embeddings separado.

- Atualizar `supabase/functions/ai-assistant/index.ts`: substituir `searchRAGChunks` por funcao que faz busca lexical + reranking
- Novo parametro na config: `rag_rerank_enabled` (boolean, default true) no campo `metadata` (jsonb) da tabela `ai_assistant_config`

---

## Tarefa 3: Constituicao Condicional

**O que muda**: A constituicao so sera incluida quando a pergunta do usuario for sobre a plataforma, sua estrutura, funcionalidades ou identidade.

**Detalhes tecnicos**:
- No `ai-assistant/index.ts`, antes de chamar `searchRAGChunks`, classificar a query do usuario:
  - Lista de palavras-chave de relevancia: `["subhumano", "plataforma", "espaço", "canal", "podcast", "mentoria", "assinatura", "plano", "como funciona", "o que oferece", "quem é", "sandro", "comunidade", "premium"]`
  - Se nenhuma keyword presente na query do usuario (case-insensitive), passar `include_constitution: false`
  - Caso contrario, manter `include_constitution: true`

---

## Tarefa 4: Otimizacao de Contexto (Economia de Tokens)

**O que muda**: Reduzir drasticamente o tamanho do system prompt eliminando conteudo redundante e limitando volumes.

**Detalhes tecnicos no `ai-assistant/index.ts`**:
1. **Artigos**: Reduzir de 10 para 5 artigos, cortar preview de 200 para 100 caracteres, remover conteudo HTML (ja faz strip mas envia muito)
2. **Discussoes de canais**: Reduzir de 10 para 5 posts, cortar preview de 150 para 80 caracteres
3. **Podcasts**: Reduzir de 15 para 8, cortar descricao de 200 para 100 caracteres
4. **Canais catalog**: Ja e compacto, manter
5. **PLATFORM_STRUCTURE**: Compactar removendo linhas redundantes (de ~18 linhas para ~10)
6. **RAG chunks**: Apos reranking (tarefa 2), limitar a 5 chunks em vez de 8

Estimativa de reducao: de ~8000 tokens para ~3500 tokens no system prompt.

---

## Tarefa 5: Logging de Queries RAG

**O que muda**: Registrar cada interacao na tabela `rag_query_logs`.

**Detalhes tecnicos no `ai-assistant/index.ts`**:
- Apos a busca RAG e antes de enviar ao LLM, registrar:
  ```
  await db.from("rag_query_logs").insert({
    user_id: user.id,
    query: userQuery,
    chunks_retrieved: ragChunks.map(c => c.id),
    chunks_count: ragChunks.length,
    latency_ms: Date.now() - startTime,
    intent: constitutionRelevant ? "platform" : "general"
  });
  ```
- Adicionar `const startTime = Date.now()` no inicio do processamento

---

## Tarefa 6: Cache de Contexto

**O que muda**: Nao refazer as queries de artigos, podcasts, canais e perfil se o contexto nao mudou recentemente.

**Detalhes tecnicos**:
- Usar cache em memoria no edge function com TTL de 5 minutos para dados "estaveis":
  - `fetchRecentPosts` - cache 5min
  - `fetchRecentPodcasts` - cache 5min
  - `fetchChannelsCatalog` - cache 5min
  - `fetchRecentChannelPosts` - cache 2min (muda mais rapido)
  - `fetchUserProfile` - cache 5min por user_id
- Implementar um Map global no modulo com timestamps:
  ```
  const cache = new Map<string, { data: unknown; ts: number }>();
  function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T>
  ```
- A busca RAG **nunca** e cacheada (depende da query do usuario)

---

## Tarefa 7: Fallback da RAG

**O que muda**: Quando a busca RAG nao retorna chunks relevantes (0 resultados ou todos com rank muito baixo), o modelo deve informar explicitamente que nao tem informacao especifica e sugerir onde buscar.

**Detalhes tecnicos no `ai-assistant/index.ts`**:
- Apos a busca RAG, verificar:
  - Se `ragChunks.length === 0` ou todos os chunks (exceto constituicao) tem `rank < 0.01`
  - Nesse caso, adicionar ao system prompt um bloco especial:
    ```
    === AVISO DE CONTEXTO LIMITADO ===
    A busca na base de conhecimento NAO retornou resultados relevantes para esta pergunta.
    REGRAS:
    1. NAO invente informacoes especificas sobre modelos, precos ou capacidades
    2. Diga ao usuario que essa informacao nao esta na base de conhecimento atual
    3. Sugira que ele explore os Espacos (/spaces) ou pergunte nos Canais (/channels)
    4. Voce pode dar informacoes GERAIS sobre IA desde que deixe claro que sao conhecimento geral
    ```

---

## Tarefa 8: Converter Artigo/Post de Canal em Conhecimento RAG

**O que muda**: Botao no painel admin (SpaceContent e admin/Channels) que permite transformar um artigo publicado ou post de canal em documento RAG com um clique.

**Detalhes tecnicos**:
- Novo hook `useConvertToRAG()` em `src/hooks/useRAGDocuments.ts`:
  - Recebe `{ title, content, layer?, tags?, source_type: "space_update" | "channel_post" }`
  - Monta o source_content com frontmatter automatico:
    ```
    ---
    title: "{title}"
    layer: biblioteca
    priority: 50
    tags: ["artigo", "space_update"]
    ---
    {content_stripped_of_html}
    ```
  - Chama `ingest-document` edge function
  - Depois chama `generate-chunks` automaticamente

- **SpaceContent.tsx**: Adicionar item "Converter em RAG" no DropdownMenu de acoes de cada artigo publicado
- **admin/Channels.tsx**: Verificar se tem listagem de posts; se sim, adicionar botao similar

- Strip HTML do conteudo usando regex `content.replace(/<[^>]*>/g, '')` antes de montar o documento

---

## Correcao Pre-existente: Build Error

O erro em `usePushNotifications.ts` (Property 'pushManager') sera corrigido adicionando uma declaracao de tipo ou cast para `ServiceWorkerRegistration` que inclua `pushManager`. Isso e um fix de tipagem pre-existente e nao relacionado as 8 tarefas acima, mas sera incluido para limpar o build.

---

## Ordem de Implementacao

1. Migracao SQL (coluna `top_p`)
2. Fix build error (`usePushNotifications.ts`)
3. Edge function `ai-assistant/index.ts` (tarefas 2-7 todas no mesmo arquivo)
4. Admin UI: `AIAssistant.tsx` (tarefa 1)
5. Hook + UI: converter conteudo em RAG (tarefa 8)

## Arquivos Modificados

| Arquivo | Tarefas |
|---------|---------|
| `supabase/functions/ai-assistant/index.ts` | 2, 3, 4, 5, 6, 7 |
| `src/pages/admin/settings/AIAssistant.tsx` | 1 |
| `src/hooks/useRAGDocuments.ts` | 8 |
| `src/pages/admin/SpaceContent.tsx` | 8 |
| `src/hooks/usePushNotifications.ts` | Fix build |
| Migracao SQL | 1 (coluna top_p) |
