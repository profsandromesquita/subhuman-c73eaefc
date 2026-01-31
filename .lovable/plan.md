

# Plano de Implementação — Login com Google (OAuth Gerenciado pelo Lovable)

## Visão Geral

Vamos implementar o login/cadastro via Google utilizando a solução gerenciada pelo Lovable Cloud. Esta opção:
- **Não requer** criação de projeto no Google Cloud Console
- **Não requer** chaves de API ou configuração manual
- Funciona imediatamente após a implementação
- A tela de consentimento do Google exibirá "Lovable" como nome do aplicativo

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────┐
│                    Fluxo de Login Google                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Usuário clica "Continuar com Google"                    │
│              ↓                                              │
│  2. lovable.auth.signInWithOAuth("google", {...})           │
│              ↓                                              │
│  3. Redirecionamento para tela de consentimento Google      │
│              ↓                                              │
│  4. Usuário autoriza (Google OAuth gerenciado Lovable)      │
│              ↓                                              │
│  5. Callback para redirect_uri (origem do app)              │
│              ↓                                              │
│  6. AuthContext detecta sessão via onAuthStateChange        │
│              ↓                                              │
│  7. Usuário logado! Profile criado automaticamente (trigger)│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## O que será feito

### 1. Configurar o Provider Google (ferramenta automática)
- Usar a ferramenta `supabase--configure-social-auth` para habilitar o Google
- Isso criará automaticamente o módulo `src/integrations/lovable/` com o cliente OAuth

### 2. Atualizar o Hook useAuth
**Arquivo:** `src/hooks/useAuth.ts`

Adicionar nova função `signInWithGoogle`:

```typescript
import { lovable } from "@/integrations/lovable/index";

const signInWithGoogle = useCallback(async () => {
  const { error } = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: window.location.origin,
  });
  return { error };
}, []);
```

### 3. Adicionar Botão Google na Página de Login
**Arquivo:** `src/pages/Login.tsx`

- Adicionar separador visual "ou"
- Adicionar botão "Continuar com Google" com ícone do Google
- Conectar ao `signInWithGoogle` do hook

**Layout proposto:**

```text
┌────────────────────────────────────────┐
│  Bem-vindo de volta                    │
│  Entre na sua conta para continuar     │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  Email                           │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  Senha                           │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌────────────────────────────────┐    │
│  │           Entrar               │    │
│  └────────────────────────────────┘    │
│                                        │
│  ─────────── ou ───────────            │
│                                        │
│  ┌────────────────────────────────┐    │
│  │  G  Continuar com Google       │    │
│  └────────────────────────────────┘    │
│                                        │
│  Não tem uma conta? Criar conta        │
└────────────────────────────────────────┘
```

### 4. Adicionar Botão Google na Página de Cadastro
**Arquivo:** `src/pages/Register.tsx`

- Adicionar o mesmo padrão visual (separador + botão)
- Posicionar antes do formulário de cadastro tradicional

**Layout proposto:**

```text
┌────────────────────────────────────────┐
│  Criar conta                           │
│  Comece sua jornada no futuro da IA    │
│                                        │
│  ┌────────────────────────────────┐    │
│  │  G  Cadastrar com Google       │    │
│  └────────────────────────────────┘    │
│                                        │
│  ─────────── ou ───────────            │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  Nome completo                   │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  Email                           │  │
│  └──────────────────────────────────┘  │
│  ...                                   │
└────────────────────────────────────────┘
```

---

## Arquivos Impactados

| Ação | Arquivo | Descrição |
|------|---------|-----------|
| Criar (automático) | `src/integrations/lovable/index.ts` | Cliente OAuth gerado pela ferramenta |
| Alterar | `src/hooks/useAuth.ts` | Adicionar função `signInWithGoogle` |
| Alterar | `src/pages/Login.tsx` | Adicionar botão Google + separador |
| Alterar | `src/pages/Register.tsx` | Adicionar botão Google + separador |

---

## Componente GoogleButton (reutilizável)

Criaremos um componente para o botão do Google que será usado em ambas as páginas:

**Arquivo:** `src/components/GoogleButton.tsx`

```typescript
// Botão estilizado com ícone do Google
// Props: onClick, isLoading, label
```

---

## Tratamento do Callback OAuth

Após o usuário autorizar no Google, ele será redirecionado de volta para a origem do app (`window.location.origin`).

O `AuthContext` já possui o listener `onAuthStateChange` que detectará a nova sessão automaticamente, então:
- Não é necessário criar uma rota de callback especial
- O usuário será automaticamente redirecionado conforme a lógica existente

---

## Criação Automática de Perfil

O trigger `handle_new_user` já existe no banco de dados e cria automaticamente:
- Registro na tabela `profiles` (com `full_name` e `avatar_url` do Google)
- Role `user` na tabela `user_roles`

Isso significa que usuários que fizerem login via Google terão seus perfis criados automaticamente.

---

## Ordem de Implementação

1. **Configurar provider Google** via ferramenta `configure-social-auth`
2. **Criar componente** `GoogleButton.tsx`
3. **Atualizar** `useAuth.ts` com `signInWithGoogle`
4. **Atualizar** `Login.tsx` com botão Google
5. **Atualizar** `Register.tsx` com botão Google

---

## Validação End-to-End

- [ ] Clicar em "Continuar com Google" na página de Login
- [ ] Tela de consentimento do Google aparece
- [ ] Após autorizar, usuário retorna logado ao app
- [ ] Perfil é criado automaticamente (verificar tabela `profiles`)
- [ ] Usuário é redirecionado para `/home` ou `/plans` conforme status
- [ ] Clicar em "Cadastrar com Google" na página de Registro funciona da mesma forma
- [ ] Usuário existente que faz login via Google é reconhecido (não duplica conta)

---

## Informação Importante

**Você não precisa fazer nada manualmente!** 

O Google OAuth gerenciado pelo Lovable funciona automaticamente. Não é necessário:
- Criar projeto no Google Cloud Console
- Configurar credenciais OAuth
- Definir URLs de callback

Tudo será configurado automaticamente pela ferramenta de configuração.

