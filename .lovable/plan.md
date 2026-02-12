
# Plano de Correcao - Autenticacao, Login e Seguranca

## Auditoria Completa - Problemas Encontrados

### Problema 1: Recuperacao de Senha NAO Funciona (CRITICO)
O arquivo `src/pages/ForgotPassword.tsx` contem uma **implementacao falsa**. O `handleSubmit` (linha 14-23) faz apenas um `setTimeout(1000)` e exibe um toast de sucesso, **sem nunca chamar** a funcao `resetPassword()` do hook `useAuth`. O hook `useAuth` ja tem a funcao `resetPassword` implementada corretamente (chama `supabase.auth.resetPasswordForEmail`), mas ela nao e importada nem usada em ForgotPassword.tsx.

Alem disso, o `redirectTo` da funcao `resetPassword` aponta para `${window.location.origin}/reset-password`, porem **nao existe** uma rota `/reset-password` no `App.tsx` nem uma pagina `ResetPassword.tsx`. Ou seja, mesmo que o email fosse enviado, o usuario clicaria no link e cairia em uma pagina 404.

### Problema 2: Sem Campo de Confirmacao de Senha no Cadastro
O formulario em `src/pages/Register.tsx` possui apenas um campo de senha. Nao ha campo de confirmacao para evitar erros de digitacao.

### Problema 3: Sem Protecao Contra Forca Bruta no Login
O formulario em `src/pages/Login.tsx` permite tentativas ilimitadas de login sem nenhum controle de rate limiting no lado do cliente. Um atacante pode tentar milhares de combinacoes sem ser bloqueado.

### Problema 4: Sem Validacao de Email Real
O formulario de cadastro usa apenas `type="email"` do HTML, que aceita qualquer formato como `a@b.c`. Nao ha validacao de dominio ou formato robusto.

---

## Plano de Implementacao

### Tarefa 1: Recuperacao de Senha Funcional

**Etapa 1A - Corrigir ForgotPassword.tsx**

Arquivo: `src/pages/ForgotPassword.tsx`

Mudancas:
- Importar `useAuth` de `@/hooks/useAuth`
- Substituir o `setTimeout` falso pela chamada real `resetPassword(email)`
- Tratar erros (rate limit, email invalido) com mensagens em PT-BR
- Manter a UI de sucesso existente

```text
// ANTES (falso):
const handleSubmit = async (e) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  setSent(true);
  toast.success("Email enviado com sucesso!");
};

// DEPOIS (real):
const { resetPassword } = useAuth();
const handleSubmit = async (e) => {
  e.preventDefault();
  setIsLoading(true);
  const { error } = await resetPassword(email);
  if (error) {
    if (error.message.includes("rate limit")) {
      toast.error("Muitas tentativas. Aguarde alguns minutos.");
    } else {
      toast.error("Erro ao enviar email de recuperacao");
    }
    setIsLoading(false);
    return;
  }
  setSent(true);
  toast.success("Email enviado com sucesso!");
  setIsLoading(false);
};
```

**Etapa 1B - Criar pagina ResetPassword.tsx**

Novo arquivo: `src/pages/ResetPassword.tsx`

Esta pagina e exibida quando o usuario clica no link do email de recuperacao. O Supabase redireciona para `/reset-password` com tokens na URL. A pagina deve:
- Verificar se existe uma sessao ativa (o Supabase automaticamente loga o usuario ao clicar no link)
- Exibir formulario com "Nova senha" e "Confirmar nova senha" (com os mesmos requisitos de senha do cadastro: 8+ caracteres, maiuscula, numero)
- Chamar `supabase.auth.updateUser({ password })` para definir a nova senha
- Apos sucesso, redirecionar para `/login` com toast de confirmacao

**Etapa 1C - Registrar a rota**

Arquivo: `src/App.tsx`

Mudancas:
- Importar `ResetPassword` com lazy loading
- Adicionar rota `<Route path="/reset-password" element={<ResetPassword />} />`nas rotas publicas

---

### Tarefa 2: Campo de Confirmacao de Senha no Cadastro

Arquivo: `src/pages/Register.tsx`

Mudancas:
- Adicionar estado `confirmPassword` (`useState("")`)
- Adicionar campo "Confirmar senha" com toggle de visibilidade (mesmo estilo do campo de senha existente)
- Adicionar validacao no `handleSubmit`: se `password !== confirmPassword`, exibir toast de erro "As senhas nao conferem" e bloquear o envio
- Posicionar o campo logo abaixo do campo de senha e acima dos indicadores de requisitos

