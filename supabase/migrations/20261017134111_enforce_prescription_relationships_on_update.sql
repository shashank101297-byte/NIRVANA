DROP POLICY IF EXISTS prescriptions_update_permission ON public.prescriptions;
CREATE POLICY prescriptions_update_permission ON public.prescriptions
FOR UPDATE TO authenticated
USING (
  created_by = (SELECT auth.uid())
  AND (SELECT private.has_org_permission(organization_id, 'prescription.update'::text))
  AND EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = prescriptions.patient_id
      AND p.organization_id = prescriptions.organization_id
  )
  AND EXISTS (
    SELECT 1 FROM public.clinical_encounters e
    WHERE e.id = prescriptions.encounter_id
      AND e.patient_id = prescriptions.patient_id
      AND e.organization_id = prescriptions.organization_id
  )
)
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND (SELECT private.has_org_permission(organization_id, 'prescription.update'::text))
  AND EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = prescriptions.patient_id
      AND p.organization_id = prescriptions.organization_id
  )
  AND EXISTS (
    SELECT 1 FROM public.clinical_encounters e
    WHERE e.id = prescriptions.encounter_id
      AND e.patient_id = prescriptions.patient_id
      AND e.organization_id = prescriptions.organization_id
  )
);;
