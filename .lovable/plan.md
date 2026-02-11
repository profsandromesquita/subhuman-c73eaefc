
# Correcao do Bug Critico de Logout

## Diagnostico - Causa Raiz

Existem **3 problemas interligados** causando esse bug:

### Problema 1: SubscriptionGuard NAO protege contra usuarios deslogados

No arquivo `src/components/SubscriptionGuard.tsx`, linhas 43-46:

```text
// If not logged in, render children (let other guards handle auth)
if (!user) {
  return <>{children}</>;
}
```

O SubscriptionGuard **deliberadamente** renderiza o conteudo quando nao ha usuario logado, com o comentario "let other guards handle auth". Porem, **nao existe nenhum outro guard de autenticacao** nas rotas protegidas. Isso significa que TODAS as rotas protegidas (`/home`, `/spaces`, `/channels`, etc.) ficam acessiveis sem login.

### Problema 2: Cache do React Query persiste apos logout

Quando o usuario faz logout, o `signOut()` limpa a sessao do Supabase, mas o React Query **mantem os dados em cache** (configurado com `gcTime: 30 minutos`). Isso causa:
- Queries que dependem do `user?.id` continuam tentando executar com dados stale
- Os erros 400 no `channel_posts` ocorrem porque queries como `useRecentDiscussions` usam joins (`channels!inner`, `profiles:author_id`) e sao disparadas sem token de autorizacao valido

### Problema 3: Navegacao pos-logout vai para "/" (Landing), mas sem protecao

O `handleLogout` navega para `"/"` (Landing page). O usuario pode entao navegar manualmente para `/home` ou qualquer rota protegida, e o SubscriptionGuard permite a renderizacao.

---

## Plano de Correcao

### Etapa 1 - SubscriptionGuard: Redirecionar usuarios deslogados

Alterar o `SubscriptionGuard` para redirecionar para `/login` quando nao ha usuario autenticado, em vez de renderizar os children.

**Arquivo**: `src/components/SubscriptionGuard.tsx`

Mudancas:
- No `useEffect`, adicionar verificacao: se `!user` e `!authLoading`, redirecionar para `/login`
- Remover o bloco que renderiza children quando `!user`
- Retornar `null` (ou loading) enquanto redireciona

```text
// ANTES (bugado):
if (!user) {
  return <>{children}</>;
}

// DEPOIS (corrigido):
if (!user) {
  return null; // redirect ja aconteceu no useEffect
}
```

### Etapa 2 - Limpar cache do React Query no logout

Alterar o `handleLogout` em `Profile.tsx` para limpar todo o cache do React Query antes de navegar. Isso previne queries stale e os erros 400.

**Arquivo**: `src/pages/Profile.tsx`

Mudancas:
- Importar `useQueryClient` do `@tanstack/react-query`
- No `handleLogout`, chamar `queryClient.clear()` apos o `signOut()`

```text
const handleLogout = async () => {
  isLoggingOut.current = true;
  await signOut();
  queryClient.clear(); // Limpa TODO o cache
  toast.success("Voce saiu da sua conta");
  navigate("/login"); // Ir para login, nao para "/"
};
```

### Etapa 3 - Proteger queries que dependem de autenticacao

As queries `useRecentDiscussions` e `useHighlights` ja tem `enabled: !!user`, entao nao executam sem usuario. Porem, o `useSubscription` tambem tem `enabled: !!user && !authLoading`. Com a limpeza do cache (Etapa 2), essas queries nao causarao mais problemas.

---

## Resumo dos Arquivos Modificados

| Arquivo | Mudanca |
|---------|---------|
| `src/components/SubscriptionGuard.tsx` | Redirecionar para `/login` quando `!user` |
| `src/pages/Profile.tsx` | Limpar cache React Query + navegar para `/login` |

## Impacto

- **Usuarios deslogados**: Serao redirecionados para `/login` ao tentar acessar qualquer rota protegida
- **Logout**: Limpa completamente o cache, elimina erros 400
- **O erro 403 no logout**: Ja e tratado corretamente pelo `signOut()` (fallback para `scope: 'local'`), nao precisa de correcao adicional
