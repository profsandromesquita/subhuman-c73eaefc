-- Permitir que autores excluam suas próprias publicações
CREATE POLICY "Authors can delete own posts" 
ON public.channel_posts 
FOR DELETE 
TO authenticated 
USING (auth.uid() = author_id);