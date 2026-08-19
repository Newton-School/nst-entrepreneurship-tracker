-- Pure Supabase Database-level Row Level Security (RLS) Policy
-- PostgreSQL drops unauthorized rows at the database kernel level so NO un-owned data ever leaves Supabase over HTTP

-- 1. Helper function for venture ownership & admin check in PostgreSQL
CREATE OR REPLACE FUNCTION public.can_read_venture(v_user_id uuid, v_roll_no text, v_student_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT 
    -- Admin & Super Admin bypass (Faculty access)
    public.is_admin(auth.uid())
    OR
    -- Direct match on user_id UUID
    (v_user_id IS NOT NULL AND v_user_id = auth.uid())
    OR
    -- Match against user_roles (roll_no or email)
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.roll_no IS NOT NULL
        AND (
          (v_roll_no IS NOT NULL AND LOWER(TRIM(ur.roll_no)) = LOWER(TRIM(v_roll_no)))
          OR (v_student_name IS NOT NULL AND LOWER(TRIM(ur.roll_no)) = LOWER(TRIM(v_student_name)))
        )
    )
    OR
    -- Match against auth.users email directly
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND (
          (v_roll_no IS NOT NULL AND LOWER(TRIM(u.email)) = LOWER(TRIM(v_roll_no)))
          OR (v_student_name IS NOT NULL AND LOWER(TRIM(u.email)) = LOWER(TRIM(v_student_name)))
          OR (
            u.raw_user_meta_data->>'roll_no' IS NOT NULL 
            AND v_roll_no IS NOT NULL 
            AND LOWER(TRIM(u.raw_user_meta_data->>'roll_no')) = LOWER(TRIM(v_roll_no))
          )
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_read_venture(uuid, text, text) TO authenticated;

-- 2. Strict RLS Policy on ventures table
ALTER TABLE public.ventures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads ventures" ON public.ventures;
DROP POLICY IF EXISTS "Users read own ventures or admins read all" ON public.ventures;
DROP POLICY IF EXISTS "Enforce RBAC for ventures select" ON public.ventures;
DROP POLICY IF EXISTS "Strict Supabase RLS for ventures" ON public.ventures;

CREATE POLICY "Strict Supabase RLS for ventures" ON public.ventures
FOR SELECT TO authenticated
USING (
  public.can_read_venture(user_id, roll_no, student_name)
);

-- 3. Strict RLS Policy on venture_kpis table
ALTER TABLE public.venture_kpis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads venture_kpis" ON public.venture_kpis;
DROP POLICY IF EXISTS "Enforce RBAC for venture_kpis select" ON public.venture_kpis;
DROP POLICY IF EXISTS "Strict Supabase RLS for venture_kpis" ON public.venture_kpis;

CREATE POLICY "Strict Supabase RLS for venture_kpis" ON public.venture_kpis
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ventures v
    WHERE v.id = public.venture_kpis.venture_id
      AND public.can_read_venture(v.user_id, v.roll_no, v.student_name)
  )
);

-- 4. Strict RLS Policy on kpi_subcategories table
ALTER TABLE public.kpi_subcategories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads kpi_subcategories" ON public.kpi_subcategories;
DROP POLICY IF EXISTS "Enforce RBAC for kpi_subcategories select" ON public.kpi_subcategories;
DROP POLICY IF EXISTS "Strict Supabase RLS for kpi_subcategories" ON public.kpi_subcategories;

CREATE POLICY "Strict Supabase RLS for kpi_subcategories" ON public.kpi_subcategories
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.venture_kpis k
    JOIN public.ventures v ON v.id = k.venture_id
    WHERE k.id = public.kpi_subcategories.kpi_id
      AND public.can_read_venture(v.user_id, v.roll_no, v.student_name)
  )
);
