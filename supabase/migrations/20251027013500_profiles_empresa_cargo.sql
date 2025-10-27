-- Ensure profiles has empresa_id and cargo, referencing empresas
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id),
  ADD COLUMN IF NOT EXISTS cargo TEXT;

-- Index for filtering by empresa
CREATE INDEX IF NOT EXISTS idx_profiles_empresa_id ON public.profiles (empresa_id);