

# Plano de Correção — Redirecionamento Pós-Login Google OAuth

## Diagnóstico da Causa Raiz

O problema está no **fluxo de retorno do Google OAuth**:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                 Fluxo Atual (PROBLEMÁTICO)                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Usuário clica "Continuar com Google" em /login                      │
│              ↓                                                          │
│  2. signInWithOAuth({ redirect_uri: window.location.origin })           │
│              ↓                                                          │
│  3. Usuário autoriza no Google                                          │
│              ↓                                                          │
│  4. Google redireciona para "/" (Landing page)                          │
│              ↓                                                          │
│  5. AuthContext detecta sessão via onAuthStateChange                    │
│              ↓                                                          │
│  6. PROBLEMA: Landing page não verifica autenticação!                   │
│              ↓                                                          │
│  7. Usuário fica "preso" na Landing, aparentemente não logado           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

O `redirect_uri: window.location.origin` envia o usuário de volta para `/`, mas a Landing page não tem nenhuma lógica para:
- Detectar que o usuário agora está autenticado
- Verificar o status da assinatura
- Redirecionar para `/home` ou `/plans` adequadamente

---

## Solução Proposta

Adicionar lógica na **Landing page** para detectar usuários autenticados e redirecioná-los automaticamente.

### Fluxo Corrigido:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                 Fluxo Corrigido                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Usuário retorna do Google OAuth para "/"                            │
│              ↓                                                          │
│  2. Landing page detecta que user existe (via useAuth)                  │
│              ↓                                                          │
│  3. Verifica status da assinatura (via useSubscription)                 │
│              ↓                                                          │
│  4. Se trial/active → navigate("/home")                                 │
│     Se none/expired → navigate("/plans")                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Arquivo a Alterar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Landing.tsx` | Adicionar lógica de redirecionamento para usuários autenticados |

---

## Implementação Técnica

### Código Atual (Landing.tsx)
A Landing page atual é completamente estática, sem verificação de autenticação.

### Código Corrigido

```typescript
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lightning, ShieldCheck, Sparkle } from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { status, loading: subLoading } = useSubscription();

  // Redirect authenticated users to appropriate page
  useEffect(() => {
    // Wait for auth and subscription to load
    if (authLoading || subLoading) return;
    
    // If user is authenticated, redirect based on subscription status
    if (user) {
      if (status === 'trial' || status === 'active') {
        navigate('/home', { replace: true });
      } else {
        navigate('/plans', { replace: true });
      }
    }
  }, [user, authLoading, status, subLoading, navigate]);

  // Show loading state while checking auth
  if (authLoading || (user && subLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // Rest of the Landing page component...
  return (
    // ... existing JSX
  );
}
```

---

## Detalhes da Implementação

1. **Importar hooks necessários:**
   - `useAuth` para verificar se há usuário autenticado
   - `useSubscription` para verificar status da assinatura
   - `useNavigate` para fazer o redirecionamento

2. **Adicionar useEffect de redirecionamento:**
   - Aguarda `authLoading` e `subLoading` terminarem
   - Se `user` existe, verifica `status` da assinatura
   - Redireciona para `/home` (trial/active) ou `/plans` (none/expired)

3. **Adicionar estado de loading:**
   - Exibe "Carregando..." enquanto verifica autenticação
   - Evita flash da Landing page antes do redirect

---

## Considerações Adicionais

Esta correção também beneficia outros cenários:
- Usuário com sessão ativa que acessa diretamente "/"
- Usuário que faz logout e depois login novamente via Google
- Qualquer fluxo OAuth que use `window.location.origin` como redirect

---

## Validação End-to-End

- [ ] Ir para `/login` e clicar "Continuar com Google"
- [ ] Autorizar no Google
- [ ] Verificar que após o redirect, o usuário vai automaticamente para `/home` (se trial/active) ou `/plans` (se none)
- [ ] Usuário não deve mais ficar "preso" na Landing page
- [ ] Repetir o teste a partir de `/register` com "Cadastrar com Google"

