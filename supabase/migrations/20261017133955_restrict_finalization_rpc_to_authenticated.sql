REVOKE EXECUTE ON FUNCTION public.finalize_clinical_encounter(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_clinical_encounter(uuid) TO authenticated;;
