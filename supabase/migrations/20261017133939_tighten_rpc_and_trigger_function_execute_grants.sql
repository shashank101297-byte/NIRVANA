REVOKE EXECUTE ON FUNCTION public.finalize_clinical_encounter(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION private.audit_clinical_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.capture_clinical_record_version() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.capture_prescription_amendment_before_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.guard_finalized_clinical_encounter_update() FROM PUBLIC, anon, authenticated;;
