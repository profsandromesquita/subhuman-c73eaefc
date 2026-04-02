

# Plano: Adicionar throttle de 250ms entre envios no daily digest

## Arquivo: `supabase/functions/send-daily-digest/index.ts`

### Edição 1 — Adicionar função `sleep` (antes do loop de envio, ~linha 215)

```typescript
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
```

### Edição 2 — Adicionar delay após cada envio bem-sucedido (após linha 248)

Dentro do bloco `else` (envio com sucesso), adicionar um `await sleep(250)` para manter no máximo ~4 req/s (abaixo do limite de 5 req/s do Resend):

```typescript
} else {
  emailsSent++;
  console.log(`Email sent to ${digest.email}`);
  await sleep(250);
}
```

Também adicionar o delay após erros não-fatais (no catch), para evitar burst em cenários de retry:

```typescript
} catch (error: any) {
  console.error(`Error sending email to ${digest.email}:`, error);
  errors.push(`Error for ${digest.email}: ${error.message}`);
  await sleep(250);
}
```

## O que NÃO muda
- Template HTML, plain text, query, subject, push notifications
- Nenhum outro arquivo

