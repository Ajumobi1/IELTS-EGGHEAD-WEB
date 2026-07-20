
CREATE POLICY "Avatars: users manage own"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatars: authenticated can read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars');
