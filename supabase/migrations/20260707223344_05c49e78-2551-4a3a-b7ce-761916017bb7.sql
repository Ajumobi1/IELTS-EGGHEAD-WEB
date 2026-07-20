
-- Users can upload/read their own speaking responses; admins can read all
CREATE POLICY "Users upload own speaking responses"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'speaking-responses' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own speaking responses"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'speaking-responses'
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Users delete own speaking responses"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'speaking-responses' AND (storage.foldername(name))[1] = auth.uid()::text);
