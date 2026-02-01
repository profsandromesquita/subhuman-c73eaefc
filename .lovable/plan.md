

# Plano: Sistema de Notificações Push para Subhumano

## Auditoria do Status Atual

### O Que Existe Hoje

| Componente | Status | Descrição |
|------------|--------|-----------|
| Tabela `notifications` | ✅ Existe | Armazena notificações no banco de dados |
| Página `/notifications` | ✅ Existe | Central de notificações in-app |
| Preferências do usuário | ✅ Existe | Colunas `notify_*` na tabela `profiles` |
| Painel admin de envio | ✅ Existe | `/admin/settings/notifications` - envio manual |
| Service Worker | ❌ Não existe | Necessário para Web Push |
| Tabela de push tokens | ❌ Não existe | Armazenar tokens dos dispositivos |
| Edge Function de push | ❌ Não existe | Enviar notificações via Web Push API |
| VAPID Keys | ❌ Não existe | Chaves para autenticação Web Push |
| Trigger automático | ❌ Não existe | Criar notificação ao publicar conteúdo |

### Fluxo Atual (Incompleto)

```text
Admin publica conteúdo
        │
        └── Notificação manual (se lembrar) via painel admin
                │
                └── INSERT na tabela notifications
                        │
                        └── Usuário vê apenas quando abre o app
```

**Problema**: Usuários só veem notificações ao abrir o app. Não há push real para o dispositivo.

## Arquitetura da Solução

### Novo Fluxo Proposto

```text
Admin publica conteúdo (space_updates)
        │
        ▼
Trigger de banco de dados
        │
        └── INSERT automático em notifications
                │
                ▼
        Edge Function send-push-notification
                │
                ├── Busca tokens dos usuários interessados
                │   (baseado em user_space_subscriptions + preferências)
                │
                └── Envia Web Push para cada dispositivo
                        │
                        ▼
                Celular recebe notificação push
                        │
                        └── Usuário clica → Abre o app no conteúdo
```

### Componentes a Implementar

| # | Componente | Tipo | Prioridade |
|---|------------|------|------------|
| 1 | Tabela `push_subscriptions` | Migração SQL | Alta |
| 2 | Service Worker (`sw.js`) | Arquivo público | Alta |
| 3 | Hook `usePushNotifications` | React Hook | Alta |
| 4 | Edge Function `send-push-notification` | Backend | Alta |
| 5 | VAPID Keys | Secrets | Alta |
| 6 | Trigger `on_space_update_published` | Migração SQL | Média |
| 7 | Componente de permissão push | UI | Média |
| 8 | Atualização do painel admin | UI | Baixa |

## Implementação Detalhada

### 1. Tabela `push_subscriptions`

Nova tabela para armazenar os tokens de push de cada dispositivo:

```sql
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  device_info jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Index para busca eficiente
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);
```

### 2. Service Worker (`public/sw.js`)

Arquivo que será registrado no navegador do usuário:

```javascript
// Escuta push events
self.addEventListener('push', function(event) {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      notificationId: data.notificationId
    },
    actions: [
      { action: 'open', title: 'Ver' },
      { action: 'close', title: 'Fechar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Quando usuário clica na notificação
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'close') return;
  
  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      // Se já tem uma aba aberta, foca nela
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Senão, abre nova aba
      return clients.openWindow(urlToOpen);
    })
  );
});
```

### 3. Hook `usePushNotifications`

Hook React para gerenciar permissões e registro:

```typescript
// src/hooks/usePushNotifications.ts
export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Verificar estado atual
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    checkSubscription();
  }, [user]);

  // Solicitar permissão e registrar
  const subscribe = async () => {
    setLoading(true);
    try {
      // 1. Solicitar permissão
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission !== 'granted') return false;

      // 2. Registrar Service Worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // 3. Criar subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // 4. Salvar no banco
      const { endpoint, keys } = subscription.toJSON();
      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        device_info: { userAgent: navigator.userAgent }
      });

      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { permission, isSubscribed, subscribe, loading };
}
```

### 4. Edge Function `send-push-notification`

Backend que envia as notificações via Web Push:

```typescript
// supabase/functions/send-push-notification/index.ts
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:contato@subhumano.ia.br',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
);

Deno.serve(async (req) => {
  const { title, body, url, userIds, spaceId } = await req.json();

  // Buscar subscriptions dos usuários alvo
  let query = supabase
    .from('push_subscriptions')
    .select('*, profiles!inner(notify_space_updates)');

  if (userIds) {
    query = query.in('user_id', userIds);
  } else if (spaceId) {
    // Buscar usuários inscritos no espaço
    const { data: subscribers } = await supabase
      .from('user_space_subscriptions')
      .select('user_id')
      .eq('space_id', spaceId);
    
    const subscriberIds = subscribers?.map(s => s.user_id) || [];
    query = query.in('user_id', subscriberIds);
  }

  const { data: subscriptions } = await query
    .eq('profiles.notify_space_updates', true);

  // Enviar push para cada subscription
  const results = await Promise.allSettled(
    (subscriptions || []).map(sub => 
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, url })
      )
    )
  );

  return new Response(JSON.stringify({ sent: results.length }));
});
```

### 5. VAPID Keys

Chaves de autenticação para Web Push. Precisam ser geradas e armazenadas como secrets:

