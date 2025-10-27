-- Secure empresas table: enable RLS and restrict SELECT to same company users or admins

-- Enable RLS (idempotent)
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- Drop any permissive policies to avoid public reads
DROP POLICY IF EXISTS "Public can view empresas" ON public.empresas;
DROP POLICY IF EXISTS "All users can view empresas" ON public.empresas;
DROP POLICY IF EXISTS "Users can view empresas" ON public.empresas;
DROP POLICY IF EXISTS "Anyone can view empresas" ON public.empresas;

-- Allow admins to view all company data
CREATE POLICY "Admins can view all empresas"
ON public.empresas
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow authenticated users to view only their own company (empresa_id matching)
CREATE POLICY "Users can view only their company"
ON public.empresas
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.empresa_id = public.empresas.id
  )
);

-- Optionally restrict write operations to admins only (defensive hardening)
DROP POLICY IF EXISTS "Users can modify empresas" ON public.empresas;
DROP POLICY IF EXISTS "Anyone can modify empresas" ON public.empresas;
CREATE POLICY "Admins can manage empresas"
ON public.empresas
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));