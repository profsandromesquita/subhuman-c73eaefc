
# Plano de Correção: Páginas de Perfil (Segurança, Notificações e Configurações)

## Diagnóstico Completo

### 1. Página de Segurança (`/profile/security`)

| Item | Status | Problema |
|------|--------|----------|
| Campo "Senha atual" | Não validado | O Supabase permite `updateUser` sem verificar senha atual |
| Troca de senha | Funciona | Mas sem verificação de segurança prévia |

**Código atual problemático (linha 67-69):**
```typescript
const { error } = await supabase.auth.updateUser({
  password: formData.newPassword
});
// A senha atual não é verificada!
```

---

### 2. Página de Notificações (`/profile/notifications`)

| Item | Status | Problema |
|------|--------|----------|
| Push Notifications | Apenas flags | Não há sistema de notificações implementado |
| Email Semanal | Apenas flag | Não há edge function nem serviço de email configurado |
| Persistência | Funciona | Salva corretamente no banco de dados |

**Infraestrutura ausente:**
- `supabase/functions` está vazio (sem edge functions)
- Não há secret `RESEND_API_KEY` configurada
- Não há sistema de push notifications (Web Push API / Service Worker)

---

### 3. Página de Configurações (`/profile/settings`)

| Item | Status | Problema |
|------|--------|----------|
| Tema | Apenas visual | Não há lógica de troca implementada |
| Idioma | Apenas visual | Não há sistema de i18n implementado |
| Limpar cache | Funciona | Remove localStorage exceto auth token |
| Baixar dados | Funciona | Exporta perfil, assinaturas e espaços |

**O que é exportado atualmente:**
```json
{
  "email": "usuario@email.com",
  "profile": { /* todos os campos do perfil */ },
  "subscriptions": [ /* planos de assinatura */ ],
  "spaceSubscriptions": [ /* espaços seguidos */ ],
  "exportedAt": "2026-01-31T..."
}
```

---

## Solução Proposta

### Etapa 1: Corrigir Validação de Senha Atual

**Abordagem:** Criar uma edge function que valida a senha atual usando `signInWithPassword` antes de permitir a alteração.

**Nova Edge Function:** `supabase/functions/verify-password/index.ts`

```typescript
// Recebe email e senha atual
// Tenta fazer login com essas credenciais
// Retorna sucesso/falha sem criar nova sessão
```

**Fluxo corrigido:**
```text
1. Usuário digita senha atual + nova senha
2. Frontend chama edge function verify-password
3. Edge function valida com signInWithPassword
4. Se válido, frontend chama updateUser
5. Se inválido, mostra erro "Senha atual incorreta"
```

---

### Etapa 2: Implementar Sistema de Notificações

#### 2.1 Push Notifications (Navegador)

**Componentes necessários:**
| Componente | Descrição |
|------------|-----------|
| Service Worker | Recebe e exibe notificações |
| Tabela `push_subscriptions` | Armazena endpoints do navegador |
| Edge Function `send-push` | Envia notificações via Web Push API |

**Fluxo:**
```text
1. Usuário ativa notificações
2. Navegador solicita permissão
3. Frontend obtém subscription e salva no banco
4. Ao criar novo post, sistema chama edge function
5. Edge function envia push para assinantes
```

#### 2.2 Email Semanal

**Componentes necessários:**
| Componente | Descrição |
|------------|-----------|
| Secret `RESEND_API_KEY` | Chave da API Resend |
| Edge Function `send-weekly-digest` | Gera e envia resumo |
| Cron Job (pg_cron) | Agenda execução semanal |

**Conteúdo do Email:**
- Top 5 posts da semana nos espaços seguidos
- Novos anúncios do Subhumano
- Resumo de atividades (comentários, menções)

---

### Etapa 3: Tema e Idioma

#### 3.1 Tema

**Decisão de Design:** Conforme o design system do Subhumano, o app é **apenas dark mode**. A opção de tema serve apenas para indicar isso.

