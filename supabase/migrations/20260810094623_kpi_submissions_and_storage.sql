-- Students upload proof documents against a KPI; mentors open them when scoring.
-- A submission is evidence, so the table is append-only: SELECT/INSERT/DELETE are
-- granted but UPDATE never is.

CREATE TABLE IF NOT EXISTS public.kpi_submissions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id         uuid NOT NULL REFERENCES public.venture_kpis(id) ON DELETE CASCADE,
  subcategory_id uuid REFERENCES public.kpi_subcategories(id) ON DELETE SET NULL,
  venture_id     uuid NOT NULL REFERENCES public.ventures(id) ON DELETE CASCADE,
  student_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path   text NOT NULL UNIQUE,
  file_name      text NOT NULL,
  mime_type      text,
  size_bytes     bigint CHECK (size_bytes IS NULL OR size_bytes <= 26214400),
  note           text,
  submitted_at   timestamptz NOT NULL DEFAULT now(),
  is_late        boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kpi_submissions_kpi_id_idx     ON public.kpi_submissions (kpi_id);
CREATE INDEX IF NOT EXISTS kpi_submissions_venture_id_idx ON public.kpi_submissions (venture_id);
CREATE INDEX IF NOT EXISTS kpi_submissions_student_id_idx ON public.kpi_submissions (student_id);

-- venture_id, student_id and is_late are all derived server-side. A client that posts
-- is_late:false after the deadline, or someone else's venture_id, gets overwritten.
CREATE OR REPLACE FUNCTION public.set_submission_metadata()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k record;
BEGIN
  SELECT venture_id, due_date, is_locked INTO k
    FROM public.venture_kpis WHERE id = NEW.kpi_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown KPI %', NEW.kpi_id;
  END IF;
  IF k.is_locked THEN
    RAISE EXCEPTION 'This KPI is locked; no further submissions are accepted';
  END IF;

  NEW.venture_id   := k.venture_id;
  NEW.student_id   := (SELECT auth.uid());
  NEW.submitted_at := now();
  -- Late uploads are accepted, only flagged.
  NEW.is_late      := (k.due_date IS NOT NULL AND now() > k.due_date);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS kpi_submissions_set_metadata ON public.kpi_submissions;
CREATE TRIGGER kpi_submissions_set_metadata
  BEFORE INSERT ON public.kpi_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_submission_metadata();

ALTER TABLE public.kpi_submissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.kpi_submissions TO authenticated;
GRANT ALL ON public.kpi_submissions TO service_role;

DROP POLICY IF EXISTS "submissions: staff read all, student reads own" ON public.kpi_submissions;
CREATE POLICY "submissions: staff read all, student reads own" ON public.kpi_submissions
  FOR SELECT TO authenticated
  USING (public.is_staff() OR public.is_venture_student(venture_id));

DROP POLICY IF EXISTS "submissions: student inserts own" ON public.kpi_submissions;
CREATE POLICY "submissions: student inserts own" ON public.kpi_submissions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_venture_student(venture_id));

DROP POLICY IF EXISTS "submissions: student withdraws before lock" ON public.kpi_submissions;
CREATE POLICY "submissions: student withdraws before lock" ON public.kpi_submissions
  FOR DELETE TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM public.venture_kpis k WHERE k.id = kpi_id AND k.is_locked
    )
  );

DROP POLICY IF EXISTS "submissions: board deletes" ON public.kpi_submissions;
CREATE POLICY "submissions: board deletes" ON public.kpi_submissions
  FOR DELETE TO authenticated
  USING (public.is_board());
