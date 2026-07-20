
CREATE OR REPLACE FUNCTION public.admin_security_healthcheck()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  result jsonb := '[]'::jsonb;
  critical_tables text[] := ARRAY['profiles','user_roles','tests','test_sections','question_groups','questions','test_attempts','bookings','booking_notifications'];
  protected_content text[] := ARRAY['questions','question_groups','test_sections','user_roles','test_attempts'];
  t text;
  rls_on boolean;
  policy_count int;
  has_anon boolean;
  answer_leak_anon boolean;
  answer_leak_auth boolean;
  score_updatable boolean;
  fn_exists boolean;
  fn_secdef boolean;
  has_exec_anon boolean;
  has_exec_auth boolean;
  trigger_exists boolean;
  bucket_pub boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- RLS enabled + policies present
  FOREACH t IN ARRAY critical_tables LOOP
    SELECT c.relrowsecurity INTO rls_on
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname=t;
    SELECT count(*) INTO policy_count FROM pg_policies WHERE schemaname='public' AND tablename=t;

    result := result || jsonb_build_object(
      'category','RLS',
      'name','RLS enabled: '||t,
      'status', CASE WHEN rls_on THEN 'pass' ELSE 'fail' END,
      'detail', CASE WHEN rls_on THEN 'Row-level security is enforced.' ELSE 'Enable RLS on this table.' END
    );
    result := result || jsonb_build_object(
      'category','RLS',
      'name','Policies defined: '||t,
      'status', CASE WHEN policy_count > 0 THEN 'pass' ELSE 'fail' END,
      'detail', policy_count || ' policies attached.'
    );
  END LOOP;

  -- No anon grants on protected content tables
  FOREACH t IN ARRAY protected_content LOOP
    SELECT EXISTS(
      SELECT 1 FROM information_schema.role_table_grants
      WHERE table_schema='public' AND table_name=t AND grantee='anon'
    ) INTO has_anon;
    result := result || jsonb_build_object(
      'category','Grants',
      'name','No anon grants: '||t,
      'status', CASE WHEN NOT has_anon THEN 'pass' ELSE 'fail' END,
      'detail', CASE WHEN NOT has_anon THEN 'anon role has no privileges.' ELSE 'anon still has grants — revoke them.' END
    );
  END LOOP;

  -- questions.correct_answer must not be SELECT-grantable
  SELECT EXISTS(
    SELECT 1 FROM information_schema.column_privileges
    WHERE table_schema='public' AND table_name='questions'
      AND column_name='correct_answer' AND privilege_type='SELECT' AND grantee='anon'
  ) INTO answer_leak_anon;
  SELECT EXISTS(
    SELECT 1 FROM information_schema.column_privileges
    WHERE table_schema='public' AND table_name='questions'
      AND column_name='correct_answer' AND privilege_type='SELECT' AND grantee='authenticated'
  ) INTO answer_leak_auth;
  result := result || jsonb_build_object(
    'category','Answer secrecy',
    'name','correct_answer hidden from anon',
    'status', CASE WHEN NOT answer_leak_anon THEN 'pass' ELSE 'fail' END,
    'detail', CASE WHEN NOT answer_leak_anon THEN 'anon cannot SELECT correct_answer.' ELSE 'anon has SELECT on correct_answer — revoke it.' END
  );
  result := result || jsonb_build_object(
    'category','Answer secrecy',
    'name','correct_answer hidden from authenticated',
    'status', CASE WHEN NOT answer_leak_auth THEN 'pass' ELSE 'fail' END,
    'detail', CASE WHEN NOT answer_leak_auth THEN 'authenticated cannot SELECT correct_answer directly (uses gated RPC).' ELSE 'Revoke SELECT on correct_answer from authenticated.' END
  );

  -- test_attempts score not client-updatable
  SELECT EXISTS(
    SELECT 1 FROM information_schema.column_privileges
    WHERE table_schema='public' AND table_name='test_attempts'
      AND column_name IN ('score','total','submitted','submitted_at')
      AND privilege_type='UPDATE' AND grantee='authenticated'
  ) INTO score_updatable;
  result := result || jsonb_build_object(
    'category','Score integrity',
    'name','Score columns not client-updatable',
    'status', CASE WHEN NOT score_updatable THEN 'pass' ELSE 'fail' END,
    'detail', CASE WHEN NOT score_updatable THEN 'Only submit_test_attempt() can write scores.' ELSE 'Revoke UPDATE on score/total/submitted from authenticated.' END
  );

  -- Trigger present
  SELECT EXISTS(
    SELECT 1 FROM pg_trigger tg
    JOIN pg_class c ON c.oid = tg.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname='test_attempts' AND tg.tgname='trg_prevent_attempt_score_tamper' AND NOT tg.tgisinternal
  ) INTO trigger_exists;
  result := result || jsonb_build_object(
    'category','Score integrity',
    'name','Score-tamper trigger active',
    'status', CASE WHEN trigger_exists THEN 'pass' ELSE 'fail' END,
    'detail', CASE WHEN trigger_exists THEN 'trg_prevent_attempt_score_tamper blocks direct score writes.' ELSE 'Trigger missing — restore it.' END
  );

  -- Security definer RPCs
  FOR t IN SELECT unnest(ARRAY['has_role','submit_test_attempt','get_question_answers']) LOOP
    SELECT true, p.prosecdef INTO fn_exists, fn_secdef
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname=t LIMIT 1;
    result := result || jsonb_build_object(
      'category','RPC hardening',
      'name', t || ' is SECURITY DEFINER',
      'status', CASE WHEN COALESCE(fn_exists,false) AND COALESCE(fn_secdef,false) THEN 'pass' ELSE 'fail' END,
      'detail', CASE WHEN COALESCE(fn_secdef,false) THEN 'Runs with owner privileges after internal auth checks.' ELSE 'Function missing or not SECURITY DEFINER.' END
    );
    fn_exists := null; fn_secdef := null;
  END LOOP;

  -- has_role execute grants
  SELECT EXISTS(
    SELECT 1 FROM information_schema.role_routine_grants
    WHERE routine_schema='public' AND routine_name='has_role' AND grantee='anon' AND privilege_type='EXECUTE'
  ) INTO has_exec_anon;
  SELECT EXISTS(
    SELECT 1 FROM information_schema.role_routine_grants
    WHERE routine_schema='public' AND routine_name='has_role' AND grantee='authenticated' AND privilege_type='EXECUTE'
  ) INTO has_exec_auth;
  result := result || jsonb_build_object(
    'category','RPC hardening',
    'name','has_role not executable by anon',
    'status', CASE WHEN NOT has_exec_anon THEN 'pass' ELSE 'fail' END,
    'detail', CASE WHEN NOT has_exec_anon THEN 'Anon cannot call has_role.' ELSE 'Revoke EXECUTE on has_role from anon.' END
  );
  result := result || jsonb_build_object(
    'category','RPC hardening',
    'name','has_role executable by authenticated',
    'status', CASE WHEN has_exec_auth THEN 'pass' ELSE 'warn' END,
    'detail', CASE WHEN has_exec_auth THEN 'Authenticated users can check their own role (required for RLS policies).' ELSE 'Authenticated cannot call has_role — admin visibility will break.' END
  );

  -- Storage buckets private
  FOR t IN SELECT unnest(ARRAY['speaking-responses','listening-audio']) LOOP
    SELECT public INTO bucket_pub FROM storage.buckets WHERE id = t;
    result := result || jsonb_build_object(
      'category','Storage',
      'name','Bucket private: '||t,
      'status', CASE WHEN bucket_pub IS FALSE THEN 'pass' WHEN bucket_pub IS NULL THEN 'warn' ELSE 'fail' END,
      'detail', CASE WHEN bucket_pub IS FALSE THEN 'Bucket is private; access via signed URLs.' WHEN bucket_pub IS NULL THEN 'Bucket not found.' ELSE 'Bucket is public — make it private.' END
    );
  END LOOP;

  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.admin_security_healthcheck() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_security_healthcheck() TO authenticated;
