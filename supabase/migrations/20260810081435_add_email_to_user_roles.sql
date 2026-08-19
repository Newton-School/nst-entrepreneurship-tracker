-- Accepting a proposal means picking a mentor, and a mentor has to be shown by email.
-- roll_no identifies students only, and auth.users is not reachable through the Data API,
-- so the email is copied onto user_roles where existing RLS already covers it.
--
-- This is a denormalised copy: it does not follow an email change in auth.users, and
-- rows created later (e.g. by the signup trigger) need it set when the role is assigned.

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS email text;

UPDATE public.user_roles ur
SET email = u.email
FROM auth.users u
WHERE u.id = ur.user_id
  AND ur.email IS DISTINCT FROM u.email;
