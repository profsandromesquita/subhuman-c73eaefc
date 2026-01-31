

# Plano: Migrar para Google OAuth com Credenciais Próprias (BYOK)

## Diagnóstico do Loop Infinito

O loop infinito está sendo causado por uma **condição de corrida** entre:
1. O OAuth callback retornando para `/` (Landing)
2. A Landing verificando autenticação enquanto os estados ainda estão atualizando
3. Múltiplos re-renders causando navegações repetidas

Esta abordagem com OAuth gerenciado pelo Lovable tem limitações que estão causando problemas. A solução mais robusta é **migrar para suas próprias credenciais**.

---

## O que você precisa fazer (passo a passo)

### Passo 1: Criar projeto no Google Cloud Console

1. Acesse: https://console.cloud.google.com/
2. Crie um novo projeto (ou use um existente)
3. Vá para **"APIs & Services" → "OAuth consent screen"**
4. Configure:
   - **User Type**: External
   - **App name**: Subhuman (ou seu nome desejado)
   - **User support email**: Seu email
   - **Logo**: (opcional) Upload do logo Subhuman
   - **Authorized domains**: `lovable.app` e seu domínio customizado (se tiver)
   - **Developer contact information**: Seu email

5. Vá para **"Credentials" → "Create Credentials" → "OAuth client ID"**
6. Configure:
   - **Application type**: Web application
   - **Name**: Subhuman Web Client
   - **Authorized JavaScript origins**: 
     - `https://id-preview--38842661-2f61-4b6f-a6f3-f9c69c0c74fd.lovable.app`
     - `https://subhuman.lovable.app`
   - **Authorized redirect URIs**:
     - `https://akkbfzfjappludgsrwsw.supabase.co/auth/v1/callback`

7. Copie o **Client ID** e **Client Secret** gerados

---

### Passo 2: Me enviar as credenciais

Após criar, envie aqui no chat:
- **Google Client ID** (algo como `123456789-xxxxxxxx.apps.googleusercontent.com`)
- **Google Client Secret** (algo como `GOCSPX-xxxxxxxxx`)

---

## O que eu vou implementar após receber as credenciais

### 1. Configurar Provider Google no Lovable Cloud
- Usar a ferramenta de configuração para cadastrar suas credenciais

### 2. Atualizar o hook `useAuth.ts`
- Trocar de `lovable.auth.signInWithOAuth` para `supabase.auth.signInWithOAuth`
- Usar o flow nativo do Supabase que é mais estável

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

### 3. Remover a integração lovable/auth
- Remover o arquivo `src/integrations/lovable/index.ts`
- Simplificar a stack de autenticação

### 4. Corrigir os warnings de forwardRef
- Adicionar `forwardRef` aos componentes `GoogleButton` e `AuthDivider`

### 5. Corrigir a Landing para evitar loops
- Adicionar flag para evitar múltiplos redirecionamentos
- Usar `replace: true` de forma mais controlada

---

## Arquivos impactados

| Ação | Arquivo |
|------|---------|
| Alterar | `src/hooks/useAuth.ts` |
| Alterar | `src/pages/Landing.tsx` |
| Alterar | `src/components/GoogleButton.tsx` |
| Alterar | `src/components/AuthDivider.tsx` |
| Remover | `src/integrations/lovable/index.ts` |

---

## Benefícios desta abordagem

1. **Controle total**: Você terá as credenciais e pode gerenciar no Google Cloud Console
2. **Branding personalizado**: Tela de consentimento mostrará "Subhuman" em vez de "Lovable"
3. **Mais estabilidade**: O flow nativo do Supabase é mais testado e robusto
4. **Debug facilitado**: Você pode ver logs no Google Cloud Console
5. **Sem dependência do cliente lovable/auth**: Menos código, menos pontos de falha

---

## Próximos passos

1. Crie o projeto no Google Cloud Console seguindo as instruções acima
2. Me envie o **Client ID** e **Client Secret** gerados
3. Eu configuro tudo e faço as alterações necessárias no código

