-- Política para usuários criarem sua própria assinatura trial
CREATE POLICY "Users can create own trial subscription"
  ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    AND plan_type = 'trial'
  );