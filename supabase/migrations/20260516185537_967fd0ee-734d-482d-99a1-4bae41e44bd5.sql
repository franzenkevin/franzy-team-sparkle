UPDATE storage.buckets
SET public = false
WHERE id IN ('avatars', 'exercise-media');