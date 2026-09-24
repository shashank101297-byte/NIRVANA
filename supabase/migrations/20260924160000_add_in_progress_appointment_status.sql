alter table public.appointments
drop constraint if exists appointments_status_check;

alter table public.appointments
add constraint appointments_status_check
check (
  status in (
    'Scheduled',
    'Confirmed',
    'In Progress',
    'Completed',
    'Cancelled',
    'No-show'
  )
);
