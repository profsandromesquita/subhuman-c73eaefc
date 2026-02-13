CREATE POLICY "Authenticated users can view active subscriptions for badges"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (status = 'active');