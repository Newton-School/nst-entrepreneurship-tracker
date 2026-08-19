-- A venture is assigned a mentor when its proposal is accepted.
-- A mentor accepting a proposal is assigned to it automatically; an admin or
-- academic_board member must pick the mentor at accept time.

ALTER TABLE public.ventures
  ADD COLUMN IF NOT EXISTS mentor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ventures_mentor_id_idx ON public.ventures (mentor_id);
