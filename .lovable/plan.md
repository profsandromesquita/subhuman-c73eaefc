
# Plano de Correção: Páginas de Perfil Faltantes (404)

## Diagnóstico

### Causa Raiz Identificada

O erro 404 ocorre porque:

1. **Rotas não definidas** no `App.tsx`:
   - `/profile/security` - NÃO EXISTE
   - `/profile/notifications` - NÃO EXISTE  
   - `/profile/settings` - NÃO EXISTE

2. **Componentes não criados** em `src/pages/profile/`:
   - Apenas `PersonalData.tsx` existe
   - `Security.tsx` - NÃO EXISTE
   - `NotificationPreferences.tsx` - NÃO EXISTE
   - `Settings.tsx` - NÃO EXISTE

3. **Links definidos** no `Profile.tsx` apontam para rotas inexistentes:
   ```typescript
   { path: "/profile/security" }      // Link existe, rota não
   { path: "/profile/notifications" } // Link existe, rota não
   { path: "/profile/settings" }      // Link existe, rota não
   ```

---

## Solução

### Etapa 1: Criar Página de Senha e Segurança

**Arquivo:** `src/pages/profile/Security.tsx`

Funcionalidades:
- Alteração de senha (atual + nova + confirmação)
- Integração com Supabase Auth `updateUser({ password })`
- Validação de senha mínima (8 caracteres)
- Feedback visual de sucesso/erro

Seções da página:
| Seção | Campos |
|-------|--------|
| Alterar senha | Senha atual, Nova senha, Confirmar senha |
| Sessões ativas | Informação sobre a sessão atual |

---

### Etapa 2: Criar Página de Preferências de Notificação

**Arquivo:** `src/pages/profile/NotificationPreferences.tsx`

Funcionalidades:
- Switches para ativar/desativar tipos de notificação
- Persistência no banco de dados (nova tabela ou coluna em profiles)

Opções de notificação:
| Tipo | Descrição |
|------|-----------|
| Atualizações de Espaços | Novos posts nos espaços que você segue |
| Comentários | Quando alguém responde seus posts |
| Menções | Quando você é mencionado |
| Novidades do Subhumano | Anúncios e novos recursos |
| Email de resumo semanal | Resumo das principais atualizações |

---

### Etapa 3: Criar Página de Configurações

**Arquivo:** `src/pages/profile/Settings.tsx`

Funcionalidades:
- Preferências do aplicativo
- Opções de acessibilidade
- Gerenciamento de dados

Opções:
| Seção | Opções |
|-------|--------|
| Aparência | Tema (apenas dark por design) |
| Idioma | Português (BR) - único disponível |
| Cache | Limpar dados em cache |
| Dados | Baixar meus dados, Excluir conta |

---

### Etapa 4: Registrar Rotas no App.tsx

Adicionar as 3 novas rotas protegidas:

```typescript
import Security from "./pages/profile/Security";
import NotificationPreferences from "./pages/profile/NotificationPreferences";
import Settings from "./pages/profile/Settings";

// Dentro de <Routes>:
<Route path="/profile/security" element={<SubscriptionGuard><Security /></SubscriptionGuard>} />
<Route path="/profile/notifications" element={<SubscriptionGuard><NotificationPreferences /></SubscriptionGuard>} />
<Route path="/profile/settings" element={<SubscriptionGuard><Settings /></SubscriptionGuard>} />
```

---

### Etapa 5: Migração do Banco (Opcional)

Para persistir preferências de notificação, adicionar colunas à tabela `profiles`:

```sql
ALTER TABLE public.profiles
ADD COLUMN notify_space_updates boolean DEFAULT true,
ADD COLUMN notify_comments boolean DEFAULT true,
ADD COLUMN notify_mentions boolean DEFAULT true,
ADD COLUMN notify_announcements boolean DEFAULT true,
ADD COLUMN notify_weekly_email boolean DEFAULT false;
```

---

## Resumo de Arquivos

| Arquivo | Ação |
|---------|------|
| `src/pages/profile/Security.tsx` | Criar |
| `src/pages/profile/NotificationPreferences.tsx` | Criar |
| `src/pages/profile/Settings.tsx` | Criar |
| `src/App.tsx` | Alterar - adicionar 3 rotas |
| Migração SQL | Criar - campos de preferências de notificação |

---

## Layout Visual das Páginas

### Senha e Segurança
```text
┌─────────────────────────────────────┐
│  ← Senha e segurança                │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ Alterar senha               │    │
│  │ ─────────────────────────── │    │
│  │ Senha atual      [________] │    │
│  │ Nova senha       [________] │    │
│  │ Confirmar        [________] │    │
│  │                             │    │
│  │ [    Alterar senha      ]   │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Sessão atual                │    │
│  │ ─────────────────────────── │    │
│  │ Dispositivo: Chrome - Mac   │    │
│  │ Último acesso: Agora        │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### Preferências de Notificação
```text
┌─────────────────────────────────────┐
│  ← Notificações                     │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ Push notifications          │    │
│  │ ─────────────────────────── │    │
│  │ Atualizações       [===O  ] │    │
│  │ Comentários        [===O  ] │    │
│  │ Menções            [===O  ] │    │
│  │ Novidades          [  O===] │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Email                       │    │
│  │ ─────────────────────────── │    │
│  │ Resumo semanal     [  O===] │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### Configurações
```text
┌─────────────────────────────────────┐
│  ← Configurações                    │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ Aparência                   │    │
│  │ ─────────────────────────── │    │
│  │ Tema              Dark   >  │    │
│  │ Idioma            PT-BR  >  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Armazenamento               │    │
│  │ ─────────────────────────── │    │
│  │ Limpar cache         >      │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Conta                       │    │
│  │ ─────────────────────────── │    │
│  │ Baixar meus dados    >      │    │
│  │ Excluir conta        >      │    │
│  └─────────────────────────────┘    │
│                                     │
│  v1.0.0 • subhumano.ia              │
└─────────────────────────────────────┘
```

---

## Padrões de Código

Todas as páginas seguirão o mesmo padrão de `PersonalData.tsx`:
- `AppLayout` como wrapper
- Header com botão voltar (`ArrowLeft`)
- `ProfileFormSection` para agrupar campos
- `motion.div` para animações de entrada
- Hook `useAuth` para verificar autenticação
- Navegação para `/login` se não autenticado
- Toast para feedback de ações
