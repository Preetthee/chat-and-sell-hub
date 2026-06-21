-- Reduce privilege exposure of has_role: switch SECURITY DEFINER -> SECURITY INVOKER.
-- RLS on user_roles restricts SELECT to the calling user's own rows, so:
--   * has_role(auth.uid(), 'admin') still resolves correctly for the caller.
--   * has_role(other_user_id, 'admin') called via PostgREST RPC now returns false
--     because the row is invisible to that role, preventing role enumeration.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$;