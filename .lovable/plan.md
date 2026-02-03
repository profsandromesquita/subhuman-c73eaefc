
# Plano de Correção: Sistema de Notificações

## Problemas Identificados

Após investigação completa, encontrei **2 problemas críticos**:

### Problema 1: Notificações In-App Não Estão Sendo Criadas

**Evidência:**
- 19 atualizações publicadas nas últimas 24 horas
- ZERO notificações criadas (apenas 1 notificação de teste manual)

**Causa Raiz:**
O trigger `notify_space_update_published` não está inserindo as notificações. Ao analisar a função, identifiquei que ela depende de um JOIN complexo com `profiles` e `user_space_subscriptions`, e o trigger pode estar falhando silenciosamente (sem log de erro visível).

### Problema 2: Push Notifications Falhando com Erro de Chave

**Evidência dos logs:**
```
DOMExceptionDataError: expected valid PKCS#8 data
```

**Causa Raiz:**
A edge function `send-push-notification` implementa a criptografia VAPID manualmente, esperando que `VAPID_PRIVATE_KEY` esteja em formato PKCS#8. No entanto, chaves VAPID geradas por ferramentas padrão (como `web-push generate-vapid-keys`) estão em formato raw EC (65 bytes base64 URL-safe), não PKCS#8.

---

## Plano de Correção

### Fase 1: Corrigir Notificações In-App

#### 1.1 Reescrever o Trigger com Tratamento de Erros

O trigger atual pode estar falhando silenciosamente. Vou reescrevê-lo com:
- Logs detalhados usando `RAISE NOTICE`
- Tratamento de exceções com `EXCEPTION WHEN OTHERS`
- Separação do INSERT de notificações do HTTP call

**SQL Migration:**
```sql
CREATE OR REPLACE FUNCTION public.notify_space_update_published()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  space_name TEXT;
  space_slug TEXT;
  notification_count INTEGER;
BEGIN
  -- Somente quando muda para publicado
  IF NEW.is_published = true AND (TG_OP = 'INSERT' OR OLD.is_published IS DISTINCT FROM true) THEN
    
    -- Buscar nome e slug do espaço
    SELECT name, slug INTO space_name, space_slug 
    FROM public.spaces 
    WHERE id = NEW.space_id;
    
    -- Criar notificação in-app para cada usuário inscrito (sem join complexo que pode falhar)
    INSERT INTO public.notifications (user_id, title, message, type, space_id)
    SELECT 
      uss.user_id,
      'Novo em ' || COALESCE(space_name, 'Espaço'),
      NEW.title,
      'update',
      NEW.space_id
    FROM public.user_space_subscriptions uss
    WHERE uss.space_id = NEW.space_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = uss.user_id 
      AND p.notify_space_updates = true
    );
    
    GET DIAGNOSTICS notification_count = ROW_COUNT;
    RAISE NOTICE 'Notificações criadas: % para space_id: %', notification_count, NEW.space_id;
    
    -- Chamar edge function para push (em bloco separado para não falhar o trigger)
    BEGIN
      PERFORM net.http_post(
        url := 'https://akkbfzfjappludgsrwsw.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        ),
        body := jsonb_build_object(
          'title', 'Novo em ' || COALESCE(space_name, 'Espaço'),
          'body', NEW.title,
          'url', '/spaces/' || COALESCE(space_slug, 'home') || '/post/' || NEW.id,
          'spaceId', NEW.space_id
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erro ao chamar edge function: %', SQLERRM;
    END;
    
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erro no trigger notify_space_update_published: %', SQLERRM;
  RETURN NEW; -- Não falha a transação principal
END;
$function$
```

### Fase 2: Corrigir Push Notifications (Chave VAPID)

#### 2.1 Substituir Implementação Manual por Biblioteca `web-push`

A implementação manual de criptografia Web Push é complexa e propensa a erros. Vou substituir por uma abordagem que use `web-push` como biblioteca ou que converta a chave corretamente.

**Nova Edge Function `send-push-notification`:**
- Usar a biblioteca `web-push` via npm/esm
- Ou converter a chave raw EC para formato JWK antes de assinar

```typescript
// Usar biblioteca web-push para Deno
import webpush from "npm:web-push@3.6.7";

// Configurar VAPID
webpush.setVapidDetails(
  'mailto:contato@subhumano.ia.br',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
);

// Enviar notificação
await webpush.sendNotification(
  { endpoint, keys: { p256dh, auth } },
  JSON.stringify(payload)
);
```

### Fase 3: Adicionar Realtime para Atualização Imediata

#### 3.1 Configurar Realtime na Tabela de Notificações

Para que as notificações apareçam instantaneamente na página `/notifications` sem refresh:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

#### 3.2 Adicionar Subscription Realtime no Hook

**Arquivo: `src/hooks/useNotifications.ts`**

Adicionar listener de realtime para invalidar cache quando novas notificações chegarem:

```typescript
useEffect(() => {
  if (!user) return;
  
  const channel = supabase
    .channel('notifications-realtime')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'notifications' },
      () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      }
    )
    .subscribe();
  
  return () => { supabase.removeChannel(channel); };
}, [user, queryClient]);
```

---

## Resumo das Alterações

| Arquivo/Recurso | Alteração |
|-----------------|-----------|
| **Migration SQL** | Reescrever função `notify_space_update_published` com tratamento de erros |
| **Migration SQL** | Habilitar realtime na tabela `notifications` |
| `supabase/functions/send-push-notification/index.ts` | Substituir implementação manual de VAPID por biblioteca `web-push` |
| `src/hooks/useNotifications.ts` | Adicionar subscription realtime para atualização instantânea |

## Ordem de Execução

1. **Primeiro**: Corrigir a edge function (push notifications)
2. **Segundo**: Atualizar o trigger do banco
3. **Terceiro**: Habilitar realtime
4. **Quarto**: Atualizar o hook com realtime
5. **Testar**: Publicar uma atualização e verificar se notificações aparecem

## Resultado Esperado

Após implementação:
- Notificações in-app serão criadas automaticamente quando conteúdo for publicado
- Notificações push serão enviadas corretamente para celulares/desktop
- A página `/notifications` atualizará em tempo real sem refresh
