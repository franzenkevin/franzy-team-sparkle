
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-media', 'exercise-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read exercise-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'exercise-media');

CREATE POLICY "Admins upload exercise-media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'exercise-media' AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update exercise-media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'exercise-media' AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete exercise-media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'exercise-media' AND private.has_role(auth.uid(), 'admin'::app_role));
