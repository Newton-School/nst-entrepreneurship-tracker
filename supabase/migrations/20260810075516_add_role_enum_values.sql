-- Records an enum change made by hand in the Supabase dashboard: app_role gained
-- 'academic_board' and 'mentor'. Without this the migrations cannot be replayed from
-- scratch -- every later migration referencing those values fails with SQLSTATE 22P02.
-- Must stay in its own file: Postgres forbids using a new enum value in the same
-- transaction that adds it.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'academic_board';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'mentor';
