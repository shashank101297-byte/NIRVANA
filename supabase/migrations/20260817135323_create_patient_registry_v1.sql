create sequence if not exists public.patient_registry_number_seq;

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  patient_code text not null unique default ('NRV-' || lpad(nextval('public.patient_registry_number_seq')::text, 6, '0')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
    organization_id uuid,
  full_name text not null,
  age_years smallint not null check (age_years between 0 and 120),
  sex text not null check (sex in ('Female', 'Male', 'Other')),
  mobile text not null,
  address text not null,
  city text not null,
  district text not null,
  state text not null,
  pincode text not null check (pincode ~ '^[0-9]{6}$'),
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists patients_created_by_idx on public.patients(created_by);
create index if not exists patients_full_name_idx on public.patients(lower(full_name));
create index if not exists patients_mobile_idx on public.patients(mobile);
create index if not exists patients_city_idx on public.patients(city);
create index if not exists patients_district_idx on public.patients(district);

alter table public.patients enable row level security;

create policy patients_select_own
on public.patients
for select
to authenticated
using (created_by = auth.uid());

create policy patients_insert_own
on public.patients
for insert
to authenticated
with check (created_by = auth.uid());

create policy patients_update_own
on public.patients
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy patients_delete_own
on public.patients
for delete
to authenticated
using (created_by = auth.uid());

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists patients_set_updated_at on public.patients;
create trigger patients_set_updated_at
before update on public.patients
for each row execute function public.set_updated_at();