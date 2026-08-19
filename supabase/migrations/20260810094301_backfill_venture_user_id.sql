-- ventures.user_id is the canonical student link, but proposal acceptance writes the
-- student's email into ventures.roll_no and only sets user_id when a user_roles row
-- already existed. Most students propose before signing up, so user_id stays NULL and
-- the student can never be matched to their own result.
--
-- Fill it in only where exactly one account matches, so an ambiguous match never
-- silently attaches one student's scores to another.

UPDATE public.ventures v
SET user_id = ur.user_id
FROM public.user_roles ur
WHERE v.user_id IS NULL
  AND v.roll_no IS NOT NULL
  AND LOWER(TRIM(ur.email)) = LOWER(TRIM(v.roll_no))
  AND (
    SELECT count(*) FROM public.user_roles u2
    WHERE LOWER(TRIM(u2.email)) = LOWER(TRIM(v.roll_no))
  ) = 1;

-- Same link, applied going forward: when a student signs up after their proposal was
-- accepted, attach any venture waiting on their email.
CREATE OR REPLACE FUNCTION public.link_ventures_to_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    UPDATE public.ventures v
    SET user_id = NEW.user_id
    WHERE v.user_id IS NULL
      AND v.roll_no IS NOT NULL
      AND LOWER(TRIM(v.roll_no)) = LOWER(TRIM(NEW.email));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS user_roles_link_ventures ON public.user_roles;
CREATE TRIGGER user_roles_link_ventures
  AFTER INSERT OR UPDATE OF email ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.link_ventures_to_new_user();
