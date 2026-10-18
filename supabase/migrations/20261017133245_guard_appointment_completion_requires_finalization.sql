CREATE OR REPLACE FUNCTION private.guard_appointment_completion_requires_finalization()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
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
BEFORE UPDATE OF status ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION private.guard_appointment_completion_requires_finalization();

CREATE OR REPLACE FUNCTION public.finalize_clinical_encounter(p_encounter_id uuid)
RETURNS public.clinical_encounters
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  result public.clinical_encounters;
  appointment_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
  END IF;

  UPDATE public.clinical_encounters
  SET status = 'Finalized',
      finalized_at = COALESCE(finalized_at, now()),
      finalized_by = COALESCE(finalized_by, auth.uid())
  WHERE id = p_encounter_id AND status = 'Open'
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'CLINICAL_ENCOUNTER_NOT_OPEN';
  END IF;

  IF result.appointment_id IS NOT NULL THEN
    SELECT status INTO appointment_status
    FROM public.appointments
    WHERE id = result.appointment_id
      AND patient_id = result.patient_id
      AND organization_id = result.organization_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'LINKED_APPOINTMENT_NOT_FOUND';
    END IF;

    IF appointment_status = 'In Progress' THEN
      PERFORM set_config('nirvana.appointment_completion_via_finalization', result.appointment_id::text, true);
      UPDATE public.appointments
      SET status = 'Completed'
      WHERE id = result.appointment_id
        AND patient_id = result.patient_id
        AND organization_id = result.organization_id
        AND status = 'In Progress';
      PERFORM set_config('nirvana.appointment_completion_via_finalization', '', true);
    ELSIF appointment_status <> 'Completed' THEN
      RAISE EXCEPTION 'APPOINTMENT_NOT_IN_PROGRESS';
    END IF;
  END IF;

  RETURN result;
END;
$function$;;
