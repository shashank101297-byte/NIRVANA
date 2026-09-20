-- Foundation V1: establish organization ownership for patients.
-- Existing legacy patients remain accessible to their creator until migrated
-- into an organization. New organization-scoped patients are visible only
-- to members of that organization.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS organization_id uuid
  REFERENCES public.organizations(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS patients_organization_id_idx
  ON public.patients (organization_id);

-- Replace the previous user-only policies with organization-aware policies.
DROP POLICY IF EXISTS patients_select_own ON public.patients;
DROP POLICY IF EXISTS patients_insert_own ON public.patients;
DROP POLICY IF EXISTS patients_update_own ON public.patients;
DROP POLICY IF EXISTS patients_delete_own ON public.patients;

CREATE POLICY patients_select_scoped
ON public.patients
FOR SELECT
TO authenticated
USING (
  (organization_id IS NOT NULL AND private.is_org_member(organization_id))
  OR
  (organization_id IS NULL AND created_by = auth.uid())
);

CREATE POLICY patients_insert_scoped
ON public.patients
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    organization_id IS NULL
    OR private.is_org_member(organization_id)
  )
);

CREATE POLICY patients_update_scoped
ON public.patients
FOR UPDATE
TO authenticated
USING (
  (organization_id IS NOT NULL AND private.is_org_member(organization_id))
  OR
  (organization_id IS NULL AND created_by = auth.uid())
)
WITH CHECK (
  created_by = auth.uid()
  AND (
    organization_id IS NULL
    OR private.is_org_member(organization_id)
  )
);

CREATE POLICY patients_delete_scoped
ON public.patients
FOR DELETE
TO authenticated
USING (
  (organization_id IS NOT NULL AND private.is_org_member(organization_id))
  OR
  (organization_id IS NULL AND created_by = auth.uid())
);