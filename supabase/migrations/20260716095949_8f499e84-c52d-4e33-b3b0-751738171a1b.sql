
-- Lock down correct_answer column: only accessible via get_question_answers RPC
REVOKE SELECT (correct_answer) ON public.questions FROM PUBLIC, anon, authenticated;

-- Prevent client-side scoring tampering: revoke UPDATE on scoring columns
REVOKE UPDATE (score, total, submitted, submitted_at) ON public.test_attempts FROM PUBLIC, anon, authenticated;

-- Attach the anti-tamper trigger (defense in depth; RPC uses SECURITY DEFINER to bypass)
DROP TRIGGER IF EXISTS trg_prevent_attempt_score_tamper ON public.test_attempts;
CREATE TRIGGER trg_prevent_attempt_score_tamper
  BEFORE UPDATE ON public.test_attempts
  FOR EACH ROW EXECUTE FUNCTION public.prevent_attempt_score_tamper();

-- Explicitly revoke exam content from anon/PUBLIC so authenticated policies are the only path
REVOKE ALL ON public.test_sections FROM PUBLIC, anon;
REVOKE ALL ON public.question_groups FROM PUBLIC, anon;
REVOKE ALL ON public.questions FROM PUBLIC, anon;
