-- NIRVANA Foundation V1
-- Clinical Encounter Documentation Layer
--
-- Extends the existing clinical_encounters foundation table.
-- Does not modify existing RLS policies.

alter table public.clinical_encounters
  add column if not exists history_of_present_illness text not null default '',
  add column if not exists past_history text not null default '',
  add column if not exists personal_history text not null default '',
  add column if not exists family_history text not null default '',
  add column if not exists drug_allergy_history text not null default '',
  add column if not exists examination text not null default '',
  add column if not exists assessment text not null default '',
  add column if not exists diagnosis text not null default '',
  add column if not exists differential_diagnosis text not null default '',
  add column if not exists investigations text not null default '',
  add column if not exists treatment_plan text not null default '',
  add column if not exists follow_up_advice text not null default '';

-- Ayurveda-first clinical assessment
alter table public.clinical_encounters
  add column if not exists prakriti text not null default '',
  add column if not exists vikriti text not null default '',
  add column if not exists dosha text not null default '',
  add column if not exists dushya text not null default '',
  add column if not exists srotas text not null default '',
  add column if not exists agni text not null default '',
  add column if not exists koshtha text not null default '',
  add column if not exists ama text not null default '',
  add column if not exists nidana text not null default '',
  add column if not exists samprapti text not null default '',
  add column if not exists ayurvedic_diagnosis text not null default '';
