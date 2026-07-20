
DO $$ BEGIN
  CREATE TYPE public.profile_user_type AS ENUM ('student','parent','professional','institution');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.profile_student_level AS ENUM ('junior_middle','high_school','college_university','graduate','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_type public.profile_user_type,
  ADD COLUMN IF NOT EXISTS student_level public.profile_student_level,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_user_type_idx ON public.profiles (user_type);
CREATE INDEX IF NOT EXISTS profiles_onboarded_idx ON public.profiles (onboarded);
