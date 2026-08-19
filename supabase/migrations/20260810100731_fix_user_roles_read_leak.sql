-- The live policy was named "Users read own roles" but its USING clause was literally
-- `true`, so any signed-in student could read every row of user_roles -- every user's
-- email, roll number and role, i.e. the whole student list and the staff roster.
-- (The original migration defined `user_id = auth.uid() OR is_admin(auth.uid())`;
-- the live version had been widened in the dashboard.)
--
-- Staff still need to read all rows, because the mentor pickers on /proposal and
-- /manageResult list mentors by email.

DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;

CREATE POLICY "user_roles: staff read all, user reads own" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_staff());

-- No INSERT/UPDATE/DELETE policy exists, so RLS already denies those. But the
-- authenticated role holds the grants anyway (this project's default privileges give
-- ALL on new tables), which means the table is protected only by a policy being
-- absent. Withdraw the grants so role assignment cannot become writable by accident.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.user_roles FROM authenticated;
REVOKE ALL ON public.user_roles FROM anon;
