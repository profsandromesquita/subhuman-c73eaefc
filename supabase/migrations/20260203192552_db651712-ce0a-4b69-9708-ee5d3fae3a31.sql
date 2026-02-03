-- Reescrever função do trigger com tratamento de erros robusto
CREATE OR REPLACE FUNCTION public.notify_space_update_published()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  space_name TEXT;
  space_slug TEXT;
  notification_count INTEGER := 0;
BEGIN
  -- Somente quando muda para publicado
  IF NEW.is_published = true AND (TG_OP = 'INSERT' OR OLD.is_published IS DISTINCT FROM true) THEN
    
    -- Buscar nome e slug do espaço
    SELECT name, slug INTO space_name, space_slug 
    FROM public.spaces 
    WHERE id = NEW.space_id;
    
    RAISE NOTICE 'Trigger fired for update % in space % (%)', NEW.id, NEW.space_id, COALESCE(space_name, 'unknown');
    
    -- Criar notificação in-app para cada usuário inscrito
    -- Usando EXISTS em vez de INNER JOIN para evitar falhas silenciosas
    BEGIN
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
        AND COALESCE(p.notify_space_updates, true) = true
      );
      
      GET DIAGNOSTICS notification_count = ROW_COUNT;
      RAISE NOTICE 'Notificações in-app criadas: % para space_id: %', notification_count, NEW.space_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erro ao criar notificações in-app: % - %', SQLSTATE, SQLERRM;
    END;
    
    -- Chamar edge function para push (em bloco separado para não falhar o trigger)
    BEGIN
      PERFORM net.http_post(
        url := 'https://akkbfzfjappludgsrwsw.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra2JmemZqYXBwbHVkZ3Nyd3N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MjAxMzQsImV4cCI6MjA4MzE5NjEzNH0.y1fMM7Nh3UNYL2GItj3tvdNKp3GQDcLB03P166GrpX8'
        ),
        body := jsonb_build_object(
          'title', 'Novo em ' || COALESCE(space_name, 'Espaço'),
          'body', NEW.title,
          'url', '/spaces/' || COALESCE(space_slug, 'home') || '/post/' || NEW.id,
          'spaceId', NEW.space_id
        )
      );
      RAISE NOTICE 'Push notification request sent for space %', NEW.space_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erro ao chamar edge function push: % - %', SQLSTATE, SQLERRM;
    END;
    
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erro geral no trigger notify_space_update_published: % - %', SQLSTATE, SQLERRM;
  RETURN NEW; -- Não falha a transação principal
END;
$function$;

-- Garantir que o trigger existe na tabela space_updates
DROP TRIGGER IF EXISTS on_space_update_published ON public.space_updates;

CREATE TRIGGER on_space_update_published
  AFTER INSERT OR UPDATE OF is_published ON public.space_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_space_update_published();

-- Habilitar realtime na tabela de notificações
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;