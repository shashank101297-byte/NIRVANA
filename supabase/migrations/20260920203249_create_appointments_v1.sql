create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete restrict,

  patient_id uuid not null
    references public.patients(id)
    on delete restrict,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  assigned_to uuid
    references auth.users(id)
    on delete set null,

  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,

  appointment_type text not null default 'OPD'
    check (
      appointment_type in (
        'OPD',
        'Follow-up',
        'Emergency',
        'Day Care',
        'Teleconsultation'
      )
    ),

  status text not null default 'Scheduled'
    check (
      status in (
        'Scheduled',
        'Confirmed',
        'Completed',
        'Cancelled',
        'No-show'
      )
    ),

  reason text not null default '',
  notes text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint appointments_time_order_check
    check (scheduled_end > scheduled_start)
);

create index if not exists appointments_organization_id_idx
  on public.appointments (organization_id);

create index if not exists appointments_patient_id_idx
  on public.appointments (patient_id);

create index if not exists appointments_scheduled_start_idx
  on public.appointments (scheduled_start);

create index if not exists appointments_assigned_to_idx
  on public.appointments (assigned_to);

create index if not exists appointments_org_start_idx
  on public.appointments (organization_id, scheduled_start);

alter table public.appointments enable row level security;

create policy appointments_select_org_member
  on public.appointments
  for select
  to authenticated
  using (
    private.is_org_member(organization_id)
  );

create policy appointments_insert_org_member
  on public.appointments
  for insert
  to authenticated
  with check (
    private.is_org_member(organization_id)
    and created_by = auth.uid()
    and exists (
      select 1
      from public.patients p
      where p.id = appointments.patient_id
        and p.organization_id = appointments.organization_id
    )
  );

create policy appointments_update_org_member
  on public.appointments
  for update
  to authenticated
  using (
    private.is_org_member(organization_id)
  )
  with check (
    private.is_org_member(organization_id)
    and exists (
      select 1
      from public.patients p
      where p.id = appointments.patient_id
        and p.organization_id = appointments.organization_id
    )
  );

create policy appointments_delete_org_member
  on public.appointments
  for delete
  to authenticated
  using (
    private.is_org_member(organization_id)
  );

revoke all on table public.appointments from anon;
revoke all on table public.appointments from authenticated;
revoke all on table public.appointments from service_role;

grant select, insert, update, delete
  on table public.appointments
  to authenticated;

grant select, insert, update, delete, references, trigger, truncate
  on table public.appointments
  to service_role;
