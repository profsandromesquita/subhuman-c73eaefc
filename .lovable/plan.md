

# Fase 2: Interface de Chat e Edge Function do Assistente IA

## Resumo

Esta fase implementa a interface de chat para assinantes e a Edge Function que processa as conversas utilizando o Lovable AI Gateway (modelo GPT-5 configurável via admin).

---

## Componentes a Implementar

### 1. Edge Function: `ai-assistant`

**Novo arquivo:** `supabase/functions/ai-assistant/index.ts`

Responsabilidades:
- Autenticação do usuário via JWT
- Buscar configuração do assistente da tabela `ai_assistant_config`
- Montar contexto com system prompt + knowledge base
- Streaming de resposta via SSE usando Lovable AI Gateway
- Tratamento de erros (429, 402)

Fluxo:
```text
1. Receber mensagens do usuário
2. Validar autenticação
3. Buscar config do banco (system_prompt, knowledge_base, model, temperature)
4. Chamar Lovable AI Gateway com streaming
5. Retornar stream SSE para o frontend
```

**Atualização:** `supabase/config.toml`
- Adicionar configuração da nova function com `verify_jwt = false`

### 2. Hook de Chat

**Novo arquivo:** `src/hooks/useAIAssistant.ts`

Funcionalidades:
- Estado de mensagens (array de `{ role, content }`)
- Função `sendMessage` com streaming token-by-token
- Estado de loading durante resposta
- Tratamento de erros (rate limit, pagamento)
- Limpar conversa

Estrutura:
```typescript
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface UseAIAssistantReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}
```

### 3. Página de Chat

**Novo arquivo:** `src/pages/AIAssistant.tsx`

Layout mobile-first:
- Header com título "Assistente IA" e descrição
- Área de mensagens scrollável (flex-grow)
- Sugestões iniciais (chips clicáveis quando sem mensagens)
- Input fixo no fundo com botão de enviar
- Renderização de markdown nas respostas
- Indicador de "digitando..." durante streaming

Sugestões iniciais:
- "Qual IA é melhor para código?"
- "Compare GPT-5 vs Claude 4"
- "Qual IA tem mais contexto?"
- "Gere um prompt para análise de dados"

Design:
- Fundo `bg-background`
- Mensagens do usuário: alinhadas à direita, `bg-card`
- Mensagens da IA: alinhadas à esquerda, `bg-secondary`
- Input na parte inferior antes do BottomNav

### 4. Navegação

**Modificar:** `src/components/BottomNav.tsx`

Adicionar novo item entre "Podcast" e "Canais":
```typescript
{ icon: Robot, label: "IA", path: "/ai-assistant" }
```

Ícone: `Robot` do `@phosphor-icons/react`

Resultado: 6 itens na navegação
- Início | Espaços | Podcast | **IA** | Canais | Perfil

### 5. Roteamento

**Modificar:** `src/App.tsx`

Adicionar rota protegida:
```typescript
<Route path="/ai-assistant" element={<SubscriptionGuard><AIAssistant /></SubscriptionGuard>} />
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/ai-assistant/index.ts` | Criar |
| `supabase/config.toml` | Modificar (adicionar function) |
| `src/hooks/useAIAssistant.ts` | Criar |
| `src/pages/AIAssistant.tsx` | Criar |
| `src/components/BottomNav.tsx` | Modificar (adicionar ícone IA) |
| `src/App.tsx` | Modificar (adicionar rota) |

---

## Fluxo de Uso

1. Assinante acessa `/ai-assistant` via BottomNav
2. Vê tela com sugestões de perguntas
3. Clica em uma sugestão ou digita pergunta
4. Frontend envia mensagens para edge function
5. Edge function busca config e chama Lovable AI Gateway
6. Resposta é streamada token-by-token
7. Markdown é renderizado em tempo real

---

## Seção Técnica

### Edge Function - Estrutura

```typescript
// Buscar configuração
const { data: config } = await supabaseAdmin
  .from('ai_assistant_config')
  .select('*')
  .eq('is_active', true)
  .single();

// Montar system message
const systemMessage = `${config.system_prompt}

${config.system_instruction}

BASE DE CONHECIMENTO:
${JSON.stringify(config.knowledge_base)}`;

// Chamar Lovable AI Gateway com streaming
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: config.model, // openai/gpt-5 ou outro configurado
    messages: [
      { role: "system", content: systemMessage },
      ...userMessages,
    ],
    stream: true,
    temperature: config.temperature,
    max_tokens: config.max_tokens,
  }),
});

// Retornar stream SSE
return new Response(response.body, {
  headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
});
```

### Frontend - Streaming Pattern

```typescript
const streamChat = async (messages, onDelta, onDone) => {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    
    // Parse SSE line-by-line
    let newlineIdx;
    while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);
      
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") break;
      
      const parsed = JSON.parse(jsonStr);
      const content = parsed.choices?.[0]?.delta?.content;
      if (content) onDelta(content);
    }
  }
  
  onDone();
};
```

### Markdown Rendering

A página usará componente para renderizar markdown nas respostas:
- Instalar/usar biblioteca de markdown (projeto já pode ter)
- Suportar: headings, listas, code blocks, bold, italic
- Styling consistente com design system

### Dependências

O projeto já possui as dependências necessárias:
- `@phosphor-icons/react` (para ícone Robot)
- `@tanstack/react-query` (para gerenciamento de estado)
- Supabase client configurado

Pode ser necessário adicionar:
- `react-markdown` para renderização de markdown (verificar se já existe)

---

## Resultado Esperado

Após implementação:

1. **BottomNav** terá 6 itens com "IA" entre Podcast e Canais
2. **Assinantes** poderão acessar `/ai-assistant`
3. **Chat** funcionará com streaming em tempo real
4. **Respostas** serão renderizadas em markdown
5. **Configurações** do admin serão aplicadas (prompt, modelo, temperatura)

---

## Segurança

- Edge function valida autenticação via JWT
- Apenas assinantes ativos acessam (SubscriptionGuard)
- Rate limiting tratado com feedback ao usuário
- LOVABLE_API_KEY nunca exposta no frontend

