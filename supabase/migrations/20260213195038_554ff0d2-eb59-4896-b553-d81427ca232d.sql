
-- Criar bucket para capas de eventos
INSERT INTO storage.buckets (id, name, public) VALUES ('event-covers', 'event-covers', true);

-- Politica: admins podem fazer upload
CREATE POLICY "Admins can upload event covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-covers'
  AND public.is_admin_or_moderator(auth.uid())
);

-- Politica: admins podem atualizar
CREATE POLICY "Admins can update event covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-covers'
  AND public.is_admin_or_moderator(auth.uid())
);

-- Politica: admins podem deletar
CREATE POLICY "Admins can delete event covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-covers'
  AND public.is_admin_or_moderator(auth.uid())
);

-- Politica: qualquer pessoa pode ver (bucket publico)
CREATE POLICY "Anyone can view event covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-covers');
