
-- 1. test_sections / question_groups: revoke all anon access
REVOKE ALL ON public.test_sections FROM anon, PUBLIC;
REVOKE ALL ON public.question_groups FROM anon, PUBLIC;
REVOKE ALL ON public.questions FROM anon, PUBLIC;
REVOKE ALL ON public.test_attempts FROM anon, PUBLIC;

-- 2. test_attempts: revoke authenticated UPDATE on scoring/submission columns
REVOKE UPDATE (score, total, submitted, submitted_at) ON public.test_attempts FROM authenticated;

-- 3. questions: hide correct_answer column from authenticated (admins & students)
REVOKE SELECT (correct_answer) ON public.questions FROM authenticated;

-- Controlled access to correct answers: admins any time, students only after submission
CREATE OR REPLACE FUNCTION public.get_question_answers(_test_id uuid)
RETURNS TABLE(id uuid, correct_answer text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN QUERY SELECT q.id, q.correct_answer FROM public.questions q WHERE q.test_id = _test_id;
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.test_attempts a
    WHERE a.test_id = _test_id AND a.user_id = auth.uid() AND a.submitted = true
  ) THEN
    RETURN QUERY SELECT q.id, q.correct_answer FROM public.questions q WHERE q.test_id = _test_id;
    RETURN;
  END IF;
  RAISE EXCEPTION 'Not authorized to view answers before submission';
END $$;

REVOKE ALL ON FUNCTION public.get_question_answers(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_question_answers(uuid) TO authenticated;

-- 4. has_role: convert to SECURITY INVOKER (reduces DEFINER-exposed surface).
-- Callers only ever check has_role(auth.uid(), ...), and user_roles has a
-- "Users read own roles" policy for auth.uid() = user_id, so INVOKER works.
-- Drop the two recursive admin policies on user_roles that would otherwise
-- cause infinite recursion under INVOKER; role management stays under
-- service_role (admin bootstrap uses backend paths, not client writes).
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins read all roles" ON public.user_roles;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
