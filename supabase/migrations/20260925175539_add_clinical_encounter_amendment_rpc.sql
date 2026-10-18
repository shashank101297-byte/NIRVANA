
create or replace function public.amend_clinical_encounter(
  p_encounter_id uuid,
  p_reason text,
  p_changes jsonb
)
returns public.clinical_encounters
language plpgsql
set search_path = ''
as $function$
declare
  current_row public.clinical_encounters%rowtype;
  proposed_row public.clinical_encounters%rowtype;
  invalid_key text;
  normalized_reason text;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  normalized_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if normalized_reason is null then
    raise exception 'AMENDMENT_REASON_REQUIRED';
  end if;

  if p_changes is null or jsonb_typeof(p_changes) <> 'object' or p_changes = '{}'::jsonb then
    raise exception 'AMENDMENT_CHANGES_REQUIRED';
  end if;

  select key
    into invalid_key
  from jsonb_object_keys(p_changes) as key
  where key not in (
    'chief_complaint',
    'history_of_present_illness',
    'past_history',
    'personal_history',
    'family_history',
    'drug_allergy_history',
    'examination',
    'assessment',
    'diagnosis',
    'differential_diagnosis',
    'investigations',
    'treatment_plan',
    'follow_up_advice',
    'prakriti',
    'vikriti',
    'dosha',
    'dushya',
    'srotas',
    'agni',
    'koshtha',
    'ama',
    'nidana',
    'samprapti',
    'ayurvedic_diagnosis',
    'ayurvedic_structured_assessment',
    'modern_structured_diagnoses',
    'modern_structured_differential_diagnoses',
    'structured_investigations',
    'diagnosis_coding_metadata',
    'differential_diagnosis_coding_metadata'
  )
  limit 1;

  if invalid_key is not null then
    raise exception 'AMENDMENT_FIELD_NOT_ALLOWED: %', invalid_key;
  end if;

  select *
    into current_row
  from public.clinical_encounters
  where id = p_encounter_id
    and status = 'Finalized'
  for update;

  if not found then
    raise exception 'FINALIZED_CLINICAL_ENCOUNTER_NOT_FOUND';
  end if;

  proposed_row := jsonb_populate_record(current_row, p_changes);

  perform set_config('nirvana.amendment_reason', normalized_reason, true);

  update public.clinical_encounters
  set
    chief_complaint = proposed_row.chief_complaint,
    history_of_present_illness = proposed_row.history_of_present_illness,
    past_history = proposed_row.past_history,
    personal_history = proposed_row.personal_history,
    family_history = proposed_row.family_history,
    drug_allergy_history = proposed_row.drug_allergy_history,
    examination = proposed_row.examination,
    assessment = proposed_row.assessment,
    diagnosis = proposed_row.diagnosis,
    differential_diagnosis = proposed_row.differential_diagnosis,
    investigations = proposed_row.investigations,
    treatment_plan = proposed_row.treatment_plan,
    follow_up_advice = proposed_row.follow_up_advice,
    prakriti = proposed_row.prakriti,
    vikriti = proposed_row.vikriti,
    dosha = proposed_row.dosha,
    dushya = proposed_row.dushya,
    srotas = proposed_row.srotas,
    agni = proposed_row.agni,
    koshtha = proposed_row.koshtha,
    ama = proposed_row.ama,
    nidana = proposed_row.nidana,
    samprapti = proposed_row.samprapti,
    ayurvedic_diagnosis = proposed_row.ayurvedic_diagnosis,
    ayurvedic_structured_assessment = proposed_row.ayurvedic_structured_assessment,
    modern_structured_diagnoses = proposed_row.modern_structured_diagnoses,
    modern_structured_differential_diagnoses = proposed_row.modern_structured_differential_diagnoses,
    structured_investigations = proposed_row.structured_investigations,
    diagnosis_coding_metadata = proposed_row.diagnosis_coding_metadata,
    differential_diagnosis_coding_metadata = proposed_row.differential_diagnosis_coding_metadata,
    amendment_count = coalesce(current_row.amendment_count, 0) + 1
  where id = p_encounter_id
  returning * into current_row;

  return current_row;
end;
$function$;

grant execute on function public.amend_clinical_encounter(uuid, text, jsonb) to authenticated;
;
