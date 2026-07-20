
-- 1) questions.correct_answer must NEVER be readable by clients directly.
REVOKE SELECT (correct_answer) ON public.questions FROM PUBLIC;
REVOKE SELECT (correct_answer) ON public.questions FROM anon;
REVOKE SELECT (correct_answer) ON public.questions FROM authenticated;
-- keep service_role/admin full access implicit via table grants

-- 2) Exam content: strictly authenticated only. Belt-and-braces revoke from anon/public.
REVOKE ALL ON public.test_sections FROM anon, PUBLIC;
REVOKE ALL ON public.question_groups FROM anon, PUBLIC;
GRANT SELECT ON public.test_sections TO authenticated;
GRANT SELECT ON public.question_groups TO authenticated;

-- 3) SECURITY DEFINER gated RPCs: lock EXECUTE down to authenticated only.
REVOKE EXECUTE ON FUNCTION public.get_question_answers(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_test_attempt(uuid, jsonb, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_question_answers(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_test_attempt(uuid, jsonb, jsonb, text) TO authenticated;

-- 4) Re-affirm score-tamper guard trigger exists (idempotent).
DROP TRIGGER IF EXISTS trg_prevent_attempt_score_tamper ON public.test_attempts;
CREATE TRIGGER trg_prevent_attempt_score_tamper
BEFORE UPDATE ON public.test_attempts
FOR EACH ROW EXECUTE FUNCTION public.prevent_attempt_score_tamper();
