
REVOKE ALL ON FUNCTION public.mark_profile_active(uuid) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.mark_profile_active(uuid);
