

# Plano de Correcao - 4 Itens de Usabilidade

---

## 1. Popup de Onboarding reaparecendo

**Causa raiz**: O estado de "ja vi o onboarding" e salvo em `sessionStorage` (apaga ao fechar aba). Alem disso, o `handleNavigateToSpaces` nao seta o flag de dismissal — so o botao "Ver a home primeiro" faz isso. Quando o usuario volta do `/spaces` para `/home`, o `sessionStorage` tem o flag mas o `subscribedSpaces` pode nao ter carregado ainda, ou se o usuario selecionou espacos e voltou, o popup nao deveria aparecer de forma alguma.

**Solucao**:
- Trocar `sessionStorage` por consulta direta: o popup so aparece quando `subscribedSpaces.length === 0` e os dados ja carregaram. Nao precisa de storage nenhum.
- Remover completamente a logica de `sessionStorage` do onboarding.
- No `handleNavigateToSpaces`, manter apenas o `setShowOnboarding(false)`.
- O `handleDismissOnboarding` tambem so faz `setShowOnboarding(false)` — sem storage.
- Condicao final: `user && !authLoading && !loadingSpaces && subscribedSpaces.length === 0` — se verdadeiro, mostra. Se o usuario selecionou ao menos 1 espaco, nunca mais mostra.

**Arquivo**: `src/pages/Home.tsx` (linhas 38-63)

---

## 2. Compartilhamento de artigos para usuarios nao logados

**Causa raiz**: A rota `/spaces/:spaceSlug/post/:postSlug` esta dentro do `SubscriptionGuard`, que permite acesso a usuarios nao logados (linha 44: retorna children se `!user`). Porem, ao tentar curtir/comentar/salvar, o `PostDetail.tsx` exibe apenas um `toast.error("Voce precisa estar logado para curtir")` sem nenhum link ou botao para login. O botao "voltar" usa `navigate(-1)`, que leva a pagina vazia se nao ha historico.

**Solucao**:

### 2a. Criar componente `AuthPromptDialog`
- Novo componente `src/components/AuthPromptDialog.tsx`
- Dialog/modal com mensagem "Para interagir com o conteudo, voce precisa ter uma conta"
- Dois botoes: "Criar conta" (vai para `/register`) e "Ja tenho conta" (vai para `/login`)
- Ambos passam `redirectTo` como query param para retornar ao artigo apos login

### 2b. Integrar no PostDetail.tsx
- Adicionar estado `showAuthPrompt`
- Nos handlers `handleLikeToggle`, `handleSaveToggle`, `handleSubmitComment`: em vez de `toast.error(...)`, setar `showAuthPrompt = true`
- Renderizar o `AuthPromptDialog` no JSX

### 2c. Corrigir botao voltar no PostHeader
- Quando `!user` (visitante), o botao voltar deve navegar para `/` em vez de `navigate(-1)` (que pode levar a pagina vazia)

### 2d. Adicionar botao fixo "Conhecer a plataforma"
- No `PostDetail.tsx`, quando `!user`, exibir um banner fixo no topo (abaixo do header) com texto "Conheca o Subhumano" e link para `/`
- Estilo sutil: `bg-card` com texto e botao

**Arquivos**:
- `src/components/AuthPromptDialog.tsx` (novo)
- `src/pages/PostDetail.tsx` (handlers + JSX)
- `src/components/post/PostHeader.tsx` (botao voltar)

---

## 3. Atalho para conteudos salvos na Home

**Solucao**:
- Na Home, ao lado do icone de sino (notificacoes), adicionar icone `BookmarkSimple` do Phosphor
- Ao clicar, navega para `/profile/saved`
- Posicionamento: no header, lado esquerdo, ao lado do Bell

**Arquivo**: `src/pages/Home.tsx` (linhas 86-101)

Mudanca no JSX:
```
<div className="flex items-center gap-1">
  <button onClick={() => navigate("/profile/saved")} ...>
    <BookmarkSimple />
  </button>
  <button onClick={() => navigate("/notifications")} ...>
    <Bell />
  </button>
</div>
<Logo size="sm" />
```

---

## 4. Separar espacos escolhidos e disponiveis

**Solucao**:
- Na pagina `Spaces.tsx`, dividir a lista em duas secoes:
  - **"Seus espaços"** — espacos onde `subscriptions[space.id] === true`
  - **"Explorar"** — espacos restantes
- Se nao ha espacos escolhidos, mostra apenas "Explorar" com todos
- Se todos estao escolhidos, mostra apenas "Seus espacos"
- Manter o mesmo card component, apenas dividindo com headers de secao

**Arquivo**: `src/pages/Spaces.tsx`

Logica:
```typescript
const subscribedSpaces = spaces.filter(s => subscriptions[s.id]);
const availableSpaces = spaces.filter(s => !subscriptions[s.id]);
```

Layout:
```
{subscribedSpaces.length > 0 && (
  <section>
    <h2>"Seus espacos"</h2>
    {subscribedSpaces.map(...)}
  </section>
)}
{availableSpaces.length > 0 && (
  <section>
    <h2>"Explorar"</h2>
    {availableSpaces.map(...)}
  </section>
)}
```

---

## Resumo de arquivos

| Arquivo | Acao |
|---------|------|
| `src/pages/Home.tsx` | Corrigir onboarding + adicionar icone salvos |
| `src/components/AuthPromptDialog.tsx` | Novo componente |
| `src/pages/PostDetail.tsx` | Integrar AuthPromptDialog nos handlers |
| `src/components/post/PostHeader.tsx` | Corrigir botao voltar para visitantes |
| `src/pages/Spaces.tsx` | Separar em secoes |

