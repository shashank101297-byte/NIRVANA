create index if not exists audit_logs_actor_user_id_idx
  on public.audit_logs (actor_user_id);

create index if not exists clinical_record_versions_actor_user_id_idx
  on public.clinical_record_versions (actor_user_id);

create index if not exists clinical_record_versions_patient_id_idx
  on public.clinical_record_versions (patient_id);

create index if not exists clinical_terminology_sets_organization_id_idx
  on public.clinical_terminology_sets (organization_id);

create index if not exists clinical_terminology_values_parent_id_idx
  on public.clinical_terminology_values (parent_id);

create index if not exists prescriptions_created_by_idx
  on public.prescriptions (created_by);

create index if not exists prescriptions_encounter_patient_org_idx
  on public.prescriptions (
    encounter_id,
    patient_id,
    organization_id
  );
