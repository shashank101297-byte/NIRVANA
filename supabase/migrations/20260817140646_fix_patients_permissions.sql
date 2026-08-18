grant select, insert, update, delete
on table public.patients
to authenticated;

grant usage, select
on sequence public.patient_registry_number_seq
to authenticated;
