

# Plano de Correção — Bugs Pós-Implementação Tentativa 4

## Resumo dos Bugs Identificados

| Bug | Descrição | Arquivo(s) Afetado(s) |
|-----|-----------|----------------------|
| A1 | TrialBanner persiste indefinidamente (não some automaticamente) | `TrialBanner.tsx` |
| A2 | Botão "Assinar agora" não redireciona para `/plans` | `TrialBanner.tsx` |
| A3 | Botão "X" não funciona | `TrialBanner.tsx` |
| A4 | Banner reaparece em cada navegação/refresh | `TrialBanner.tsx`, `AppLayout.tsx` |
| B | Botão "Ver Planos" redireciona para `/home` ao invés de `/plans` | `ChannelDetail.tsx` |
| C | Botão "Assinatura" não abre modal com detalhes da assinatura | `Profile.tsx` |

---

## Análise de Causa Raiz

### Bug A — TrialBanner

**Causa raiz identificada no código:**

1. **A1 - Persistência infinita:** O banner nunca foi projetado para desaparecer automaticamente. Não existe nenhum `setTimeout` ou lógica de auto-dismiss no componente (linhas 11-93 de `TrialBanner.tsx`).

2. **A2 - Botão não redireciona:** O código na linha 83 usa `onClick={() => navigate('/plans')}`, que deveria funcionar. O problema pode ser que o `navigate` está sendo chamado mas algo impede a navegação (possível conflito com `AnimatePresence` ou evento não propagando corretamente).

3. **A3 - Botão X não funciona:** O código na linha 54 define `onClick={() => setIsDismissed(true)}`, que deveria funcionar. O problema parece ser que o estado `isDismissed` está sendo resetado pelo `useEffect` na linha 17-19 que observa `location.pathname`.

4. **A4 - Reaparece em cada navegação:** O `useEffect` nas linhas 17-19 deliberadamente faz `setIsDismissed(false)` sempre que a rota muda. Esta era a intenção original mas contradiz o requisito do usuário.

**Nova regra de negócio:**
- O banner deve aparecer **apenas uma vez por sessão de login**
- Após ser fechado (manualmente ou auto-dismiss), só reaparece no próximo login
- Isso requer persistir o estado de "banner já exibido nesta sessão"

### Bug B — Botão "Ver Planos" no ChannelDetail

**Causa raiz identificada:**

No arquivo `ChannelDetail.tsx`, linha 310, o código já está correto:
```typescript
<Button onClick={() => navigate('/plans')}>
  Ver Planos
</Button>
```

Porém, o usuário reportou que está indo para `/home`. Isso pode indicar:
- Um cache de navegador com código antigo
- Ou um problema de estado onde a navegação para `/plans` dispara o `SubscriptionGuard` que redireciona de volta

**Investigação adicional necessária:** Verificar se o problema persiste após limpar cache. Se persistir, o problema é no guard redirecionando.

### Bug C — Modal de Assinatura no Profile

**Causa raiz identificada:**

No arquivo `Profile.tsx`, o item "Assinatura" (linhas 41-45) simplesmente redireciona para `/profile/subscription` via `Link`:
```typescript
{
  icon: CreditCard,
  label: "Assinatura",
  description: "Gerenciar plano",
  path: "/profile/subscription",
}
```

O arquivo `/profile/subscription` **não existe** (só existe `PersonalData.tsx` no diretório `profile/`). Isso causa um erro 404 ou página não encontrada.

A solução é criar uma página de assinatura **OU** transformar o clique em "Assinatura" para abrir um modal inline na própria página de perfil.

---

## Plano de Correção

### Correção A — TrialBanner

#### A.1 — Controle de exibição por sessão

**Estratégia:** Usar `sessionStorage` para controlar se o banner já foi exibido nesta sessão de login.

**Mudanças em `TrialBanner.tsx`:**

1. Ao montar o componente, verificar se existe uma flag `trial_banner_shown` no `sessionStorage`
2. Se existir, não exibir o banner
3. Após exibir o banner pela primeira vez, marcar a flag no `sessionStorage`
4. Remover o `useEffect` que reseta `isDismissed` em cada navegação

```typescript
// Lógica proposta
const [hasBeenShown, setHasBeenShown] = useState(() => {
  return sessionStorage.getItem('trial_banner_shown') === 'true';
});

useEffect(() => {
  if (!hasBeenShown) {
    sessionStorage.setItem('trial_banner_shown', 'true');
    setHasBeenShown(true);
  }
}, [hasBeenShown]);

// Não exibir se já foi mostrado nesta sessão
if (hasBeenShown && isDismissed) {
  return null;
}
```

#### A.2 — Auto-dismiss após alguns segundos

**Adicionar um timer para fechar automaticamente:**

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    setIsDismissed(true);
  }, 8000); // 8 segundos

  return () => clearTimeout(timer);
}, []);
```

#### A.3 — Garantir que botões funcionem

**Problema potencial:** O `AnimatePresence` pode estar capturando eventos. Solução: usar `e.stopPropagation()` e garantir que o componente animado não bloqueia cliques.

Também mover o botão "Assinar agora" para fora da hierarquia que pode causar conflito:

```typescript
<Button
  variant="ghost"
  size="sm"
  className="mt-2 -ml-2 h-8 text-xs font-medium hover:bg-foreground/10"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate('/plans');
  }}
