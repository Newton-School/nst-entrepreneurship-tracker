-- Two jobs.
--
-- 1. Close the read hole. ventures / venture_kpis / kpi_subcategories were all
--    FOR SELECT USING (true) with GRANT SELECT TO anon, so every student's scores were
--    readable by anyone holding the publishable key.
--
-- 2. Express the evaluation rules the write policies cannot currently state, because
--    they all go through is_admin(), which returns true for mentors:
--      - a mentor writes only on ventures assigned to them
--      - a locked KPI is editable only by admin / academic_board
--      - students read their own; all staff read everyone's

-- --------------------------------------------------------------------------------
-- Student read predicate, lifted from the never-applied
-- 20260728000000_student_result_privacy_rls.sql. Kept deliberately loose: ventures
-- imported before signup have no user_id and identify the student by an email sitting
-- in either roll_no or student_name. Used for reads ONLY -- writes and uploads go
-- through the strict is_venture_student().
CREATE OR REPLACE FUNCTION public.can_read_venture(
  v_user_id uuid, v_roll_no text, v_student_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth AS $$
  SELECT
    (v_user_id IS NOT NULL AND v_user_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.email IS NOT NULL
        AND (LOWER(TRIM(ur.email)) = LOWER(TRIM(COALESCE(v_roll_no,'')))
          OR LOWER(TRIM(ur.email)) = LOWER(TRIM(COALESCE(v_student_name,''))))
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
        AND ur.roll_no IS NOT NULL
        AND LOWER(TRIM(ur.roll_no)) = LOWER(TRIM(COALESCE(v_roll_no,'')))
    )
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = (SELECT auth.uid())
        AND u.email IS NOT NULL
        AND (LOWER(TRIM(u.email)) = LOWER(TRIM(COALESCE(v_roll_no,'')))
          OR LOWER(TRIM(u.email)) = LOWER(TRIM(COALESCE(v_student_name,''))))
    )
$$;

REVOKE EXECUTE ON FUNCTION public.can_read_venture(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_venture(uuid, text, text) TO authenticated;

-- Resolves a subcategory's parent KPI once instead of joining in four policies.
CREATE OR REPLACE FUNCTION public.kpi_parent(
  _kpi_id uuid, OUT venture_id uuid, OUT is_locked boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT k.venture_id, k.is_locked FROM public.venture_kpis k WHERE k.id = _kpi_id
$$;

REVOKE EXECUTE ON FUNCTION public.kpi_parent(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kpi_parent(uuid) TO authenticated;

-- --------------------------------------------------------------------------------
REVOKE SELECT ON public.ventures, public.venture_kpis, public.kpi_subcategories FROM anon;

DROP POLICY IF EXISTS "Anyone reads ventures"          ON public.ventures;
DROP POLICY IF EXISTS "Anyone reads venture_kpis"      ON public.venture_kpis;
DROP POLICY IF EXISTS "Anyone reads kpi_subcategories" ON public.kpi_subcategories;
DROP POLICY IF EXISTS "Strict Supabase RLS for ventures"          ON public.ventures;
DROP POLICY IF EXISTS "Strict Supabase RLS for venture_kpis"      ON public.venture_kpis;
DROP POLICY IF EXISTS "Strict Supabase RLS for kpi_subcategories" ON public.kpi_subcategories;

DROP POLICY IF EXISTS "Admins insert ventures"          ON public.ventures;
DROP POLICY IF EXISTS "Admins update ventures"          ON public.ventures;
DROP POLICY IF EXISTS "Admins delete ventures"          ON public.ventures;
DROP POLICY IF EXISTS "Admins insert venture_kpis"      ON public.venture_kpis;
DROP POLICY IF EXISTS "Admins update venture_kpis"      ON public.venture_kpis;
DROP POLICY IF EXISTS "Admins delete venture_kpis"      ON public.venture_kpis;
DROP POLICY IF EXISTS "Admins insert kpi_subcategories" ON public.kpi_subcategories;
DROP POLICY IF EXISTS "Admins update kpi_subcategories" ON public.kpi_subcategories;
DROP POLICY IF EXISTS "Admins delete kpi_subcategories" ON public.kpi_subcategories;

-- --------------------------------------------------------------------------------
-- ventures
CREATE POLICY "ventures: staff read all, student reads own" ON public.ventures
  FOR SELECT TO authenticated
  USING (public.is_staff() OR public.can_read_venture(user_id, roll_no, student_name));

CREATE POLICY "ventures: board inserts" ON public.ventures
  FOR INSERT TO authenticated WITH CHECK (public.is_board());

-- Accepting a proposal creates the venture. A mentor may do that only by assigning
-- themselves, never by handing the student to somebody else.
CREATE POLICY "ventures: mentor inserts own" ON public.ventures
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role((SELECT auth.uid()), 'mentor') AND mentor_id = (SELECT auth.uid())
  );

CREATE POLICY "ventures: board updates" ON public.ventures
  FOR UPDATE TO authenticated
  USING (public.is_board()) WITH CHECK (public.is_board());

CREATE POLICY "ventures: board deletes" ON public.ventures
  FOR DELETE TO authenticated USING (public.is_board());

-- --------------------------------------------------------------------------------
-- venture_kpis. USING sees the row as it was, WITH CHECK as it will be.
CREATE POLICY "kpis: staff read all, student reads own" ON public.venture_kpis
  FOR SELECT TO authenticated
  USING (
    public.is_staff()
    OR EXISTS (
      SELECT 1 FROM public.ventures v
      WHERE v.id = venture_id
        AND public.can_read_venture(v.user_id, v.roll_no, v.student_name)
    )
  );

CREATE POLICY "kpis: mentor or board inserts" ON public.venture_kpis
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_board() OR public.is_mentor_of_venture(venture_id))
    AND (is_locked = false OR public.is_board())
  );

