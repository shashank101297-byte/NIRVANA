-- NIRVANA Phase 2B: Clinical workspace foundation
-- Minimal organization-scoped encounter model for future clinical records.

create table if not exists public.clinical_encounters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  encounter_date timestamptz not null default now(),
  encounter_type text not null
    check (encounter_type in ('OPD', 'Follow-up', 'Emergency', 'Day Care')),
  status text not null default 'Open'
    check (status in ('Open', 'Completed', 'Cancelled')),
  chief_complaint text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clinical_encounters_organization_id_idx
  on public.clinical_encounters(organization_id);

create index if not exists clinical_encounters_patient_id_idx
  on public.clinical_encounters(patient_id);

create index if not exists clinical_encounters_created_by_idx
  on public.clinical_encounters(created_by);

alter table public.clinical_encounters enable row level security;

grant select, insert, update on public.clinical_encounters to authenticated;

create policy "clinical_encounters_select_org_member"
on public.clinical_encounters
for select
to authenticated
using (
  private.is_org_member(organization_id)
  and exists (
    select 1
    from public.patients p
    where p.id = patient_id
      and p.organization_id = clinical_encounters.organization_id
  )
);

create policy "clinical_encounters_insert_org_member"
on public.clinical_encounters
for insert
to authenticated
with check (
  private.is_org_member(organization_id)
  and created_by = auth.uid()
  and exists (
    select 1
    from public.patients p
    where p.id = patient_id
      and p.organization_id = clinical_encounters.organization_id
  )
);

create policy "clinical_encounters_update_org_member"
on public.clinical_encounters
for update
to authenticated
using (
  private.is_org_member(organization_id)
  and created_by = auth.uid()
  and exists (
    select 1
    from public.patients p
    where p.id = patient_id
      and p.organization_id = clinical_encounters.organization_id
  )
)
with check (
  private.is_org_member(organization_id)
  and created_by = auth.uid()
  and exists (
    select 1
    from public.patients p
    where p.id = patient_id
      and p.organization_id = clinical_encounters.organization_id
  )
);
