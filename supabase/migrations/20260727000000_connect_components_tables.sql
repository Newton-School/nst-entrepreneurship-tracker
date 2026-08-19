-- Migration: Connect components to Supabase
-- Tables: ventures, venture_kpis, kpi_subcategories, evaluations, residency_applications

-- 1. Ventures Table
CREATE TABLE IF NOT EXISTS public.ventures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  roll_no TEXT,
  student_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Venture KPIs Table
CREATE TABLE IF NOT EXISTS public.venture_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES public.ventures(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  obtain_grade TEXT NOT NULL,
  total_grade NUMERIC NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. KPI Subcategories Table
CREATE TABLE IF NOT EXISTS public.kpi_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID NOT NULL REFERENCES public.venture_kpis(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  obtain_grade TEXT NOT NULL,
  total_grade NUMERIC NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Evaluations Table
CREATE TABLE IF NOT EXISTS public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  evaluator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  course_id TEXT NOT NULL,
  rubric_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Residency Applications Table
CREATE TABLE IF NOT EXISTS public.residency_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  venture_name TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'Idea',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ventures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venture_kpis TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kpi_subcategories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.residency_applications TO authenticated;

GRANT SELECT ON public.ventures TO anon;
GRANT SELECT ON public.venture_kpis TO anon;
GRANT SELECT ON public.kpi_subcategories TO anon;
GRANT SELECT ON public.evaluations TO anon;
GRANT SELECT ON public.residency_applications TO anon;

GRANT ALL ON public.ventures TO service_role;
GRANT ALL ON public.venture_kpis TO service_role;
GRANT ALL ON public.kpi_subcategories TO service_role;
GRANT ALL ON public.evaluations TO service_role;
GRANT ALL ON public.residency_applications TO service_role;

-- Enable Row Level Security
ALTER TABLE public.ventures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venture_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residency_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone reads ventures" ON public.ventures FOR SELECT USING (true);
CREATE POLICY "Admins insert ventures" ON public.ventures FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update ventures" ON public.ventures FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins delete ventures" ON public.ventures FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Anyone reads venture_kpis" ON public.venture_kpis FOR SELECT USING (true);
CREATE POLICY "Admins insert venture_kpis" ON public.venture_kpis FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update venture_kpis" ON public.venture_kpis FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins delete venture_kpis" ON public.venture_kpis FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Anyone reads kpi_subcategories" ON public.kpi_subcategories FOR SELECT USING (true);
CREATE POLICY "Admins insert kpi_subcategories" ON public.kpi_subcategories FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update kpi_subcategories" ON public.kpi_subcategories FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins delete kpi_subcategories" ON public.kpi_subcategories FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Anyone reads evaluations" ON public.evaluations FOR SELECT USING (true);
CREATE POLICY "Authenticated insert evaluations" ON public.evaluations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Anyone reads residency_applications" ON public.residency_applications FOR SELECT USING (true);
CREATE POLICY "Authenticated insert residency_applications" ON public.residency_applications FOR INSERT TO authenticated WITH CHECK (true);
