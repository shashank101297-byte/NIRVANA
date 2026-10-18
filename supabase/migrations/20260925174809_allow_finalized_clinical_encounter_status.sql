
alter table public.clinical_encounters
  drop constraint if exists clinical_encounters_status_check;

alter table public.clinical_encounters
  add constraint clinical_encounters_status_check
  check (status = any (array[
    'Open'::text,
    'Completed'::text,
    'Cancelled'::text,
    'Abandoned'::text,
    'Finalized'::text
  ]));
;
