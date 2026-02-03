-- Habilitar extensão pg_net para chamadas HTTP do trigger
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Habilitar extensão pg_cron para agendamento do resumo diário
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Renomear coluna de notify_weekly_email para notify_daily_email
ALTER TABLE public.profiles 
RENAME COLUMN notify_weekly_email TO notify_daily_email;

-- Função que cria notificações in-app e dispara push quando conteúdo é publicado
CREATE OR REPLACE FUNCTION public.notify_space_update_published()
RETURNS TRIGGER AS $$
DECLARE
  space_name TEXT;
  space_slug TEXT;
BEGIN
  -- Somente quando muda para publicado (INSERT com is_published=true OU UPDATE de false para true)
  IF NEW.is_published = true AND (TG_OP = 'INSERT' OR OLD.is_published = false OR OLD.is_published IS NULL) THEN
    
    -- Buscar nome e slug do espaço
    SELECT name, slug INTO space_name, space_slug FROM public.spaces WHERE id = NEW.space_id;
    
    -- Criar notificação in-app para cada usuário inscrito no espaço
    -- Apenas se o usuário tem notify_space_updates = true
    INSERT INTO public.notifications (user_id, title, message, type, space_id)
    SELECT 
      uss.user_id,
      'Novo em ' || COALESCE(space_name, 'Espaço'),
      NEW.title,
      'update',
      NEW.space_id
    FROM public.user_space_subscriptions uss
    INNER JOIN public.profiles p ON p.id = uss.user_id AND p.notify_space_updates = true
    WHERE uss.space_id = NEW.space_id;
    
    -- Chamar edge function para push via pg_net
    -- Passa spaceId para que a edge function envie push para todos os usuários inscritos naquele espaço
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
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger que dispara após INSERT ou UPDATE em space_updates
DROP TRIGGER IF EXISTS on_space_update_published ON public.space_updates;
CREATE TRIGGER on_space_update_published
  AFTER INSERT OR UPDATE ON public.space_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_space_update_published();