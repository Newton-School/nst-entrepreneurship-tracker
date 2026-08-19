-- Signing up assigns a role only through a trigger on auth.users. That trigger was
-- created once, in the very first migration, and every migration since has only done
-- CREATE OR REPLACE FUNCTION handle_new_user() -- which is a no-op if the trigger
-- itself was dropped in the dashboard. When that happens nothing surfaces at signup:
-- the account is created, no user_roles row appears, and the user only sees
-- "No role is assigned to this account." on their next sign-in.
--
-- Two fixes, both idempotent so replaying this against the live database is safe:
--   1. Re-assert the trigger, and keep re-asserting it in this file going forward.
--   2. Populate user_roles.email. The column was added in 20260810081435, which noted
--      the signup trigger would need to set it, but the trigger was never updated -- so
--      every account created since has email NULL. That also silently disables
--      link_ventures_to_new_user (it returns early on NEW.email IS NULL), leaving
--      students unlinked from the venture accepted under their email.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_roles(user_id, role, roll_no, email)
  VALUES (
    NEW.id,
    'student',
    NEW.raw_user_meta_data->>'roll_no',
    NEW.email
  )
  ON CONFLICT (user_id, role) DO UPDATE
    SET roll_no = COALESCE(EXCLUDED.roll_no, user_roles.roll_no),
        email   = COALESCE(EXCLUDED.email, user_roles.email);
  RETURN NEW;
END;
$function$;

-- Internal machinery: nothing outside the trigger should reach it as an RPC endpoint.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- An email change in auth.users otherwise leaves the denormalised copy stale, and a
-- stale copy is what the mentor pickers and the venture link match on.
CREATE OR REPLACE FUNCTION public.sync_user_role_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.user_roles SET email = NEW.email WHERE user_id = NEW.id;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.sync_user_role_email() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
CREATE TRIGGER on_auth_user_email_changed
AFTER UPDATE OF email ON auth.users
FOR EACH ROW WHEN (OLD.email IS DISTINCT FROM NEW.email)
EXECUTE FUNCTION public.sync_user_role_email();

-- Backfill 1: accounts left without any role row while the trigger was missing.
-- Everyone lands on 'student' -- the trigger has never assigned anything else, and
-- guessing staff from an email pattern would hand out staff access by accident. Any
-- staff account caught by this has to be promoted by hand afterwards (see below).
INSERT INTO public.user_roles (user_id, role, roll_no, email)
SELECT u.id, 'student', u.raw_user_meta_data->>'roll_no', u.email
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Backfill 2: rows created after the email column was added but before this migration.
UPDATE public.user_roles ur
SET email = u.email
FROM auth.users u
WHERE u.id = ur.user_id
  AND ur.email IS DISTINCT FROM u.email;

-- Backfill 2 fires user_roles_link_ventures (AFTER UPDATE OF email), which attaches any
-- venture still waiting on that email -- so the venture link repairs itself here too.

-- To promote a staff account that backfill 1 restored as a student:
--   UPDATE public.user_roles SET role = 'admin' WHERE email = '<their email>';
-- Valid roles: 'admin', 'academic_board', 'mentor', 'student'.
