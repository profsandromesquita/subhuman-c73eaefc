

# Plano revisado: Corrigir fluxo de acesso a artigos via links externos

## Respostas às verificações

**Ponto 1 — Layout wrapper:** Confirmado que a rota do PostDetail em App.tsx é `<SubscriptionGuard><PostDetail /></SubscriptionGuard>` sem nenhum layout. Todas as outras páginas (Home, Spaces, SpaceDetail) aplicam `<AppLayout>` internamente. Adicionar `<AppLayout>` dentro do PostDetail é seguro — sem risco de duplicação.

**Ponto 2 — Fallback do botão voltar:** Concordo com sua sugestão. `window.history.length` é não-confiável (inclui entradas cross-origin e não indica se há histórico *dentro* da SPA). O PostHeader hoje NÃO recebe `spaceSlug` — recebe apenas `isSaved`, `onSaveToggle`, `title`, `isGuest`. A solução é passar `spaceSlug` como nova prop e usar `navigate(\`/spaces/${spaceSlug}\`)` como fallback fixo, eliminando `navigate(-1)` completamente para usuários logados.

---

## Arquivos alterados (5)

### 1. `src/components/SubscriptionGuard.tsx`
- Salvar URL atual em `location.state.returnTo` e `sessionStorage.setItem('returnTo', path)` antes de redirecionar para `/login`

### 2. `src/pages/Login.tsx`
- Ler `returnTo` de `location.state` no redirect pós-login
- Usar como destino em vez de `/home` hardcoded

### 3. `src/pages/Landing.tsx`
- No useEffect que redireciona usuário logado, verificar `sessionStorage.getItem('returnTo')` antes de ir para `/home` (cobre fluxo OAuth/Google)

### 4. `src/pages/PostDetail.tsx`
- Envolver conteúdo com `<AppLayout>` para ter BottomNav (mobile) e DesktopSidebar (desktop)
- Remover `pt-safe` duplicado (AppLayout já aplica)
- Passar `spaceSlug` como prop para `<PostHeader>`

### 5. `src/components/post/PostHeader.tsx`
- Adicionar `spaceSlug?: string` à interface de props
- Substituir lógica do botão voltar:
  - Guest → `navigate("/")`
  - Logado → `navigate(\`/spaces/${spaceSlug}\`)` (fallback determinístico, nunca `navigate(-1)`)

---

## O que NÃO muda
- Edge Functions, tabelas do banco, webhooks
- SubscriptionGuard continua permitindo todos os tiers
- ContentPaywall, useUserAccess, useSubscription
- Register.tsx, Google OAuth config
- Outras páginas que já usam AppLayout

