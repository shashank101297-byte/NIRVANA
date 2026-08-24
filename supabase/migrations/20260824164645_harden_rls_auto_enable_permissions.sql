-- NIRVANA Foundation V1: harden internal RLS event-trigger function
-- rls_auto_enable() must not be callable through PostgREST/RPC.

revoke all on function public.rls_auto_enable() from public;
grant execute on function public.rls_auto_enable() to postgres, service_role;
