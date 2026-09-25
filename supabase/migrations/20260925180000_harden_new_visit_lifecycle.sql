-- Allow an encounter shell created for a New Visit to be explicitly abandoned.
alter table public.clinical_encounters
  drop constraint if exists clinical_encounters_status_check;

alter table public.clinical_encounters
  add constraint clinical_encounters_status_check
  check (
    status = any (
      array[
        'Open'::text,
        'Completed'::text,
        'Cancelled'::text,
        'Abandoned'::text
      ]
    )
  );

-- Preserve the appointment status that existed immediately before
-- the consultation was opened. This allows a discarded consultation
-- to restore Scheduled/Confirmed safely.
alter table public.clinical_encounters
  add column if not exists appointment_previous_status text;

alter table public.clinical_encounters
  drop constraint if exists clinical_encounters_appointment_previous_status_check;

alter table public.clinical_encounters
  add constraint clinical_encounters_appointment_previous_status_check
  check (
    appointment_previous_status is null
    or appointment_previous_status = any (
      array[
        'Scheduled'::text,
        'Confirmed'::text
      ]
    )
  );
