create or replace function public.create_prescription_transaction(
  p_organization_id uuid,
  p_patient_id uuid,
  p_encounter_id uuid,
  p_notes text default '',
  p_change_reason text default '',
  p_supersedes_prescription_id uuid default null,
  p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_prescription_id uuid;
  v_item jsonb;
  v_line_no integer := 0;
  v_previous_status text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not private.has_org_permission(
    p_organization_id,
    'prescription.create'
  ) then
    raise exception 'Insufficient permission to create prescriptions';
  end if;

  if not exists (
    select 1 from public.patients p
    where p.id = p_patient_id
      and p.organization_id = p_organization_id
  ) then
    raise exception 'Patient does not belong to the selected organization';
  end if;

  if not exists (
    select 1 from public.clinical_encounters e
    where e.id = p_encounter_id
      and e.patient_id = p_patient_id
      and e.organization_id = p_organization_id
  ) then
    raise exception 'Encounter does not belong to the selected patient and organization';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one prescription item is required';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) item
    where nullif(trim(coalesce(item->>'medicine_name', '')), '') is null
  ) then
    raise exception 'Every prescription item requires a medicine name';
  end if;

  if p_supersedes_prescription_id is not null then
    if not private.has_org_permission(
      p_organization_id,
      'prescription.update'
    ) then
      raise exception 'Insufficient permission to modify an existing prescription';
    end if;

    select p.status
    into v_previous_status
    from public.prescriptions p
    where p.id = p_supersedes_prescription_id
      and p.encounter_id = p_encounter_id
      and p.patient_id = p_patient_id
      and p.organization_id = p_organization_id
    for update;

    if not found then
      raise exception 'Previous prescription was not found for this encounter';
    end if;

    if v_previous_status <> 'Active' then
      raise exception 'Only an active prescription can be modified';
    end if;

    update public.prescriptions
    set
      notes = coalesce(trim(p_notes), ''),
      change_reason = coalesce(trim(p_change_reason), ''),
      updated_at = now()
    where id = p_supersedes_prescription_id;

    delete from public.prescription_items
    where prescription_id = p_supersedes_prescription_id;

    v_prescription_id := p_supersedes_prescription_id;

  else
    insert into public.prescriptions (
      organization_id,
      patient_id,
      encounter_id,
      created_by,
      status,
      notes,
      supersedes_prescription_id,
      change_reason
    )
    values (
      p_organization_id,
      p_patient_id,
      p_encounter_id,
      v_user_id,
      'Active',
      coalesce(trim(p_notes), ''),
      null,
      coalesce(trim(p_change_reason), '')
    )
    returning id into v_prescription_id;
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    v_line_no := v_line_no + 1;

    insert into public.prescription_items (
      prescription_id,
      line_no,
      therapy_system,
      medicine_name,
      formulation,
      strength,
      dose,
      route,
      frequency,
      timing,
      duration_value,
      duration_unit,
      quantity,
      anupana,
      instructions
    )
    values (
      v_prescription_id,
      v_line_no,
      case
        when v_item->>'therapy_system' in ('Ayurvedic', 'Modern')
          then v_item->>'therapy_system'
        else 'Ayurvedic'
      end,
      trim(v_item->>'medicine_name'),
      coalesce(trim(v_item->>'formulation'), ''),
      coalesce(trim(v_item->>'strength'), ''),
      coalesce(trim(v_item->>'dose'), ''),
      coalesce(trim(v_item->>'route'), 'Oral'),
      coalesce(trim(v_item->>'frequency'), ''),
      coalesce(trim(v_item->>'timing'), ''),
      case
        when nullif(v_item->>'duration_value', '') is null then null
        else (v_item->>'duration_value')::numeric
      end,
      case
        when v_item->>'duration_unit' in ('Days', 'Weeks', 'Months')
          then v_item->>'duration_unit'
        else 'Days'
      end,
      coalesce(trim(v_item->>'quantity'), ''),
      coalesce(trim(v_item->>'anupana'), ''),
      coalesce(trim(v_item->>'instructions'), '')
    );
  end loop;

  return v_prescription_id;
end;
$$;

revoke execute on function public.create_prescription_transaction(uuid, uuid, uuid, text, text, uuid, jsonb)
from public, anon, authenticated;

grant execute on function public.create_prescription_transaction(uuid, uuid, uuid, text, text, uuid, jsonb)
to authenticated;
