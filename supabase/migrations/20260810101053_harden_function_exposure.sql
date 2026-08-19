-- 1. path_venture_id is called from the storage.objects policies, so an attacker-
--    controlled search_path could change which function `storage.foldername` resolves
--    to. Pin it. Every reference inside is already schema-qualified, so '' is safe.
CREATE OR REPLACE FUNCTION public.path_venture_id(_name text)
RETURNS uuid LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE
    WHEN (storage.foldername(_name))[1] ~*
         '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN ((storage.foldername(_name))[1])::uuid
  END
$$;

REVOKE EXECUTE ON FUNCTION public.path_venture_id(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.path_venture_id(text) TO authenticated;

-- 2. Trigger functions default to EXECUTE for PUBLIC, so they show up as
--    /rest/v1/rpc/<name> endpoints. Postgres refuses to run a trigger function called
--    directly, so this is not exploitable today -- but they are internal machinery and
--    nothing outside the trigger should be able to reach them.
REVOKE EXECUTE ON FUNCTION public.set_submission_metadata() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_ventures_to_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.stamp_kpi_evaluation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_obtain_grade() FROM PUBLIC, anon, authenticated;

-- kpi_parent(uuid) would let a signed-in user read the venture and lock state of any
-- KPI id they can guess. It is only needed inside the kpi_subcategories policies, which
-- evaluate as the invoking role, so it must stay executable -- but it returns nothing
-- beyond what those policies already gate, and KPI ids are not enumerable.
