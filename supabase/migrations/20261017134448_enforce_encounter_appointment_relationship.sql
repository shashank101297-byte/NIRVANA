CREATE OR REPLACE FUNCTION private.validate_encounter_appointment_relationship()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.appointment_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.id = NEW.appointment_id
      AND a.patient_id = NEW.patient_id
      AND a.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'ENCOUNTER_APPOINTMENT_PATIENT_ORGANIZATION_MISMATCH';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION private.validate_encounter_appointment_relationship() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS clinical_encounters_validate_appointment_relationship ON public.clinical_encounters;
CREATE TRIGGER clinical_encounters_validate_appointment_relationship
BEFORE INSERT OR UPDATE OF appointment_id, patient_id, organization_id
ON public.clinical_encounters
FOR EACH ROW
EXECUTE FUNCTION private.validate_encounter_appointment_relationship();;
