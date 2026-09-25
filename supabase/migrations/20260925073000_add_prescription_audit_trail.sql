-- Extend the existing audit function so prescription-item changes
-- can be attributed to the correct patient and organization.
create or replace function private.audit_clinical_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target_org uuid;
  target_patient uuid;
  target_record uuid;
  changed text[] := '{}';
  k text;
begin
  target_record := case when TG_OP = 'DELETE' then OLD.id else NEW.id end;

  if TG_TABLE_NAME = 'patients' then
    target_patient := target_record;
    target_org := case when TG_OP = 'DELETE'
      then OLD.organization_id
      else NEW.organization_id
    end;

  elsif TG_TABLE_NAME = 'prescription_items' then
    select p.organization_id, p.patient_id
      into target_org, target_patient
    from public.prescriptions p
    where p.id = case
      when TG_OP = 'DELETE' then OLD.prescription_id
      else NEW.prescription_id
    end;

  else
    target_org := case when TG_OP = 'DELETE'
      then OLD.organization_id
      else NEW.organization_id
    end;

    target_patient := case when TG_OP = 'DELETE'
      then OLD.patient_id
      else NEW.patient_id
    end;
  end if;

  if TG_OP = 'UPDATE' then
    for k in select key from jsonb_each(to_jsonb(NEW))
    loop
      if to_jsonb(NEW) -> k is distinct from to_jsonb(OLD) -> k then
        changed := array_append(changed, k);
      end if;
    end loop;

  elsif TG_OP = 'INSERT' then
    changed := array(select jsonb_object_keys(to_jsonb(NEW)));

  else
    changed := array(select jsonb_object_keys(to_jsonb(OLD)));
  end if;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    table_name,
    record_id,
    patient_id,
    changed_columns,
    metadata
  )
  values (
    target_org,
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    target_record,
    target_patient,
    changed,
    jsonb_build_object('source', 'database_trigger')
  );

  return case when TG_OP = 'DELETE' then OLD else NEW end;
end;
$function$;

drop trigger if exists prescriptions_audit_trigger on public.prescriptions;

create trigger prescriptions_audit_trigger
after insert or update or delete on public.prescriptions
for each row
execute function private.audit_clinical_change();

drop trigger if exists prescription_items_audit_trigger on public.prescription_items;

create trigger prescription_items_audit_trigger
after insert or update or delete on public.prescription_items
for each row
execute function private.audit_clinical_change();
