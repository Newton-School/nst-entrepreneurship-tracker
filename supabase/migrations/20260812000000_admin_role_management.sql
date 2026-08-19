-- Role management panel (/admin).
--
-- Until now a role could only be changed by hand in the Supabase SQL editor: the
-- signup trigger assigns 'student' to everyone, and 20260810100731 revoked
-- INSERT/UPDATE/DELETE on user_roles from `authenticated`, so no client-side write can
-- reach the table. That revoke stays -- this migration adds two SECURITY DEFINER RPCs
-- that are the *only* way in, each of which re-checks the caller's role in the database
-- rather than trusting the UI.
--
-- "Admin" here means role = 'admin' exactly. That is deliberately narrower than
-- public.is_admin(uuid) / is_staff(), which both mean "not a student" -- a mentor or an
-- academic_board member must not be able to promote themselves.
--
-- Bootstrapping: if no account holds 'admin' yet, nothing here can grant the first one
-- (by design). Promote one by hand in the SQL editor, once:
--   UPDATE public.user_roles SET role = 'admin' WHERE email = '<their email>';

-- ---------------------------------------------------------------------------
-- 1. Strict admin predicate
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin_strict()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin_strict() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_strict() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Audit trail
-- ---------------------------------------------------------------------------
-- Role changes are the highest-privilege action in the app, so every one of them is
-- recorded. Emails are denormalised copies so the log still reads correctly after an
-- account is deleted -- which is also why target_user_id carries no FK.

CREATE TABLE IF NOT EXISTS public.role_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  target_email text,
  previous_role public.app_role,
  new_role public.app_role NOT NULL,
  changed_by uuid NOT NULL,
  changed_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS role_change_log_created_at_idx
  ON public.role_change_log (created_at DESC);

ALTER TABLE public.role_change_log ENABLE ROW LEVEL SECURITY;

-- Writes happen only through admin_set_user_role (SECURITY DEFINER), never directly.
REVOKE ALL ON public.role_change_log FROM anon, authenticated;
GRANT SELECT ON public.role_change_log TO authenticated;
GRANT ALL ON public.role_change_log TO service_role;

DROP POLICY IF EXISTS "role_change_log: admins read" ON public.role_change_log;
CREATE POLICY "role_change_log: admins read" ON public.role_change_log
  FOR SELECT TO authenticated
  USING (public.is_admin_strict());

-- ---------------------------------------------------------------------------
-- 3. Directory read
-- ---------------------------------------------------------------------------
-- Reads auth.users rather than user_roles alone, so the panel also lists accounts that
-- have no role row at all -- exactly the accounts that hit "No role is assigned to this
-- account." on sign-in and that an admin needs to see in order to fix.
--
-- user_roles is UNIQUE(user_id, role), not UNIQUE(user_id), so an account can carry
-- more than one row. The lateral join collapses that to the newest row, matching what
-- admin_set_user_role leaves behind (it normalises every account to a single row).

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  roll_no text,
  role public.app_role,
  role_assigned_at timestamptz,
  signed_up_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin_strict() THEN
    RAISE EXCEPTION 'Only an admin can list accounts.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    COALESCE(ur.email, u.email::text),
    ur.roll_no,
    ur.role,
    ur.created_at,
    u.created_at,
    u.last_sign_in_at
  FROM auth.users u
  LEFT JOIN LATERAL (
    SELECT r.email, r.roll_no, r.role, r.created_at
    FROM public.user_roles r
    WHERE r.user_id = u.id
    ORDER BY r.created_at DESC
    LIMIT 1
  ) ur ON true
  WHERE u.deleted_at IS NULL
  ORDER BY COALESCE(ur.email, u.email::text);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Role assignment
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_set_user_role(_user_id uuid, _role public.app_role)
RETURNS public.user_roles
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _caller uuid := (SELECT auth.uid());
  _caller_email text;
  _target_email text;
  _roll_no text;
  _previous public.app_role;
  _row public.user_roles;
BEGIN
  IF NOT public.is_admin_strict() THEN
    RAISE EXCEPTION 'Only an admin can change roles.' USING ERRCODE = '42501';
  END IF;

  -- Self-lockout guard. An admin who demotes themselves cannot undo it, and if they
  -- were the only admin the panel becomes unreachable for everyone.
  IF _user_id = _caller THEN
    RAISE EXCEPTION 'You cannot change your own role. Ask another admin to do it.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = _user_id AND u.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'No account exists with that id.' USING ERRCODE = '23503';
  END IF;

  SELECT u.email::text INTO _target_email FROM auth.users u WHERE u.id = _user_id;
  SELECT u.email::text INTO _caller_email FROM auth.users u WHERE u.id = _caller;

  SELECT r.role INTO _previous
  FROM public.user_roles r WHERE r.user_id = _user_id
  ORDER BY r.created_at DESC LIMIT 1;

  -- Redundant while self-changes are blocked above (the demoting admin is always still
  -- an admin), but it is the invariant that actually matters, so it is asserted here
  -- too rather than being implied by another rule.
  IF _previous = 'admin' AND _role <> 'admin'
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles
       WHERE role = 'admin' AND user_id <> _user_id
     )
  THEN
    RAISE EXCEPTION 'This is the last admin account -- promote another admin first.'
      USING ERRCODE = '42501';
  END IF;

  -- roll_no is captured before the delete below, which would otherwise drop it along
  -- with the superseded row.
  SELECT r.roll_no INTO _roll_no
  FROM public.user_roles r
  WHERE r.user_id = _user_id AND r.roll_no IS NOT NULL
  LIMIT 1;

  DELETE FROM public.user_roles WHERE user_id = _user_id AND role <> _role;

  INSERT INTO public.user_roles (user_id, role, email, roll_no)
  VALUES (_user_id, _role, _target_email, _roll_no)
  ON CONFLICT (user_id, role) DO UPDATE
    SET email   = COALESCE(EXCLUDED.email, public.user_roles.email),
        roll_no = COALESCE(EXCLUDED.roll_no, public.user_roles.roll_no)
  RETURNING * INTO _row;

  IF _previous IS DISTINCT FROM _role THEN
    INSERT INTO public.role_change_log (
      target_user_id, target_email, previous_role, new_role, changed_by, changed_by_email
    )
    VALUES (_user_id, _target_email, _previous, _role, _caller, _caller_email);
  END IF;

  RETURN _row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role) TO authenticated;
