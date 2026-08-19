-- Records a change already made by hand in the Supabase dashboard: proposal no longer
-- stores a free-text name/email pair, it points at the submitting account instead.
-- Written idempotently so replaying it against the live database is a no-op.

ALTER TABLE public.proposal
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.proposal DROP COLUMN IF EXISTS name;
ALTER TABLE public.proposal DROP COLUMN IF EXISTS email;

CREATE INDEX IF NOT EXISTS proposal_user_id_idx ON public.proposal (user_id);
