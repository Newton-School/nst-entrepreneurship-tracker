-- Account management (/admin): audit trail for accounts created and deleted through the
-- Auth admin API (see src/lib/account-admin.ts), plus two foreign keys that made deleting
-- an account either impossible or destructive.

-- course_mappings.updated_by had no ON DELETE action, so deleting anyone who had ever
-- saved a mapping failed outright.
ALTER TABLE public.course_mappings
  DROP CONSTRAINT IF EXISTS course_mappings_updated_by_fkey;

ALTER TABLE public.course_mappings
  ADD CONSTRAINT course_mappings_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ventures.user_id cascaded, so removing a student took their venture, its KPIs and every
-- score with it. The venture is a graded record and carries roll_no and student_name of
-- its own; user_roles_link_ventures re-attaches it if the student is added back.
ALTER TABLE public.ventures
  DROP CONSTRAINT IF EXISTS ventures_user_id_fkey;

ALTER TABLE public.ventures
  ADD CONSTRAINT ventures_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.account_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL CHECK (action IN ('created', 'deleted')),
  target_user_id uuid NOT NULL,
  target_email text,
  target_roll_no text,
  role public.app_role,
  actor_id uuid NOT NULL,
  actor_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_change_log_created_at_idx
  ON public.account_change_log (created_at DESC);

ALTER TABLE public.account_change_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.account_change_log FROM anon, authenticated;
GRANT SELECT ON public.account_change_log TO authenticated;
GRANT ALL ON public.account_change_log TO service_role;

DROP POLICY IF EXISTS "account_change_log: admins read" ON public.account_change_log;
CREATE POLICY "account_change_log: admins read" ON public.account_change_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
    )
  );
