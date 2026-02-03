
# Plano: Sistema Completo de Notificacoes do Subhumano

## Diagnostico do Problema

### Situacao Atual

| Componente | Status | Problema |
|------------|--------|----------|
| Edge Function `send-push-notification` | Existe | Nunca e chamada automaticamente |
| Tabela `notifications` | Existe | Apenas 1 registro manual |
| Triggers de banco | Nao existe | Nenhum trigger configurado |
| Email de resumo diario | Nao existe | Nao ha edge function nem RESEND_API_KEY |
| Push subscriptions | 4 dispositivos | Registros existem mas nunca recebem push automatico |

### Causa Raiz

Quando um administrador publica conteudo em `SpaceContent.tsx`, apenas o registro e salvo na tabela `space_updates`. Nao ha nenhum mecanismo que:

1. Crie notificacoes in-app na tabela `notifications`
2. Dispare push notifications para usuarios inscritos no espaco
3. Acumule dados para o resumo diario por email

## Arquitetura Proposta

```text
                          PUBLICACAO DE CONTEUDO
                                   |
                                   v
                     +-------------------------+
                     |     space_updates       |
                     |  (is_published = true)  |
                     +-------------------------+
                                   |
                    trigger: after_space_update_published
                                   |
                    +--------------+--------------+
                    |                             |
                    v                             v
    +---------------------------+   +---------------------------+
    |   1. Notificacao In-App   |   |   2. Push Notification    |
    |---------------------------|   |---------------------------|
    | INSERT INTO notifications |   | Chama edge function       |
    | para cada usuario         |   | send-push-notification    |
    | inscrito no espaco        |   | com spaceId               |
    +---------------------------+   +---------------------------+

                          RESUMO DIARIO (18h)
                                   |
                                   v
                     +-------------------------+
                     |   Cron Job (pg_cron)    |
                     |   18:00 UTC-3 diario    |
                     +-------------------------+
                                   |
                                   v
                     +-------------------------+
                     | Edge Function:          |
                     | send-daily-digest       |
                     +-------------------------+
                                   |
                    +--------------+--------------+
                    |                             |
                    v                             v
         +------------------+         +------------------+
         | Email via Resend |         | Push Notification|
         | (resumo do dia)  |         | (resumo do dia)  |
         +------------------+         +------------------+
```

## Mudancas Necessarias

### 1. Criar Trigger no Banco de Dados

**Arquivo**: Nova migration SQL

Funcao e trigger que disparam quando um `space_update` e publicado:

```sql
-- Funcao que cria notificacoes e chama push
CREATE OR REPLACE FUNCTION notify_space_update_published()
RETURNS TRIGGER AS $$
DECLARE
  space_name TEXT;
  subscriber_record RECORD;
BEGIN
  -- Somente quando muda para publicado
  IF NEW.is_published = true AND (OLD.is_published = false OR OLD.is_published IS NULL) THEN
    
    -- Buscar nome do espaco
    SELECT name INTO space_name FROM spaces WHERE id = NEW.space_id;
    
    -- Criar notificacao in-app para cada usuario inscrito no espaco
    INSERT INTO notifications (user_id, title, message, type, space_id)
    SELECT 
      uss.user_id,
      'Novo em ' || COALESCE(space_name, 'Espaco'),
      NEW.title,
      'update',
      NEW.space_id
    FROM user_space_subscriptions uss
    INNER JOIN profiles p ON p.id = uss.user_id AND p.notify_space_updates = true
    WHERE uss.space_id = NEW.space_id;
    
    -- Chamar edge function para push via pg_net
    PERFORM net.http_post(
      url := 'https://akkbfzfjappludgsrwsw.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
      ),
      body := jsonb_build_object(
        'title', 'Novo em ' || COALESCE(space_name, 'Espaco'),
        'body', NEW.title,
        'url', '/spaces/' || (SELECT slug FROM spaces WHERE id = NEW.space_id) || '/post/' || NEW.id,
        'spaceId', NEW.space_id
      )
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER on_space_update_published
  AFTER INSERT OR UPDATE ON space_updates
  FOR EACH ROW
  EXECUTE FUNCTION notify_space_update_published();
```

### 2. Habilitar Extensao pg_net

**Arquivo**: Nova migration SQL

```sql
-- Habilitar extensao para chamadas HTTP do banco
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

### 3. Criar Edge Function para Resumo Diario

**Arquivo**: `supabase/functions/send-daily-digest/index.ts`

Nova edge function que:
- Busca todos os `space_updates` publicados nas ultimas 24h
- Agrupa por espaco
- Para cada usuario com espacos inscritos:
  - Envia email com resumo (se notify_weekly_email = true)
  - Envia push com resumo (se tem subscription ativa)

### 4. Configurar RESEND_API_KEY

Sera necessario configurar a secret `RESEND_API_KEY` para envio de emails.

### 5. Configurar Cron Job para 18h

**Arquivo**: SQL a executar manualmente

```sql
SELECT cron.schedule(
  'daily-digest-18h',
  '0 21 * * *', -- 18:00 BRT = 21:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://akkbfzfjappludgsrwsw.supabase.co/functions/v1/send-daily-digest',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

### 6. Atualizar Preferencias de Notificacao

**Arquivo**: `src/pages/profile/NotificationPreferences.tsx`

Alterar label de "Resumo semanal" para "Resumo diario as 18h" e atualizar a coluna no banco de `notify_weekly_email` para `notify_daily_email`.

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/send-daily-digest/index.ts` | Criar |
| `src/pages/profile/NotificationPreferences.tsx` | Modificar label |
| Migration: habilitar pg_net | Criar |
| Migration: criar trigger | Criar |
| Migration: renomear coluna | Criar |

## Pre-requisitos

1. **Configurar RESEND_API_KEY** - Usuario precisa criar conta em resend.com e fornecer a chave
2. **Habilitar pg_cron** - Necessario para agendamento do resumo diario

## Resultado Esperado

### Notificacao Imediata (ao publicar)

1. Admin publica conteudo no espaco "Produtividade"
2. Trigger dispara automaticamente
3. Usuarios inscritos em "Produtividade" recebem:
   - Notificacao in-app (tabela `notifications`)
   - Push notification no celular/desktop

### Resumo Diario (18h)

1. Cron job executa as 18h
2. Edge function busca atualizacoes das ultimas 24h
3. Para cada usuario com espacos inscritos:
   - Se `notify_daily_email = true`: envia email
   - Se tem push subscription: envia push consolidado
