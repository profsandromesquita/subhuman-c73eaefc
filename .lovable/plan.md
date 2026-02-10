

# Correcoes: Modal de trial, Logout e "Em alta nos canais"

## Problema 1 — Modal "Nao, voltar para a home" nao funciona

**Causa raiz**: Ao clicar "Nao, voltar para a home", o `onClose` do modal navega para `/home`. Porem, `/home` esta protegida pelo `SubscriptionGuard`, que detecta que o usuario nao tem assinatura (`status === 'none'`) e redireciona de volta para `/plans`. Resultado: loop de redirecionamento silencioso.

**Solucao**: Navegar para `/` (Landing page, que e publica) em vez de `/home` quando o usuario nao tem assinatura.

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Plans.tsx` | Alterar `backDestination` de `'/home'` para `'/'` (linha 64) |

---

## Problema 2 — Botao "Sair da conta" nao funciona

**Causa raiz**: No `handleLogout`, apos o `signOut()`, o codigo navega para `/`. Porem, o `useEffect` na linha 64-68 detecta `!user` (agora null apos logout) e navega para `/login`, sobrescrevendo a navegacao para `/`. O usuario acaba em `/login`, mas como a rota `/profile` esta dentro do `SubscriptionGuard`, pode haver conflito adicional.

**Solucao**: Remover o redirect automatico do `useEffect` quando o logout e intencional, usando uma flag `isLoggingOut` para evitar que o efeito interfira.

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Profile.tsx` | Adicionar ref `isLoggingOut` e verificar no useEffect antes de redirecionar |

---

## Problema 3 — "Em alta nos canais" vazio

**Causa raiz**: O hook `useRecentDiscussions` filtra posts dos ultimos **7 dias** (`sevenDaysAgo`). Os posts mais recentes no banco sao de 3 de fevereiro (ha 7 dias), entao ja cairam fora da janela.

**Solucao**: Ampliar a janela de tempo de 7 para 30 dias, alinhando com o mesmo periodo usado no `useHighlights`. Isso garante que a secao mostre conteudo mesmo em periodos com menor atividade.

| Arquivo | Mudanca |
|---------|---------|
| `src/hooks/usePosts.ts` | Alterar `sevenDaysAgo` para 30 dias (linha 300-301) |

---

## Resumo tecnico das alteracoes

1. **Plans.tsx (linha 64)**: `const backDestination = user ? '/' : '/register';` — rota publica que nao sofre redirect do SubscriptionGuard
2. **Profile.tsx (linhas 62-74)**: Adicionar `const isLoggingOut = useRef(false)`, setar `true` antes do `signOut()`, e verificar no `useEffect` com `if (isLoggingOut.current) return`
3. **usePosts.ts (linhas 300-301)**: Renomear variavel e mudar calculo para `thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)`
