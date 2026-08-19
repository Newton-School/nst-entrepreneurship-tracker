-- Scores were free-form TEXT in obtain_grade, mixing "8.5/10" and "4", so nothing could
-- total or compare them. Adds a real numeric score plus the evaluation workflow columns:
-- a due date for student submissions, mentor feedback, and a lock.
--
-- obtain_grade is kept and maintained by trigger so the existing UI keeps rendering
-- while it migrates to `score`.

ALTER TABLE public.venture_kpis
  ADD COLUMN IF NOT EXISTS score     numeric,
  ADD COLUMN IF NOT EXISTS due_date  timestamptz,
  ADD COLUMN IF NOT EXISTS feedback  text,
  ADD COLUMN IF NOT EXISTS scored_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scored_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz;

ALTER TABLE public.kpi_subcategories
  ADD COLUMN IF NOT EXISTS score numeric;

-- Backfill takes the leading number ("8.5/10" -> 8.5). Audited beforehand: every
-- existing row is numeric, so nothing is silently dropped. Non-numeric rows would end
-- as NULL, which is why the CHECK below tolerates NULL.
UPDATE public.venture_kpis
   SET score = LEAST(total_grade, GREATEST(0,
         (regexp_match(obtain_grade, '^\s*([0-9]+(?:\.[0-9]+)?)'))[1]::numeric))
 WHERE score IS NULL AND obtain_grade ~ '^\s*[0-9]';

UPDATE public.kpi_subcategories
   SET score = LEAST(total_grade, GREATEST(0,
         (regexp_match(obtain_grade, '^\s*([0-9]+(?:\.[0-9]+)?)'))[1]::numeric))
 WHERE score IS NULL AND obtain_grade ~ '^\s*[0-9]';

ALTER TABLE public.venture_kpis
  DROP CONSTRAINT IF EXISTS venture_kpis_score_range,
  ADD CONSTRAINT venture_kpis_score_range
  CHECK (score IS NULL OR (score >= 0 AND score <= total_grade));

ALTER TABLE public.kpi_subcategories
  DROP CONSTRAINT IF EXISTS kpi_subcategories_score_range,
  ADD CONSTRAINT kpi_subcategories_score_range
  CHECK (score IS NULL OR (score >= 0 AND score <= total_grade));

-- Keep the legacy TEXT column consistent with score so older read paths keep working.
-- Only overwrites once a real score exists, so pre-existing non-numeric text survives.
CREATE OR REPLACE FUNCTION public.sync_obtain_grade()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.score IS NOT NULL THEN
    NEW.obtain_grade := trim(to_char(NEW.score, 'FM999999990.99')) || '/' ||
                        trim(to_char(NEW.total_grade, 'FM999999990.99'));
  ELSIF NEW.obtain_grade IS NULL THEN
    NEW.obtain_grade := '';
  END IF;
  RETURN NEW;
END $$;

ALTER TABLE public.venture_kpis      ALTER COLUMN obtain_grade DROP NOT NULL;
ALTER TABLE public.kpi_subcategories ALTER COLUMN obtain_grade DROP NOT NULL;

DROP TRIGGER IF EXISTS venture_kpis_sync_obtain_grade ON public.venture_kpis;
CREATE TRIGGER venture_kpis_sync_obtain_grade
  BEFORE INSERT OR UPDATE ON public.venture_kpis
  FOR EACH ROW EXECUTE FUNCTION public.sync_obtain_grade();

DROP TRIGGER IF EXISTS kpi_subcategories_sync_obtain_grade ON public.kpi_subcategories;
CREATE TRIGGER kpi_subcategories_sync_obtain_grade
  BEFORE INSERT OR UPDATE ON public.kpi_subcategories
  FOR EACH ROW EXECUTE FUNCTION public.sync_obtain_grade();

-- Who scored and who locked is evidence, so the server stamps it rather than trusting
-- whatever the client sends.
CREATE OR REPLACE FUNCTION public.stamp_kpi_evaluation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.score IS DISTINCT FROM OLD.score
     OR NEW.feedback IS DISTINCT FROM OLD.feedback THEN
    NEW.scored_by := (SELECT auth.uid());
    NEW.scored_at := now();
  END IF;

  IF NEW.is_locked AND (TG_OP = 'INSERT' OR NOT OLD.is_locked) THEN
    NEW.locked_by := (SELECT auth.uid());
    NEW.locked_at := now();
  ELSIF NOT NEW.is_locked THEN
    NEW.locked_by := NULL;
    NEW.locked_at := NULL;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS venture_kpis_stamp_evaluation ON public.venture_kpis;
CREATE TRIGGER venture_kpis_stamp_evaluation
  BEFORE INSERT OR UPDATE ON public.venture_kpis
  FOR EACH ROW EXECUTE FUNCTION public.stamp_kpi_evaluation();

-- Every policy added later joins on these; neither index existed.
CREATE INDEX IF NOT EXISTS venture_kpis_venture_id_idx    ON public.venture_kpis (venture_id);
CREATE INDEX IF NOT EXISTS kpi_subcategories_kpi_id_idx   ON public.kpi_subcategories (kpi_id);
CREATE INDEX IF NOT EXISTS venture_kpis_due_date_idx      ON public.venture_kpis (due_date)
  WHERE is_locked = false;
