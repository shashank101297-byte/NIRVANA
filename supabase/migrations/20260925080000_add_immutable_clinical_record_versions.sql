create table if not exists public.clinical_record_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  patient_id uuid null references public.patients(id) on delete restrict,
  entity_type text not null,
  record_id uuid not null,
  operation text not null check (
    operation in ('INSERT', 'UPDATE', 'DELETE', 'BASELINE')
  ),
  actor_user_id uuid null references auth.users(id) on delete set null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),

  constraint clinical_record_versions_entity_type_check
    check (
      entity_type in (
        'clinical_encounter',
        'prescription',
        'prescription_item'
      )
    )
);

create index if not exists clinical_record_versions_record_idx
  on public.clinical_record_versions (
    entity_type,
    record_id,
    created_at
  );

create index if not exists clinical_record_versions_patient_idx
  on public.clinical_record_versions (
    organization_id,
    patient_id,
    created_at
  );

alter table public.clinical_record_versions
  enable row level security;

revoke all on public.clinical_record_versions from anon, authenticated;

grant select on public.clinical_record_versions to authenticated;

drop policy if exists clinical_record_versions_select_permission
  on public.clinical_record_versions;

create policy clinical_record_versions_select_permission
on public.clinical_record_versions
for select
to authenticated
using (
  (
    entity_type = 'clinical_encounter'
    and private.has_org_permission(
      organization_id,
      'encounter.read'
    )
  )
  or
  (
    entity_type in (
      'prescription',
      'prescription_item'
    )
    and private.has_org_permission(
      organization_id,
      'prescription.read'
    )
  )
);

create or replace function private.capture_clinical_record_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  source_row jsonb;
  target_org uuid;
  target_patient uuid;
  target_record uuid;
  target_entity text;
begin
  source_row := case
    when TG_OP = 'DELETE' then to_jsonb(OLD)
    else to_jsonb(NEW)
  end;

  target_record := case
    when TG_OP = 'DELETE' then OLD.id
    else NEW.id
  end;

  target_entity := case TG_TABLE_NAME
    when 'clinical_encounters' then 'clinical_encounter'
    when 'prescriptions' then 'prescription'
    when 'prescription_items' then 'prescription_item'
  end;

  if TG_TABLE_NAME = 'prescription_items' then
    select
      p.organization_id,
      p.patient_id
    into
      target_org,
      target_patient
    from public.prescriptions p
    where p.id = case
      when TG_OP = 'DELETE' then OLD.prescription_id
      else NEW.prescription_id
    end;
  else
    target_org := case
      when TG_OP = 'DELETE'
        then OLD.organization_id
      else NEW.organization_id
    end;

    target_patient := case
      when TG_OP = 'DELETE'
        then OLD.patient_id
      else NEW.patient_id
    end;
  end if;

  insert into public.clinical_record_versions (
    organization_id,
    patient_id,
    entity_type,
    record_id,
    operation,
    actor_user_id,
    snapshot
  )
  values (
    target_org,
    target_patient,
    target_entity,
    target_record,
    TG_OP,
    auth.uid(),
    source_row
  );

  return case
    when TG_OP = 'DELETE' then OLD
    else NEW
  end;
end;
$function$;

drop trigger if exists clinical_encounters_version_trigger
  on public.clinical_encounters;

create trigger clinical_encounters_version_trigger
after insert or update or delete
on public.clinical_encounters
for each row
execute function private.capture_clinical_record_version();

drop trigger if exists prescriptions_version_trigger
  on public.prescriptions;

create trigger prescriptions_version_trigger
after insert or update or delete
on public.prescriptions
for each row
execute function private.capture_clinical_record_version();

drop trigger if exists prescription_items_version_trigger
  on public.prescription_items;

create trigger prescription_items_version_trigger
after insert or update or delete
on public.prescription_items
for each row
execute function private.capture_clinical_record_version();

insert into public.clinical_record_versions (
  organization_id,
  patient_id,
  entity_type,
  record_id,
  operation,
  actor_user_id,
  snapshot
)
select
  e.organization_id,
  e.patient_id,
  'clinical_encounter',
  e.id,
  'BASELINE',
  e.created_by,
  to_jsonb(e)
from public.clinical_encounters e
where not exists (
  select 1
  from public.clinical_record_versions v
  where v.entity_type = 'clinical_encounter'
    and v.record_id = e.id
);

insert into public.clinical_record_versions (
  organization_id,
  patient_id,
  entity_type,
  record_id,
  operation,
  actor_user_id,
  snapshot
)
select
  p.organization_id,
  p.patient_id,
  'prescription',
  p.id,
  'BASELINE',
  p.created_by,
  to_jsonb(p)
from public.prescriptions p
where not exists (
  select 1
  from public.clinical_record_versions v
  where v.entity_type = 'prescription'
    and v.record_id = p.id
);

insert into public.clinical_record_versions (
  organization_id,
  patient_id,
  entity_type,
  record_id,
  operation,
  actor_user_id,
  snapshot
)
select
  p.organization_id,
  p.patient_id,
  'prescription_item',
  pi.id,
  'BASELINE',
  p.created_by,
  to_jsonb(pi)
from public.prescription_items pi
join public.prescriptions p
  on p.id = pi.prescription_id
where not exists (
  select 1
  from public.clinical_record_versions v
  where v.entity_type = 'prescription_item'
    and v.record_id = pi.id
);
