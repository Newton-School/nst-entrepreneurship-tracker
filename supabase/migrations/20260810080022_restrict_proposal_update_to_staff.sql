-- "Authenticated updates proposal" was USING (true) WITH CHECK (true) TO authenticated,
-- so any signed-in user -- including the student who submitted it -- could accept or
-- reject any proposal by calling the API directly. Hiding the buttons in the UI is not
-- enforcement. Accepting/rejecting is staff-only: admin, academic_board, mentor.

DROP POLICY IF EXISTS "Authenticated updates proposal" ON public.proposal;

CREATE POLICY "Staff update proposal" ON public.proposal
  FOR UPDATE TO authenticated
  USING (public.is_admin((SELECT auth.uid())))
  WITH CHECK (public.is_admin((SELECT auth.uid())));
