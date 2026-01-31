
## Objetivo da Tentativa 4
Corrigir o comportamento de “loop” em `/plans` após clicar em **“Prefiro testar grátis por 7 dias →”**, garantindo que:
1) o trial seja criado (isso já está ok), e
2) o usuário seja **redirecionado e permaneça** em `/home` (ou rota protegida), com acesso liberado por 7 dias.

---

## Diagnóstico (causa raiz provável, baseada no código atual)
### Sintoma observado
- Após clicar no botão, não há mais erro de backend.
- O usuário “não vai para lugar nenhum” e parece ficar preso em `/plans`.
- Isso é compatível com este cenário: **o app tenta ir para `/home`, mas é imediatamente redirecionado de volta para `/plans`**, dando a impressão de que nada aconteceu.

### O mecanismo do “loop”
- Em `Plans.tsx`, após criar o trial com sucesso, o código faz:
  - `navigate("/home")`
- A rota `/home` é protegida por `SubscriptionGuard` (`App.tsx`):
  - Se `status === 'none'` ou `status === 'expired'`, ele executa:
    - `navigate('/plans', { replace: true })`

Portanto, se por qualquer motivo o guard “enxerga” o status como `none` logo após a navegação, ele manda o usuário de volta para `/plans`.

### A causa raiz mais forte no seu código (race condition / estado duplicado de autenticação)
O seu `useAuth()` **não é um provider/context global**. Ele é um hook que cria estado interno (`useState`) e registra listeners (`onAuthStateChange`) em **cada lugar que for chamado**.

E aqui está o ponto crítico:

- `SubscriptionGuard` faz:
  - `const { user, loading: authLoading } = useAuth();`   (Instância A)
  - `const { status, loading: subLoading } = useSubscription();`
- `useSubscription()` por sua vez faz:
  - `const { user } = useAuth();`   (Instância B)

Ou seja: **existem duas instâncias independentes de autenticação**, cada uma com seu próprio timing de `getSession()` e `onAuthStateChange`.

Isso pode gerar exatamente o bug:
- A instância A (do guard) já tem `user` preenchido (authLoading=false).
- A instância B (do useSubscription) ainda está com `user=null` naquele momento.
- Então `useSubscription` entra no trecho:
  - `if (!user) { setStatus('none'); setLoading(false); return; }`
- Resultado: o guard vê `user != null` e `status === 'none'` e redireciona para `/plans`.
- Para o usuário parece um “loop”/“não sai do lugar”.

Esse tipo de race é muito comum quando o estado de auth não é centralizado e é consumido em múltiplos hooks que se auto-instanciam.

---

## Estratégia de correção (definitiva)
### Princípio
**Garantir que exista uma única fonte de verdade para autenticação** (um único estado compartilhado), para que `SubscriptionGuard` e `useSubscription` sempre enxerguem o mesmo `user/session` ao mesmo tempo.

### Mudança-chave
Implementar um `AuthProvider` com React Context e refatorar `useAuth()` para consumir esse contexto, ao invés de criar estado toda vez.

---

## Plano de implementação (passo a passo)

### 1) Criar um Provider global de autenticação (React Context)
**Novos arquivos (frontend):**
- `src/contexts/AuthContext.tsx` (ou `src/context/AuthContext.tsx`, mantendo padrão do projeto)
  - Responsável por:
    - manter `user`, `session`, `loading`
    - registrar **uma única vez** o `supabase.auth.onAuthStateChange`
    - executar `supabase.auth.getSession()` uma única vez ao montar
  - Exportar:
    - `AuthProvider`
    - `useAuthContext` (hook interno do context)

**Comportamento esperado:**
- Qualquer componente/hook que use auth receberá exatamente o mesmo `user`, no mesmo tick, sem instâncias “A/B”.

### 2) Refatorar `src/hooks/useAuth.ts` para usar o Context
- Manter a mesma API pública (para não quebrar o app):
  - `user`, `session`, `loading`, `signUp`, `signIn`, `signOut`, `resetPassword`
- Trocar o estado interno por consumo do Context:
  - `const { user, session, loading } = useAuthContext()`
- As funções `signUp/signIn/...` continuam usando o client `supabase` normalmente.

**Importante:**
- Remover do `useAuth` atual:
  - `useEffect` com `onAuthStateChange` e `getSession`
- Essas responsabilidades passam para o Provider.

### 3) Envolver o App com `AuthProvider`
Há duas opções seguras. Escolherei a mais previsível:

