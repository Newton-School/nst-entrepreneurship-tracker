-- Private bucket for student proof documents. Not public: these are graded coursework,
-- and a public bucket would hand out permanent unguessable-but-unrevocable URLs with no
-- RLS at all. Clients must mint a short-lived signed URL, which re-runs the SELECT
-- policy below under the caller's JWT.
--
-- Path convention: <venture_id>/<kpi_id>/<uuid>-<filename>
-- venture_id first so a policy can recover it from the object name in one step and
-- reuse the same predicates as the table policies.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kpi-submissions', 'kpi-submissions', false, 26214400,
  ARRAY[
    'application/pdf',
    'image/png','image/jpeg','image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain','application/zip'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- A bare ::uuid cast inside a policy raises on a malformed path, which surfaces as a
-- 500 rather than a clean denial. Return NULL instead and let the policy fail closed.
CREATE OR REPLACE FUNCTION public.path_venture_id(_name text)
RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN (storage.foldername(_name))[1] ~*
         '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN ((storage.foldername(_name))[1])::uuid
  END
$$;

REVOKE EXECUTE ON FUNCTION public.path_venture_id(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.path_venture_id(text) TO authenticated;

DROP POLICY IF EXISTS "kpi proofs: student uploads own" ON storage.objects;
CREATE POLICY "kpi proofs: student uploads own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kpi-submissions'
    AND public.path_venture_id(name) IS NOT NULL
    AND public.is_venture_student(public.path_venture_id(name))
  );

DROP POLICY IF EXISTS "kpi proofs: owner or staff reads" ON storage.objects;
CREATE POLICY "kpi proofs: owner or staff reads" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'kpi-submissions'
    AND public.path_venture_id(name) IS NOT NULL
    AND (public.is_staff() OR public.is_venture_student(public.path_venture_id(name)))
  );

DROP POLICY IF EXISTS "kpi proofs: student deletes own before lock" ON storage.objects;
CREATE POLICY "kpi proofs: student deletes own before lock" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'kpi-submissions'
    AND owner = (SELECT auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM public.kpi_submissions s
      JOIN public.venture_kpis k ON k.id = s.kpi_id
      WHERE s.storage_path = storage.objects.name AND k.is_locked
    )
  );

DROP POLICY IF EXISTS "kpi proofs: board deletes" ON storage.objects;
CREATE POLICY "kpi proofs: board deletes" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'kpi-submissions' AND public.is_board());
