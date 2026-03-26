CREATE POLICY "Anyone can count saves"
ON public.saved_updates FOR SELECT TO public USING (true);