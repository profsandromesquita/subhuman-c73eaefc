
# Adicionar link de checkout do Workshop e processar compra de evento no webhook

## Contexto

O evento "Crie seu site em 6h usando IA" (id: `ee7c1663-4496-4be6-a02e-47acc93323d1`) existe no banco de dados com preco R$ 19,90, mas sem `checkout_url` nem `ticto_offer_id`. Alem disso, o webhook da Ticto atualmente so processa **assinaturas** -- nao tem logica para registrar **compras de eventos** na tabela `event_purchases`.

## Alteracoes necessarias

### 1. Atualizar o evento no banco de dados (migracao SQL)

Definir o `checkout_url` e `ticto_offer_id` no evento existente:

```sql
UPDATE public.events
SET checkout_url = 'https://checkout.ticto.app/O94A9B515',
    ticto_offer_id = 'O94A9B515',
    updated_at = now()
WHERE id = 'ee7c1663-4496-4be6-a02e-47acc93323d1';
```

### 2. Atualizar o webhook (`supabase/functions/ticto-webhook/index.ts`)

Adicionar logica para diferenciar **compra de evento** vs **assinatura**:

- Antes de processar como assinatura, verificar se o `offer_id` da Ticto corresponde a um evento cadastrado na tabela `events` (via campo `ticto_offer_id`)
- Se corresponder: criar registro em `event_purchases` (nao em `subscriptions`)
- Se nao corresponder: processar como assinatura normalmente (fluxo atual)

Logica adicionada no bloco `isApproved`:

```typescript
// Check if this is an event purchase
const tictoOfferId = payload.item?.offer_id ? String(payload.item.offer_id) : null
const offerIdStr = tictoOfferId || ''

// Look for matching event by ticto_offer_id
const { data: matchedEvent } = await supabase
  .from('events')
  .select('id')
  .eq('ticto_offer_id', offerIdStr)
  .maybeSingle()

if (matchedEvent) {
  // This is an event purchase, NOT a subscription
  // Check for duplicate
  const { data: existingPurchase } = await supabase
    .from('event_purchases')
    .select('id')
    .eq('user_id', user.id)
    .eq('event_id', matchedEvent.id)
    .eq('status', 'active')
    .maybeSingle()

  if (existingPurchase) {
    console.log('Event already purchased:', matchedEvent.id)
    return Response(...)
  }

  // Insert event purchase
  await supabase.from('event_purchases').insert({
    user_id: user.id,
    event_id: matchedEvent.id,
    external_id: orderHash,
    status: 'active',
  })

  // DO NOT create/update subscription
  return Response({ success: true })
}

// Otherwise, continue with subscription logic (existing code)
```

### 3. Consistencia de dados do usuario

- O `handleEventPurchase` em `Plans.tsx` ja injeta `email` e `src` (user_id) na URL de checkout -- nenhuma alteracao necessaria
- O redirect para `/payment-success` ja esta configurado
- O usuario que compra o workshop **sem ter assinatura** permanece no plano freemium, pois nenhum registro e criado na tabela `subscriptions`
- O acesso ao evento e validado exclusivamente pela tabela `event_purchases`

## Resumo de impacto

| Arquivo | Alteracao |
|---|---|
| Migracao SQL | Atualizar `checkout_url` e `ticto_offer_id` do evento |
| `ticto-webhook/index.ts` | Adicionar deteccao de compra de evento antes da logica de assinatura |
| `Plans.tsx` | Nenhuma alteracao (ja funciona corretamente) |
| `Events.tsx` | Nenhuma alteracao (ja exibe botao com `checkout_url`) |

## Fluxo completo

1. Usuario logado acessa `/plans` ou `/events`
2. Clica em "Garantir minha vaga" no workshop
3. Redirecionado para `https://checkout.ticto.app/O94A9B515?email=...&src=userId`
4. Paga na Ticto
5. Webhook recebe payload com `offer_id` correspondente ao evento
6. Webhook cria registro em `event_purchases` (nao em `subscriptions`)
7. Usuario permanece no tier freemium (se nao tinha assinatura)
8. Usuario ganha acesso ao conteudo do evento via `event_purchases`
