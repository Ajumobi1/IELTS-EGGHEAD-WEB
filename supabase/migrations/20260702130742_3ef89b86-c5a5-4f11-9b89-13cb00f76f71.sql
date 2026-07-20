
-- Extend tests with library metadata
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'academic',
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS cover_image_url text;

-- Sections
CREATE TABLE IF NOT EXISTS public.test_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  position int NOT NULL,
  title text,
  passage text,
  audio_url text,
  writing_prompt text,
  speaking_cue text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.test_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_sections TO authenticated;
GRANT ALL ON public.test_sections TO service_role;
ALTER TABLE public.test_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sections viewable if test published" ON public.test_sections
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND t.is_published = true) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sections admin write" ON public.test_sections
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Question groups
CREATE TABLE IF NOT EXISTS public.question_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.test_sections(id) ON DELETE CASCADE,
  position int NOT NULL,
  question_type text NOT NULL,
  instructions text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.question_groups TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_groups TO authenticated;
GRANT ALL ON public.question_groups TO service_role;
ALTER TABLE public.question_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groups viewable via published test" ON public.question_groups
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.test_sections s JOIN public.tests t ON t.id = s.test_id WHERE s.id = section_id AND t.is_published = true) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "groups admin write" ON public.question_groups
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Extend questions
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.question_groups(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS number int,
  ADD COLUMN IF NOT EXISTS question_type text;

-- update triggers
CREATE OR REPLACE FUNCTION public.tick_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS sections_touch ON public.test_sections;
CREATE TRIGGER sections_touch BEFORE UPDATE ON public.test_sections
  FOR EACH ROW EXECUTE FUNCTION public.tick_updated_at();

DROP TRIGGER IF EXISTS groups_touch ON public.question_groups;
CREATE TRIGGER groups_touch BEFORE UPDATE ON public.question_groups
  FOR EACH ROW EXECUTE FUNCTION public.tick_updated_at();
