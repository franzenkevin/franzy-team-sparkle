
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text,
  ADD COLUMN IF NOT EXISTS plan_start date,
  ADD COLUMN IF NOT EXISTS plan_end date,
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS first_access_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by_admin uuid;

-- Function: mark profile as active on first access
CREATE OR REPLACE FUNCTION public.mark_profile_active(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET account_status = 'active',
      first_access_at = COALESCE(first_access_at, now())
  WHERE user_id = _user_id AND (account_status = 'pending' OR first_access_at IS NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_profile_active(uuid) TO authenticated;
