-- Add functions to grant/revoke admin role via RPC with security definer

CREATE OR REPLACE FUNCTION public.grant_admin(target_user UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_admin(target_user UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = target_user AND role = 'admin';
END;
$$;

-- Allow authenticated users to execute these functions (the function itself enforces admin check)
GRANT EXECUTE ON FUNCTION public.grant_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_admin(UUID) TO authenticated;