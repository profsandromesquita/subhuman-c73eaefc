
# Correcao do loop de redirecionamento para usuarios Freemium

## Diagnostico completo

Existem **3 pontos** que, juntos, criam um loop impossivel de escapar para usuarios freemium (status = 'none'):

### Causa 1: Login.tsx (linhas 157-160)
```typescript
if (result.status === 'trial' || result.status === 'active') {
  navigate("/home", { replace: true });
} else {
  navigate("/plans", { replace: true }); // <-- freemium cai aqui SEMPRE
}
```
Apos login bem-sucedido, qualquer usuario sem assinatura e mandado para `/plans`.

### Causa 2: TrialOfferModal + Plans.tsx (handleBackClick)
O botao de voltar no Plans chama `handleBackClick` que, quando `canStartTrial` e `true` (status === 'none'), abre o modal de trial. O botao "Nao, voltar para a home" do modal apenas fecha o modal (`setShowTrialModal(false)`). **Nao navega para lugar nenhum.** O usuario continua preso em `/plans`.

### Causa 3: Landing.tsx (linhas 29-35)
Se o usuario tentar acessar `/` (landing), o componente detecta que esta logado e como status e `none`, redireciona para `/plans`. Outra saida bloqueada.

## Plano de correcao (3 arquivos)

### 1. `src/pages/Login.tsx` (linha 157-161)
Mudar a logica pos-login para enviar **todos** os usuarios autenticados para `/home`, independente do status de assinatura. O ContentPaywall ja cuida das restricoes de conteudo premium dentro do app.

```typescript
// ANTES:
if (result.status === 'trial' || result.status === 'active') {
  navigate("/home", { replace: true });
} else {
  navigate("/plans", { replace: true });
}

// DEPOIS:
navigate("/home", { replace: true });
```

### 2. `src/pages/Plans.tsx` (handleBackClick + onClose do modal)
Dois ajustes:
- O `handleBackClick` deve navegar diretamente para `/home` quando o usuario esta logado, sem interceptar com o modal de trial. O modal de trial so deve aparecer em contextos onde faz sentido (ex: ao tentar assinar).
- OU: manter o modal mas fazer o `onClose` navegar para `/home` em vez de apenas fechar o modal.

Abordagem escolhida: manter o modal como oportunidade de conversao, mas o `onClose` passa a navegar para `/home`:

```typescript
// handleBackClick permanece igual (mostra modal se canStartTrial)

// Mas o onClose do modal agora navega:
const handleTrialModalClose = () => {
  setShowTrialModal(false);
  navigate('/home');
};
```

E no JSX:
```tsx
<TrialOfferModal
  isOpen={showTrialModal}
  onClose={handleTrialModalClose}  // <-- agora navega
  onConfirmTrial={handleStartTrial}
  isLoading={isTrialLoading}
/>
```

### 3. `src/pages/Landing.tsx` (linhas 29-35)
Mudar a logica para enviar usuarios logados com status `none` para `/home` em vez de `/plans`:

```typescript
// ANTES:
if (user) {
  if (status === 'trial' || status === 'active') {
    navigate('/home', { replace: true });
  } else {
    navigate('/plans', { replace: true });
  }
}

// DEPOIS:
if (user) {
  navigate('/home', { replace: true });
}
```

Todos os usuarios logados vao para `/home`. A pagina de planos (`/plans`) continua acessivel via navegacao interna (links, botoes de upgrade, paywall).

## Impacto

- 3 arquivos editados: `Login.tsx`, `Plans.tsx`, `Landing.tsx`
- Nenhuma alteracao de banco ou RLS
- O fluxo de upgrade continua funcionando (usuario pode acessar `/plans` voluntariamente)
- O ContentPaywall continua mostrando restricoes de conteudo premium dentro do app
- O SubscriptionGuard ja permite freemium, entao `/home` funcionara normalmente
