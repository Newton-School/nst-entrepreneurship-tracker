-- This project carries default privileges that grant ALL on every new table in `public`
-- to both anon and authenticated. So the explicit "GRANT SELECT, INSERT, DELETE" on
-- kpi_submissions did not restrict anything -- anon came out with UPDATE and TRUNCATE
-- too, and the table was only append-only by accident of there being no UPDATE policy.
--
-- RLS was still holding the line (anon has no auth.uid(), so every policy evaluated
-- false), but a table should not depend on a missing policy for its integrity.

REVOKE ALL ON public.kpi_submissions FROM anon;
REVOKE UPDATE, TRUNCATE, REFERENCES, TRIGGER ON public.kpi_submissions FROM authenticated;

-- Same reasoning for the result tables: anon should hold nothing at all.
REVOKE ALL ON public.ventures          FROM anon;
REVOKE ALL ON public.venture_kpis      FROM anon;
REVOKE ALL ON public.kpi_subcategories FROM anon;
