create table if not exists public.clinical_encounters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  encounter_date timestamptz not null default now(),
  encounter_type text not null check (encounter_type in ('OPD', 'Follow-up', 'Emergency', 'Day Care')),
  status text not null default 'Open' check (status in ('Open', 'Completed', 'Cancelled')),
  chief_complaint text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clinical_encounters_organization_id_idx on public.clinical_encounters(organization_id);
create index if not exists clinical_encounters_patient_id_idx on public.clinical_encounters(patient_id);
create index if not exists clinical_encounters_created_by_idx on public.clinical_encounters(created_by);

alter table public.clinical_encounters enable row level security;

grant select, insert, update on public.clinical_encounters to authenticated;



