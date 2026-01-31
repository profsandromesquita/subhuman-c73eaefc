
## Investigação exaustiva (causa raiz comprovada)

### 1) O que acontece quando o usuário clica em “Prefiro testar grátis por 7 dias →”
Ao clicar no botão, o frontend executa `handleStartTrial()` em `src/pages/Plans.tsx` e tenta inserir um registro na tabela `public.subscriptions`:

- `user_id: user.id`
- `plan_type: 'trial'`
- `status: 'active'`
- `starts_at: now.toISOString()`
- `expires_at: now + 7 dias`

Código (trecho real do projeto, linhas 93–102):
- `plan_type: 'trial'` está correto e consistente com o objetivo do trial.

Conclusão: **o frontend envia exatamente o que deveria enviar**.

---

### 2) Por que o erro aparece como “index-*.js linha XXXXX”?
Esse arquivo é o bundle minificado do build (Vite). Ele apenas “reflete” o erro que vem do backend ao tentar inserir o registro.

Conclusão: **o problema não está “na linha do index”**; a linha aponta apenas para onde o erro foi capturado/logado no bundle.

---

### 3) Evolução dos erros (por que mudou de 403/42501 para 400/23514)
Você reportou duas fases:

#### Fase A — 42501 (RLS)
- Erro: `new row violates row-level security policy for table "subscriptions"`
- Isso acontecia quando não havia política de INSERT permitindo o usuário criar seu próprio trial.

Essa parte foi endereçada ao criar a policy de INSERT para `plan_type='trial'` e `auth.uid()=user_id`.

#### Fase B — 23514 (CHECK constraint)
Agora o erro é:
- `new row for relation "subscriptions" violates check constraint "subscriptions_plan_type_check"`
- HTTP 400 (PostgREST), que bate exatamente com “violação de constraint”.

Isso significa: **a tentativa de inserir passou pela RLS (senão seria 42501), mas foi bloqueada por uma regra de integridade do banco (CHECK constraint)**.

---

### 4) Prova definitiva: definição real da constraint no banco (consulta direta)
Eu consultei as constraints CHECK da tabela `public.subscriptions` e obtive:

- `subscriptions_plan_type_check`
  - Definição:
    - `CHECK ((plan_type = ANY (ARRAY['monthly'::text, 'yearly'::text])))`

Ou seja, hoje o banco **só aceita**:
- `monthly`
- `yearly`

E **rejeita**:
- `trial`

Isso explica 100% do erro `23514`: estamos enviando `plan_type='trial'`, mas a constraint não permite.

Conclusão: **a causa raiz é a constraint `subscriptions_plan_type_check` estar desatualizada e não incluir o valor `trial`.**

---

## Correção definitiva (escopo mínimo, sem alterar o que já funciona)

### Objetivo
Permitir `plan_type='trial'` mantendo os valores já suportados (`monthly`, `yearly`) e sem mexer em outras regras de assinatura.

### Mudança necessária (somente backend / schema)
Atualizar a constraint `subscriptions_plan_type_check` para aceitar também `trial`.

#### Migração SQL proposta
```sql
-- 1) Remove a constraint antiga (que não aceita 'trial')
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;

-- 2) Recria a constraint incluindo 'trial'
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_type_check
  CHECK (
    plan_type = ANY (ARRAY['monthly'::text, 'yearly'::text, 'trial'::text])
  );
```

### Por que isso resolve “em definitivo”?
- O INSERT do trial já tem:
  - usuário autenticado
  - RLS permitindo inserir trial (já aplicada)
- O único bloqueio restante comprovado é:
  - constraint de `plan_type` não aceitar `trial`
- Ao incluir `trial`, o INSERT passa.

---

## Verificações pré e pós-migração (para garantir zero regressão)

### Pré-migração (checagens de segurança)
1) Verificar valores existentes em `subscriptions.plan_type`:
   - Se houver algum valor fora de `monthly/yearly/trial`, a nova constraint falharia ao ser aplicada.
   - Hoje é altamente provável que só existam `monthly/yearly`, já que trial nunca inseriu (estava falhando).

2) Confirmar que a policy de INSERT do trial existe (já existe, mas confirmaremos no backend):
   - “Users can create own trial subscription” (INSERT) com `auth.uid() = user_id` e `plan_type='trial'`.

### Pós-migração (testes funcionais)
1) Fluxo principal:
   - Fazer login
   - Ir para `/plans`
   - Clicar “Prefiro testar grátis por 7 dias →”
   - Resultado esperado:
     - Toast de sucesso
     - Redireciona para `/home`
     - Um registro deve existir em `subscriptions` com:
       - `plan_type='trial'`
       - `status='active'`
       - `expires_at` em ~7 dias

2) Fluxo de “trial já utilizado”:
   - Voltar em `/plans`
   - Clicar novamente em “Prefiro testar grátis…”
   - Resultado esperado:
     - Mensagem “Você já utilizou seu período de teste gratuito.”

3) Fluxo de bloqueio após expiração:
   - Para teste rápido (sem esperar 7 dias), apenas em ambiente de teste:
     - Ajustar manualmente `expires_at` do trial para uma data no passado (operação controlada)
   - Resultado esperado:
     - Ao tentar acessar `/home` (ou qualquer rota protegida) o usuário será redirecionado para `/plans` e verá “Seu período de teste expirou”.

---

## Itens que NÃO serão alterados (respeitando sua restrição)
- Nenhuma mudança no componente da página `/plans` além do que já existe (o frontend já envia `trial` corretamente).
- Nenhuma mudança em guardas, rotas e regras já implementadas (SubscriptionGuard/useSubscription/useChannelAccess).
- Nenhuma mudança em outras tabelas/políticas.
- Apenas correção estrutural pontual: **permitir `trial` no `CHECK` do banco**.

---

## Checklist de aceite (o que você pode usar para validar)
- [ ] Clicar em “Prefiro testar grátis…” não gera mais erro 400/23514
- [ ] Trial é criado com sucesso e o usuário entra na plataforma
- [ ] Após expirar, o usuário é sempre redirecionado para `/plans`
- [ ] Planos pagos (`monthly/yearly`) permanecem válidos (a constraint continua aceitando os valores atuais)

---

## Próximo passo (após sua aprovação deste plano)
1) Aplicar a migração de schema para atualizar a constraint `subscriptions_plan_type_check`
2) Retestar o fluxo ponta a ponta (cadastro/login → `/plans` → trial → acesso → expiração/redirect)
