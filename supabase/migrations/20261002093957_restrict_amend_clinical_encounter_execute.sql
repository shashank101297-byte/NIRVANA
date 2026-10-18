REVOKE ALL ON FUNCTION public.amend_clinical_encounter(uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.amend_clinical_encounter(uuid, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.amend_clinical_encounter(uuid, text, jsonb) TO authenticated;;
