
# Correcao de 3 Problemas: Status Admin, Email e Cupom

## Problema 1: Status Incorreto no Painel Admin

**Causa**: A tabela `subscriptions` armazena `status = 'active'` mesmo apos a data de expiracao passar. O `useSubscription` do lado do usuario calcula corretamente que o trial expirou (comparando `expires_at` com `now()`), mas o painel admin (`admin/Subscriptions.tsx`) exibe o valor cru do banco de dados sem essa verificacao.

**Correcao no Admin**: Adicionar logica de status computado na pagina `admin/Subscriptions.tsx` e `admin/Users.tsx`. Para cada assinatura, verificar se `status === 'active'` e `expires_at < now()` — nesse caso, exibir "Expirado" (com cor vermelha) em vez de "Ativo".

**Correcao no Backend**: Criar uma funcao scheduled ou um trigger que automaticamente mude o `status` de `active` para `expired` quando `expires_at` passa. Porem, como isso exige cron jobs que nao estao disponiveis no Lovable Cloud, a solucao mais segura e computar o status real no frontend (tanto no admin quanto no SubscriptionGuard, que ja faz isso corretamente).

**O SubscriptionGuard ja bloqueia corretamente** usuarios com trial expirado (redireciona para /plans). Nao precisa de correcao nesse componente.

---

## Problema 2: Email do Usuario Invisivel para Admin

**Causa**: A tabela `profiles` nao armazena email. O email esta apenas no schema `auth.users`, que nao e acessivel via client SDK.

**Correcao**: Criar uma funcao de banco de dados `SECURITY DEFINER` que retorna emails apenas para admins:

```text
create function get_user_emails_admin()
returns table(user_id uuid, email text)
security definer
-- Verifica se o chamador e admin antes de retornar dados
```

Depois, no `admin/Users.tsx`, chamar essa funcao via `supabase.rpc('get_user_emails_admin')` e exibir o email na tabela e no dialog de detalhes.

---

## Problema 3: Cupom Nao Reconhecido

**Causa**: O input de cupom na pagina Plans.tsx tem `maxLength={20}`. O cupom `PARCEIROS-SDW5-V62N-FV2V` tem **24 caracteres**. O usuario nao consegue digitar o codigo completo — ele e truncado para `PARCEIROS-SDW5-V62N-F`, que nao existe no banco.

**Correcao**: Aumentar o `maxLength` para 30 (os cupons gerados pelo sistema tem formato `PREFIX-XXXX-YYYY-ZZZZ`, que pode ter ate ~25 caracteres dependendo do prefixo).

---

## Plano de Implementacao

### Etapa 1 — Corrigir maxLength do cupom (trivial)
- Arquivo: `src/pages/Plans.tsx`
- Alterar `maxLength={20}` para `maxLength={30}` no input de cupom (linha 366)

### Etapa 2 — Corrigir exibicao de status no admin
- Arquivo: `src/pages/admin/Subscriptions.tsx`
  - Adicionar funcao `computeRealStatus(sub)` que retorna 'expired' se `status === 'active' && expires_at < now()`
  - Atualizar a coluna "Status" para usar o status computado
  - Atualizar as stats para excluir assinaturas expiradas do contador "Ativas"
  - Atualizar o dialog de detalhes para mostrar o status real

- Arquivo: `src/pages/admin/Users.tsx`
  - Na query de subscriptions, trazer tambem `expires_at` para computar o status real
  - Atualizar a coluna "Assinatura" para mostrar "Expirado" quando `expires_at < now()`

### Etapa 3 — Expor email para admin
- Criar migracao SQL com funcao `get_user_emails_admin()`:
  - Funcao `SECURITY DEFINER` que consulta `auth.users`
  - Verifica internamente se o chamador tem role 'admin' ou 'moderator'
  - Retorna `(user_id uuid, email text)`

- Arquivo: `src/pages/admin/Users.tsx`
  - Chamar `supabase.rpc('get_user_emails_admin')` no `fetchUsers()`
  - Adicionar coluna "Email" na tabela
  - Exibir email no dialog de perfil do usuario

### Detalhes Tecnicos

**Funcao SQL get_user_emails_admin**:
```text
create or replace function public.get_user_emails_admin()
returns table(user_id uuid, email text)
language sql
stable
security definer
set search_path = public
as $$
  select au.id as user_id, au.email
  from auth.users au
  where is_admin_or_moderator(auth.uid())
$$;
```

**Funcao computeRealStatus (TypeScript)**:
```text
function computeRealStatus(sub: Subscription): string {
  if (sub.status === 'active' && sub.expires_at) {
    return new Date(sub.expires_at) < new Date() ? 'expired' : 'active';
  }
  return sub.status;
}
```
