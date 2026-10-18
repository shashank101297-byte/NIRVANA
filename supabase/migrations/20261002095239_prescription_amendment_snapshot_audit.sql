CREATE OR REPLACE FUNCTION private.capture_prescription_amendment_before_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_reason text;
  v_previous_version uuid;
  v_next_version integer;
  v_snapshot jsonb;
BEGIN
  v_reason := nullif(btrim(coalesce(NEW.change_reason, '')), '');

  -- Only treat an actual prescription edit with a supplied reason as a formal amendment.
  IF OLD.status = 'Active'
     AND NEW.status = 'Active'
     AND NEW.updated_at IS DISTINCT FROM OLD.updated_at
     AND v_reason IS NOT NULL
  THEN
    SELECT id, version_number
      INTO v_previous_version, v_next_version
    FROM public.clinical_record_versions
    WHERE entity_type = 'prescription'
      AND record_id = OLD.id
      AND version_number IS NOT NULL
    ORDER BY version_number DESC, created_at DESC
    LIMIT 1;

    v_next_version := coalesce(v_next_version, 0) + 1;

    -- Capture the complete PRE-change prescription and medication list before the
    -- existing transaction deletes/reinserts prescription_items.
    SELECT jsonb_build_object(
      'prescription', to_jsonb(OLD),
      'items', coalesce(
        (SELECT jsonb_agg(to_jsonb(pi) ORDER BY pi.line_no, pi.id)
         FROM public.prescription_items pi
         WHERE pi.prescription_id = OLD.id),
        '[]'::jsonb
      )
    ) INTO v_snapshot;

    INSERT INTO public.clinical_record_versions (
      organization_id, patient_id, entity_type, record_id, operation,
      actor_user_id, snapshot, version_number, change_reason, previous_version_id
    ) VALUES (
      OLD.organization_id, OLD.patient_id, 'prescription', OLD.id, 'AMENDMENT',
      auth.uid(), v_snapshot, v_next_version, v_reason, v_previous_version
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS prescriptions_capture_amendment_before_update ON public.prescriptions;
CREATE TRIGGER prescriptions_capture_amendment_before_update
BEFORE UPDATE ON public.prescriptions
FOR EACH ROW
EXECUTE FUNCTION private.capture_prescription_amendment_before_update();

REVOKE ALL ON FUNCTION private.capture_prescription_amendment_before_update() FROM PUBLIC, anon, authenticated;;