| Secret | Descrição |
|--------|-----------|
| `VAPID_PUBLIC_KEY` | Chave pública (usada no frontend também) |
| `VAPID_PRIVATE_KEY` | Chave privada (apenas no backend) |
| `VAPID_SUBJECT` | Email de contato (`mailto:contato@subhumano.ia.br`) |

### 6. Trigger Automático

Trigger que dispara notificação quando conteúdo é publicado:

```sql
CREATE OR REPLACE FUNCTION notify_on_space_update_published()
RETURNS TRIGGER AS $$
BEGIN
  -- Só notifica se mudou para publicado
  IF NEW.is_published = true AND (OLD.is_published = false OR OLD IS NULL) THEN
    -- Insere notificação broadcast
    INSERT INTO notifications (title, message, type, space_id)
    VALUES (
      NEW.title,
      'Nova atualização disponível',
      'update',
      NEW.space_id
    );
    
    -- Chama edge function para enviar push
    PERFORM net.http_post(
      url := 'https://akkbfzfjappludgsrwsw.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_key')
      ),
      body := jsonb_build_object(
        'title', NEW.title,
        'body', 'Nova atualização no espaço',
        'url', '/spaces/' || (SELECT slug FROM spaces WHERE id = NEW.space_id),
        'spaceId', NEW.space_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_space_update_published
  AFTER INSERT OR UPDATE ON space_updates
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_space_update_published();
```

### 7. Componente de Permissão Push

Banner que aparece para solicitar permissão:

```tsx
// src/components/PushPermissionBanner.tsx
export function PushPermissionBanner() {
  const { permission, subscribe, loading } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  // Não mostra se já tem permissão ou foi dispensado
  if (permission === 'granted' || dismissed) return null;

  return (
    <motion.div className="fixed top-4 left-4 right-4 bg-card border rounded-xl p-4 z-50">
      <div className="flex items-start gap-3">
        <Bell className="w-6 h-6 text-foreground" />
        <div className="flex-1">
          <h3 className="font-semibold">Ative as notificações</h3>
          <p className="text-sm text-muted-foreground">
            Receba alertas quando novos conteúdos forem publicados nos seus espaços favoritos.
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Button onClick={subscribe} disabled={loading}>
          {loading ? 'Ativando...' : 'Ativar notificações'}
        </Button>
        <Button variant="ghost" onClick={() => setDismissed(true)}>
          Agora não
        </Button>
      </div>
    </motion.div>
  );
}
```

### 8. Atualização do Painel Admin

Modificar `/admin/settings/notifications` para mostrar status de push:

- Exibir quantos usuários têm push ativado
- Opção de enviar push junto com notificação in-app
- Preview da notificação push

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `public/sw.js` | Criar |
| `src/hooks/usePushNotifications.ts` | Criar |
| `src/components/PushPermissionBanner.tsx` | Criar |
| `supabase/functions/send-push-notification/index.ts` | Criar |
| `src/pages/Home.tsx` | Modificar (adicionar banner) |
| `src/pages/admin/settings/Notifications.tsx` | Modificar |
| `src/main.tsx` | Modificar (registrar SW) |
| Migração SQL | Criar tabela + trigger |

## Fluxo de Experiência do Usuário

```text
Usuário abre o app pela primeira vez
        │
        ▼
Vê banner "Ative as notificações"
        │
        ├── Clica "Ativar" → Browser pede permissão → Ativo ✓
        │
        └── Clica "Agora não" → Banner some (pode ativar depois em Configurações)
```

## Seção Técnica

### Por que Web Push?

| Alternativa | Prós | Contras |
|-------------|------|---------|
| **Web Push (escolhido)** | Funciona em PWA instalado, gratuito, sem SDK externo | Requer SW, não funciona em Safari iOS < 16.4 |
| Firebase Cloud Messaging | SDK robusto, histórico de mensagens | Dependência externa, configuração complexa |
| OneSignal | Fácil setup | Pago para volume, dados em terceiro |

### Limitações Importantes

1. **iOS Safari < 16.4**: Web Push não funciona. Usuários precisam instalar o PWA via "Adicionar à Tela de Início"
2. **Permissão negada**: Se usuário negar, só pode mudar nas configurações do browser
3. **Background sync**: Dispositivo precisa estar conectado para receber

### Dependências Necessárias

Para a Edge Function:
```toml
[functions.send-push-notification]
verify_jwt = false
```

Biblioteca web-push será importada via Deno no edge function.

### Segurança

- VAPID keys são secrets e nunca expostas no frontend (exceto public key)
- Edge function valida que apenas admins/triggers podem enviar
- RLS garante que usuários só gerenciam suas próprias subscriptions

## Ordem de Implementação

1. **Fase 1 - Infraestrutura** (Essencial)
   - Gerar VAPID keys e adicionar como secrets
   - Criar tabela `push_subscriptions`
   - Criar Service Worker
   - Criar hook `usePushNotifications`

2. **Fase 2 - Backend** (Envio)
   - Criar edge function `send-push-notification`
   - Criar trigger no banco para publicações

3. **Fase 3 - UX** (Adoção)
   - Adicionar banner de permissão
   - Atualizar painel admin
   - Opção de ativar/desativar nas preferências

## Resultado Esperado

Após implementação:
- Usuários com push ativado receberão notificação no celular quando novo conteúdo for publicado nos espaços que seguem
- Notificação clicável que abre diretamente no conteúdo
- Admin pode enviar notificações manuais que também chegam como push
- Respeito às preferências de notificação do usuário

