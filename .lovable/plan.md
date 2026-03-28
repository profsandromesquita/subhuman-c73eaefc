

# Plano: Correção de navegação em notificações de menção

## Resumo

3 arquivos alterados + 1 migration RLS. Corrige o bug de clique sem navegação e popula `notification_url` + `sender_id` no insert.

**Descoberta crítica:** A tabela `notifications` só permite INSERT por admins ou para `type = 'direct_message'`. Notificações de menção criadas por usuários comuns **falham silenciosamente**. É necessária uma nova policy RLS.

---

## Etapa 1 — Migration: policy INSERT para menções

```sql
CREATE POLICY "Users can create mention notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND type = 'mention'
  AND user_id IS NOT NULL
);
```

Sem isso, apenas admins conseguem inserir notificações de menção.

---

## Etapa 2 — `src/hooks/useNotifications.ts`

### 2.1 — Adicionar `notification_url` ao tipo e select

**Interface (linha 6-17):**
```typescript
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  space_id: string | null;
  space_name?: string;
  space_slug?: string;
  isGlobal?: boolean;
  notification_url: string | null;  // NOVO
}
```

**Select (linha 93-96):** adicionar `notification_url`
```
id, type, title, message, is_read, created_at, space_id, user_id, notification_url,
spaces(name, slug)
```

**Map (linha 122-133):** adicionar campo
```typescript
notification_url: n.notification_url || null,
```

---

## Etapa 3 — `src/pages/Notifications.tsx`

### 3.1 — Importar `At` do Phosphor e adicionar ao iconMap

```typescript
import { 
  Bell, TrendUp, ChatCircle, Megaphone, EnvelopeSimple, Check, At, IconProps
} from "@phosphor-icons/react";

const iconMap: Record<string, PhosphorIcon> = {
  update: Bell,
  channel: ChatCircle,
  announcement: Megaphone,
  trending: TrendUp,
  info: Bell,
  direct_message: EnvelopeSimple,
  mention: At,  // NOVO
};
```

### 3.2 — Refatorar `handleNotificationClick`

```typescript
const handleNotificationClick = async (notification: typeof notifications[0]) => {
  if (!notification.is_read) {
    try {
      await markRead.mutateAsync({ 
        notificationId: notification.id, 
        isGlobal: notification.isGlobal 
      });
    } catch { /* ignore */ }
  }

  // 1. notification_url como critério prioritário
  if (notification.notification_url) {
    const url = notification.notification_url;
    if (url.startsWith("/")) {
      navigate(url);
      return;
    }
    // Extrair path de URLs absolutas do domínio
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes("subhumano")) {
        navigate(parsed.pathname);
        return;
      }
    } catch { /* não é URL válida */ }
  }

  // 2. Fallbacks por tipo (lógica existente)
  if (notification.type === "update" && notification.space_slug) {
    navigate(`/spaces/${notification.space_slug}`);
  } else if (notification.type === "update" && notification.space_id) {
    navigate(`/spaces`);
  } else if (notification.type === "channel") {
    navigate(`/canais`);
  }
};
```

---

## Etapa 4 — `src/hooks/useMentions.ts`

### 4.1 — Adicionar `notificationUrl` à interface

```typescript
interface MentionData {
  mentionedUserId?: string;
  mentionedCompanyId?: string;
  contextType: string;
  contextId: string;
  notificationUrl?: string;  // NOVO
}
```

### 4.2 — Popular `notification_url` e `sender_id` no insert

```typescript
const notifications = mentions
  .filter((m) => m.mentionedUserId)
  .map((m) => ({
    user_id: m.mentionedUserId!,
    sender_id: user.id,
    title: "Você foi mencionado",
    message: "Alguém mencionou você em uma publicação",
    type: "mention",
    notification_url: m.notificationUrl || null,
  }));
```

### 4.3 — Atualizar chamadores

**PostDetail.tsx (linha 161-168):** adicionar `notificationUrl: window.location.pathname`
```typescript
createMentions.mutate(
  mentions.map((m) => ({
    mentionedUserId: m.type === "user" ? m.id : undefined,
    mentionedCompanyId: m.type === "company" ? m.id : undefined,
    contextType: "update_comment",
    contextId: postId,
    notificationUrl: window.location.pathname,
  }))
);
```

**ChannelPostDetail.tsx (linha 205-212):** adicionar `notificationUrl: window.location.pathname`
```typescript
createMentions.mutate(
  mentions.map((m) => ({
    mentionedUserId: m.type === "user" ? m.id : undefined,
    mentionedCompanyId: m.type === "company" ? m.id : undefined,
    contextType: "channel_comment",
    contextId: commentData.id,
    notificationUrl: window.location.pathname,
  }))
);
```

---

## Arquivos alterados

1. Migration SQL — nova policy INSERT para menções
2. `src/hooks/useNotifications.ts` — tipo + select + map
3. `src/pages/Notifications.tsx` — ícone `At` + handler refatorado
4. `src/hooks/useMentions.ts` — interface + insert com `notification_url`/`sender_id`
5. `src/pages/PostDetail.tsx` — passa `notificationUrl`
6. `src/pages/ChannelPostDetail.tsx` — passa `notificationUrl`

## Não alterado

- Tabela notifications (schema)
- Edge Functions
- Triggers SQL
- Sistema de detecção de menções

