DROP POLICY IF EXISTS "Users view own protocols" ON public.protocols;
CREATE POLICY "Users view released protocols"
ON public.protocols
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND status IN ('active', 'archived'));

DROP POLICY IF EXISTS "Users update own protocols" ON public.protocols;

DROP POLICY IF EXISTS "Users insert own protocols" ON public.protocols;

DROP POLICY IF EXISTS "Admins insert protocols" ON public.protocols;
CREATE POLICY "Admins insert protocols"
ON public.protocols
FOR INSERT
TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins update all protocols" ON public.protocols;
CREATE POLICY "Admins update all protocols"
ON public.protocols
FOR UPDATE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));