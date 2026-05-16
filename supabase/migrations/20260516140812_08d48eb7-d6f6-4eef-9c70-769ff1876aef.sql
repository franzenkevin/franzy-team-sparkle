CREATE POLICY "Admins insert protocols"
ON public.protocols
FOR INSERT
TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));