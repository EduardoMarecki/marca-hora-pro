-- Allow admins to update any profile (fixes edit in Equipe > Perfil Detalhado)
-- Idempotent: drop existing policy, then create with USING and WITH CHECK

BEGIN;

-- Ensure RLS is enabled (safe even if already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remove existing policy to avoid duplicate_object errors
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Create update policy for admins
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

COMMIT;