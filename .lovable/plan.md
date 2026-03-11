

# Token Budgeting no Assistente de IA

3 mudanças cirúrgicas em `supabase/functions/ai-assistant/index.ts`.

## Mudança 1: Limitar histórico de mensagens (linha 453→467)

Após o parsing de `messages` (linha 453) e antes do uso, adicionar trimming:

```ts
// Linha 453 (existente):
const { messages } = await req.json();

// NOVO (após linha 456, antes de linha 462):
const maxHistoryMessages = (ragCfg.max_history_messages as number) ?? 20;
const trimmedMessages = messages.length > maxHistoryMessages
  ? messages.slice(-maxHistoryMessages)
  : messages;
if (messages.length > maxHistoryMessages) {
  console.log(`[TOKEN BUDGET] History trimmed: ${messages.length} → ${trimmedMessages.length} messages`);
}
```

Problema: `ragCfg` é declarado na linha 468, depois de `messages`. Solução: mover o trimming para logo após a linha 468 (após `ragCfg` ser declarado).

Na linha 566, substituir `...messages` por `...trimmedMessages`:
```ts
// ANTES:
const body = { model, messages: [{ role: "system", content: sysMsg }, ...messages], stream: true };
// DEPOIS:
const body = { model, messages: [{ role: "system", content: sysMsg }, ...trimmedMessages], stream: true };
```

Na linha 573 (TOKEN DEBUG), atualizar para refletir trimmedMessages:
```ts
console.log(`[TOKEN DEBUG] sysMsg: ${sysMsg.length} chars (~${Math.round(sysMsg.length/4)} tokens) | history: ${trimmedMessages.length} msgs (original: ${messages.length}), ${JSON.stringify(trimmedMessages).length} chars (~${Math.round(JSON.stringify(trimmedMessages).length/4)} tokens)`);
```

## Mudança 2: Limitar tamanho do system message (após linha 561)

Após a montagem completa do `sysMsg` (linha 561) e antes da construção do `body` (linha 563):

```ts
// NOVO (entre linhas 561 e 563):
const maxSysMsgChars = (ragCfg as any).max_system_chars ?? 30000;
if (sysMsg.length > maxSysMsgChars) {
  console.log(`[TOKEN BUDGET] sysMsg truncated: ${sysMsg.length} → ${maxSysMsgChars} chars`);
  sysMsg = sysMsg.substring(0, maxSysMsgChars);
}
```

## Mudança 3: Limitar chunks RAG individuais (função `buildRAGContext`, linhas 332-341)

Adicionar parâmetro `maxChunkChars` e truncar cada chunk:

```ts
// ANTES (linhas 332-341):
function buildRAGContext(chunks: RAGChunk[], constitutionChunks: RAGChunk[]): string {
  let ctx = "";
  if (constitutionChunks.length) {
    ctx += "[IDENTIDADE E DIRETRIZES]\n" + constitutionChunks.map(c => c.content).join("\n\n") + "\n\n";
  }
  const nonConst = chunks.filter(c => c.layer !== "constituicao");
  if (nonConst.length) {
    ctx += "[BASE DE CONHECIMENTO]\n" + nonConst.map(c => `[${c.document_title}]\n${c.content}`).join("\n\n") + "\n\n";
  }
  return ctx;
}

// DEPOIS:
function buildRAGContext(chunks: RAGChunk[], constitutionChunks: RAGChunk[], maxChunkChars = 2000): string {
  const truncate = (text: string) => text.length > maxChunkChars ? text.substring(0, maxChunkChars) + "..." : text;
  let ctx = "";
  if (constitutionChunks.length) {
    ctx += "[IDENTIDADE E DIRETRIZES]\n" + constitutionChunks.map(c => truncate(c.content)).join("\n\n") + "\n\n";
  }
  const nonConst = chunks.filter(c => c.layer !== "constituicao");
  if (nonConst.length) {
    ctx += "[BASE DE CONHECIMENTO]\n" + nonConst.map(c => `[${c.document_title}]\n${truncate(c.content)}`).join("\n\n") + "\n\n";
  }
  return ctx;
}
```

Na chamada (linha 550), passar o parâmetro:
```ts
// ANTES:
sysMsg += buildRAGContext(ragChunks, constitutionChunks);
// DEPOIS:
const maxChunkChars = (ragCfg as any).max_chunk_chars ?? 2000;
sysMsg += buildRAGContext(ragChunks, constitutionChunks, maxChunkChars);
```

## Resumo de configuração via metadata

| Campo | Default | Efeito |
|---|---|---|
| `max_history_messages` | 20 | Envia apenas as N últimas mensagens ao modelo |
| `max_system_chars` | 30000 | Trunca sysMsg se exceder (~7500 tokens) |
| `max_chunk_chars` | 2000 | Trunca cada chunk RAG individual |

Todos lidos de `config.metadata` (campo `ragCfg`). Sem migração de banco necessária.

