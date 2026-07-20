## Plan

### 1. Admin Security Health-Check screen
New route: `src/routes/_authenticated/admin/security.tsx` (linked from admin sidebar).

Runs a set of read-only probes via a new `createServerFn` (`runSecurityHealthcheck`) that uses `requireSupabaseAuth` + admin role check, then internally uses `supabaseAdmin` to introspect `pg_catalog` / `information_schema`. Returns a JSON report the page renders as pass/fail tiles.

Checks performed (critical tables: `profiles`, `user_roles`, `tests`, `test_sections`, `question_groups`, `questions`, `test_attempts`, `bookings`, `booking_notifications`):

- RLS enabled on every critical table (`pg_class.relrowsecurity`).
- At least one policy exists per table (`pg_policies`).
- No `anon` grants on protected content tables (`questions`, `question_groups`, `test_sections`, `test_attempts`, `user_roles`).
- `questions.correct_answer` column not SELECT-grantable to `anon`/`authenticated` (via `information_schema.column_privileges`).
- `test_attempts` score/total/submitted columns not UPDATE-grantable to `authenticated`.
- `has_role`, `submit_test_attempt`, `get_question_answers` exist and are `SECURITY DEFINER`.
- EXECUTE on `has_role` revoked from `anon`, present for `authenticated`.
- Trigger `trg_prevent_attempt_score_tamper` exists on `test_attempts`.
- Storage buckets `speaking-responses`, `listening-audio` are private.

### 2. UI
Cards grouped by category (RLS, Grants, Answer secrecy, Score integrity, RPC hardening, Storage). Each row: check name, status badge (Pass/Fail/Warn), short description, remediation hint on failure. Summary header with counts and last-run timestamp + "Re-run" button.

### 3. Review page tweak
In `src/routes/_authenticated/admin/attempts.$attemptId.tsx`, hide/soften the manual grading UI for objective question types (mcq, gap-fill, matching, true/false, etc.), keeping manual review only for `essay` and `speaking`. Add a note: "Objective questions are auto-marked — no review needed."

### Technical notes
- Purely presentational + read-only DB introspection; no schema changes.
- Server fn verifies admin via `context.supabase.rpc('has_role', …)` before importing `supabaseAdmin`.
- No client exposure of correct answers or secrets.