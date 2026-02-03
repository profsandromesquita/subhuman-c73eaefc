

# Plano: Integrar Checkout Ticto no Subhumano

## Resumo

Integrar o checkout da Ticto para processar assinaturas recorrentes, sincronizando pagamentos com a tabela `subscriptions` existente e mantendo a lógica de acesso que já funciona (trial 7 dias ou assinatura ativa).

---

## Dados da Integração

| Informação | Valor |
|------------|-------|
| API Key | `a0eefaa0-4f8f-4c22-94f5-a85c52540bea` |
| Link Checkout | `https://checkout.ticto.app/O1F2F1BB4` |
| Código da Oferta | O1F2F1BB4 |
| Tipo | Assinatura recorrente |

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE PAGAMENTO TICTO                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Usuário clica "Assinar" na página /plans                       │
│     ↓                                                               │
│  2. Redireciona para checkout.ticto.app/O1F2F1BB4                  │
│     (com email e user_id como parâmetros)                          │
│     ↓                                                               │
│  3. Ticto processa pagamento (cartão/PIX)                          │
│     ↓                                                               │
│  4. Ticto envia webhook POST para Edge Function                    │
│     ↓                                                               │
│  5. Edge Function valida e cria registro em subscriptions          │
│     ↓                                                               │
│  6. Usuário retorna ao app → SubscriptionGuard libera acesso       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Componentes a Implementar

### 1. Secret: TICTO_API_KEY

Armazenar a API Key de forma segura nos secrets do projeto.

### 2. Edge Function: `ticto-webhook`

Novo arquivo que receberá os eventos da Ticto:

**Eventos a processar:**
| Evento | Ação |
|--------|------|
| `purchase_approved` / `order_paid` | Cria subscription ativa |
| `subscription_renewed` | Atualiza `expires_at` |
| `subscription_canceled` | Muda status para `canceled` |
| `refund_completed` | Muda status para `refunded` |

**Lógica principal:**
- Extrair email do comprador do payload
- Buscar usuário pelo email na tabela `auth.users` (via service_role)
- Criar/atualizar registro em `subscriptions` com:
  - `plan_type`: 'monthly' ou 'yearly' (baseado no valor/período)
  - `status`: 'active'
  - `provider`: 'ticto'
  - `external_id`: ID da transação na Ticto
  - `expires_at`: Data calculada (30 ou 365 dias)

### 3. Atualização: `src/pages/Plans.tsx`

Modificar o botão "Assinar agora" para redirecionar ao checkout da Ticto:

```typescript
const handleSubscribe = () => {
  const checkoutUrl = new URL('https://checkout.ticto.app/O1F2F1BB4');
  
  // Identificar usuário no checkout
  if (user?.email) {
    checkoutUrl.searchParams.set('email', user.email);
  }
  if (user?.id) {
    checkoutUrl.searchParams.set('src', user.id);
  }
  
  window.location.href = checkoutUrl.toString();
};
```

### 4. Nova página: `src/pages/PaymentSuccess.tsx`

Página de callback para quando usuário retorna do checkout:
- Verifica status da subscription
- Mostra confirmação ou "aguardando confirmação"
- Redireciona para Home quando subscription ativa

### 5. Atualização: `src/App.tsx`

Adicionar rota `/payment-success` para a nova página.

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/ticto-webhook/index.ts` | **Criar** | Processar webhooks da Ticto |
| `supabase/config.toml` | **Modificar** | Adicionar config da edge function |
| `src/pages/Plans.tsx` | **Modificar** | Redirecionar para checkout Ticto |
| `src/pages/PaymentSuccess.tsx` | **Criar** | Página de retorno pós-pagamento |
| `src/App.tsx` | **Modificar** | Adicionar rota /payment-success |

---

## Configuração no Painel Ticto

Após a implementação, você precisará configurar o webhook no painel da Ticto:

**URL do Webhook:**
```
https://akkbfzfjappludgsrwsw.supabase.co/functions/v1/ticto-webhook
```

**Eventos a ativar:**
- Pagamento aprovado
- Assinatura renovada
- Assinatura cancelada
- Reembolso

---

## Segurança

### Validação do Webhook
- Verificar header de autenticação da Ticto (se disponível)
- Validar campos obrigatórios no payload
- Prevenir duplicatas verificando `external_id` existente

### Proteção de Dados
- API Key armazenada como secret (não no código)
- Edge function com `verify_jwt = false` para receber webhooks
- Logs detalhados para debugging

---

## Lógica de Acesso (já implementada)

O `SubscriptionGuard` já verifica corretamente:

| Status | Acesso |
|--------|--------|
| `trial` | Liberado (7 dias) |
| `active` | Liberado (assinatura paga) |
| `expired` | Bloqueado → /plans |
| `none` | Bloqueado → /plans |

A integração apenas adiciona a capacidade de criar subscriptions via pagamento Ticto.

---

## Resultado Esperado

| Cenário | Comportamento |
|---------|---------------|
| Usuário paga via Ticto | Webhook cria subscription → acesso liberado |
| Renovação automática | Webhook atualiza expires_at → acesso continua |
| Cancelamento | Webhook muda status → acesso até expirar |
| Reembolso | Webhook muda status → acesso bloqueado |

---

## Próximo Passo Após Aprovação

1. Vou solicitar que você insira a API Key como secret
2. Implementar todos os arquivos listados
3. Você configura o webhook no painel da Ticto
4. Fazemos um teste de pagamento