-- The lock rule. A mentor may score an unlocked KPI and may lock it (WITH CHECK
-- deliberately does not test is_locked). Once locked, USING rejects the mentor and only
-- the board matches -- so unlocking and re-scoring belong to admin / academic_board.
CREATE POLICY "kpis: mentor edits unlocked, board edits any" ON public.venture_kpis
  FOR UPDATE TO authenticated
  USING (
    public.is_board()
    OR (public.is_mentor_of_venture(venture_id) AND is_locked = false)
  )
  WITH CHECK (
    public.is_board() OR public.is_mentor_of_venture(venture_id)
  );

CREATE POLICY "kpis: mentor deletes unlocked, board deletes any" ON public.venture_kpis
  FOR DELETE TO authenticated
  USING (
    public.is_board()
    OR (public.is_mentor_of_venture(venture_id) AND is_locked = false)
  );

-- --------------------------------------------------------------------------------
-- kpi_subcategories inherit their parent KPI's venture and lock.
CREATE POLICY "subs: staff read all, student reads own" ON public.kpi_subcategories
  FOR SELECT TO authenticated
  USING (
    public.is_staff()
    OR EXISTS (
      SELECT 1 FROM public.venture_kpis k
      JOIN public.ventures v ON v.id = k.venture_id
      WHERE k.id = kpi_id
        AND public.can_read_venture(v.user_id, v.roll_no, v.student_name)
    )
  );

CREATE POLICY "subs: mentor or board inserts" ON public.kpi_subcategories
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_board()
    OR ((public.kpi_parent(kpi_id)).is_locked = false
        AND public.is_mentor_of_venture((public.kpi_parent(kpi_id)).venture_id))
  );

CREATE POLICY "subs: mentor edits unlocked, board edits any" ON public.kpi_subcategories
  FOR UPDATE TO authenticated
  USING (
    public.is_board()
    OR ((public.kpi_parent(kpi_id)).is_locked = false
        AND public.is_mentor_of_venture((public.kpi_parent(kpi_id)).venture_id))
  )
  WITH CHECK (
    public.is_board()
    OR public.is_mentor_of_venture((public.kpi_parent(kpi_id)).venture_id)
  );

CREATE POLICY "subs: mentor deletes unlocked, board deletes any" ON public.kpi_subcategories
  FOR DELETE TO authenticated
  USING (
    public.is_board()
    OR ((public.kpi_parent(kpi_id)).is_locked = false
        AND public.is_mentor_of_venture((public.kpi_parent(kpi_id)).venture_id))
  );

-- --------------------------------------------------------------------------------
-- rollback: restore the previous (wide-open) behaviour with
--   GRANT SELECT ON public.ventures, public.venture_kpis, public.kpi_subcategories TO anon;
--   CREATE POLICY "Anyone reads ventures" ON public.ventures FOR SELECT USING (true);
--   CREATE POLICY "Anyone reads venture_kpis" ON public.venture_kpis FOR SELECT USING (true);
--   CREATE POLICY "Anyone reads kpi_subcategories" ON public.kpi_subcategories FOR SELECT USING (true);
--   and the nine "Admins insert/update/delete ..." policies using public.is_admin(auth.uid()).
