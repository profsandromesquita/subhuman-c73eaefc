-- Create a function to check if there are any admins
CREATE OR REPLACE FUNCTION public.has_any_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE role = 'admin'
  )
$$;

-- Add policy: Allow first admin setup when no admins exist
CREATE POLICY "Allow first admin setup"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  role = 'admin' 
  AND auth.uid() = user_id 
  AND NOT public.has_any_admin()
);