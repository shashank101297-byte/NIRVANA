-- NIRVANA Foundation V1
-- Explicit application-role SELECT privileges

grant select on public.branches to authenticated;
grant select on public.departments to authenticated;
grant select on public.hospitals to authenticated;
grant select on public.membership_roles to authenticated;
grant select on public.organization_memberships to authenticated;
grant select on public.organizations to authenticated;
grant select on public.permissions to authenticated;
grant select on public.profiles to authenticated;
grant select on public.role_permissions to authenticated;
grant select on public.roles to authenticated;
