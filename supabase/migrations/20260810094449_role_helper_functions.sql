-- is_admin(uuid) means "not a student", which is too coarse now that mentor and
-- academic_board are distinct roles: it currently grants every mentor write access to
-- every student's scores. These helpers split that apart.
--
-- They take no user argument and read auth.uid() internally. The one-argument form
-- lets a caller ask about somebody else; a zero-argument form can only describe the
-- caller, which is what a policy actually wants.
--
-- SECURITY DEFINER because they read user_roles and ventures, which are themselves
-- RLS-protected -- an invoker-rights helper would see nothing. search_path is pinned,
-- and EXECUTE is revoked from anon.

-- Recreated: the original was cascade-dropped when app_role was rebuilt.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Any non-student. The read audience for score tracking.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role <> 'student'
  )
$$;

-- The only roles permitted to change a locked score.
CREATE OR REPLACE FUNCTION public.is_board()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role IN ('admin','academic_board')
  )
$$;

-- A mentor's write scope is exactly the ventures assigned to them.
CREATE OR REPLACE FUNCTION public.is_mentor_of_venture(_venture_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ventures v
    WHERE v.id = _venture_id AND v.mentor_id = (SELECT auth.uid())
  )
$$;

-- Strict student ownership, used for writes and uploads. Deliberately narrower than
-- can_read_venture, which also matches on student_name and is too loose to gate writes.
CREATE OR REPLACE FUNCTION public.is_venture_student(_venture_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ventures v
    WHERE v.id = _venture_id
      AND (
        v.user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = (SELECT auth.uid())
            AND ur.email IS NOT NULL
            AND v.roll_no IS NOT NULL
            AND LOWER(TRIM(ur.email)) = LOWER(TRIM(v.roll_no))
        )
      )
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_board() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_mentor_of_venture(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_venture_student(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_board() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_mentor_of_venture(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_venture_student(uuid) TO authenticated;
