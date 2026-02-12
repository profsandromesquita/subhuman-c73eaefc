
-- =============================================
-- PHASE 1: Companies, Company Members, Mentions
-- =============================================

-- 1.1 Table: companies
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  logo_url text,
  website text,
  industry text,
  city text,
  state text,
  cnpj text,
  instagram_url text,
  linkedin_url text,
  is_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger for slug generation
CREATE TRIGGER set_company_slug_on_insert
  BEFORE INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_slug_on_insert();

-- Trigger for updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active companies"
  ON public.companies FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all companies"
  ON public.companies FOR SELECT
  USING (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Owner can insert own company"
  ON public.companies FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner can update own company"
  ON public.companies FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Admins can manage all companies"
  ON public.companies FOR ALL
  USING (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Owner can delete own company"
  ON public.companies FOR DELETE
  USING (auth.uid() = owner_id);

-- 1.2 Table: company_members
CREATE TABLE public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'colaborador',
  job_title text,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE(company_id, user_id)
);

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- Users can see their own memberships
CREATE POLICY "Users can view own memberships"
  ON public.company_members FOR SELECT
  USING (auth.uid() = user_id);

-- Company owners can see members of their companies
CREATE POLICY "Owners can view company members"
  ON public.company_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.companies
    WHERE companies.id = company_members.company_id
    AND companies.owner_id = auth.uid()
  ));

-- Anyone can view approved members (public info)
CREATE POLICY "Anyone can view approved members"
  ON public.company_members FOR SELECT
  USING (status = 'approved');

-- Users can request to join
CREATE POLICY "Users can request membership"
  ON public.company_members FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Company owners can update membership status
CREATE POLICY "Owners can update membership"
  ON public.company_members FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.companies
    WHERE companies.id = company_members.company_id
    AND companies.owner_id = auth.uid()
  ));

-- Users can delete own pending requests
CREATE POLICY "Users can cancel own request"
  ON public.company_members FOR DELETE
  USING (auth.uid() = user_id);

-- Owners can remove members
CREATE POLICY "Owners can remove members"
  ON public.company_members FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.companies
    WHERE companies.id = company_members.company_id
    AND companies.owner_id = auth.uid()
  ));

-- Admins full access
CREATE POLICY "Admins can manage all memberships"
  ON public.company_members FOR ALL
  USING (public.is_admin_or_moderator(auth.uid()));

-- 1.3 Table: mentions
CREATE TABLE public.mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  mentioned_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentioned_company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  context_type text NOT NULL,
  context_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mention_target_check CHECK (
    mentioned_user_id IS NOT NULL OR mentioned_company_id IS NOT NULL
  )
);

ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can insert mentions"
  ON public.mentions FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can view mentions about them"
  ON public.mentions FOR SELECT
  USING (
    auth.uid() = mentioned_user_id
    OR EXISTS (
      SELECT 1 FROM public.companies
      WHERE companies.id = mentioned_company_id
      AND companies.owner_id = auth.uid()
    )
  );

CREATE POLICY "Authors can view own mentions"
  ON public.mentions FOR SELECT
  USING (auth.uid() = author_id);

CREATE POLICY "Admins can manage all mentions"
  ON public.mentions FOR ALL
  USING (public.is_admin_or_moderator(auth.uid()));

-- 1.4 Add account_type to profiles
ALTER TABLE public.profiles
  ADD COLUMN account_type text NOT NULL DEFAULT 'personal';

-- Indexes
CREATE INDEX idx_companies_owner ON public.companies(owner_id);
CREATE INDEX idx_companies_slug ON public.companies(slug);
CREATE INDEX idx_company_members_company ON public.company_members(company_id);
CREATE INDEX idx_company_members_user ON public.company_members(user_id);
CREATE INDEX idx_mentions_user ON public.mentions(mentioned_user_id);
CREATE INDEX idx_mentions_company ON public.mentions(mentioned_company_id);
CREATE INDEX idx_mentions_context ON public.mentions(context_type, context_id);
