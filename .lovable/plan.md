
# Interações entre Usuários: Mensagem Privada e Notificação Admin

## Diagnóstico da Arquitetura Atual

Após auditoria completa, o sistema possui:
- Tabela `notifications` com campo `user_id` nullable — suporta notificações individuais (user_id preenchido) e broadcast (user_id null)
- Admin já envia notificações broadcast via `/admin/settings/notifications`
- Edge function `send-daily-digest` usa Resend para envio de email com template HTML dark
- A tabela `profiles` possui campos `instagram_url`, `linkedin_url`, `website` — mas **não existe tabela de mensagens diretas**
- O `AuthorModal` exibe perfil mas não tem ação de mensagem
- A página `/admin/users` gerencia usuários mas **não tem ação de enviar notificação individual**

## Escopo da Implementação

### Parte 1 — Botão "Enviar Mensagem" no AuthorModal
Ao clicar, abre um mini formulário dentro do modal onde o usuário escreve uma mensagem curta. Ao enviar, a mensagem é entregue ao destinatário como **notificação in-app** do tipo `"direct_message"`, aparecendo na central de notificações dele com o nome do remetente e o texto.

> Justificativa: Não há infraestrutura de chat em tempo real (sem tabela de mensagens). A forma mais pragmática e coerente com a arquitetura existente é usar o sistema de notificações já funcional. O destinatário vê a mensagem em `/notifications`. Isso evita criar um sistema de chat complexo mantendo a entrega imediata via Realtime já configurado.

### Parte 2 — Notificação Privada Admin → Usuário
No painel `/admin/users`, adicionar opção "Notificar usuário" no menu de ações (dropdown). Abre um dialog com formulário para título, mensagem e toggle de email. Ao enviar: insere notificação individual na tabela e, opcionalmente, dispara email via Edge Function nova `send-user-notification`.

---

## Plano Técnico Detalhado

### Banco de Dados — Migração

Adicionar coluna `sender_id` na tabela `notifications` para identificar o remetente de mensagens diretas:

```sql
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS notification_url text;
```

Adicionar o novo tipo `direct_message` não requer ALTER TYPE (o campo `type` é `text`, não enum).

Atualizar a política RLS de INSERT na tabela `notifications` para permitir que usuários autenticados insiram notificações direcionadas a outros usuários (com `sender_id = auth.uid()`):

```sql
CREATE POLICY "Users can send direct messages to others"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IS NOT NULL        -- deve ter destinatário específico
  AND sender_id = auth.uid() -- remetente = usuário logado
  AND type = 'direct_message'
);
```

### Nova Edge Function: `send-user-notification`

**Arquivo**: `supabase/functions/send-user-notification/index.ts`

Responsabilidade: receber `{ user_id, title, message, send_email }` e:
1. Inserir notificação individual via service_role (contornando RLS)
2. Se `send_email = true`: buscar email do usuário em `auth.users` e enviar via Resend com template HTML igual ao do daily-digest (dark, com branding Subhumano)

Esta função é protegida por JWT e valida que o chamador é admin/moderador.

### Parte 1 — AuthorModal com Mensagem Direta

**Arquivo modificado**: `src/components/post/AuthorModal.tsx`

Adicionar ao componente:
- `useAuth()` para verificar se o usuário está logado e não está vendo o próprio perfil
- Estado `showMessageForm` (boolean) e `messageText` (string)
- Botão "Enviar mensagem" estilo secondary, visível apenas para usuários logados que NÃO são o próprio perfil
- Quando `showMessageForm = true`, exibe um `Textarea` + botão "Enviar" + botão "Cancelar"
- Ao enviar: faz INSERT direto em `notifications` via `supabase.from('notifications').insert(...)` com `type: 'direct_message'`, `user_id: author.id`, `sender_id: user.id`, `title: "Mensagem de [seu nome]"`, `message: messageText`
- Toast de sucesso "Mensagem enviada!" e fecha o formulário

