-- Safety check: abort if any unexpected plan_type exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE plan_type NOT IN ('monthly','yearly','trial')
  ) THEN
    RAISE EXCEPTION 'Cannot update subscriptions_plan_type_check: found unexpected subscriptions.plan_type values.';
  END IF;
END $$;

-- Replace the outdated CHECK constraint (did not include ''trial'')
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_type_check
  CHECK (plan_type = ANY (ARRAY['monthly'::text, 'yearly'::text, 'trial'::text]));
