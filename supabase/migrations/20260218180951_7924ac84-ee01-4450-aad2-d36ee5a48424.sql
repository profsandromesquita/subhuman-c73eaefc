
-- Adicionar coluna sender_id para identificar remetente de mensagens diretas
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Adicionar coluna notification_url para navegação opcional
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS notification_url text;

-- Criar política RLS para usuários enviarem mensagens diretas entre si
CREATE POLICY "Users can send direct messages to others"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IS NOT NULL
  AND sender_id = auth.uid()
  AND type = 'direct_message'
);
