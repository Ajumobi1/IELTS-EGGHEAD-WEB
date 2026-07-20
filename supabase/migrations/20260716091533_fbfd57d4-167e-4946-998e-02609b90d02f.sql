
REVOKE SELECT (correct_answer) ON public.questions FROM authenticated, anon, PUBLIC;
REVOKE UPDATE (score, total, submitted, submitted_at) ON public.test_attempts FROM authenticated, anon, PUBLIC;
REVOKE ALL ON public.test_sections FROM anon, PUBLIC;
REVOKE ALL ON public.question_groups FROM anon, PUBLIC;
REVOKE ALL ON public.questions FROM anon, PUBLIC;
GRANT SELECT ON public.test_sections TO authenticated;
GRANT SELECT ON public.question_groups TO authenticated;
GRANT SELECT (id, test_id, group_id, number, position, prompt, options, question_type, points, created_at) ON public.questions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.questions TO authenticated;
