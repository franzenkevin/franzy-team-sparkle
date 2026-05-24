
-- 1. Tighten share_links: remove public read; access is mediated by /api/public/share/$token (server route using service role)
DROP POLICY IF EXISTS "Anyone can read active share links" ON public.share_links;

CREATE POLICY "Users view own share links"
ON public.share_links
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Storage: avatars SELECT (authenticated users can read avatars)
CREATE POLICY "Authenticated can view avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

-- 3. Storage: photos UPDATE (owner only)
CREATE POLICY "Users update own photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'photos' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'photos' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 4. Realtime: enable RLS on realtime.messages so users cannot subscribe to arbitrary broadcast/presence topics.
-- The app only uses postgres_changes, which goes through replication (not realtime.messages reads),
-- so denying all client access here does not break existing functionality.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
