

# Plano: Ativar resumo diário para dois usuários

## Diagnóstico

Consultei o banco de dados e confirmei o status atual:

| Usuário | Email | `notify_daily_email` | Status |
|---|---|---|---|
| Davy Barros | davylbarros@gmail.com | `false` | ⚠️ Desativado |
| MINDZ DIGITAL | davy@mindzdigital.com.br | `false` | ⚠️ Desativado |

Ambos estão com a notificação de resumo diário **desativada**.

## Correção

Executar um UPDATE na tabela `profiles` para ativar `notify_daily_email = true` nos dois registros:

```sql
UPDATE profiles 
SET notify_daily_email = true 
WHERE id IN (
  '7082fd72-4af9-4a20-b153-f95b62f8a379',
  'dd38490f-aab9-4ffe-8023-5b1bcfc13e35'
);
```

## Validação

Após o UPDATE, consultar novamente para confirmar que ambos estão com `notify_daily_email = true`.

## O que NÃO muda

- Nenhum arquivo de código
- Nenhuma Edge Function
- Preferências de outros usuários

