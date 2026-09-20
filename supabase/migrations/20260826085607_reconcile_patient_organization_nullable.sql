-- NIRVANA Foundation V1
-- Reconcile remote patient organization ownership with the canonical
-- Foundation V1 design: patients.organization_id is intentionally nullable.

ALTER TABLE public.patients
  ALTER COLUMN organization_id DROP NOT NULL;
