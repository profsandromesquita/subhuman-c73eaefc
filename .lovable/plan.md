
# Plano: Corrigir Edge Function do Ticto Webhook

## Problema Identificado

Os logs mostram que a estrutura do payload da Ticto é diferente do que foi implementado:

| Campo | Esperado | Recebido (Ticto real) |
|-------|----------|----------------------|
| Email | `email` ou `buyer.email` | `customer.email` |
| Evento | `event_type` | `status` |
| ID Transação | `transaction_id` | `order.hash` |

## Estrutura Real do Payload Ticto

```json
{
  "status": "waiting_payment",
  "customer": {
    "email": "cliente@email.com",
    "name": "Nome Cliente"
  },
  "order": {
    "hash": "TOB12609GU88Q5",
    "paid_amount": 50000
  },
  "item": {
    "offer_id": 16,
    "days_of_access": null
  }
}
```

## Eventos da Ticto a Processar

| Status | Ação |
|--------|------|
| `approved` | Criar subscription ativa |
| `waiting_payment` | Ignorar (boleto aguardando) |
| `refunded` | Marcar subscription como refunded |
| `canceled` / `cancelled` | Marcar subscription como canceled |
| `expired` | Marcar subscription como expired |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/ticto-webhook/index.ts` | Corrigir extração de dados do payload |

## Correções Técnicas

### 1. Extrair email corretamente
```typescript
// Antes (incorreto)
const customerEmail = payload.email || payload.buyer?.email;

// Depois (correto)
const customerEmail = payload.customer?.email;
```

### 2. Identificar evento corretamente
```typescript
// Antes (incorreto)
const eventType = payload.event_type || payload.event;

// Depois (correto)
const status = payload.status;
```

### 3. Extrair ID da transação
```typescript
// Antes (incorreto)
const transactionId = payload.transaction_id || payload.order_id;

// Depois (correto)
const transactionId = payload.order?.hash;
```

### 4. Retornar sucesso para eventos não processados
Em vez de retornar erro para eventos como `waiting_payment`, retornar sucesso com mensagem indicando que o evento foi ignorado.

## Resultado Esperado

Após a correção:
- Webhook retorna "success" para todos os eventos válidos
- Eventos de pagamento aprovado criam/atualizam subscription
- Eventos ignorados (waiting_payment) retornam OK sem processar
- Ticto salva o webhook sem mostrar "failed"
