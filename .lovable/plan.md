

# Correcao do fluxo "Nao, voltar para a home"

## Problema

Quando o usuario clica em "Nao, voltar para a home" no modal de trial, ele e redirecionado para `/` (Landing page) em vez de `/home` (Home do app). A Landing page provavelmente detecta que o usuario esta logado e redireciona de volta para `/plans`, criando um loop.

## Causa raiz

Na linha 82 de `src/pages/Plans.tsx`:

```typescript
const backDestination = user ? '/' : '/register';
```

A rota `/` e a **Landing page** (pagina de marketing), nao a Home do app. A Home real esta em `/home`.

## Correcao

Alterar a linha 82 para:

```typescript
const backDestination = user ? '/home' : '/register';
```

## Impacto

- Apenas 1 linha alterada em `src/pages/Plans.tsx`
- O `SubscriptionGuard` em `/home` ja permite usuarios freemium (sem assinatura), entao o usuario conseguira acessar normalmente
- O botao de voltar (seta no topo) tambem sera corrigido, pois usa o mesmo `backDestination`

