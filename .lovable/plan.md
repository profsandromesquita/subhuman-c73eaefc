

# Debug: Token Budget do System Message

## Mudança única

Inserir um `console.log` na **linha 572** (antes do `fetch` na linha 573) do `supabase/functions/ai-assistant/index.ts`:

```ts
// Linha 571 (existente):
body[isOpenAI ? "max_completion_tokens" : "max_tokens"] = config.max_tokens || 2048;

// NOVO LOG (inserir aqui):
console.log(`[TOKEN DEBUG] sysMsg: ${sysMsg.length} chars (~${Math.round(sysMsg.length/4)} tokens) | history: ${messages.length} msgs, ${JSON.stringify(messages).length} chars (~${Math.round(JSON.stringify(messages).length/4)} tokens)`);

// Linha 573 (existente):
const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
```

Nenhuma outra alteração.

