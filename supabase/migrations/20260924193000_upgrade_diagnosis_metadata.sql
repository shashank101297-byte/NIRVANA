alter table public.clinical_encounters
  add column if not exists diagnosis_coding_metadata jsonb not null default '{}'::jsonb;

alter table public.clinical_encounters
  add column if not exists differential_diagnosis_coding_metadata jsonb not null default '{}'::jsonb;

comment on column public.clinical_encounters.diagnosis_coding_metadata is
'Structured coding metadata for modern diagnosis concepts. Designed for ICD-11-ready storage without treating local seed concepts as official ICD-11 codes.';

comment on column public.clinical_encounters.differential_diagnosis_coding_metadata is
'Structured coding metadata for differential diagnosis concepts. Designed for ICD-11-ready storage without treating local seed concepts as official ICD-11 codes.';
