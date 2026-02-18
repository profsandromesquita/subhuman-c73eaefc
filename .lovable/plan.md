
# Correção do Envio de Email por Notificação Admin

## Diagnóstico Definitivo

### Causa Raiz 1 — Domínio não verificado no Resend (ERRO PRINCIPAL)

Os logs da Edge Function são conclusivos:

```
ERROR Email send error: {
  statusCode: 403,
  message: "The subhumano.ia.br domain is not verified.
            Please, add and verify your domain on https://resend.com/domains",
  name: "validation_error"
}
```

O Resend bloqueia o envio com **HTTP 403** porque o domínio `subhumano.ia.br` não foi verificado na conta Resend. Isso ocorre em 100% dos envios testados (os 3 usuários que você testou falharam por esse motivo).

A Edge Function captura o erro silenciosamente e retorna `{ success: true, emailSent: false }` — a notificação in-app é inserida, mas o email nunca sai.

### Causa Raiz 2 — Frontend ignora `emailSent: false`

Em `src/pages/admin/Users.tsx`, a função `confirmNotifyUser` não lê o campo `emailSent` da resposta:

```typescript
// Código atual — linha 216
const { error } = await supabase.functions.invoke('send-user-notification', { ... });
if (!error) {
  toast.success('Notificação enviada!'); // ← sempre mostra sucesso mesmo sem email
}
```

O admin vê "Notificação enviada!" mesmo quando o email falhou, criando confusão.

---

## Duas Soluções — Ordem de Implementação

### Solução A — Verificar domínio no Resend (ação manual sua — fora do código)

Esta é a correção definitiva para o email funcionar. Você precisa:

1. Acessar [https://resend.com/domains](https://resend.com/domains)
2. Clicar em "Add Domain" e adicionar `subhumano.ia.br`
3. O Resend fornecerá registros DNS (TXT/CNAME) para adicionar no painel DNS do seu domínio
4. Após adicionar os registros DNS, clicar em "Verify" no Resend

Enquanto o domínio não estiver verificado, **nenhum email será entregue**, independente de qualquer correção no código.

> Alternativa temporária: usar o domínio sandbox do Resend (`onboarding@resend.dev`) que funciona sem verificação, mas só entrega emails para o endereço cadastrado na conta Resend — não serve para produção com múltiplos destinatários.

### Solução B — Correções de código (implementar agora)

Independente da verificação do domínio, o código precisa ser corrigido em dois pontos:

#### 1. Edge Function — Propagar erro de email na resposta

**Arquivo**: `supabase/functions/send-user-notification/index.ts`

Adicionar campo `emailError` na resposta para que o frontend saiba distinguir:

```typescript
// ANTES (linha 125-128):
return new Response(
  JSON.stringify({ success: true, emailSent }),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);

// DEPOIS:
return new Response(
  JSON.stringify({ 
    success: true, 
    emailSent,
    emailError: emailSent ? null : (send_email ? 'Domínio não verificado no Resend' : null)
  }),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

Mas melhor ainda: capturar a mensagem de erro real do Resend e enviá-la:

```typescript
let emailSent = false;
let emailErrorMsg: string | null = null;

// ... dentro do bloco if (send_email && resendApiKey):
if (emailError) {
  console.error('Email send error:', emailError);
  emailErrorMsg = emailError.message || 'Falha no envio do email';
} else {
  emailSent = true;
}

// Na resposta:
return new Response(
  JSON.stringify({ success: true, emailSent, emailError: emailErrorMsg }),
  ...
);
```

#### 2. Frontend — Informar admin sobre status real do email

**Arquivo**: `src/pages/admin/Users.tsx` — função `confirmNotifyUser`

```typescript
// ANTES:
const { error } = await supabase.functions.invoke('send-user-notification', { ... });
if (!error) {
  toast.success('Notificação enviada!');
  setShowNotifyDialog(false);
  // ...
}

// DEPOIS:
const { data, error } = await supabase.functions.invoke('send-user-notification', { ... });
if (!error) {
  if (notifySendEmail && data && !data.emailSent) {
    // Notificação in-app enviada, mas email falhou
    toast.warning(`Notificação enviada! ${data.emailError ? `Email falhou: ${data.emailError}` : 'Email não pôde ser enviado.'}`);
  } else {
    toast.success(notifySendEmail && data?.emailSent ? 'Notificação e email enviados!' : 'Notificação enviada!');
  }
  setShowNotifyDialog(false);
  // resetar campos...
}
```

---

## Resumo das Mudanças de Código

| Arquivo | Mudança | Motivo |
|---|---|---|
| `supabase/functions/send-user-notification/index.ts` | Capturar `emailErrorMsg` e incluir na resposta JSON | Admin sabe quando email falhou e o motivo |
| `src/pages/admin/Users.tsx` | Ler `data.emailSent` e `data.emailError` da resposta e exibir toast diferenciado | Feedback correto para o admin |

## Ação Obrigatória Fora do Código

Sem verificar o domínio `subhumano.ia.br` no Resend, os emails continuarão falhando com 403 mesmo após corrigir o código. A sequência correta é:

1. Implementar as correções de código (feedback correto no admin)
2. Verificar o domínio no Resend (emails passam a ser entregues)
3. Testar novamente com os 3 emails informados

## Arquivos Alterados

- `supabase/functions/send-user-notification/index.ts` — adicionar `emailErrorMsg` e incluir na resposta
- `src/pages/admin/Users.tsx` — ler `data.emailSent`/`data.emailError` e exibir toast diferenciado
