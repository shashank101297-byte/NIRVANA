
alter table public.clinical_record_versions
  drop constraint if exists clinical_record_versions_operation_check;

alter table public.clinical_record_versions
  add constraint clinical_record_versions_operation_check
  check (operation in ('BASELINE', 'INSERT', 'UPDATE', 'DELETE', 'FINALIZE', 'AMENDMENT'));
;
