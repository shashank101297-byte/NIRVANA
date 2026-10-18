CREATE OR REPLACE FUNCTION private.guard_finalized_clinical_encounter_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  amendment_reason text;
BEGIN
  IF OLD.status IS DISTINCT FROM 'Finalized' AND NEW.status = 'Finalized' THEN
    IF current_setting('nirvana.clinical_finalization_via_rpc', true) IS DISTINCT FROM OLD.id::text THEN
      RAISE EXCEPTION 'CLINICAL_FINALIZATION_REQUIRES_APPROVED_WORKFLOW';
    END IF;
    IF NEW.finalized_at IS NULL OR NEW.finalized_by IS NULL THEN
      RAISE EXCEPTION 'FINALIZATION_METADATA_REQUIRED';
    END IF;
  END IF;

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

  PERFORM set_config('nirvana.clinical_finalization_via_rpc', p_encounter_id::text, true);
  UPDATE public.clinical_encounters
  SET status = 'Finalized',
      finalized_at = COALESCE(finalized_at, now()),
      finalized_by = COALESCE(finalized_by, auth.uid())
  WHERE id = p_encounter_id AND status = 'Open'
  RETURNING * INTO result;
  PERFORM set_config('nirvana.clinical_finalization_via_rpc', '', true);

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
