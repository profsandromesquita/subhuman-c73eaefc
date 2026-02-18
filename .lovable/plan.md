
# Diagnóstico e Correção do Fluxo RAG do Assistente IA

## Análise da Causa Raiz (3 bugs identificados)

### Bug 1 — Falha Crítica no Tokenizer: "5.2" vs "-5.2"

Este é o bug principal e mais grave. O PostgreSQL Full-Text Search (FTS) trata hífens como separadores, então o título **"GPT-5.2"** gera o token **`-5.2`** (com hífen à esquerda) no tsvector do documento. Mas quando o usuário escreve **"5.2"** sem hífen, a query gera o token **`5.2`** (sem hífen).

Resultado: o match NUNCA ocorre porque `-5.2 ≠ 5.2`.

Confirmado via query direta:
```
to_tsvector('portuguese', 'GPT-5.2 é o modelo') 
→ tokens: gpt | -5.2 | model

plainto_tsquery('portuguese', 'GPT 5.2') 
→ query: 'gpt' & '5.2'    ← token '5.2' não existe no doc!

plainto_tsquery('portuguese', 'GPT-5.2')  
→ query: 'gpt' & '-5.2'   ← ESSE corresponderia!
```

Os documentos "GPT-5.2 - System Card" e "GPT-5.2-Codex - System Card" existem na base, estão indexados (status: `indexed`), têm chunks, mas **nunca são encontrados** quando o usuário escreve "5.2" sem hífen.

### Bug 2 — `plainto_tsquery` usa AND: query longa = zero resultados

O `plainto_tsquery` conecta TODOS os termos com `AND`. A query do usuário tinha 28 tokens: `'quer' & 'cri' & 'gpt' & 'personaliz' & 'engenh' & 'requisit' & ... & 'instructions'`. Um único chunk jamais pode conter todos esses 28 termos simultaneamente.

Comprovado nos logs do banco: **`chunks_count: 0`** para as 3 consultas do usuário (incluindo a pergunta sobre GPT 5.2 e sobre GPT 5.3).

A função `searchRAGChunks` usa o `userQuery` completo (a mensagem inteira do usuário) diretamente como `query_text` para o FTS — sem extração de entidades ou palavras-chave.

### Bug 3 — Fallback RAG com instrução contraditória

Quando `hasRelevantRAG = false` (chunks_count = 0), o sistema adiciona o bloco `RAG_FALLBACK` que instrui a IA: _"NÃO invente informações específicas... Diga que essa informação não está na base de conhecimento."_

Porém o `system_instruction` configurado no banco diz: _"Se não tiver informação específica sobre algum modelo, informe que a base pode estar desatualizada e sugira verificar diretamente no site oficial."_

Essas duas instruções são parcialmente conflitantes, e como o modelo não recebe o contexto RAG, ele responde com conhecimento geral FALSO ("essa informação específica (versão 5.2) não consta na base...") em vez de simplesmente buscar o que de fato existe.

---

## Fluxo Atual (com os bugs)

```text
Usuário: "...modelo 5.2 Thinking...system instructions..."
         ↓
Edge Function: userQuery = mensagem COMPLETA (28 tokens)
         ↓
searchRAGChunks → plainto_tsquery AND de 28 termos
         ↓
PostgreSQL: nenhum chunk satisfaz os 28 termos → []
         ↓
hasRelevantRAG = false → adiciona RAG_FALLBACK
         ↓
Modelo: "5.2 não consta na base do Subhumano" ← ERRADO
```

## Fluxo Corrigido

```text
Usuário: "...modelo 5.2 Thinking...system instructions..."
         ↓
Edge Function: EXTRAI entidades-chave via LLM mini antes do FTS
               → "GPT-5.2 thinking openai"
         ↓
searchRAGChunks (query curta) → websearch_to_tsquery com OR/phrase
         ↓
PostgreSQL: encontra chunks de GPT-5.2 e GPT-5.2-Codex ✓
         ↓
Reranker: seleciona os 5 mais relevantes
         ↓
Modelo: responde com o conteúdo real dos System Cards ✓
```

---

## Plano de Implementação

### Correção 1 — Trocar `plainto_tsquery` por `websearch_to_tsquery` no banco (migração SQL)

`websearch_to_tsquery` usa operadores OR e frases, sendo muito mais tolerante que `plainto_tsquery`. Exemplo:

- `plainto_tsquery`: `'gpt' & '5.2' & 'requisit' & ...` (AND rígido)
- `websearch_to_tsquery`: `'gpt' | '5.2' | 'requisit' | ...` (OR flexível)

Também corrigir o tokenizer para termos com hífen adicionando uma coluna `search_text` que normaliza `GPT-5.2` → `GPT 5.2` no momento da indexação dos chunks.

**Arquivo**: migração SQL para:
- Alterar a função `search_rag_chunks_lexical` para usar `websearch_to_tsquery` com fallback OR
- Adicionar normalização de hífens na query antes de gerar o tsquery

### Correção 2 — Extração de Entidades/Keywords na Edge Function

Antes de chamar o FTS, extrair uma query curta e focada da mensagem do usuário usando o LLM mais rápido (`gemini-2.5-flash-lite`):

```typescript
// NOVO: extrai keywords antes do FTS
async function extractSearchQuery(userMessage: string, apiKey: string): Promise<string> {
  // Se a mensagem é curta (< 80 chars), usa ela diretamente
  if (userMessage.length < 80) return userMessage;
  
  // Para mensagens longas, extrai entidades principais
  // Prompt: "Extraia os 3-5 termos técnicos mais importantes para buscar em base de conhecimento sobre IA"
  // Retorna: "GPT-5.2 thinking openai model"
}
```

Isso resolve o Bug 2 sem depender de mudança no banco.

### Correção 3 — Harmonizar System Prompt e RAG Fallback

Reescrever a instrução `RAG_FALLBACK` e o `system_instruction` da config para que sejam complementares:

**RAG_FALLBACK atual (conflitante)**:
```
"NÃO invente informações específicas sobre modelos, preços ou capacidades"
"Diga que essa informação não está na base de conhecimento"
```

**RAG_FALLBACK novo (harmonizado)**:
```
"A busca automática não retornou resultados. TENTE reformular sua resposta baseando-se
em qualquer informação parcial que possa existir. Se realmente não souber, diga que
a base pode estar desatualizada e indique o site oficial."
```

Também atualizar o `system_instruction` no banco (`ai_assistant_config`) para deixar explícito que o modelo deve reportar com honestidade o que encontrou na RAG antes de dar conhecimento geral.

---

## Arquivos Alterados

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/` | Nova migração: alterar `search_rag_chunks_lexical` para `websearch_to_tsquery` + normalização de hífens |
| `supabase/functions/ai-assistant/index.ts` | Adicionar `extractSearchQuery()` antes de `searchRAGChunks()`; atualizar `RAG_FALLBACK` |
| Banco (`ai_assistant_config`) | Atualizar `system_instruction` via SQL na migração para harmonizar com o novo fallback |

## Resultado Esperado

Com as 3 correções:
1. A query "GPT 5.2" ou "modelo 5.2 Thinking" vai encontrar os chunks dos documentos "GPT-5.2 - System Card" e "GPT-5.2-Codex - System Card"
2. Queries longas e complexas não retornarão mais zero resultados por excesso de tokens ANDados
3. O modelo responderá com o conteúdo real da base de conhecimento em vez de inventar ou negar a existência do documento
