-- 1. COMPANIES: protect CNPJ from public exposure
-- Revoke direct column-level SELECT on cnpj from anon and authenticated roles
REVOKE SELECT (cnpj) ON public.companies FROM anon, authenticated;

-- Provide owner-only secure access to cnpj via SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.get_my_company_cnpj(_company_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cnpj
  FROM public.companies
  WHERE id = _company_id
    AND owner_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.get_my_company_cnpj(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_company_cnpj(uuid) TO authenticated;

-- 2. PROMO COUPONS: remove broad authenticated SELECT, restrict to admins
DROP POLICY IF EXISTS "Users can view active coupons" ON public.promo_coupons;
-- "Admins can manage coupons" (FOR ALL) already covers admin SELECT/INSERT/UPDATE/DELETE.
-- Coupon redemption is handled by the redeem-coupon edge function using the service role,
-- which bypasses RLS, so end-user redemption flow is unaffected.