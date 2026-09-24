alter table public.prescriptions
drop constraint if exists prescriptions_status_check;

alter table public.prescriptions
add constraint prescriptions_status_check
check (status in ('Active', 'Cancelled', 'Superseded'));
