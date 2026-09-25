create unique index if not exists prescriptions_one_active_per_encounter_idx
on public.prescriptions (encounter_id)
where status = 'Active';
