-- student_id is forced to auth.uid() by set_submission_metadata(), so a client never
-- sends it -- but NOT NULL with no default makes it required in the generated
-- TypeScript Insert type. Give it the same default the trigger applies, so the types
-- describe how the table is actually used.

ALTER TABLE public.kpi_submissions
  ALTER COLUMN student_id SET DEFAULT auth.uid();
