-- NIRVANA Foundation V1 security hardening
-- rls_auto_enable() is an internal event-trigger function
-- and must not be callable through PostgREST/RPC.

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
