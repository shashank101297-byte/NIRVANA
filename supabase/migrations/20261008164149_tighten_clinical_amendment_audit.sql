
CREATE OR REPLACE FUNCTION private.capture_clinical_record_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  source_row jsonb;
  target_org uuid;
  target_patient uuid;
  target_record uuid;
  target_entity text;
  next_version integer;
  previous_version uuid;
  amendment_reason text;
  clinical_content_changed boolean := false;
begin
  source_row := case when TG_OP = 'DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end;
  target_record := case when TG_OP = 'DELETE' then OLD.id else NEW.id end;
  target_entity := case TG_TABLE_NAME
    when 'clinical_encounters' then 'clinical_encounter'
    when 'prescriptions' then 'prescription'
    when 'prescription_items' then 'prescription_item'
  end;

  if TG_TABLE_NAME = 'prescription_items' then
    select p.organization_id, p.patient_id into target_org, target_patient
    from public.prescriptions p
    where p.id = case when TG_OP = 'DELETE' then OLD.prescription_id else NEW.prescription_id end;
  else
    target_org := case when TG_OP = 'DELETE' then OLD.organization_id else NEW.organization_id end;
    target_patient := case when TG_OP = 'DELETE' then OLD.patient_id else NEW.patient_id end;
  end if;

  if TG_TABLE_NAME = 'clinical_encounters' then
    amendment_reason := nullif(current_setting('nirvana.amendment_reason', true), '');

    if TG_OP = 'UPDATE' then
      clinical_content_changed :=
        (to_jsonb(NEW) - array['updated_at','finalized_at','finalized_by','amendment_count']) is distinct from
        (to_jsonb(OLD) - array['updated_at','finalized_at','finalized_by','amendment_count']);

      if OLD.status = 'Finalized' and clinical_content_changed and amendment_reason is null then
        raise exception 'FINALIZED_RECORD_REQUIRES_AMENDMENT_REASON';
      end if;
    end if;

    if TG_OP = 'INSERT' then
      insert into public.clinical_record_versions
      (organization_id,patient_id,entity_type,record_id,operation,actor_user_id,snapshot,version_number,change_reason,previous_version_id)
      values (target_org,target_patient,target_entity,target_record,'INSERT',auth.uid(),source_row,null,null,null);

    elsif TG_OP = 'UPDATE' and OLD.status is distinct from 'Finalized' and NEW.status = 'Finalized' then
      select id, version_number into previous_version, next_version
      from public.clinical_record_versions
      where entity_type='clinical_encounter' and record_id=NEW.id and version_number is not null
      order by version_number desc, created_at desc limit 1;
      next_version := coalesce(next_version,0)+1;

      insert into public.clinical_record_versions
      (organization_id,patient_id,entity_type,record_id,operation,actor_user_id,snapshot,version_number,change_reason,previous_version_id)
      values (target_org,target_patient,target_entity,target_record,'FINALIZE',auth.uid(),source_row,next_version,'Initial clinical record finalization',previous_version);

    elsif TG_OP = 'UPDATE' and OLD.status = 'Finalized' and clinical_content_changed then
      select id, version_number into previous_version, next_version
      from public.clinical_record_versions
      where entity_type='clinical_encounter' and record_id=NEW.id and version_number is not null
      order by version_number desc, created_at desc limit 1;
      next_version := coalesce(next_version,0)+1;

      insert into public.clinical_record_versions
      (organization_id,patient_id,entity_type,record_id,operation,actor_user_id,snapshot,version_number,change_reason,previous_version_id)
      values (target_org,target_patient,target_entity,target_record,'AMENDMENT',auth.uid(),source_row,next_version,amendment_reason,previous_version);

    elsif TG_OP = 'UPDATE' and OLD.status <> 'Finalized' and clinical_content_changed then
      insert into public.clinical_record_versions
      (organization_id,patient_id,entity_type,record_id,operation,actor_user_id,snapshot)
      values (target_org,target_patient,target_entity,target_record,'UPDATE',auth.uid(),source_row);

    elsif TG_OP = 'DELETE' then
      insert into public.clinical_record_versions
      (organization_id,patient_id,entity_type,record_id,operation,actor_user_id,snapshot)
      values (target_org,target_patient,target_entity,target_record,'DELETE',auth.uid(),source_row);
    end if;
  else
    insert into public.clinical_record_versions
    (organization_id,patient_id,entity_type,record_id,operation,actor_user_id,snapshot)
    values (target_org,target_patient,target_entity,target_record,TG_OP,auth.uid(),source_row);
  end if;

  return case when TG_OP='DELETE' then OLD else NEW end;
