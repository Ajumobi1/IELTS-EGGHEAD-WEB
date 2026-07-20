
-- Allow authenticated users to read listening audio; admins to manage
CREATE POLICY "listening_audio_read_auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'listening-audio');
CREATE POLICY "listening_audio_admin_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listening-audio' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "listening_audio_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'listening-audio' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "listening_audio_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'listening-audio' AND public.has_role(auth.uid(), 'admin'));

-- Make correct_answer optional (speaking/essay questions don't have one)
ALTER TABLE public.questions ALTER COLUMN correct_answer DROP NOT NULL;
ALTER TABLE public.questions ALTER COLUMN correct_answer SET DEFAULT '';
