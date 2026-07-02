DROP POLICY IF EXISTS "Avatars: users can upload own files" ON storage.objects;
DROP POLICY IF EXISTS "Avatars: users can update own files" ON storage.objects;

CREATE POLICY "Avatars: users can upload own files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND lower(name) ~ '\.(jpe?g|png|gif|webp)$'
);

CREATE POLICY "Avatars: users can update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND lower(name) ~ '\.(jpe?g|png|gif|webp)$'
);