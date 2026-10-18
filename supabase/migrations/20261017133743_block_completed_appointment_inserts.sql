CREATE OR REPLACE FUNCTION private.guard_appointment_completion_requires_finalization()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'Completed' THEN
      RAISE EXCEPTION 'APPOINTMENT_COMPLETION_REQUIRES_CLINICAL_FINALIZATION';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'Completed' AND OLD.status IS DISTINCT FROM 'Completed' THEN
    IF current_setting('nirvana.appointment_completion_via_finalization', true) IS DISTINCT FROM OLD.id::text THEN
      RAISE EXCEPTION 'APPOINTMENT_COMPLETION_REQUIRES_CLINICAL_FINALIZATION';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.clinical_encounters e
      WHERE e.appointment_id = OLD.id
        AND e.patient_id = OLD.patient_id
        AND e.organization_id = OLD.organization_id
        AND e.status = 'Finalized'
        AND e.finalized_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'APPOINTMENT_COMPLETION_REQUIRES_FINALIZED_ENCOUNTER';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS appointments_require_clinical_finalization_for_completion ON public.appointments;
CREATE TRIGGER appointments_require_clinical_finalization_for_completion
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION private.guard_appointment_completion_requires_finalization();;
