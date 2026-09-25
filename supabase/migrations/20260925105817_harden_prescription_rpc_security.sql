alter function public.create_prescription_transaction(
  uuid,
  uuid,
  uuid,
  text,
  text,
  uuid,
  jsonb
)
security invoker;

revoke execute on function public.create_prescription_transaction(
  uuid,
  uuid,
  uuid,
  text,
  text,
  uuid,
  jsonb
) from public;

revoke execute on function public.create_prescription_transaction(
  uuid,
  uuid,
  uuid,
  text,
  text,
  uuid,
  jsonb
) from anon;

grant execute on function public.create_prescription_transaction(
  uuid,
  uuid,
  uuid,
  text,
  text,
  uuid,
  jsonb
) to authenticated;

grant execute on function public.create_prescription_transaction(
  uuid,
  uuid,
  uuid,
  text,
  text,
  uuid,
  jsonb
) to service_role;
