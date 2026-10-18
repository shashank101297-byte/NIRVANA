
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

    PERFORM set_config('nirvana.prescription_amendment_record', OLD.id::text, true);
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION private.capture_clinical_record_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  source_row jsonb;
  target_org uuid;
  target_patient uuid;
  target_record uuid;
  target_entity text;
  next_version integer;
  previous_version uuid;
  amendment_reason text;
  clinical_content_changed boolean := false;
  prescription_amendment_record text;
begin
  source_row := case when TG_OP = 'DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end;
  target_record := case when TG_OP = 'DELETE' then OLD.id else NEW.id end;
  target_entity := case TG_TABLE_NAME
    when 'clinical_encounters' then 'clinical_encounter'
    when 'prescriptions' then 'prescription'
    when 'prescription_items' then 'prescription_item'
  end;

  if TG_TABLE_NAME = 'prescription_items' then
    select p.organization_id, p.patient_id into target_org, target_patient
    from public.prescriptions p
    where p.id = case when TG_OP = 'DELETE' then OLD.prescription_id else NEW.prescription_id end;
  else
    target_org := case when TG_OP = 'DELETE' then OLD.organization_id else NEW.organization_id end;
    target_patient := case when TG_OP = 'DELETE' then OLD.patient_id else NEW.patient_id end;
  end if;

  if TG_TABLE_NAME = 'clinical_encounters' then
    amendment_reason := nullif(current_setting('nirvana.amendment_reason', true), '');

    if TG_OP = 'UPDATE' then
      clinical_content_changed :=
        (to_jsonb(NEW) - array['updated_at','finalized_at','finalized_by','amendment_count']) is distinct from
        (to_jsonb(OLD) - array['updated_at','finalized_at','finalized_by','amendment_count']);

      if OLD.status = 'Finalized' and clinical_content_changed and amendment_reason is null then
        raise exception 'FINALIZED_RECORD_REQUIRES_AMENDMENT_REASON';
      end if;
    end if;

    if TG_OP = 'INSERT' then
      insert into public.clinical_record_versions
      (organization_id,patient_id,entity_type,record_id,operation,actor_user_id,snapshot,version_number,change_reason,previous_version_id)
      values (target_org,target_patient,target_entity,target_record,'INSERT',auth.uid(),source_row,null,null,null);

    elsif TG_OP = 'UPDATE' and OLD.status is distinct from 'Finalized' and NEW.status = 'Finalized' then
      select id, version_number into previous_version, next_version
      from public.clinical_record_versions
      where entity_type='clinical_encounter' and record_id=NEW.id and version_number is not null
      order by version_number desc, created_at desc limit 1;
      next_version := coalesce(next_version,0)+1;

      insert into public.clinical_record_versions
      (organization_id,patient_id,entity_type,record_id,operation,actor_user_id,snapshot,version_number,change_reason,previous_version_id)
      values (target_org,target_patient,target_entity,target_record,'FINALIZE',auth.uid(),source_row,next_version,'Initial clinical record finalization',previous_version);

    elsif TG_OP = 'UPDATE' and OLD.status = 'Finalized' and clinical_content_changed then
      select id, version_number into previous_version, next_version
      from public.clinical_record_versions
      where entity_type='clinical_encounter' and record_id=NEW.id and version_number is not null
      order by version_number desc, created_at desc limit 1;
      next_version := coalesce(next_version,0)+1;

      insert into public.clinical_record_versions
      (organization_id,patient_id,entity_type,record_id,operation,actor_user_id,snapshot,version_number,change_reason,previous_version_id)
      values (target_org,target_patient,target_entity,target_record,'AMENDMENT',auth.uid(),source_row,next_version,amendment_reason,previous_version);

    elsif TG_OP = 'UPDATE' and OLD.status <> 'Finalized' and clinical_content_changed then
      insert into public.clinical_record_versions
      (organization_id,patient_id,entity_type,record_id,operation,actor_user_id,snapshot)
      values (target_org,target_patient,target_entity,target_record,'UPDATE',auth.uid(),source_row);

    elsif TG_OP = 'DELETE' then
      insert into public.clinical_record_versions
      (organization_id,patient_id,entity_type,record_id,operation,actor_user_id,snapshot)
      values (target_org,target_patient,target_entity,target_record,'DELETE',auth.uid(),source_row);
    end if;
  else
    if TG_TABLE_NAME = 'prescriptions' and TG_OP = 'UPDATE' then
      prescription_amendment_record := current_setting('nirvana.prescription_amendment_record', true);

      if prescription_amendment_record = target_record::text then
        perform set_config('nirvana.prescription_amendment_record', '', true);
      else
        insert into public.clinical_record_versions
        (organization_id,patient_id,entity_type,record_id,operation,actor_user_id,snapshot)
        values (target_org,target_patient,target_entity,target_record,TG_OP,auth.uid(),source_row);
      end if;
    else
      insert into public.clinical_record_versions
      (organization_id,patient_id,entity_type,record_id,operation,actor_user_id,snapshot)
      values (target_org,target_patient,target_entity,target_record,TG_OP,auth.uid(),source_row);
    end if;
  end if;

  return case when TG_OP='DELETE' then OLD else NEW end;
end;
$function$;
;
