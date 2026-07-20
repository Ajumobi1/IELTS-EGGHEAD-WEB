
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS exam_type text,
  ADD COLUMN IF NOT EXISTS test_timeframe text,
  ADD COLUMN IF NOT EXISTS prep_purpose text,
  ADD COLUMN IF NOT EXISTS focus_skills text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_source text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_exam_type_chk CHECK (exam_type IS NULL OR exam_type IN ('academic','general_training')) NOT VALID;
ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_exam_type_chk;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_timeframe_chk CHECK (test_timeframe IS NULL OR test_timeframe IN ('within_1_month','1_3_months','3_6_months','6_plus','not_sure')) NOT VALID;
ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_timeframe_chk;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_purpose_chk CHECK (prep_purpose IS NULL OR prep_purpose IN ('study_abroad','immigration','work','other')) NOT VALID;
ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_purpose_chk;
