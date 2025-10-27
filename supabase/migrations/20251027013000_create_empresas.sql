-- Create empresas table if it doesn't exist, with basic fields and constraints
CREATE TABLE IF NOT EXISTS public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  cnpj TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS to ensure policies can be applied
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS idx_empresas_nome ON public.empresas (nome);
CREATE INDEX IF NOT EXISTS idx_empresas_cnpj ON public.empresas (cnpj);