end;
$function$;

CREATE OR REPLACE FUNCTION public.amend_clinical_encounter(
  p_encounter_id uuid,
  p_reason text,
  p_changes jsonb
)
RETURNS public.clinical_encounters
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
declare
  current_row public.clinical_encounters%rowtype;
  proposed_row public.clinical_encounters%rowtype;
  invalid_key text;
  normalized_reason text;
  clinical_content_changed boolean := false;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;

  normalized_reason := nullif(btrim(coalesce(p_reason,'')),'');
  if normalized_reason is null then raise exception 'AMENDMENT_REASON_REQUIRED'; end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' or p_changes='{}'::jsonb then
    raise exception 'AMENDMENT_CHANGES_REQUIRED';
  end if;

  select key into invalid_key
  from jsonb_object_keys(p_changes) as key
  where key not in (
    'chief_complaint','history_of_present_illness','past_history','personal_history','family_history',
    'drug_allergy_history','examination','assessment','diagnosis','differential_diagnosis','investigations',
    'treatment_plan','follow_up_advice','prakriti','vikriti','dosha','dushya','srotas','agni','koshtha',
    'ama','nidana','samprapti','ayurvedic_diagnosis','ayurvedic_structured_assessment',
    'modern_structured_diagnoses','modern_structured_differential_diagnoses','structured_investigations',
    'diagnosis_coding_metadata','differential_diagnosis_coding_metadata'
  ) limit 1;

  if invalid_key is not null then raise exception 'AMENDMENT_FIELD_NOT_ALLOWED: %', invalid_key; end if;

  select * into current_row
  from public.clinical_encounters
  where id=p_encounter_id and status='Finalized'
  for update;

  if not found then raise exception 'FINALIZED_CLINICAL_ENCOUNTER_NOT_FOUND'; end if;

  proposed_row := jsonb_populate_record(current_row,p_changes);

  clinical_content_changed :=
    (to_jsonb(proposed_row) - array['updated_at','finalized_at','finalized_by','amendment_count']) is distinct from
    (to_jsonb(current_row) - array['updated_at','finalized_at','finalized_by','amendment_count']);

  if not clinical_content_changed then raise exception 'AMENDMENT_NO_CHANGE'; end if;

  perform set_config('nirvana.amendment_reason',normalized_reason,true);

  update public.clinical_encounters
  set
    chief_complaint=proposed_row.chief_complaint,
    history_of_present_illness=proposed_row.history_of_present_illness,
    past_history=proposed_row.past_history,
    personal_history=proposed_row.personal_history,
    family_history=proposed_row.family_history,
    drug_allergy_history=proposed_row.drug_allergy_history,
    examination=proposed_row.examination,
    assessment=proposed_row.assessment,
    diagnosis=proposed_row.diagnosis,
    differential_diagnosis=proposed_row.differential_diagnosis,
    investigations=proposed_row.investigations,
    treatment_plan=proposed_row.treatment_plan,
    follow_up_advice=proposed_row.follow_up_advice,
    prakriti=proposed_row.prakriti,
    vikriti=proposed_row.vikriti,
    dosha=proposed_row.dosha,
    dushya=proposed_row.dushya,
    srotas=proposed_row.srotas,
    agni=proposed_row.agni,
    koshtha=proposed_row.koshtha,
    ama=proposed_row.ama,
    nidana=proposed_row.nidana,
    samprapti=proposed_row.samprapti,
    ayurvedic_diagnosis=proposed_row.ayurvedic_diagnosis,
    ayurvedic_structured_assessment=proposed_row.ayurvedic_structured_assessment,
    modern_structured_diagnoses=proposed_row.modern_structured_diagnoses,
    modern_structured_differential_diagnoses=proposed_row.modern_structured_differential_diagnoses,
    structured_investigations=proposed_row.structured_investigations,
    diagnosis_coding_metadata=proposed_row.diagnosis_coding_metadata,
    differential_diagnosis_coding_metadata=proposed_row.differential_diagnosis_coding_metadata,
    amendment_count=coalesce(current_row.amendment_count,0)+1
  where id=p_encounter_id
  returning * into current_row;

  return current_row;
end;
$function$;
;
