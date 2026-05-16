DROP POLICY IF EXISTS "Users insert own protocols" ON public.protocols;
CREATE POLICY "Users create protocols for review only"
ON public.protocols
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending_review');

DROP POLICY IF EXISTS "Users update own protocols" ON public.protocols;
CREATE POLICY "Users update own protocols in review only"
ON public.protocols
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending_review')
WITH CHECK (auth.uid() = user_id AND status = 'pending_review');

DROP POLICY IF EXISTS "Public read exercise-media" ON storage.objects;
CREATE POLICY "Authenticated read exercise-media"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'exercise-media');