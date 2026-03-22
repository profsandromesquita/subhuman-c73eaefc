

# Plano: Migrar auth-email-hook de Lovable Email API para Resend API

## Arquivo: `supabase/functions/auth-email-hook/index.ts`

### Mudanças

**Linha 3 — Import**: Remover `sendLovableEmail` do import. Manter `parseEmailWebhookPayload` (usado no `verifyWebhookRequest`).

```diff
- import { sendLovableEmail, parseEmailWebhookPayload } from 'npm:@lovable.dev/email-js'
+ import { parseEmailWebhookPayload } from 'npm:@lovable.dev/email-js'
```

**Linhas 37-41 — Configuração**: Remover `SENDER_DOMAIN` e `FROM_DOMAIN` (não mais necessários).

**Linhas 236-270 — Bloco de envio**: Substituir toda a seção que usa `sendLovableEmail` + `callbackUrl` por chamada direta à Resend API:

- Remover verificação de `callbackUrl` (linhas 239-246)
- Remover chamada `sendLovableEmail` (linhas 248-262)
- Adicionar: leitura de `RESEND` dos secrets
- Adicionar: `fetch('https://api.resend.com/emails', ...)` com `from: 'Subhumano <noreply@subhumano.ia.br>'`
- Manter tratamento de erro e logs no mesmo padrão

### O que NÃO muda

- Webhook verification (`verifyWebhookRequest` + `LOVABLE_API_KEY`) — intacto
- Preview handler — intacto
- Templates React Email — intactos
- Renderização HTML/text — intacta
- `EMAIL_SUBJECTS`, `EMAIL_TEMPLATES`, `SAMPLE_DATA` — intactos

### Deploy

Após a edição, deploy via `deploy_edge_functions(['auth-email-hook'])`.

