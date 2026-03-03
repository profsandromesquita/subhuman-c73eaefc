

# Integracao Google Play Billing

## Problema

4 usuarios pagaram pela Google Play Store, mas o Subhumano nao tem nenhuma logica para receber e processar essas compras. A tabela `subscriptions` nao possui nenhum registro com `provider: 'google_play'`, entao esses usuarios sao tratados como `freemium`.

## Arquitetura necessaria

```text
Google Play Store (compra do usuario)
        |
        v
Google Cloud Pub/Sub (RTDN - Real-Time Developer Notification)
        |
        v (HTTP POST push)
Edge Function: google-play-webhook
        |
        v (valida purchaseToken via Google Play Developer API)
Tabela "subscriptions" (provider = 'google_play')
        |
        v
useSubscription / useUserAccess (ja funciona, agnostico ao provider)
```

## Componentes a implementar

### 1. Secret: GOOGLE_PLAY_SERVICE_ACCOUNT_KEY

- Credencial JSON de uma service account Google com permissao `androidpublisher` (Google Play Developer API).
- Configurada como secret na edge function.

### 2. Mapeamento de produtos (constantes na edge function)

Definir um mapa dos `subscriptionId` / `productId` configurados no Google Play Console para os `plan_type` do Subhumano:

```text
PRODUCT_MAP = {
  "subhumano_monthly"  -> plan_type: "monthly",  days: 30
  "subhumano_yearly"   -> plan_type: "yearly",   days: 365
  "subhumano_lifetime" -> plan_type: "lifetime",  days: null
}
```

Os nomes exatos dos produtos dependem do que foi cadastrado no Google Play Console.

### 3. Edge Function `google-play-webhook`

Responsabilidades:

- Receber POST do Google Cloud Pub/Sub (payload base64-encoded com `subscriptionNotification` ou `oneTimeProductNotification`)
- Decodificar e extrair: `packageName`, `subscriptionId` ou `productId`, `purchaseToken`, `notificationType`
- Usar a service account para obter um access token OAuth2
- Chamar a Google Play Developer API:
  - `GET androidpublisher/v3/applications/{packageName}/purchases/subscriptionsv2/tokens/{purchaseToken}` (para assinaturas)
  - `GET androidpublisher/v3/applications/{packageName}/purchases/products/{productId}/tokens/{purchaseToken}` (para compras unicas como lifetime)
- Validar que o pagamento esta confirmado (`acknowledgementState`, `paymentState`)
- Identificar o usuario: o app TWA precisa enviar o `user_id` do Supabase como `obfuscatedExternalAccountId` no momento da compra, ou associar via email da conta Google
- Criar/atualizar registro em `subscriptions` com `provider: 'google_play'`, `external_id: purchaseToken`

Tipos de notificacao a tratar:

| notificationType | Acao |
|---|---|
| 4 (PURCHASED) | Criar subscription active |
| 2 (RENEWED) | Atualizar expires_at |
| 3 (CANCELED) | Marcar como canceled |
| 13 (EXPIRED) | Marcar como expired |
| 12 (REVOKED) | Marcar como refunded |

### 4. Configuracao no Google Cloud Console

(Fora do codigo — configuracao manual necessaria):

- Criar topico Pub/Sub
- Criar assinatura push apontando para `https://akkbfzfjappludgsrwsw.supabase.co/functions/v1/google-play-webhook`
- No Google Play Console -> Monetization setup -> Real-time developer notifications, apontar para o topico Pub/Sub
- Dar permissao ao Pub/Sub de chamar a URL

### 5. Identificacao do usuario (ponto critico)

O Google Play nao envia email do comprador no webhook. Ha duas estrategias:

**Opcao A (recomendada):** No app TWA, ao iniciar a compra via Billing Library, enviar o `user_id` do Supabase no campo `obfuscatedExternalAccountId`. A edge function recupera esse ID ao validar o token.

**Opcao B (fallback):** O app envia um POST para uma edge function propria (`verify-play-purchase`) com o `purchaseToken` + `user_id` apos a compra ser concluida no client. Isso permite associar imediatamente.

### 6. Solucao imediata (para os 4 usuarios atuais)

Como o webhook ainda nao existe, os 4 usuarios precisam ter suas assinaturas criadas manualmente no banco via SQL (igual ao que ja foi feito com `provider: 'manual'`). Para isso, preciso dos emails ou IDs desses usuarios.

## O que NAO precisa mudar

- `useSubscription` — ja busca por `status: 'active'` independente do provider
- `useUserAccess` — ja deriva o tier pelo `planType`
- `SubscriptionGuard` — ja permite freemium com restricoes
- Tabela `subscriptions` — ja suporta qualquer `provider` (text livre)

## Proximos passos sugeridos

1. Definir os nomes exatos dos produtos no Google Play Console
2. Criar a service account e configurar o secret
3. Implementar a edge function `google-play-webhook`
4. Configurar Pub/Sub push
5. Ativar manualmente os 4 usuarios pendentes
6. (Opcional) Implementar `verify-play-purchase` como fallback client-side

## Prerequisitos do usuario

Antes de implementar, preciso saber:

- Quais sao os `productId` / `subscriptionId` cadastrados no Google Play Console?
- Voce ja tem uma service account com acesso a Google Play Developer API?
- O wrapper TWA envia algum identificador do usuario (user_id) no momento da compra?
