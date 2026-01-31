
## Diagnóstico definitivo (causa raiz mais provável)

O redirecionamento “misterioso” para **/home** não está sendo causado pelo clique/botão (TrialBanner/SubscriptionModal) e sim por uma **regra de auto-redirect dentro da própria página `/plans`**.

No arquivo **`src/pages/Plans.tsx`**, existe este trecho:

```ts
// Redirect if user already has active subscription or trial
useEffect(() => {
  if (!subLoading && (status === 'active' || status === 'trial')) {
    navigate('/home', { replace: true });
  }
}, [status, subLoading, navigate]);
```

Ou seja:
1) Você clica “Assinar agora” (TrialBanner) ou “Ver Planos Disponíveis” (Modal)  
2) O app navega corretamente para **/plans**  
3) Ao montar `/plans`, esse `useEffect` detecta que o usuário está **trial/active** e imediatamente manda para **/home** (com `replace: true`, apagando a navegação)

Isso explica por que “parece que o botão sempre vai para /home”, mesmo quando o código do botão está correto: **o /plans está expulsando o usuário de volta para /home**.

---

## Por que foi difícil “acertar” nas tentativas anteriores?

Porque o sintoma aparece no clique do botão, mas a causa real está em outro lugar:
- Os botões estavam sendo ajustados (stopPropagation, type="button", etc.)
- Porém, independentemente disso, **a página /plans tinha uma regra que não permite trial/active permanecerem nela**
- Portanto qualquer CTA que envie trial/active para /plans “falha” visualmente

---

## Correção definitiva (estratégia)

### Objetivo de negócio que o seu feedback define
- Usuário **trial** ou **active** deve conseguir entrar em **/plans** quando quiser (via CTA) para ver/gerenciar planos.
- Logo: **/plans não pode redirecionar trial/active automaticamente para /home**.

### Mudança principal
1) **Remover** (ou restringir fortemente) o `useEffect` que redireciona trial/active para `/home` em `src/pages/Plans.tsx`.

Recomendação para correção definitiva: **remover** completamente esse auto-redirect.  
Assim, qualquer navegação para `/plans` será respeitada (vinda do banner, modal, canal premium, etc.).

---

## Ajustes complementares (para evitar novos efeitos colaterais)

2) Em `src/pages/Plans.tsx`, ajustar a UI para usuários `trial/active` (sem redirecionar):
- Trocar o título/descrição para algo como “Planos e Gerenciamento” ou “Gerencie seu plano”.
- Opcional: mostrar um card “Seu plano atual: X” (usando o `useSubscription()` que já existe).
- O botão principal “Assinar agora” pode continuar, mas o fluxo de “assinatura” hoje é mockado (navega /home após 1s). Se você quer permitir upgrade/downgrade real depois, isso é outro passo.

3) Corrigir a opção de trial “Prefiro testar grátis por 7 dias →” para não aparecer quando o usuário já está `trial` ou `active`:
- Hoje ela aparece sempre que `!showExpiredMessage`.
- Melhor regra: exibir apenas quando `status === 'none'` (e/ou usuário não logado, se você quiser).

Isso evita confusão e reduz cliques que “dão erro” (já existe bloqueio de trial repetido via banco).

---

## Arquivos impactados

### Alterar
- **`src/pages/Plans.tsx`**
  - Remover o `useEffect` de redirect `trial/active -> /home`
  - Ajustar renderização da seção “trial grátis” para aparecer somente quando fizer sentido
  - (Opcional) Ajustar header/back link para usuários logados (ex.: voltar para /home em vez de /register)

### Não precisa alterar (já estão corretos)
- `src/components/TrialBanner.tsx` (já navega para `/plans`)
- `src/components/SubscriptionModal.tsx` (já navega para `/plans`)

---

## Plano de execução (passo a passo)

1) **Reproduzir o bug de forma controlada**
- Logar com usuário `trial`
- Clicar “Assinar agora” no banner → observar que a URL chega em `/plans` e volta para `/home`
- Abrir modal “Sua Assinatura” → “Ver Planos Disponíveis” → mesmo comportamento

2) **Implementar a correção principal**
- Editar `src/pages/Plans.tsx`
- Remover completamente o `useEffect` que redireciona para `/home` quando `status` é `trial/active`

3) **Implementar os ajustes complementares**
- Condicionar o botão “testar grátis 7 dias” para aparecer apenas quando `status === 'none'`
- (Opcional) Ajustar o link de volta (seta) para:
  - se `user` existe: voltar para `/home` ou `navigate(-1)`
  - se não: manter `/register` ou `/`

4) **Validação end-to-end (critério de aceite)**
- Usuário trial:
  - Banner → “Assinar agora” → vai para **/plans** e **permanece** em /plans
  - Modal → “Ver Planos Disponíveis” → vai para **/plans** e **permanece** em /plans
- Usuário none/expired:
  - Continua conseguindo acessar /plans normalmente
  - SubscriptionGuard continua redirecionando para /plans quando necessário
- Garantir que não existe nenhuma outra regra que re-redireciona /plans para /home

---

## Resultado esperado após a correção
- Todos os CTAs para planos (banner trial, modal assinatura, canal premium, etc.) passam a funcionar de forma consistente, porque **/plans deixa de expulsar trial/active para /home**.
