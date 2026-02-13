

# Adicionar link de checkout vitalicio e garantir consistencia no webhook

## Alteracoes necessarias

### 1. `src/pages/Plans.tsx` (linha 53)
Substituir o placeholder do checkout vitalicio pelo link real:

```
// ANTES:
checkoutUrl: "https://checkout.ticto.app/LIFETIME_PLACEHOLDER"

// DEPOIS:
checkoutUrl: "https://checkout.ticto.app/OF16846C3"
```

### 2. `supabase/functions/ticto-webhook/index.ts` (linhas 142-153)
O webhook atual so diferencia entre `monthly` e `yearly`. Precisa detectar o plano **lifetime** e configurar corretamente:
- `plan_type: 'lifetime'`
- `expires_at: null` (acesso permanente)

Logica atualizada:

```typescript
const offerName = payload.item?.offer_name?.toLowerCase() || ''
const offerId = payload.item?.offer_id
const daysOfAccess = payload.item?.days_of_access

// Detectar lifetime primeiro
const isLifetime =
  offerName.includes('vitalic') ||
  offerName.includes('lifetime') ||
  daysOfAccess === null ||
  (daysOfAccess && daysOfAccess >= 36500)

const isYearly =
  !isLifetime && (
    offerName.includes('anual') ||
    offerName.includes('yearly') ||
    (daysOfAccess && daysOfAccess >= 365)
  )

const planType = isLifetime ? 'lifetime' : isYearly ? 'yearly' : 'monthly'
const expiresAt = isLifetime ? null : new Date(now.getTime() + (daysOfAccess || (isYearly ? 365 : 30)) * 86400000)
```

E no insert/update, usar `expires_at: expiresAt ? expiresAt.toISOString() : null`.

### 3. Verificacao do `useSubscription` hook
Confirmar que o hook trata `plan_type === 'lifetime'` como `status === 'active'` (ja funciona pois a query filtra por `status = 'active'`, independente do plan_type).

## Impacto

- 2 arquivos editados: `Plans.tsx`, `ticto-webhook/index.ts`
- 0 migracoes SQL (o check constraint ja aceita 'lifetime')
- O fluxo completo: usuario logado -> clica "Assinar agora" com vitalicio selecionado -> redirecionado para Ticto com email e user_id -> paga -> webhook processa como lifetime com expires_at null -> usuario volta ao /payment-success e e reconhecido como ativo
