-- public.is_admin(uuid) is executable by anon and reachable as /rest/v1/rpc/is_admin,
-- so anyone could ask "is this user id staff?" for any uuid they got hold of.
--
-- It cannot simply be revoked from anon while the course_mappings read policy calls it:
-- Postgres checks EXECUTE privilege when the expression is evaluated, and guarding it
-- behind `auth.uid() IS NOT NULL AND ...` does NOT avoid that -- an anonymous read then
-- fails with "permission denied for function is_admin" instead of returning the
-- published rows.
--
-- Split the policy by role instead. Policies are OR'd per role, and an anonymous caller
-- only ever evaluates the anon policy, which never mentions the function.

DROP POLICY IF EXISTS "Anyone reads published mappings" ON public.course_mappings;

CREATE POLICY "mappings: anon reads published" ON public.course_mappings
  FOR SELECT TO anon
  USING (published = true);

CREATE POLICY "mappings: staff read all, others read published" ON public.course_mappings
  FOR SELECT TO authenticated
  USING (published = true OR public.is_admin((SELECT auth.uid())));

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
