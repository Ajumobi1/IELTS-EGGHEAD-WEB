
-- 1) Restrict test_sections & question_groups to authenticated users
REVOKE SELECT ON public.test_sections FROM anon;
REVOKE SELECT ON public.question_groups FROM anon;

DROP POLICY IF EXISTS "sections viewable if test published" ON public.test_sections;
CREATE POLICY "sections viewable if test published"
  ON public.test_sections FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_sections.test_id AND t.is_published));

DROP POLICY IF EXISTS "groups viewable via published test" ON public.question_groups;
CREATE POLICY "groups viewable via published test"
  ON public.question_groups FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.test_sections s
    JOIN public.tests t ON t.id = s.test_id
    WHERE s.id = question_groups.section_id AND t.is_published
  ));

-- 2) Trigger to block client-side tampering of score/total/submitted
CREATE OR REPLACE FUNCTION public.prevent_attempt_score_tamper()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Allow internal path (set by submit_test_attempt) and service_role
  IF current_setting('app.internal_scoring', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF current_user IN ('service_role', 'supabase_admin', 'postgres') THEN
    RETURN NEW;
  END IF;
  IF (NEW.score IS DISTINCT FROM OLD.score)
     OR (NEW.total IS DISTINCT FROM OLD.total)
     OR (NEW.submitted IS DISTINCT FROM OLD.submitted)
     OR (NEW.submitted_at IS DISTINCT FROM OLD.submitted_at) THEN
    RAISE EXCEPTION 'score/total/submitted can only be set via submit_test_attempt()';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prevent_attempt_score_tamper ON public.test_attempts;
CREATE TRIGGER trg_prevent_attempt_score_tamper
  BEFORE UPDATE ON public.test_attempts
  FOR EACH ROW EXECUTE FUNCTION public.prevent_attempt_score_tamper();

-- 3) Server-side grading RPC
CREATE OR REPLACE FUNCTION public.submit_test_attempt(
  _attempt_id uuid,
  _answers jsonb,
  _flagged jsonb DEFAULT '{}'::jsonb,
  _notes text DEFAULT ''
)
RETURNS TABLE(score int, total int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_test uuid;
  v_already_submitted boolean;
  s int := 0;
  t int := 0;
  q record;
  a text;
  correct text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT user_id, test_id, submitted
    INTO v_user, v_test, v_already_submitted
  FROM public.test_attempts WHERE id = _attempt_id;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;
  IF v_user <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_already_submitted THEN
    RAISE EXCEPTION 'Attempt already submitted';
  END IF;

  FOR q IN
    SELECT id, correct_answer, points, question_type
    FROM public.questions
    WHERE test_id = v_test
  LOOP
    IF q.question_type IN ('essay', 'speaking') THEN
      CONTINUE;
    END IF;
    t := t + COALESCE(q.points, 1);
    a := lower(btrim(COALESCE(_answers ->> (q.id::text), '')));
    correct := lower(btrim(COALESCE(q.correct_answer, '')));
    IF a <> '' AND a = correct THEN
      s := s + COALESCE(q.points, 1);
    END IF;
  END LOOP;

  PERFORM set_config('app.internal_scoring', 'on', true);

  UPDATE public.test_attempts
    SET score = s,
        total = t,
        submitted = true,
        submitted_at = now(),
        answers = jsonb_build_object(
          '__answers', COALESCE(_answers, '{}'::jsonb),
          '__flagged', COALESCE(_flagged, '{}'::jsonb),
          '__notes', COALESCE(_notes, '')
        ),
        updated_at = now()
    WHERE id = _attempt_id;

  PERFORM set_config('app.internal_scoring', 'off', true);

  RETURN QUERY SELECT s, t;
END $$;

REVOKE ALL ON FUNCTION public.submit_test_attempt(uuid, jsonb, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_test_attempt(uuid, jsonb, jsonb, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_test_attempt(uuid, jsonb, jsonb, text) TO authenticated;

-- 4) Lock down has_role EXECUTE — used only by RLS/policies (authenticated) and internal services
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
