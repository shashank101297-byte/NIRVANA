-- Prevent a prescription from being reassigned to an encounter
-- belonging to a different patient or organization.

alter table public.clinical_encounters
  add constraint clinical_encounters_id_patient_org_key
  unique (id, patient_id, organization_id);

alter table public.prescriptions
  add constraint prescriptions_encounter_patient_org_fkey
  foreign key (encounter_id, patient_id, organization_id)
  references public.clinical_encounters (id, patient_id, organization_id)
  on delete restrict;