Fluxo visual no modal:

```
[Avatar] [Nome] [Badge]
[Bio / Educação]
[Redes Sociais]

--- separador ---
[Textarea: "Escreva uma mensagem..."]
[Cancelar]  [Enviar mensagem]
```

**Comportamento**:
- Botão "Enviar mensagem" → aparece abaixo das redes sociais
- Texto máx. 500 caracteres (validação client-side)
- Usuário não logado → não exibe o botão
- Usuário vendo o próprio perfil → não exibe o botão
- Estado de loading no botão durante o envio

**Notificação recebida**: O destinatário vê na central de avisos:
- Ícone: `EnvelopeSimple` (novo mapeamento no `Notifications.tsx`)
- Título: "Mensagem de [Nome do Remetente]"
- Mensagem: "[texto da mensagem]"
- Não navega para nenhuma rota ao clicar (apenas marca como lida)

### Parte 2 — Admin: Notificação Privada para Usuário

**Arquivo modificado**: `src/pages/admin/Users.tsx`

Adicionar ao dropdown de ações de cada usuário:
- Nova opção: "Notificar usuário" (ícone `Bell`)

Adicionar novo Dialog `showNotifyDialog`:
- Campo título (Input, obrigatório)
- Campo mensagem (Textarea, opcional)
- Toggle "Enviar também por email" (Switch) — igual ao padrão existente em NotificationSettings
- Botão "Enviar notificação"

Ao submeter: chama `supabase.functions.invoke('send-user-notification', { body: { user_id, title, message, send_email } })`

**Arquivo modificado**: `src/pages/admin/settings/Notifications.tsx`

Adicionar aba ou seção separada para "Notificações Individuais", com histórico das notificações `type = 'direct_message'` ou enviadas pelo admin com `user_id` preenchido. (opcional — melhoria de UX no admin)

### Atualização da Central de Notificações

**Arquivo modificado**: `src/pages/Notifications.tsx`

Adicionar ao `iconMap`:
```typescript
direct_message: EnvelopeSimple,
```

Importar `EnvelopeSimple` do `@phosphor-icons/react`.

O clique numa notificação `direct_message` apenas marca como lida (sem navegação), diferente das notificações de conteúdo.

---

## Resumo de Arquivos

| Arquivo | Ação | Descrição |
|---|---|---|
| Migração SQL | Criar | Coluna `sender_id` e `notification_url` em `notifications` + política RLS de insert para usuários |
| `supabase/functions/send-user-notification/index.ts` | Criar | Edge Function para envio de notificação individual com email opcional via Resend |
| `supabase/config.toml` | Editar | Registrar nova função com `verify_jwt = false` (valida internamente) |
| `src/components/post/AuthorModal.tsx` | Editar | Botão + formulário de mensagem direta para usuário logado |
| `src/pages/admin/Users.tsx` | Editar | Opção "Notificar usuário" no dropdown + Dialog com formulário |
| `src/pages/Notifications.tsx` | Editar | Adicionar ícone e handler para tipo `direct_message` |

## Fluxo Completo

**Mensagem entre usuários:**
```
Usuário A abre AuthorModal do Usuário B
→ Clica em "Enviar mensagem"
→ Preenche texto e clica "Enviar"
→ INSERT em notifications (type=direct_message, user_id=B, sender_id=A)
→ Realtime notifica Usuário B
→ B vê na central: "Mensagem de [Nome de A]" com o texto
```

**Notificação admin → usuário:**
```
Admin abre /admin/users
→ Clica em "..." no usuário X → "Notificar usuário"
→ Preenche título + mensagem + toggle de email
→ Chama Edge Function send-user-notification
→ Function insere notificação individual (user_id=X)
→ Se email: busca email em auth.users e envia via Resend
→ Usuário X recebe in-app (Realtime) e/ou email
```
