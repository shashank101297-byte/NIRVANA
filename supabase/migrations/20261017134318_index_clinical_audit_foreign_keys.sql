CREATE INDEX IF NOT EXISTS clinical_encounters_finalized_by_idx ON public.clinical_encounters (finalized_by);
CREATE INDEX IF NOT EXISTS clinical_record_versions_previous_version_id_idx ON public.clinical_record_versions (previous_version_id);;
