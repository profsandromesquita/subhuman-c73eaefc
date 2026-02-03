
# Plano: Adicionar Link de Checkout do Plano Anual

## Problema Atual

O botao "Assinar agora" sempre redireciona para o link do plano mensal, independentemente de qual plano esta selecionado.

## Alteracao Proposta

Modificar a logica de `handleSubscribe` para redirecionar para o checkout correto baseado no plano selecionado:

| Plano | Link de Checkout |
|-------|------------------|
| Mensal | `https://checkout.ticto.app/O1F2F1BB4` |
| Anual | `https://payment.ticto.app/O40A9D8E6` |

## Arquivo a Modificar

`src/pages/Plans.tsx`

## Mudancas Tecnicas

### 1. Adicionar URLs de checkout aos planos

Atualizar o array `plans` para incluir a URL de checkout de cada plano:

```typescript
const plans = [
  {
    id: "monthly",
    name: "Mensal",
    price: "R$ 29,90",
    period: "/mes",
    description: "Ideal para experimentar",
    checkoutUrl: "https://checkout.ticto.app/O1F2F1BB4", // URL mensal
    features: [...],
  },
  {
    id: "yearly",
    name: "Anual",
    price: "R$ 239,90",
    period: "/ano",
    description: "Economize 33%",
    badge: "Mais popular",
    checkoutUrl: "https://payment.ticto.app/O40A9D8E6", // URL anual
    features: [...],
  },
];
```

### 2. Atualizar funcao handleSubscribe

Modificar para usar a URL do plano selecionado:

```typescript
const handleSubscribe = () => {
  // Encontrar o plano selecionado
  const plan = plans.find(p => p.id === selectedPlan);
  if (!plan) return;

  // Usar a URL de checkout do plano selecionado
  const checkoutUrl = new URL(plan.checkoutUrl);

  // Passar dados do usuario para identificacao
  if (user?.email) {
    checkoutUrl.searchParams.set('email', user.email);
  }
  if (user?.id) {
    checkoutUrl.searchParams.set('src', user.id);
  }

  // URL de retorno apos pagamento
  checkoutUrl.searchParams.set('redirect_url', 
    `${window.location.origin}/payment-success`);

  // Redirecionar para checkout
  window.location.href = checkoutUrl.toString();
};
```

## Fluxo Resultante

```text
Usuario seleciona plano
         |
         v
   +-----------+
   | selectedPlan |
   +-----------+
         |
    _____|_____
   |           |
   v           v
monthly     yearly
   |           |
   v           v
O1F2F1BB4   O40A9D8E6
(checkout)  (payment)
```

## Resultado Esperado

1. Ao selecionar "Mensal" e clicar "Assinar agora" -> Redireciona para `checkout.ticto.app/O1F2F1BB4`
2. Ao selecionar "Anual" e clicar "Assinar agora" -> Redireciona para `payment.ticto.app/O40A9D8E6`
3. Ambos os links passam `email`, `src` (user_id) e `redirect_url` como parametros
