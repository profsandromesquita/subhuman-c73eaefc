

# Plano de Correção: Google OAuth

## Diagnóstico dos Problemas

### Problema 1: Mensagem "Prosseguir para akkbfzfjappludgsrwsw.supabase.co"

Esta mensagem é exibida pelo Google e mostra o **domínio do callback URL configurado nas credenciais OAuth no Google Cloud Console**. Ela **NÃO** é controlada pelo código da aplicação.

Para que apareça "Prosseguir para subhumano.ia.br", seria necessário:
- Configurar um **Custom Domain para o Supabase Auth** (funcionalidade não disponível no Lovable Cloud)
- Isso requer acesso direto ao painel do Supabase para configurar um CNAME

**Limitação**: No Lovable Cloud, não é possível configurar um domínio personalizado para o endpoint de autenticação do Supabase. A mensagem sempre mostrará o domínio do Supabase.

### Problema 2: "Missing state parameter"

Este erro ocorreu porque o `redirectTo` foi alterado para `https://subhumano.ia.br/~oauth/callback`, que é um formato incompatível com o fluxo OAuth padrão do Supabase. O parâmetro `state` é usado para proteção CSRF e se perde quando o redirect não segue o padrão esperado.

---

## Solução

### Etapa 1: Corrigir o erro "Missing state parameter"

Reverter o `redirectTo` para usar a raiz do domínio, permitindo que o Supabase processe o callback corretamente:

**Arquivo:** `src/hooks/useAuth.ts` (linha 46-54)

```typescript
const signInWithGoogle = useCallback(async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://subhumano.ia.br/',
    }
  });
  return { error };
}, []);
```

Isso fará:
1. Google autentica e envia callback para `akkbfzfjappludgsrwsw.supabase.co/auth/v1/callback`
2. Supabase processa a autenticação e redireciona para `https://subhumano.ia.br/`
3. Landing page detecta o usuário autenticado e redireciona para `/home` ou `/plans`

---

## Sobre a Mensagem "Prosseguir para"

Infelizmente, a mensagem "Prosseguir para akkbfzfjappludgsrwsw.supabase.co" **não pode ser alterada** via código no Lovable Cloud. Essa mensagem é determinada pelo **Authorized redirect URI** configurado no Google Cloud Console.

Para o seu caso com domínio personalizado (`subhumano.ia.br`), seria necessário:
- Configurar Custom Domain no Supabase Auth (não disponível no Lovable Cloud)
- Ou implementar um proxy de autenticação customizado (complexidade elevada)

**Alternativa pragmática**: Manter o fluxo atual funcionando. Os usuários verão o domínio técnico do Supabase apenas por um momento durante o login, mas serão redirecionados corretamente para `subhumano.ia.br` após a autenticação.

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useAuth.ts` | Corrigir `redirectTo` para `https://subhumano.ia.br/` |

---

## Resultado Esperado

1. Login com Google volta a funcionar sem erros
2. Após autenticação, usuário é redirecionado para `subhumano.ia.br`
3. Landing page processa a sessão e navega para `/home` ou `/plans`

