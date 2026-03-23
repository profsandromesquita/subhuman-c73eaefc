
-- ============================================
-- OPERAÇÃO 2: Criar tabela event_materials
-- ============================================

CREATE TABLE public.event_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('video', 'ebook', 'photo', 'slide')),
  title text NOT NULL,
  description text,
  url text NOT NULL,
  thumbnail_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_materials_event_id ON public.event_materials(event_id);
CREATE INDEX idx_event_materials_type ON public.event_materials(event_id, type);

CREATE TRIGGER update_event_materials_updated_at
  BEFORE UPDATE ON public.event_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- OPERAÇÃO 3: RLS na event_materials
-- ============================================

ALTER TABLE public.event_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view materials of published events"
  ON public.event_materials FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_materials.event_id
    AND events.is_published = true AND events.is_active = true
  ));

CREATE POLICY "Admins can insert event materials"
  ON public.event_materials FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can update event materials"
  ON public.event_materials FOR UPDATE TO authenticated
  USING (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can delete event materials"
  ON public.event_materials FOR DELETE TO authenticated
  USING (public.is_admin_or_moderator(auth.uid()));
