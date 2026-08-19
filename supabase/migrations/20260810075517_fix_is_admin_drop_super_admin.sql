-- The app_role enum was changed to ('admin','academic_board','mentor','student').
-- is_admin() still referenced the dropped 'super_admin' value, so every call raised
--   ERROR 22P02: invalid input value for enum app_role: "super_admin"
-- which broke every RLS policy that calls it (ventures, venture_kpis,
-- kpi_subcategories, course_mappings, user_roles).
--
-- "Admin" here means staff: anyone who is not a student.

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role <> 'student'
  )
$$;
