
# Plano: Adicionar Status "authorized" ao Webhook Ticto

## Problema Identificado

O webhook da Ticto recebeu o pagamento corretamente, porém o status enviado foi **`authorized`** (autorização de cartão de crédito), que não estava mapeado no código.

| O que aconteceu | Evidência |
|-----------------|-----------|
| Pagamento processado | Log: `Received Ticto webhook` com `paid_amount: 2990` |
| Usuário identificado | Log: `Found user: dd98c4c8-b923-44f9-9921-a9e8cd7b50ca` |
| Status não processado | Log: `Unhandled status type: authorized - acknowledging webhook` |
| Subscription não criada | Banco: Apenas existe subscription `trial` |

## Mapeamento de Status da Ticto

A Ticto envia diferentes status dependendo do método de pagamento:

| Status | Significado | Ação Necessária |
|--------|-------------|-----------------|
| `authorized` | Cartão aprovado (novo!) | Criar subscription ativa |
| `approved` | Pagamento confirmado | Criar subscription ativa |
| `paid` | Pagamento confirmado | Criar subscription ativa |
| `waiting_payment` | Boleto aguardando | Ignorar |
| `refused` | Cartão recusado | Ignorar |
| `canceled` / `cancelled` | Assinatura cancelada | Marcar como canceled |
| `expired` | Expirado | Marcar como canceled |
| `refunded` | Reembolsado | Marcar como refunded |

## Correção Técnica

### Arquivo: `supabase/functions/ticto-webhook/index.ts`

Adicionar `authorized` à lista de status que ativam a subscription:

```typescript
// Antes
const isApproved = status === 'approved' || status === 'paid'

// Depois  
const isApproved = status === 'approved' || status === 'paid' || status === 'authorized'
```

## Resultado Esperado

Após a correção:
1. Webhook processará status `authorized` como pagamento aprovado
2. Subscription será criada/atualizada com `status: 'active'` e `plan_type: 'monthly'`
3. O trial existente será mantido (o código já verifica se existe subscription ativa antes de criar nova)
4. Interface mostrará "Plano: Mensal" em vez de "Período de Teste"

## Ação Manual Temporária

Como o webhook já foi recebido e não processou, você pode:
1. Aguardar eu fazer a correção e depois simular um novo evento na Ticto
2. **OU** eu posso criar a subscription manualmente no banco de dados agora

## Próximos Passos

1. Corrigir o código da Edge Function
2. Reprocessar o pagamento (Ticto geralmente tem opção de reenviar webhook)
3. **OU** inserir subscription manualmente para liberar acesso imediato
