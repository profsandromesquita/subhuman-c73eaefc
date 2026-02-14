

# Melhorar o fluxo de compra do Workshop para usuarios vindos da Landing Page

## Problema atual

Quando o usuario clica em "Garantir minha vaga" na Landing Page sem estar logado, ele e redirecionado para o login/cadastro, mas depois se perde porque nao ha nenhuma indicacao visual de que ele veio para comprar o workshop.

## Solucao proposta

Usar `sessionStorage` para rastrear a intencao de compra do workshop ao longo de toda a cadeia de redirecionamentos.

### Mecanismo: `sessionStorage.setItem('workshop_intent', 'true')`

Esse valor persiste entre navegacoes na mesma aba e e limpo automaticamente ao fechar o navegador.

---

### 1. `src/components/landing/LandingEvents.tsx`

Antes de redirecionar para `/login`, salvar a intencao:

```typescript
if (!user) {
  sessionStorage.setItem('workshop_intent', 'true');
  navigate('/login', { state: { from: '/' } });
  return;
}
```

---

### 2. `src/pages/Login.tsx` -- Caso 3.1 (usuario ja tem conta)

Apos login bem-sucedido (linha 157), verificar se existe `workshop_intent`:

```typescript
// Apos login com sucesso
clearFailedAttempts();
toast.success("Login realizado com sucesso!");

const workshopIntent = sessionStorage.getItem('workshop_intent');

if (workshopIntent) {
  sessionStorage.removeItem('workshop_intent');
  navigate("/home", { replace: true });
  // Toast persistente com botao de acao para ir ao checkout
  toast("Voce estava comprando o Workshop!", {
    description: "Clique para continuar sua compra",
    action: {
      label: "Ir para o Workshop",
      onClick: () => window.location.href = "/plans?tab=workshops",
    },
    duration: 15000,
  });
} else {
  navigate("/home", { replace: true });
}
```

O toast aparece por 15 segundos com um botao clicavel "Ir para o Workshop" que leva direto para `/plans?tab=workshops`.

---

### 3. `src/pages/Plans.tsx` -- Caso 3.2 (usuario novo, apos confirmar email)

Ler o parametro `tab=workshops` da URL para abrir automaticamente na aba correta:

```typescript
import { useSearchParams } from "react-router-dom";

const [searchParams] = useSearchParams();

// Inicializar a aba ativa baseada no parametro da URL
const [activeTab, setActiveTab] = useState<"subscriptions" | "workshops">(() => {
  const tabParam = searchParams.get('tab');
  return tabParam === 'workshops' ? 'workshops' : 'subscriptions';
});
```

Alem disso, quando `tab=workshops` estiver na URL, adicionar um destaque visual animado no botao "Workshops" do segmented control:

```typescript
<button
  onClick={() => setActiveTab("workshops")}
  className={`... ${
    activeTab === "workshops"
      ? "bg-foreground text-background font-semibold"
      : "text-muted-foreground hover:text-foreground"
  }`}
>
  Workshops
  {searchParams.get('tab') === 'workshops' && activeTab === 'workshops' && (
    <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
  )}
</button>
```

---

### 4. `src/pages/Register.tsx` -- Propagar a intencao

Se o usuario chegou ao cadastro vindo do fluxo do workshop (via sessionStorage), manter o `workshop_intent` no sessionStorage. Nenhuma alteracao necessaria aqui, pois o sessionStorage ja persiste. Porem, precisamos garantir que apos confirmar o email, ele seja redirecionado para `/plans?tab=workshops`.

No `src/pages/VerifyEmail.tsx` ou no fluxo de confirmacao: verificar se existe `workshop_intent` e redirecionar para `/plans?tab=workshops` em vez de `/plans`.

---

## Resumo de arquivos alterados

| Arquivo | Alteracao |
|---|---|
| `LandingEvents.tsx` | Salvar `workshop_intent` no sessionStorage antes do redirect |
| `Login.tsx` | Mostrar toast com CTA "Ir para o Workshop" apos login |
| `Plans.tsx` | Ler `?tab=workshops` da URL para abrir na aba correta + indicador visual |
| `VerifyEmail.tsx` ou fluxo de confirmacao | Redirecionar para `/plans?tab=workshops` se houver `workshop_intent` |

## Fluxo corrigido

**Caso 3.1 -- usuario existente:**
1. Clica "Garantir minha vaga" na landing
2. Redirecionado para `/login`
3. Faz login
4. Vai para `/home` com toast: "Voce estava comprando o Workshop! [Ir para o Workshop]"
5. Clica no toast, vai para `/plans?tab=workshops`
6. Ve a aba Workshops ja aberta, compra o produto

**Caso 3.2 -- usuario novo:**
1. Clica "Garantir minha vaga" na landing
2. Redirecionado para `/login`, clica em "Criar conta"
3. Faz cadastro, confirma email
4. Redirecionado para `/plans?tab=workshops`
5. Ve a aba Workshops ja aberta com indicador visual, compra o produto
