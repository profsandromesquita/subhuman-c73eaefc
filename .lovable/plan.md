
# Plano: Criar Subscription Ativa Manualmente

## Situação Atual

| Campo | Valor |
|-------|-------|
| Usuário | `dd98c4c8-b923-44f9-9921-a9e8cd7b50ca` |
| Subscription Existente | Trial (expira 07/02/2026) |
| Pagamento | Confirmado via Ticto (R$ 29,90) |

## Ação a Executar

Inserir nova subscription com os seguintes dados:

| Campo | Valor |
|-------|-------|
| user_id | `dd98c4c8-b923-44f9-9921-a9e8cd7b50ca` |
| plan_type | `monthly` |
| status | `active` |
| provider | `ticto` |
| starts_at | Agora |
| expires_at | 1 mês a partir de hoje |

## SQL a Executar

```sql
INSERT INTO subscriptions (user_id, plan_type, status, provider, starts_at, expires_at)
VALUES (
  'dd98c4c8-b923-44f9-9921-a9e8cd7b50ca',
  'monthly',
  'active',
  'ticto',
  NOW(),
  NOW() + INTERVAL '1 month'
);
```

## Resultado Esperado

1. Nova subscription `monthly` será criada com status `active`
2. O `useSubscription` hook retornará `status: 'active'` (prioriza subscription paga sobre trial)
3. A interface mostrará **"Plano: Mensal"** em vez de "Período de Teste"
4. O `TrialBanner` não será mais exibido
