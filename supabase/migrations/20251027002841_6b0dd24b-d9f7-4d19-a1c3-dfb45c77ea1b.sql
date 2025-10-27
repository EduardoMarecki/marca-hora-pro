-- Adicionar coluna empresa_id nas tabelas profiles se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'profiles' 
                 AND column_name = 'empresa_id') THEN
    ALTER TABLE public.profiles ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
    CREATE INDEX idx_profiles_empresa_id ON public.profiles(empresa_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'public_profiles' 
                 AND column_name = 'empresa_id') THEN
    ALTER TABLE public.public_profiles ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
    CREATE INDEX idx_public_profiles_empresa_id ON public.public_profiles(empresa_id);
  END IF;
END $$;

-- Inserir Unimed Paraná se não existir
INSERT INTO public.empresas (nome) 
VALUES ('Unimed Paraná')
ON CONFLICT (nome) DO NOTHING;