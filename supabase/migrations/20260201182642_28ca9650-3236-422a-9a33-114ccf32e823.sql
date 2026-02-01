-- Tabela para armazenar tokens de push notification
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  device_info jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Index para busca eficiente por user_id
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Habilitar RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: usuários podem gerenciar suas próprias subscriptions
CREATE POLICY "Users can manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: admins podem ver todas as subscriptions (para estatísticas)
CREATE POLICY "Admins can view all push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (is_admin_or_moderator(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();