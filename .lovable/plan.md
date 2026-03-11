

# Alinhamento do Frontend com Limites Diários do Backend

## 1. useUserAccess.ts — Atualizar permissões

Alterar `TIER_PERMISSIONS` para freemium e student (`canUseAI: true`, `aiDailyLimit: 1`), e atualizar limites de trial (3), yearly (20), lifetime (25).

```text
Antes:                          Depois:
freemium: canUseAI=false, 0  →  canUseAI=true, 1
student:  canUseAI=false, 0  →  canUseAI=true, 1
trial:    aiDailyLimit=2     →  aiDailyLimit=3
yearly:   aiDailyLimit=15    →  aiDailyLimit=20
lifetime: aiDailyLimit=20    →  aiDailyLimit=25
```

## 2. useAIAssistant.ts — Tratar HTTP 429

Adicionar 3 novos estados exportados:

- `limitReached: boolean` (default false)
- `limitInfo: { tier: string; daily_limit: number; used_today: number } | null`
- `resetLimit()` — seta limitReached=false

No bloco de tratamento de erro do `sendMessage`, detectar `response.status === 429`:
- Parsear o body JSON para extrair tier, daily_limit, used_today
- Setar `limitReached = true` e `limitInfo` com os dados
- Remover a mensagem do usuário que acabou de ser adicionada (ela não foi processada)
- Não chamar `toast.error` para 429 (o componente visual vai exibir)

No `clearMessages`, chamar `resetLimit()` para permitir nova tentativa.

## 3. AIAssistant.tsx — Mensagem contextual de limite

Substituir o bloco condicional `canUseAI ? (...form...) : (...lock...)` por lógica de 3 estados:

1. **limitReached === true**: Exibir card contextual no lugar do input com mensagem e CTA variando por tier:
   - freemium/student/coupon/trial: "Você usou suas X consulta(s) de hoje." + CTA "Assine o Subhumano" → /plans
   - monthly: "Limite de 10 consultas do plano Mensal." + CTA "Upgrade para Anual (20/dia)" → /plans
   - yearly: "Limite de 20 consultas do plano Anual." + CTA "Upgrade para Vitalício (25/dia)" → /plans
   - lifetime: "Limite de 25 consultas de hoje. Volte amanhã!" (sem CTA)

2. **limitReached === false**: Exibir o form de input normal (remove a verificação `canUseAI`)

3. Remover completamente o bloco antigo com `Lock` icon e "Assine para usar o assistente de IA"

## Detalhes Técnicos

### useAIAssistant.ts — Novo estado e tratamento 429

```ts
// Novos estados
const [limitReached, setLimitReached] = useState(false);
const [limitInfo, setLimitInfo] = useState<{tier: string; daily_limit: number; used_today: number} | null>(null);

// Dentro de sendMessage, no bloco que trata response.status:
if (response.status === 429) {
  const errorData = await response.json().catch(() => ({}));
  setLimitReached(true);
  setLimitInfo({
    tier: errorData.tier || 'freemium',
    daily_limit: errorData.daily_limit || 0,
    used_today: errorData.used_today || 0,
  });
  // Remover a mensagem do usuário que não foi processada
  setMessages((prev) => prev.slice(0, -1));
  setIsLoading(false);
  return;
}

// Em clearMessages:
const resetLimit = useCallback(() => {
  setLimitReached(false);
  setLimitInfo(null);
}, []);

// clearMessages também chama resetLimit
```

### AIAssistant.tsx — Bloco de input (linhas 230-244)

```tsx
// Substituir o bloco canUseAI ternário por:
{limitReached && limitInfo ? (
  <div className="flex flex-col items-center gap-3 py-4 px-2 text-center">
    <Lock className="w-6 h-6 text-muted-foreground" />
    <p className="text-sm text-muted-foreground">
      {/* Mensagem contextual baseada no tier */}
    </p>
    {/* CTA condicional por tier */}
  </div>
) : (
  <form onSubmit={handleSubmit} className="flex gap-2">
    {/* Input normal, sem verificação canUseAI */}
  </form>
)}
```

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/hooks/useUserAccess.ts` | canUseAI=true para todos, atualizar limites |
| `src/hooks/useAIAssistant.ts` | Adicionar limitReached, limitInfo, resetLimit, tratar 429 |
| `src/pages/AIAssistant.tsx` | Mensagem contextual por tier, remover bloqueio antigo |

### Nenhuma alteração em

- Edge Functions
- Tabelas/migrações SQL
- useSubscription ou outros hooks

