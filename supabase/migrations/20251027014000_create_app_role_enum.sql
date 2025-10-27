-- Ensure app_role enum type exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t WHERE t.typname = 'app_role'
  ) THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  END IF;
END $$;