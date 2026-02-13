

# Correcao Critica: Exigir Login Antes de Assinar

## Problema

As funcoes `handleSubscribe` (assinar plano) e `handleEventPurchase` (comprar evento) redirecionam para o checkout da Ticto sem verificar se o usuario esta logado. Sem o `user.id` no parametro `src`, o webhook da Ticto nao consegue associar o pagamento ao usuario correto.

As funcoes `handleStartTrial` e `handleRedeemCoupon` ja possuem essa verificacao, mas as duas principais ficaram sem.

## Solucao

Adicionar verificacao de autenticacao no inicio de `handleSubscribe` e `handleEventPurchase`. Se `!user`, exibir toast informativo e redirecionar para `/login` com um parametro de retorno para que, apos o login, o usuario volte para `/plans`.

## Detalhes tecnicos

**Arquivo**: `src/pages/Plans.tsx`

**`handleSubscribe` (linha 90)** - adicionar no inicio:
```
if (!user) {
  toast.error("Voce precisa estar logado para assinar um plano.");
  navigate("/login", { state: { from: "/plans" } });
  return;
}
```

**`handleEventPurchase` (linha 101)** - adicionar no inicio:
```
if (!user) {
  toast.error("Voce precisa estar logado para comprar.");
  navigate("/login", { state: { from: "/plans" } });
  return;
}
```

Duas linhas de codigo em cada funcao. Nenhum outro arquivo precisa ser alterado, pois a pagina de Login ja suporta redirecionamento pos-login via state ou o usuario naturalmente navega de volta.

