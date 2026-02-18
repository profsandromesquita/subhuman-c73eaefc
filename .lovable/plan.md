
# Correção do Fluxo RAG — 3 Bugs Confirmados com Dados Reais

## Diagnóstico Final (Evidências do Banco)

### Bug 1 — Tokenizer de Hífens (CONFIRMADO)
Query direta ao banco prova o problema:

```text
to_tsvector('GPT-5.2 - System Card') → tokens: '-5.2', 'card', 'gpt', 'system'
plainto_tsquery('GPT 5.2')           → query:  'gpt' & '5.2'

match_without_hyphen = FALSE  ← Bug confirmado
match_with_hyphen    = TRUE   ← Só funciona escrevendo 'GPT-5.2' exato
match_normalized     = TRUE   ← Solução: normalizar hífens antes de indexar
```

### Bug 2 — Query Longa com AND (CONFIRMADO)
A mensagem real do usuário gerou 28 termos em AND:
```text
'quer' & 'cri' & 'gpt' & 'personaliz' & 'é' & 'especial' & 'engenh' & 
'requisit' & 'professor' & 'autor' & 'livr' & 'pesquis' & 'requisit' & 
'sistem' & 'ire' & 'configur' & 'model' & '5.2' & 'thinking' & 'respond' &
'pergunt' & 'dev' & 'ser' & 'system' & 'instructions' & 'dev' & 'adicion' & 'gpt'
```
Nenhum chunk do mundo satisfaz 28 termos em AND simultaneamente → zero resultados.

### Bug 3 — System Prompt Conflitante (CONFIRMADO)
Quando RAG retorna zero → `RAG_FALLBACK` instrui: *"Diga que essa informação não está na base"*. Resultado: o modelo inventa que o GPT-5.2 não existe na base, quando na verdade existem 4 documentos indexados sobre ele.

## O que Será Alterado

### Correção 1 — Banco de Dados: Normalizar Hífens na Função `search_rag_chunks_lexical`

A função SQL atual usa `plainto_tsquery('portuguese', query_text)` diretamente. A correção substitui por `websearch_to_tsquery` com normalização de hífens na query, gerando tokens compatíveis com o tsvector dos documentos:

```sql
-- Antes:
search_query := plainto_tsquery('portuguese', query_text);

-- Depois (2 melhorias):
-- 1. Normaliza hífens: 'GPT-5.2' → 'GPT 5.2' antes de tokenizar  
-- 2. websearch_to_tsquery suporta OR e frases (mais flexível que AND rígido)
normalized_text := regexp_replace(query_text, '([A-Za-z0-9])-([A-Za-z0-9])', '\1 \2', 'g');
search_query := websearch_to_tsquery('portuguese', normalized_text);
```

Também adicionar fallback: se `websearch_to_tsquery` falhar por query muito longa, usar `OR` entre os primeiros 5 tokens.

### Correção 2 — Edge Function: Extração de Keywords antes do FTS

Adicionar função `extractSearchQuery()` que, para mensagens longas (>80 chars), usa o modelo `google/gemini-2.5-flash-lite` para extrair 3-5 termos técnicos principais antes de chamar o banco:

```typescript
// NOVO fluxo:
// 1. Usuário envia: "Quero criar um GPT personalizado especialista em ER, com modelo 5.2 Thinking..."
// 2. extractSearchQuery() → "GPT-5.2 thinking model openai"  (query curta e focada)
// 3. searchRAGChunks("GPT-5.2 thinking model openai") → encontra os 4 documentos GPT-5.2
// 4. rerankChunks() → seleciona os 3 mais relevantes
// 5. Modelo responde com conteúdo real dos System Cards

async function extractSearchQuery(userMessage: string, apiKey: string): Promise<string> {
  if (userMessage.trim().length <= 80) return userMessage; // Mensagens curtas: passa direto
  
  // Chama LLM rápido para extração de entidades
  // Prompt: "Extraia 3-5 termos técnicos para busca em base de conhecimento sobre IA.
  //          Preserve versões exatas como 'GPT-5.2', 'Claude-3.5'. Retorne apenas os termos."
  // Resultado esperado: "GPT-5.2 thinking model system instructions"
}
```

Esta função é chamada **antes** do `searchRAGChunks`, substituindo o `userQuery` completo pela query focada.

### Correção 3 — System Prompt: Harmonizar RAG_FALLBACK e Instrução de Fallback

Substituir o `RAG_FALLBACK` atual (que instrui o modelo a negar a existência) por uma instrução que:
- Admite que a busca automática falhou (pode ser problema técnico, não ausência do dado)
- Pede que o modelo use seu conhecimento geral com transparência
- Remove a instrução "Diga que essa informação não está na base" — que causa alucinação inversa

```typescript
// ANTES (problemático):
const RAG_FALLBACK = `
  A busca NÃO retornou resultados. REGRAS:
  1. NÃO invente informações específicas
  2. Diga que essa informação não está na base de conhecimento atual  ← CAUSA ALUCINAÇÃO INVERSA
  3. Sugira explorar os Espaços ou Canais`;

// DEPOIS (corrigido):
const RAG_FALLBACK = `
  A busca automática não retornou resultados específicos para esta consulta.
  INSTRUÇÕES:
  1. Responda com seu conhecimento geral sobre o tema, sendo claro que é conhecimento geral
  2. NÃO afirme que um modelo ou informação "não está na base" — isso pode ser impreciso
  3. Se não tiver certeza sobre algo específico, diga "Não tenho essa informação confirmada"
  4. Mencione que a base de conhecimento do Subhumano pode ter mais detalhes nos Espaços`;
```

## Arquivos Alterados

| # | Arquivo | Mudança |
|---|---|---|
| 1 | `supabase/migrations/TIMESTAMP_fix_rag_lexical_search.sql` | Reescreve `search_rag_chunks_lexical` com `websearch_to_tsquery` + normalização de hífens |
| 2 | `supabase/functions/ai-assistant/index.ts` | Adiciona `extractSearchQuery()` + atualiza `RAG_FALLBACK` + chama extração antes do FTS |

## Fluxo Após as Correções

```text
Usuário: "...modelo 5.2 Thinking...system instructions..." (286 chars)
         ↓
[NOVO] extractSearchQuery() → "GPT-5.2 thinking openai model" (query focada)
         ↓
[NOVO] search_rag_chunks_lexical com normalização de hífens:
       "GPT-5.2" → "GPT 5.2" → tokens: 'gpt' & '5.2' → MATCH! ✓
         ↓
Resultados: GPT-5.2 System Card ✓, GPT-5.2-Codex ✓, GitHub Copilot GPT-5.2 ✓
         ↓
rerankChunks() seleciona os 3 mais relevantes
         ↓
Modelo responde com conteúdo real dos System Cards ✓
```

## Resultado Esperado

Após as 3 correções, quando o usuário perguntar sobre "GPT 5.2", "modelo 5.2 Thinking", "ChatGPT 5.3" ou qualquer termo técnico com hífen em uma pergunta longa, o assistente:
1. Encontrará os documentos indexados correspondentes
2. Responderá com o conteúdo real da base (System Cards, especificações)
3. Não negará mais falsamente a existência de documentos que existem
