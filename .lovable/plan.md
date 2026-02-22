

# Ativar Resumo Diario por Padrao

## Resumo

Atualmente, o campo `notify_daily_email` e criado com valor padrao `false` no banco de dados, e os fallbacks no codigo tambem usam `false`. Vamos alterar tudo para `true`, garantindo que novos usuarios recebam o resumo diario automaticamente.

## Diagnostico da Funcionalidade

A funcionalidade do resumo diario esta **completamente implementada**:
- Edge function `send-daily-digest` busca atualizacoes das ultimas 24h, agrupa por espaco e envia via Resend
- Filtro por `notify_daily_email` esta correto (so envia para quem tem `true`)
- Template do email segue a identidade visual do Subhumano
- Remetente configurado como `noreply@subhumano.ia.br`
- Cron job configurado para disparar diariamente as 18h BRT

## Alteracoes Necessarias

### 1. Migracao no banco de dados
Alterar o valor padrao da coluna `notify_daily_email` de `false` para `true`:

```text
ALTER TABLE public.profiles 
ALTER COLUMN notify_daily_email SET DEFAULT true;
```

Isso garante que novos usuarios criados a partir de agora terao o resumo ativado. Usuarios existentes nao serao afetados (mantem o valor atual).

### 2. Frontend - NotificationPreferences.tsx
Alterar os dois fallbacks de `false` para `true`:
- Estado inicial (linha 33): `notify_daily_email: false` para `true`
- Fallback ao carregar do banco (linha 64): `?? false` para `?? true`

### 3. Edge Function - send-daily-digest/index.ts
Alterar o fallback (linha 184): `?? false` para `?? true`

Isso garante que, caso o valor no banco seja `null` (usuarios antigos que nunca configuraram), o sistema assume como ativado.

## Impacto

- **Novos usuarios**: Receberao o resumo diario por padrao (podem desativar nas preferencias)
- **Usuarios existentes com valor `null`**: Passarao a ser tratados como ativado
- **Usuarios existentes com valor `false` explicito**: Continuam sem receber (respeitando a escolha)
- Nenhuma alteracao visual na tela de preferencias

