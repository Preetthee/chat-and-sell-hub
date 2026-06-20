
-- Lock down user_roles writes: only service_role may modify
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated, anon, PUBLIC;

CREATE POLICY "No client inserts to user_roles"
ON public.user_roles FOR INSERT TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "No client updates to user_roles"
ON public.user_roles FOR UPDATE TO authenticated, anon
USING (false) WITH CHECK (false);

CREATE POLICY "No client deletes to user_roles"
ON public.user_roles FOR DELETE TO authenticated, anon
USING (false);

-- Tighten EXECUTE on has_role: revoke from PUBLIC, grant only to roles that need it for RLS evaluation
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
