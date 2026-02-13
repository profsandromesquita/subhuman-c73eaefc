
-- =============================================
-- FASE 0: Tabelas de Eventos para Funil de Vendas
-- =============================================

-- Tabela principal de eventos
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'workshop',
  modality TEXT NOT NULL DEFAULT 'online',
  price NUMERIC(10,2) DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT false,
  cover_url TEXT,
  location TEXT,
  max_participants INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_published BOOLEAN NOT NULL DEFAULT false,
  checkout_url TEXT,
  ticto_offer_id TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  slug TEXT NOT NULL DEFAULT ''
);

-- Sessões/datas do evento
CREATE TABLE public.event_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  session_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compras/inscrições de eventos por usuário
CREATE TABLE public.event_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  external_id TEXT,
  UNIQUE(user_id, event_id)
);

-- =============================================
-- RLS: events
-- =============================================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published events"
  ON public.events FOR SELECT
  USING (is_published = true AND is_active = true);

CREATE POLICY "Admins can view all events"
  ON public.events FOR SELECT
  USING (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can insert events"
  ON public.events FOR INSERT
  WITH CHECK (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can update events"
  ON public.events FOR UPDATE
  USING (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can delete events"
  ON public.events FOR DELETE
  USING (public.is_admin_or_moderator(auth.uid()));

-- =============================================
-- RLS: event_sessions
-- =============================================
ALTER TABLE public.event_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sessions of published events"
  ON public.event_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_sessions.event_id
      AND events.is_published = true
      AND events.is_active = true
    )
  );

CREATE POLICY "Admins can view all sessions"
  ON public.event_sessions FOR SELECT
  USING (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can insert sessions"
  ON public.event_sessions FOR INSERT
  WITH CHECK (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can update sessions"
  ON public.event_sessions FOR UPDATE
  USING (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can delete sessions"
  ON public.event_sessions FOR DELETE
  USING (public.is_admin_or_moderator(auth.uid()));

-- =============================================
-- RLS: event_purchases
-- =============================================
ALTER TABLE public.event_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
  ON public.event_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases"
  ON public.event_purchases FOR SELECT
  USING (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Users can insert own purchases"
  ON public.event_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all purchases"
  ON public.event_purchases FOR ALL
  USING (public.is_admin_or_moderator(auth.uid()));

-- =============================================
-- Trigger updated_at para events
-- =============================================
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Trigger slug automático para events
-- =============================================
CREATE TRIGGER set_event_slug_on_insert
  BEFORE INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_slug_on_insert();
