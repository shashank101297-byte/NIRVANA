CREATE OR REPLACE FUNCTION private.guard_finalized_clinical_encounter_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  amendment_reason text;
BEGIN
  IF OLD.status = 'Finalized' THEN
    amendment_reason := nullif(btrim(coalesce(current_setting('nirvana.amendment_reason', true), '')), '');
    IF amendment_reason IS NULL THEN
      RAISE EXCEPTION 'FINALIZED_RECORD_REQUIRES_AMENDMENT_REASON';
    END IF;
    IF NEW.status IS DISTINCT FROM 'Finalized' THEN
      RAISE EXCEPTION 'FINALIZED_RECORD_STATUS_IS_IMMUTABLE';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS clinical_encounters_guard_finalized_update ON public.clinical_encounters;
CREATE TRIGGER clinical_encounters_guard_finalized_update
BEFORE UPDATE ON public.clinical_encounters
FOR EACH ROW
EXECUTE FUNCTION private.guard_finalized_clinical_encounter_update();;
