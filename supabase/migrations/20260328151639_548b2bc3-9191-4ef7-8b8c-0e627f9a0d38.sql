CREATE POLICY "Users can create mention notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND type = 'mention'
  AND user_id IS NOT NULL
);