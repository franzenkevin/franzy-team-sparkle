CREATE OR REPLACE FUNCTION public.prevent_self_admin_promotion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.role = 'admin' AND auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can create admin roles';
  END IF;
  RETURN NEW;
END;
$function$;

INSERT INTO public.user_roles (user_id, role) VALUES ('f924782a-4b90-4f11-a670-33ffa07e9f23', 'admin') ON CONFLICT (user_id, role) DO NOTHING;