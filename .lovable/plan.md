

# Plano de Implementação: Google OAuth BYOK

## Credenciais Recebidas
- **Client ID:** `546052877300-jujjmcspsq9k0o0uj9mdoqonm253himo.apps.googleusercontent.com`
- **Client Secret:** `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`

---

## Etapas de Implementação

### 1. Configurar Provider Google no Lovable Cloud
Usar a ferramenta de configuração de autenticação para cadastrar suas credenciais OAuth no backend.

### 2. Atualizar `src/hooks/useAuth.ts`
Trocar a função `signInWithGoogle` para usar o cliente Supabase nativo:

```typescript
const signInWithGoogle = useCallback(async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/home`,
    }
  });
  return { error };
}, []);
```

Também remover a importação do `lovable` que não será mais necessária.

### 3. Corrigir `src/pages/Landing.tsx`
Adicionar uma flag `hasRedirected` usando `useRef` para evitar múltiplos redirecionamentos causados por re-renders durante a atualização do estado de autenticação.

### 4. Remover `src/integrations/lovable/index.ts`
Este arquivo não será mais necessário após a migração para o flow nativo do Supabase.

---

## Arquivos Impactados

| Arquivo | Ação |
|---------|------|
| `src/hooks/useAuth.ts` | Alterar para usar `supabase.auth.signInWithOAuth` |
| `src/pages/Landing.tsx` | Corrigir lógica de redirecionamento |
| `src/integrations/lovable/index.ts` | Remover |

---

## Resultado Esperado

1. Login com Google funcionará com branding "Subhuman"
2. Após autenticação, usuário será redirecionado para `/home` (trial/active) ou `/plans` (sem assinatura)
3. Sem loops infinitos de redirecionamento
4. Stack de autenticação simplificada

