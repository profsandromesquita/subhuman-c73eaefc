-- ============================================
-- Sistema de Cupons Promocionais Subhumano
-- ============================================

-- 1. Atualizar constraint para permitir 'promo' como plan_type
ALTER TABLE public.subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;

ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_plan_type_check 
CHECK (plan_type IN ('monthly', 'yearly', 'trial', 'promo'));

-- 2. Criar tabela de cupons promocionais
CREATE TABLE public.promo_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  plan_type TEXT NOT NULL DEFAULT 'promo',
  days_granted INTEGER NOT NULL DEFAULT 30,
  max_uses INTEGER NOT NULL DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_uses CHECK (current_uses <= max_uses),
  CONSTRAINT positive_days CHECK (days_granted > 0)
);

-- 3. Criar tabela de resgates de cupons
CREATE TABLE public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.promo_coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  
  UNIQUE(coupon_id, user_id)
);

-- 4. Criar indices para performance
CREATE INDEX idx_promo_coupons_code ON public.promo_coupons(code);
CREATE INDEX idx_promo_coupons_active ON public.promo_coupons(is_active);
CREATE INDEX idx_coupon_redemptions_user ON public.coupon_redemptions(user_id);
CREATE INDEX idx_coupon_redemptions_coupon ON public.coupon_redemptions(coupon_id);

-- 5. Trigger para atualizar updated_at
CREATE TRIGGER update_promo_coupons_updated_at
  BEFORE UPDATE ON public.promo_coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Habilitar RLS
ALTER TABLE public.promo_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- 7. Politicas RLS para promo_coupons

-- Admins podem gerenciar todos os cupons
CREATE POLICY "Admins can manage coupons"
  ON public.promo_coupons FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Usuarios autenticados podem ver cupons ativos (para validacao no resgate)
CREATE POLICY "Users can view active coupons"
  ON public.promo_coupons FOR SELECT
  USING (is_active = true AND auth.uid() IS NOT NULL);

-- 8. Politicas RLS para coupon_redemptions

-- Usuarios podem ver seus proprios resgates
CREATE POLICY "Users can view own redemptions"
  ON public.coupon_redemptions FOR SELECT
  USING (auth.uid() = user_id);

-- Admins podem ver todos os resgates
CREATE POLICY "Admins can view all redemptions"
  ON public.coupon_redemptions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Admins podem gerenciar todos os resgates
CREATE POLICY "Admins can manage redemptions"
  ON public.coupon_redemptions FOR ALL
  USING (has_role(auth.uid(), 'admin'));