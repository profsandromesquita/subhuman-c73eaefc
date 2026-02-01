

# Plano de Implementação: Validação de Cadastro por Email

## Diagnóstico do Estado Atual

Após auditoria completa do código, identifiquei o seguinte:

| Componente | Arquivo | Status Atual |
|------------|---------|--------------|
| Página de Registro | `src/pages/Register.tsx` | Redireciona para `/plans` imediatamente após signup |
| Hook de Autenticação | `src/hooks/useAuth.ts` | Usa `signUp` com `emailRedirectTo` configurado |
| Contexto de Auth | `src/contexts/AuthContext.tsx` | Não verifica se email foi confirmado |
| Guards de Rota | `src/components/SubscriptionGuard.tsx` | Não bloqueia usuários com email não confirmado |

### Problema Identificado

O fluxo atual permite que usuários se cadastrem com **qualquer email** (mesmo domínios inexistentes) e ganhem acesso imediato à plataforma. Isso ocorre porque:

1. A confirmação de email está desabilitada ou não é verificada
2. Após o `signUp`, o usuário é redirecionado diretamente para escolher um plano
3. Não existe uma página intermediária para aguardar confirmação

## Solução Proposta

Implementar um fluxo de **confirmação obrigatória de email** em 3 etapas:

### Etapa 1: Habilitar Confirmação de Email no Backend

Ativar a configuração de "Confirm Email" no sistema de autenticação para que todos os novos cadastros recebam um email de confirmação antes de poderem fazer login.

### Etapa 2: Criar Página de Verificação de Email

Criar uma nova página `VerifyEmail.tsx` que será exibida após o cadastro, informando o usuário que ele precisa verificar seu email antes de continuar.

### Etapa 3: Atualizar Fluxo de Cadastro

Modificar `Register.tsx` para redirecionar para a página de verificação ao invés de `/plans` após cadastro bem-sucedido.

### Etapa 4: Proteger Login e Rotas

Atualizar o fluxo de login para verificar se o email foi confirmado e exibir mensagem adequada caso o usuário tente fazer login sem confirmação.

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/VerifyEmail.tsx` | **Criar** - Página de aguardando verificação de email |
| `src/pages/Register.tsx` | **Modificar** - Redirecionar para `/verify-email` após cadastro |
| `src/pages/Login.tsx` | **Modificar** - Tratar erro de email não confirmado |
| `src/App.tsx` | **Modificar** - Adicionar rota `/verify-email` |
| `src/hooks/useAuth.ts` | **Modificar** - Adicionar função de reenvio de email |

## Fluxo de Usuário Proposto

```text
+------------------+     +-------------------+     +------------------+
|   Página de      |     |   Página de       |     |   Clica no Link  |
|   Cadastro       | --> |   Verificação     | --> |   no Email       |
|   (Register)     |     |   (VerifyEmail)   |     |                  |
+------------------+     +-------------------+     +------------------+
                                   |                        |
                                   v                        v
                         [Aguardando confirmação]   [Redirecionado para /]
                         [Botão: Reenviar email]    [Email confirmado!]
                                                            |
                                                            v
                                                    +------------------+
                                                    |   Página de      |
                                                    |   Login ou Home  |
                                                    +------------------+
```

## Detalhes de Implementação

### 1. Página VerifyEmail.tsx

```text
Conteúdo da página:
- Ícone de email (envelope)
- Título: "Verifique seu email"
- Mensagem: "Enviamos um link de confirmação para {email}"
- Instrução: "Clique no link para ativar sua conta"
- Botão: "Reenviar email de verificação"
- Link: "Usar outro email" (volta para registro)
- Texto: "Já confirmou? Fazer login"
```

### 2. Modificações no Register.tsx

Após cadastro bem-sucedido:
- Salvar o email no sessionStorage para exibir na página de verificação
- Redirecionar para `/verify-email` ao invés de `/plans`
- Mostrar toast de sucesso diferente: "Enviamos um link de confirmação para seu email"

### 3. Modificações no Login.tsx

Tratar o erro específico de email não confirmado:
- Código de erro: `email_not_confirmed`
- Exibir mensagem: "Por favor, confirme seu email antes de fazer login"
- Oferecer opção de reenviar email de confirmação

### 4. Hook useAuth - Nova Função

Adicionar função `resendConfirmationEmail` para permitir reenvio do email de confirmação.

## Seção Técnica

### Configuração de Autenticação

O Lovable Cloud usa o sistema de autenticação integrado. A configuração de "Confirm Email" precisa ser habilitada nas configurações de autenticação. Isso pode ser feito através do dashboard:

```
Lovable Cloud Dashboard > Auth Settings > Confirm Email: Enabled
```

### Como funciona a confirmação de email

1. **Cadastro**: `supabase.auth.signUp()` envia email de confirmação automaticamente quando habilitado
2. **Usuário clica no link**: Redirecionado para a URL configurada em `emailRedirectTo`
3. **Token processado**: O sistema de autenticação marca o email como confirmado
4. **Login liberado**: Usuário pode fazer login normalmente

### Verificação de Email Confirmado

O objeto `user` do Supabase contém:
```javascript
user.email_confirmed_at // null se não confirmado, timestamp se confirmado
```

Isso pode ser usado para verificar se o usuário confirmou o email.

### Reenvio de Email

Para reenviar o email de confirmação, usar:
```javascript
supabase.auth.resend({
  type: 'signup',
  email: userEmail,
  options: {
    emailRedirectTo: `${window.location.origin}/`
  }
})
```

## Experiência do Usuário

**Antes (atual):**
1. Usuário cadastra com email qualquer
2. Acesso imediato à plataforma
3. Email pode ser falso/inexistente

**Depois (proposto):**
1. Usuário cadastra com email
2. Vê página de "Verifique seu email"
3. Recebe email com link de confirmação
4. Clica no link e é redirecionado para a plataforma
5. Pode fazer login normalmente

**Benefícios:**
- Garante que o email é válido e pertence ao usuário
- Base de usuários limpa para campanhas de marketing
- Reduz cadastros falsos/spam
- Possibilita comunicação futura com o usuário