- Em `src/main.tsx`:
  - envolver `<App />` com `<AuthProvider>`

Isso garante que **todas** as rotas e guards estejam dentro do Provider.

### 4) Corrigir `useSubscription` para não criar outra instância de auth
Após o Context, `useSubscription` pode continuar chamando `useAuth()` (agora ele será estável e compartilhado).
Mas ainda vamos fortalecer o fluxo para evitar “status none” durante transições:

- Em `useSubscription.ts`:
  - pegar `user` e também `loading` do `useAuth()`
  - só rodar `checkSubscription` quando `authLoading === false`
  - enquanto `authLoading === true`, manter `loading` de subscription true (ou pelo menos não setar status `none` prematuramente)

Isso elimina o caso:
- auth ainda carregando → `useSubscription` marca “none” → guard redireciona errado

### 5) Garantir atualização imediata após iniciar trial (evitar depender de timing)
Mesmo com Context, vale “selar” o comportamento do clique do trial para ser instantâneo:

- Alterar `useSubscription` para expor um método `refetch()` (ou `refresh()`):
  - `return { status, planType, expiresAt, daysRemaining, loading, refetch: checkSubscription }`

- Em `Plans.tsx`, após inserir o trial com sucesso:
  - chamar `await refetch()` antes do `navigate("/home")`
  - usar `navigate("/home", { replace: true })` para evitar voltar para `/plans` via histórico

Isso garante que, ao entrar em `/home`, o guard já terá o estado atualizado (ou muito mais provável de estar).

### 6) Melhorias defensivas na página `/plans` (para UX e evitar confusões)
- Se o usuário já tem assinatura/trial ativo (`status === 'trial' || status === 'active'`), redirecionar automaticamente para `/home`.
  - Isso evita o cenário: usuário com trial ativo volta em `/plans` e acha que “não funcionou”.

- Botão “Prefiro testar grátis...”:
  - desabilitar caso `status === 'trial' || status === 'active'`
  - e mostrar mensagem apropriada

### 7) Debug orientado a evidências (temporário, para fechar o caso)
Adicionar logs temporários (removíveis) para confirmar o fluxo real:
- Em `SubscriptionGuard`:
  - logar `authLoading, subLoading, user?.id, status`
- Em `Plans.tsx`:
  - logar que o insert terminou e que vai navegar

Após confirmação em produção/teste, remover logs para não poluir.

---

## Por que essa abordagem resolve “em definitivo”
- Remove a classe inteira de bugs de “estado de auth duplicado” (que é a causa mais comum de loops com guards).
- Faz `SubscriptionGuard` e `useSubscription` operarem com o mesmo estado real.
- Reduz dependência de timing do banco/rede com `refetch()` antes de navegar.

---

## Validação (checklist de testes ponta a ponta)
### Cenário A — Usuário novo (principal)
1) Criar conta e fazer login
2) Ir para `/plans`
3) Clicar “Prefiro testar grátis por 7 dias →”
4) Esperado:
   - toast de sucesso
   - navega para `/home`
   - permanece em `/home` (sem voltar a `/plans`)
5) Recarregar a página em `/home`
6) Esperado:
   - continua com acesso (não cai em `/plans`)

### Cenário B — Usuário já com trial
1) Usuário com trial ativo acessa `/plans`
2) Esperado:
   - redireciona automaticamente para `/home` ou desabilita o botão de trial com mensagem

### Cenário C — Trial expirado
1) Simular expiração (em ambiente de teste) ajustando `expires_at` para o passado
2) Acessar `/home`
3) Esperado:
   - redireciona para `/plans`
   - exibe mensagem de trial expirado

---

## Arquivos que serão alterados/criados (resumo técnico)
- Criar:
  - `src/contexts/AuthContext.tsx`
- Alterar:
  - `src/main.tsx` (envolver App com AuthProvider)
  - `src/hooks/useAuth.ts` (usar context, remover listeners duplicados)
  - `src/hooks/useSubscription.ts` (aguardar authLoading, expor refetch)
  - `src/components/SubscriptionGuard.tsx` (opcional: logs temporários / dependências mais estáveis)
  - `src/pages/Plans.tsx` (chamar refetch e usar replace; UX defensiva)

---

## Observações importantes
- **Não requer novas mudanças no banco** (o trial já está sendo inserido).
- O warning de `ref` no console (“Function components cannot be given refs…”) é um problema separado e não é a causa do loop. Podemos corrigir depois, mas não deve bloquear o trial.

