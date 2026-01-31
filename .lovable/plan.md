

# Plano: Configurar OAuth Redirect para Domínio Personalizado

## Problema Identificado

O `signInWithOAuth` está usando `window.location.origin` dinamicamente, o que funciona para preview mas não para o domínio personalizado. Precisamos hardcodar o domínio `subhumano.ia.br`.

---

## Alteração Necessária

### Arquivo: `src/hooks/useAuth.ts`

**Linha 46-54** - Alterar a função `signInWithGoogle`:

```typescript
const signInWithGoogle = useCallback(async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://subhumano.ia.br/~oauth/callback',
    }
  });
  return { error };
}, []);
```

---

## Configuração Adicional Necessária

Após aprovar este plano, você também precisará:

1. **Google Cloud Console** - Adicionar o redirect URI nas credenciais OAuth:
   - Vá em **Credentials → seu OAuth Client → Authorized redirect URIs**
   - Adicione: `https://akkbfzfjappludgsrwsw.supabase.co/auth/v1/callback`
   - E também: `https://subhumano.ia.br/~oauth/callback` (se suportado)

2. **Backend Authentication Settings** - Garantir que o domínio `subhumano.ia.br` está configurado como Site URL ou Redirect URL adicional

---

## Fluxo OAuth Esperado

```text
1. Usuário clica "Continuar com Google"
           ↓
2. Redireciona para Google OAuth (consent screen "Subhuman")
           ↓
3. Google envia callback para Supabase: 
   akkbfzfjappludgsrwsw.supabase.co/auth/v1/callback
           ↓
4. Supabase processa e redireciona para:
   https://subhumano.ia.br/~oauth/callback
           ↓
5. App processa sessão e navega para /home ou /plans
```

---

## Arquivo Impactado

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useAuth.ts` | Alterar `redirectTo` para domínio personalizado |