**Opções:**
1. **Remover a opção** - Mais simples, evita confusão
2. **Manter como informativo** - Deixar visível que é "Dark" sem interação
3. **Implementar Light Mode** - Requer criar variáveis CSS adicionais

**Recomendação:** Manter apenas informativo com tooltip explicando que o app é exclusivamente dark mode.

#### 3.2 Idioma

**Status atual:** App é exclusivamente em Português (BR).

**Opções:**
1. **Remover a opção** - Mais simples
2. **Manter como informativo** - Indicar o idioma atual
3. **Implementar i18n** - Significativo esforço, requer biblioteca como react-i18next

**Recomendação:** Remover ou manter como informativo, já que i18n é um esforço considerável.

---

## Arquivos a Serem Criados/Modificados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/verify-password/index.ts` | Criar | Valida senha atual |
| `supabase/functions/send-weekly-digest/index.ts` | Criar | Envia email semanal |
| `supabase/functions/send-push/index.ts` | Criar | Envia push notifications |
| `src/pages/profile/Security.tsx` | Modificar | Integrar validação de senha |
| `src/pages/profile/NotificationPreferences.tsx` | Modificar | Adicionar lógica de permissão push |
| `src/pages/profile/Settings.tsx` | Modificar | Clarificar opções de tema/idioma |
| `public/sw.js` | Criar | Service Worker para push |
| Migração SQL | Criar | Tabela `push_subscriptions` |

---

## Migração do Banco de Dados

```sql
-- Tabela para armazenar subscriptions de push notifications
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id);
```

---

## Dependências Externas Necessárias

| Serviço | Uso | Secret Necessária |
|---------|-----|-------------------|
| Resend | Envio de emails | `RESEND_API_KEY` |
| Web Push | Push notifications | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` |

---

## Priorização Sugerida

### Prioridade Alta
1. **Validação de senha atual** - Crítico para segurança

### Prioridade Média  
2. **Clarificar Tema/Idioma** - UX confusa atualmente
3. **Documentar dados exportados** - Transparência

### Prioridade Baixa (Requer Infraestrutura)
4. **Push Notifications** - Requer Service Worker + VAPID
5. **Email Semanal** - Requer Resend API + Cron

---

## Resumo do Que Será Implementado

### Implementação Imediata (Sem Dependências Externas)
1. Validação de senha atual via edge function
2. Clarificar UI de Tema/Idioma (informativo apenas)
3. Adicionar lista detalhada dos dados exportados

### Implementação Futura (Requer Configuração)
4. Push Notifications (requer VAPID keys)
5. Email Semanal (requer Resend API key)

---

## Notas Técnicas

### Validação de Senha - Por que Edge Function?

O Supabase Auth não oferece um método direto para "verificar senha sem criar sessão". A solução é:

```typescript
// Edge function: verify-password
const { error } = await supabase.auth.signInWithPassword({
  email: userEmail,
  password: currentPassword
});

if (error) {
  return new Response(JSON.stringify({ valid: false }), { status: 401 });
}

return new Response(JSON.stringify({ valid: true }), { status: 200 });
```

O frontend então:
1. Chama a edge function primeiro
2. Se válido, chama `supabase.auth.updateUser({ password })`
3. Se inválido, mostra erro antes de tentar alterar

### Cache - O que é limpo?

Atualmente limpa todo o `localStorage` exceto o token de autenticação:
- Dados de navegação em cache
- Preferências locais temporárias
- Estados de UI salvos localmente

### Dados Exportados - Detalhamento

| Dado | Origem | Descrição |
|------|--------|-----------|
| `email` | Auth | Email de login |
| `profile` | profiles | Nome, avatar, bio, localização, profissão, etc. |
| `subscriptions` | subscriptions | Planos pagos (trial, mensal, anual) |
| `spaceSubscriptions` | user_space_subscriptions | Espaços que o usuário segue |
