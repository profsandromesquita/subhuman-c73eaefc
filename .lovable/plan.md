
# Correção Definitiva da Cegueira do Assistente — Causa Raiz Encontrada nos Logs

## Diagnóstico Final com Evidência dos Logs

Os logs da Edge Function de 18/02 provam dois bugs que coexistem:

```
searchQuery: "Quais as características do chatgpt 5.2?"  → 0 RAG
searchQuery: "E sobre o gpt-5.2?"                        → 4 RAG ✓
```

### Bug A — `extractSearchQuery` está falhando silenciosamente

Quando o usuário escreve "Quais as características do chatgpt 5.2?" (47 chars), a função `extractSearchQuery` retorna a string COMPLETA porque a mensagem tem menos de 80 caracteres. O limiar de 80 chars é alto demais — essa frase de 47 chars passa direto sem extração.

**Resultado:** a query enviada ao FTS é `"Quais as características do chatgpt 5.2?"` com 4 tokens AND (`qua & característ & chatgpt & 5.2`) — que não encontra nada porque o token `chatgpt` não existe nos documentos GPT-5.2.

### Bug B — Sinônimo "ChatGPT" vs "GPT" não é resolvido

Os documentos indexados usam o texto `GPT-5.2`, nunca `ChatGPT`. O FTS não sabe que `chatgpt = gpt`. Portanto qualquer busca com `chatgpt` falha contra os documentos reais.

Confirmado via query no banco:
```
has_chatgpt: false  ← em TODOS os chunks de GPT-5.2
has_52: true        ← esses existem
```

### Por que "E sobre o gpt-5.2?" funcionou?

Porque tem apenas 23 chars (< 80), passa pela extração sem mudança, e o FTS encontra `gpt & 5.2` que SIM existem nos documentos.

---

## O que a Instrução Adicional que Você Adicionou Resolve?

A instrução que você adicionou em "Instruções Adicionais" vai para o `system_instruction` do modelo — que é adicionado ao system prompt DEPOIS da busca FTS. Isso orienta o modelo a pensar melhor, mas **não muda o que é buscado no banco de dados**. A busca FTS acontece antes do modelo sequer ver sua instrução.

Então: **não, isso não resolve o problema de recuperação**. A busca no banco precisa ser corrigida na Edge Function.

---

## Plano de Correção

### Correção 1 — Reduzir limiar de extração: 80 → 30 chars

A mensagem "Quais as características do chatgpt 5.2?" tem 47 chars e **não deveria** passar direto. O limiar correto é 30 chars — somente perguntas ultra-curtas como "gpt 5.2?" passam sem extração.

```typescript
// ANTES (falha):
if (trimmed.length <= 80) return trimmed;

// DEPOIS (corrigido):
if (trimmed.length <= 30) return trimmed;
```

### Correção 2 — Resolver Sinônimos Antes do FTS (mapa de aliases)

Adicionar uma função `normalizeSynonyms()` que resolve termos equivalentes comuns no domínio de IA antes de enviar para o FTS:

```typescript
const AI_SYNONYMS: Record<string, string> = {
  "chatgpt":     "gpt",
  "chat gpt":    "gpt",
  "chat-gpt":    "gpt",
  "openai gpt":  "gpt openai",
  "gpt 5":       "gpt",
  "chatgpt4":    "gpt-4 gpt4",
  "chatgpt3":    "gpt-3 gpt3",
  "grok":        "grok xai",
  "claude":      "claude anthropic",
  "gemini":      "gemini google",
};

function normalizeSynonyms(query: string): string {
  let normalized = query.toLowerCase();
  for (const [alias, replacement] of Object.entries(AI_SYNONYMS)) {
    normalized = normalized.replace(new RegExp(`\\b${alias}\\b`, 'g'), replacement);
  }
  return normalized;
}
```

Esta função é chamada **antes** do `extractSearchQuery` e **antes** de enviar ao FTS.

### Correção 3 — Busca Dupla: FTS + Fallback por Tags

Quando o FTS retorna 0 resultados, fazer uma segunda busca diretamente nas tags dos documentos. Os documentos GPT-5.2 têm tags `["llm", "openai", "gpt-5.2", ...]`. Uma busca por tag encontraria imediatamente.

```typescript
// Se FTS retornou 0 → busca por tags como fallback
async function searchByTags(query: string, db: any): Promise<RAGChunk[]> {
  // Extrai tokens da query e busca em tags[]
  // "chatgpt 5.2" → busca tags que contenham "5.2" OU "gpt-5.2" OU "openai"
  const tokens = query.split(/\s+/).filter(t => t.length > 2);
  const { data } = await db.from("rag_chunks")
    .select("id, content, document_id, rag_documents!inner(title, layer, status, tags)")
    .eq("rag_documents.status", "indexed")
    .overlaps("rag_documents.tags", tokens)
    .limit(10);
  return data || [];
}
```

### Correção 4 — Melhorar Prompt de Extração de Keywords

O prompt atual do `extractSearchQuery` não instrui o modelo a converter "ChatGPT" em "GPT". Adicionar essa regra explicitamente:

```typescript
// Adicionar ao system prompt da extração:
"IMPORTANTE: 'ChatGPT' e 'ChatGPT-X.X' devem ser convertidos para 'GPT-X.X openai'. Exemplo: 'ChatGPT 5.2' → 'GPT-5.2 openai'"
```

---

## Arquivos Alterados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/ai-assistant/index.ts` | 4 correções: limiar 80→30, `normalizeSynonyms()`, busca fallback por tags, prompt de extração melhorado |

## Fluxo Corrigido

```
Usuário: "Quais as características do chatgpt 5.2?" (47 chars)
         ↓
[1] normalizeSynonyms("chatgpt 5.2") → "gpt 5.2"
         ↓
[2] 47 chars > 30 → extractSearchQuery() é chamado
    Prompt: "chatgpt → GPT-X.X" instrui o modelo
    Retorna: "GPT-5.2 openai características"
         ↓
[3] FTS com "GPT-5.2 openai" → websearch_to_tsquery → 'gpt' OR '5.2' OR 'opena'
    Encontra: GPT-5.2 System Card ✓, GPT-5.2-Codex ✓, GitHub Copilot GPT-5.2 ✓
         ↓
[4] Se FTS = 0 → fallback por tags (busca "5.2", "gpt-5.2", "openai" em tags[])
         ↓
Modelo responde com conteúdo real dos System Cards ✓
```

## Resultado Esperado

| Pergunta do usuário | Antes | Depois |
|---|---|---|
| "Quais as características do chatgpt 5.2?" | 0 RAG | 3-5 chunks GPT-5.2 |
| "O que é o ChatGPT 5.3?" | 0 RAG | 3+ chunks System Card GPT-5.3 |
| "Me fale sobre o GPT-5.2 Thinking" | 0 RAG | 4+ chunks |
| "E sobre o gpt-5.2?" | 4 RAG ✓ | 4+ RAG ✓ (já funciona) |
