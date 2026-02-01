

# Plano de Correção: Entrega de Emails de Confirmação

## Diagnóstico da Investigação

### O que os logs revelam

| Email | Status | Problema |
|-------|--------|----------|
| `contato@arduinoceara.cc` | Já cadastrado e confirmado (31/01/2026) | `user_repeated_signup` - não envia email |
| `contato@profsandromesquita.com` | Já cadastrado e confirmado (20/01/2026) | `user_repeated_signup` - não envia email |

### Causa Raiz Identificada

**Não é um bug no código**, mas sim uma combinação de fatores:

1. **Usuários já existem**: Ambos os emails já foram cadastrados anteriormente e estão confirmados
2. **Comportamento do sistema de autenticação**: Quando um usuário tenta se cadastrar com um email que já existe, o sistema:
   - Retorna status 200 (sucesso) para não revelar se o email existe (segurança)
   - Marca como `user_repeated_signup` nos logs
   - **NÃO envia novo email de confirmação** (anti-spam)
3. **Rate limit atingido**: O log mostra `429: email rate limit exceeded` em tentativas anteriores

### Por que o código atual não detecta isso?

O `supabase.auth.signUp()` retorna sucesso (sem erro) mesmo quando o email já existe - isso é intencional por segurança para evitar enumeração de emails.

## Solução Proposta

### Melhorar o tratamento de cadastros duplicados

O sistema precisa detectar quando um cadastro é de um email já existente e informar adequadamente ao usuário.

### Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/Register.tsx` | Detectar cadastro duplicado e informar usuário |
| `src/hooks/useAuth.ts` | Melhorar retorno do signUp com verificação adicional |

## Implementação Detalhada

### 1. Modificar signUp em useAuth.ts

Após chamar `signUp`, verificar se o usuário foi realmente criado ou se já existia:

```typescript
const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
  const redirectUrl = `${window.location.origin}/`;
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: { full_name: fullName }
    }
  });
  
  // Detecta se é um cadastro duplicado
  // Quando o email já existe, identities vem vazio
  const isExistingUser = data?.user?.identities?.length === 0;
  
  return { error, isExistingUser };
}, []);
```

### 2. Modificar Register.tsx

Tratar o caso de usuário já existente:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // ... validações ...
  
  const { error, isExistingUser } = await signUp(email, password, name);
  
  if (error) {
    // Tratamento de erro normal
    return;
  }
  
  if (isExistingUser) {
    // Email já cadastrado - direcionar para login
    toast.info(
      "Este email já está cadastrado. Faça login ou recupere sua senha.",
      { duration: 5000 }
    );
    navigate("/login");
    return;
  }
  
  // Cadastro novo - seguir fluxo normal
  sessionStorage.setItem("pending_verification_email", email);
  toast.success("Enviamos um link de confirmação para seu email!");
  navigate("/verify-email");
};
```

### 3. Adicionar feedback para rate limit

Tratar especificamente o erro de rate limit:

```typescript
if (error) {
  if (error.message.includes("rate limit")) {
    toast.error(
      "Muitas tentativas. Por favor, aguarde alguns minutos antes de tentar novamente."
    );
  } else if (error.message.includes("already registered")) {
    toast.error("Este email já está cadastrado");
  } else {
    toast.error(error.message || "Erro ao criar conta");
  }
  return;
}
```

## Fluxo Corrigido

```text
Usuário tenta cadastrar
        |
        v
signUp() chamado
        |
        +-- Erro de rate limit --> "Aguarde alguns minutos"
        |
        +-- isExistingUser = true --> "Email já cadastrado, faça login"
        |
        +-- Sucesso (novo usuário) --> Redireciona para /verify-email
```

## Seção Técnica

### Por que o sistema de autenticação não retorna erro para emails duplicados?

Por segurança (prevenção de enumeração de emails). Se o sistema retornasse "email já cadastrado", um atacante poderia descobrir quais emails estão registrados na plataforma.

### Como detectar cadastro duplicado?

O objeto `data.user.identities` retorna:
- **Array com identidades**: Novo usuário criado
- **Array vazio `[]`**: Email já existe no sistema

### Rate Limits do Sistema de Autenticação

| Tipo | Limite Aproximado |
|------|-------------------|
| Emails por hora | 4 por destinatário |
| Emails por dia | 30 por destinatário |
| Tentativas de signup | 60 por hora por IP |

### Por que não usar serviço de email externo?

O Lovable Cloud já envia emails de confirmação automaticamente. Um serviço externo (como Resend) seria necessário apenas para:
- Emails personalizados com branding
- Emails transacionais (não relacionados a auth)
- Maior volume de envios

## Benefícios da Correção

1. **Feedback claro**: Usuário sabe se o email já está cadastrado
2. **Redirecionamento inteligente**: Usuários existentes vão para login
3. **Tratamento de rate limit**: Mensagem clara quando limite é atingido
4. **Segurança mantida**: Não expõe informação de emails cadastrados de forma insegura

## Para Testes Reais

Para testar com emails novos (que nunca foram cadastrados), você pode:
1. Usar um email pessoal diferente
2. Usar serviços de email temporário (10minutemail, guerrillamail)
3. Usar alias de Gmail: seuemail+teste1@gmail.com, seuemail+teste2@gmail.com

