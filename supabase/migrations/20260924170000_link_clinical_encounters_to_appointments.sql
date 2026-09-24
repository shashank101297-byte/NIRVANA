alter table public.clinical_encounters
add column if not exists appointment_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'clinical_encounters_appointment_id_fkey'
  ) then
    alter table public.clinical_encounters
      add constraint clinical_encounters_appointment_id_fkey
      foreign key (appointment_id)
      references public.appointments(id)
      on delete set null;
  end if;
end $$;

create index if not exists clinical_encounters_appointment_id_idx
  on public.clinical_encounters(appointment_id);
