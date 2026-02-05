

# Plano de Correção: Erro 500 no Assistente IA

## Diagnóstico

O erro ocorre porque o modelo **openai/gpt-5** não aceita o parâmetro `max_tokens`. A API retorna erro 400 indicando que deve ser usado `max_completion_tokens` em seu lugar.

**Causa raiz:**
```
"Unsupported parameter: 'max_tokens' is not supported with this model. 
Use 'max_completion_tokens' instead."
```

---

## Solução

Modificar a Edge Function para usar o parâmetro correto dependendo do modelo selecionado. Modelos OpenAI mais recentes (como GPT-5) usam `max_completion_tokens`, enquanto outros modelos (Google, Anthropic) usam `max_tokens`.

---

## Implementação

### Arquivo a Modificar

`supabase/functions/ai-assistant/index.ts`

### Mudança Necessária

Na linha 101-110, alterar a construção do body da requisição:

**Antes:**
```typescript
body: JSON.stringify({
  model: config.model || "google/gemini-3-flash-preview",
  messages: [...],
  stream: true,
  temperature: Number(config.temperature) || 0.7,
  max_tokens: config.max_tokens || 2048,  // ❌ Não funciona com GPT-5
}),
```

**Depois:**
```typescript
// Detectar se é modelo OpenAI (usa max_completion_tokens)
const isOpenAIModel = config.model?.startsWith("openai/");
const maxTokensParam = isOpenAIModel 
  ? { max_completion_tokens: config.max_tokens || 2048 }
  : { max_tokens: config.max_tokens || 2048 };

body: JSON.stringify({
  model: config.model || "google/gemini-3-flash-preview",
  messages: [...],
  stream: true,
  temperature: Number(config.temperature) || 0.7,
  ...maxTokensParam,  // ✅ Parâmetro correto por modelo
}),
```

---

## Arquivo Completo da Correção

A Edge Function será atualizada com lógica condicional para:

1. **Verificar o prefixo do modelo** - Se começa com `openai/`, usar `max_completion_tokens`
2. **Para outros modelos** - Manter `max_tokens` (Google, Anthropic, etc.)

---

## Resultado Esperado

Após a correção:
- Modelo `openai/gpt-5` funcionará corretamente
- Outros modelos (Gemini, Claude) continuarão funcionando
- O chat do assinante responderá normalmente

---

## Seção Técnica

### Mapeamento de Parâmetros por Provider

| Provider | Parâmetro de Tokens |
|----------|---------------------|
| openai/* | `max_completion_tokens` |
| google/* | `max_tokens` |
| anthropic/* | `max_tokens` |

### Código da Correção

```typescript
// Antes da chamada ao AI Gateway (linhas 95-111)

// Construir parâmetros de tokens baseado no modelo
const modelName = config.model || "google/gemini-3-flash-preview";
const isOpenAIModel = modelName.startsWith("openai/");

const requestBody: Record<string, unknown> = {
  model: modelName,
  messages: [
    { role: "system", content: systemMessage },
    ...messages,
  ],
  stream: true,
  temperature: Number(config.temperature) || 0.7,
};

// Adicionar parâmetro correto de tokens
if (isOpenAIModel) {
  requestBody.max_completion_tokens = config.max_tokens || 2048;
} else {
  requestBody.max_tokens = config.max_tokens || 2048;
}

const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(requestBody),
});
```

