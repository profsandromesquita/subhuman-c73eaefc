-- Tabela para rastrear notificações globais lidas por usuário
CREATE TABLE public.notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- Enable RLS
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own notification reads"
ON public.notification_reads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification reads"
ON public.notification_reads FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification reads"
ON public.notification_reads FOR DELETE
USING (auth.uid() = user_id);