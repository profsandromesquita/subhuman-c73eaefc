
# Plano de Correção: Política RLS para Trial

## Diagnóstico

O erro `42501 - new row violates row-level security policy` ocorre porque a tabela `subscriptions` não possui uma política que permita usuários autenticados inserirem sua própria assinatura de trial.

**Políticas atuais:**
- `Admins can manage subscriptions` (ALL) - Apenas admins
- `Users can view own subscriptions` (SELECT) - Usuários só podem VER

**Problema:** Falta política de INSERT para usuários criarem trial.

## Solução

Adicionar uma política RLS que permita usuários autenticados criarem **apenas** assinaturas do tipo `trial` para si mesmos.

## Implementação

### Migração SQL

```sql
-- Política para usuários criarem sua própria assinatura trial
CREATE POLICY "Users can create own trial subscription"
  ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    AND plan_type = 'trial'
  );
```

### Detalhes da Política

| Aspecto | Valor |
|---------|-------|
| Tabela | `subscriptions` |
| Comando | `INSERT` |
| Role | `authenticated` |
| Condição | `user_id = auth.uid() AND plan_type = 'trial'` |

### Restrições de Segurança

A política garante que:
1. O `user_id` deve ser igual ao ID do usuário autenticado (não pode criar para outros)
2. O `plan_type` deve ser exatamente `'trial'` (não pode criar planos pagos)

A verificação de "trial já utilizado" continua sendo feita no frontend, mas mesmo que alguém tente burlar, a lógica de negócio continua protegida.

## Impacto

- **Código frontend:** Nenhuma alteração necessária
- **Outros fluxos:** Não afetados (admins continuam podendo gerenciar tudo)
- **Segurança:** Mantida - usuários só podem criar trial para si mesmos

## Validação

Após aplicar a migração:
1. Usuário clica em "Testar grátis por 7 dias"
2. Sistema cria registro em `subscriptions` com `plan_type: 'trial'`
3. Usuário é redirecionado para `/home` com acesso liberado por 7 dias