```text
// Novo estado:
const [confirmPassword, setConfirmPassword] = useState("");
const [showConfirmPassword, setShowConfirmPassword] = useState(false);

// Nova validacao no handleSubmit:
if (password !== confirmPassword) {
  toast.error("As senhas nao conferem");
  return;
}

// Indicador visual inline (abaixo do campo de confirmacao):
// - Se confirmPassword vazio: nada
// - Se igual: texto verde "Senhas conferem"
// - Se diferente: texto vermelho "As senhas nao conferem"
```

---

### Tarefa 3: Protecao Contra Forca Bruta no Login

Arquivo: `src/pages/Login.tsx`

Implementacao de **rate limiting no lado do cliente** usando `localStorage`:

Logica:
- Manter um contador de tentativas falhas consecutivas em `localStorage` com chave `login_failed_attempts`
- Manter o timestamp da ultima tentativa falha em `login_last_failed_at`
- A cada tentativa falha, incrementar o contador
- Regras de bloqueio progressivo:
  - 3 tentativas falhas: bloqueio de 30 segundos
  - 5 tentativas falhas: bloqueio de 2 minutos
  - 8+ tentativas falhas: bloqueio de 10 minutos
- Ao fazer login com sucesso, zerar o contador
- Exibir mensagem no formulario: "Muitas tentativas incorretas. Tente novamente em X segundos"
- Desabilitar o botao "Entrar" e os inputs durante o periodo de bloqueio
- Adicionar um timer visual (countdown) mostrando quanto tempo falta

```text
// Estrutura no localStorage:
{
  "login_failed_attempts": 3,
  "login_last_failed_at": 1707500000000,
  "login_lockout_until": 1707500030000
}

// Funcao de calculo do lockout:
function getLockoutDuration(attempts: number): number {
  if (attempts >= 8) return 10 * 60 * 1000; // 10 min
  if (attempts >= 5) return 2 * 60 * 1000;   // 2 min
  if (attempts >= 3) return 30 * 1000;        // 30s
  return 0;
}
```

> Nota: O rate limiting no lado do cliente e uma primeira barreira. O Supabase ja possui rate limiting no servidor (GoTrue), mas o cliente nao mostra feedback adequado sobre isso. Esta implementacao oferece feedback visual imediato ao usuario e desencoraja tentativas automatizadas basicas.

---

### Tarefa 4: Validacao de Email Real no Cadastro

Arquivo: `src/pages/Register.tsx`

Implementacao de validacao de email em duas camadas:

**Camada 1 - Validacao de formato (client-side):**
- Regex robusto para validar formato de email
- Bloquear dominios temporarios/descartaveis conhecidos (lista das 50+ mais comuns: mailinator.com, tempmail.com, guerrillamail.com, yopmail.com, throwaway.email, etc.)
- Validar que o dominio tem pelo menos 2 partes (ex: `gmail.com`, nao `gmail`)
- Exibir erro inline abaixo do campo de email se invalido

```text
// Lista parcial de dominios bloqueados:
const BLOCKED_DOMAINS = [
  "mailinator.com", "tempmail.com", "guerrillamail.com",
  "yopmail.com", "throwaway.email", "10minutemail.com",
  "trashmail.com", "fakeinbox.com", "sharklasers.com",
  "guerrillamailblock.com", "grr.la", "dispostable.com",
  "maildrop.cc", "temp-mail.org", "emailondeck.com",
  // ... mais dominios
];

function validateEmail(email: string): { valid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Formato de email invalido" };
  }
  const domain = email.split("@")[1].toLowerCase();
  if (BLOCKED_DOMAINS.includes(domain)) {
    return { valid: false, error: "Use um email real, nao temporario" };
  }
  return { valid: true };
}
```

**Camada 2 - Confirmacao de email obrigatoria (ja existe):**
O fluxo atual ja exige confirmacao por email via `/verify-email`. Isso funciona como segunda camada de validacao, pois apenas emails reais receberao o link de confirmacao.

---

## Resumo dos Arquivos

| Arquivo | Tarefa | Tipo |
|---------|--------|------|
| `src/pages/ForgotPassword.tsx` | 1A | Correcao |
| `src/pages/ResetPassword.tsx` | 1B | Novo arquivo |
| `src/App.tsx` | 1C | Adicionar rota |
| `src/pages/Register.tsx` | 2 e 4 | Adicionar campo + validacao |
| `src/pages/Login.tsx` | 3 | Adicionar rate limiting |

## Ordem de Implementacao

1. ForgotPassword.tsx (corrigir chamada real)
2. ResetPassword.tsx (criar pagina nova)
3. App.tsx (registrar rota)
4. Register.tsx (campo confirmacao + validacao email)
5. Login.tsx (rate limiting)

## Nenhuma Migracao SQL Necessaria

Todas as mudancas sao exclusivamente no frontend. O backend (Supabase Auth) ja possui as funcoes necessarias (`resetPasswordForEmail`, `updateUser`). O rate limiting do servidor ja existe no GoTrue do Supabase.
