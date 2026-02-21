
-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  receiver_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- SELECT: user sees own messages
CREATE POLICY "Users can view own messages" ON public.messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- INSERT: user can send messages
CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id AND receiver_id IS NOT NULL);

-- UPDATE: receiver can mark as read
CREATE POLICY "Receiver can mark as read" ON public.messages
  FOR UPDATE USING (auth.uid() = receiver_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Trigger to auto-create notification on new message
CREATE OR REPLACE FUNCTION public.notify_new_message()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  sender_name TEXT;
BEGIN
  SELECT full_name INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
  
  INSERT INTO public.notifications (user_id, sender_id, type, title, message, notification_url)
  VALUES (
    NEW.receiver_id,
    NEW.sender_id,
    'direct_message',
    'Mensagem de ' || COALESCE(sender_name, 'Alguém'),
    LEFT(NEW.content, 100),
    '/messages'
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erro no trigger notify_new_message: % - %', SQLSTATE, SQLERRM;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();