>
```

#### A.4 — Limpar flag no logout

**Em `useAuth.ts` ou `Login.tsx`:**
Ao fazer login, limpar a flag para que o banner apareça novamente na nova sessão.

```typescript
// No login bem-sucedido
sessionStorage.removeItem('trial_banner_shown');
```

---

### Correção B — Botão "Ver Planos" no ChannelDetail

**Análise do código atual (linha 310):**

```typescript
<Button onClick={() => navigate('/plans')}>
  Ver Planos
</Button>
```

O código parece correto. Para garantir que funcione:

1. Adicionar `e.preventDefault()` e `e.stopPropagation()` para evitar conflitos
2. Verificar se não há redirecionamento do `SubscriptionGuard`

**Mudança proposta:**

```typescript
<Button onClick={(e) => {
  e.preventDefault();
  navigate('/plans', { replace: true });
}}>
  Ver Planos
</Button>
```

---

### Correção C — Modal de Assinatura no Profile

**Estratégia:** Criar um modal inline na página Profile que exibe as informações da assinatura atual.

#### C.1 — Modificar Profile.tsx

1. Remover o item "Assinatura" do array `menuItems` (não será mais um link)
2. Criar um estado para controlar o modal: `const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)`
3. Usar o hook `useSubscription` para obter os dados da assinatura
4. Criar o componente modal com:
   - Status atual (trial/active/expired)
   - Tipo de plano (trial/monthly/yearly)
   - Data de expiração
   - Dias restantes
   - Botão "Ver Planos" que navega para `/plans`

#### C.2 — Design do Modal

```text
┌────────────────────────────────────────┐
│         ✕                              │
│                                        │
│  💳  Sua Assinatura                    │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  Status: Período de Teste        │  │
│  │  Plano: Trial (7 dias)           │  │
│  │  Expira em: 05/02/2026           │  │
│  │  Dias restantes: 5               │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌────────────────────────────────┐    │
│  │       Ver Planos Disponíveis   │    │
│  └────────────────────────────────┘    │
│                                        │
└────────────────────────────────────────┘
```

#### C.3 — Criar componente SubscriptionModal

Novo arquivo: `src/components/SubscriptionModal.tsx`

Props:
- `isOpen: boolean`
- `onClose: () => void`
- Internamente usa `useSubscription` para obter dados

---

## Arquivos a Serem Alterados/Criados

| Ação | Arquivo | Descrição |
|------|---------|-----------|
| Alterar | `src/components/TrialBanner.tsx` | Corrigir todos os bugs (sessão, auto-dismiss, botões) |
| Alterar | `src/pages/Login.tsx` | Limpar flag de banner ao fazer login |
| Alterar | `src/pages/ChannelDetail.tsx` | Garantir navegação correta do botão "Ver Planos" |
| Criar | `src/components/SubscriptionModal.tsx` | Modal de detalhes da assinatura |
| Alterar | `src/pages/Profile.tsx` | Integrar modal e modificar item "Assinatura" |

---

## Ordem de Implementação

1. **Primeiro:** Corrigir `TrialBanner.tsx` (bug mais crítico de UX)
2. **Segundo:** Atualizar `Login.tsx` para limpar flag do sessionStorage
3. **Terceiro:** Corrigir `ChannelDetail.tsx` (botão Ver Planos)
4. **Quarto:** Criar `SubscriptionModal.tsx`
5. **Quinto:** Integrar modal em `Profile.tsx`

---

## Checklist de Validação

### Bug A — TrialBanner
- [ ] Banner aparece ao fazer login com trial ativo
- [ ] Banner some automaticamente após ~8 segundos
- [ ] Botão X fecha o banner imediatamente
- [ ] Botão "Assinar agora" navega para `/plans`
- [ ] Banner NÃO reaparece ao navegar entre páginas
- [ ] Banner NÃO reaparece ao atualizar a página
- [ ] Banner REAPARECE ao fazer logout e login novamente

### Bug B — Ver Planos no ChannelDetail
- [ ] Clicar em canal Premium sem acesso mostra card "Canal Exclusivo"
- [ ] Botão "Ver Planos" navega corretamente para `/plans`

### Bug C — Modal de Assinatura
- [ ] Clicar em "Assinatura" no perfil abre o modal
- [ ] Modal exibe status correto (trial/active/expired)
- [ ] Modal exibe data de expiração
- [ ] Modal exibe dias restantes
- [ ] Botão "Ver Planos" no modal navega para `/plans`
- [ ] Botão X fecha o modal

---

## Considerações Técnicas

### Uso de sessionStorage vs localStorage

- **sessionStorage:** Limpa automaticamente ao fechar a aba/navegador. Ideal para "exibir apenas uma vez por sessão de login".
- **localStorage:** Persiste entre sessões. Seria necessário limpar manualmente no logout.

**Decisão:** Usar `sessionStorage` porque:
1. Mais alinhado com o requisito "aparecer no login"
2. Não requer limpeza manual em caso de logout
3. Ao fechar e reabrir o navegador, o usuário fará novo login e verá o banner novamente

### AnimatePresence e propagação de eventos

O `AnimatePresence` do Framer Motion pode interferir com eventos de clique se não configurado corretamente. A solução é garantir que os handlers usem `e.stopPropagation()` e que os botões tenham `type="button"` explícito.

