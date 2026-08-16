-- NIRVANA Foundation v1.1
-- Migration 001: Identity and Organization Foundation
-- No patient or clinical data is created in this migration.

create extension if not exists pgcrypto;

-- =========================================================
-- 1. ORGANIZATIONS
-- =========================================================

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  status text not null default 'active'
    check (status in ('active', 'suspended', 'archived')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 2. HOSPITALS
-- =========================================================

create table public.hospitals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text not null,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organization_id, code)
);

-- =========================================================
-- 3. BRANCHES
-- =========================================================

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  name text not null,
  code text not null,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (hospital_id, code)
);

-- =========================================================
-- 4. DEPARTMENTS
-- =========================================================

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  name text not null,
  code text not null,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (branch_id, code)
);

-- =========================================================
-- 5. USER PROFILES
-- =========================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  avatar_url text,
  status text not null default 'active'
    check (status in ('active', 'suspended', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 6. ROLES
-- =========================================================

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_system_role boolean not null default true,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 7. PERMISSIONS
-- =========================================================

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 8. ROLE → PERMISSION
-- =========================================================

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (role_id, permission_id)
);

-- =========================================================
-- 9. ORGANIZATION MEMBERSHIPS
-- =========================================================

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active'
    check (status in ('invited', 'active', 'suspended', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organization_id, user_id)
);

-- =========================================================
-- 10. MEMBERSHIP → ROLE
-- =========================================================

create table public.membership_roles (
  membership_id uuid not null references public.organization_memberships(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  created_at timestamptz not null default now(),

  primary key (membership_id, role_id)
);

-- =========================================================
-- 11. INDEXES
-- =========================================================

create index hospitals_organization_id_idx
  on public.hospitals(organization_id);

create index branches_hospital_id_idx
  on public.branches(hospital_id);

create index departments_branch_id_idx
  on public.departments(branch_id);

create index organization_memberships_user_id_idx
  on public.organization_memberships(user_id);

create index organization_memberships_organization_id_idx
  on public.organization_memberships(organization_id);

create index membership_roles_role_id_idx
  on public.membership_roles(role_id);

-- =========================================================
-- 12. RLS
-- =========================================================

alter table public.organizations enable row level security;
alter table public.hospitals enable row level security;
alter table public.branches enable row level security;
alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.membership_roles enable row level security;

-- =========================================================
-- 13. SECURITY-DEFINER MEMBERSHIP HELPER
-- =========================================================

create schema if not exists private;

create or replace function private.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = target_org
      and om.user_id = auth.uid()
      and om.status = 'active'
  );
$$;

revoke all on function private.is_org_member(uuid) from public;
grant execute on function private.is_org_member(uuid) to authenticated;

-- =========================================================
-- 14. PROFILE POLICIES
-- =========================================================

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- =========================================================
-- 15. ORGANIZATION POLICIES
-- =========================================================

create policy "organizations_select_member"
on public.organizations
for select
to authenticated
using ((select private.is_org_member(id)));

create policy "organizations_insert_creator"
on public.organizations
for insert
to authenticated
with check ((select auth.uid()) = created_by);

-- =========================================================
-- 16. HOSPITAL POLICIES
-- =========================================================

create policy "hospitals_select_member"
on public.hospitals
for select
to authenticated
using ((select private.is_org_member(organization_id)));

-- =========================================================
-- 17. BRANCH POLICIES
-- =========================================================

create policy "branches_select_member"
on public.branches
for select
to authenticated
using (
  exists (
    select 1
    from public.hospitals h
    where h.id = branches.hospital_id
      and (select private.is_org_member(h.organization_id))
  )
);

-- =========================================================
-- 18. DEPARTMENT POLICIES
-- =========================================================

create policy "departments_select_member"
on public.departments
for select
to authenticated
using (
  exists (
    select 1
    from public.branches b
    join public.hospitals h
      on h.id = b.hospital_id
    where b.id = departments.branch_id
      and (select private.is_org_member(h.organization_id))
  )
);

-- =========================================================
-- 19. MEMBERSHIP POLICIES
-- =========================================================

create policy "memberships_select_member"
on public.organization_memberships
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_org_member(organization_id))
);

-- =========================================================
-- 20. ROLE / PERMISSION READ POLICIES
-- =========================================================

create policy "roles_select_authenticated"
on public.roles
for select
to authenticated
using (true);

create policy "permissions_select_authenticated"
on public.permissions
for select
to authenticated
using (true);

create policy "role_permissions_select_authenticated"
on public.role_permissions
for select
to authenticated
using (true);

create policy "membership_roles_select_member"
on public.membership_roles
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_memberships om
    where om.id = membership_roles.membership_id
      and (
        om.user_id = (select auth.uid())
        or (select private.is_org_member(om.organization_id))
      )
  )
);

-- =========================================================
-- 21. SEED SYSTEM ROLES
-- =========================================================

insert into public.roles (code, name, description)
values
  ('platform_admin', 'Platform Administrator',
   'Reserved platform-level administrative role.'),
  ('organization_admin', 'Organization Administrator',
   'Administrative role for an organization.'),
  ('hospital_admin', 'Hospital Administrator',
   'Administrative role for a hospital.'),
  ('doctor', 'Doctor',
   'Clinical practitioner role for future clinical modules.'),
  ('staff', 'Staff',
   'General authorized organization staff role.')
on conflict (code) do nothing;

-- =========================================================
-- 22. SEED FOUNDATION PERMISSIONS
-- =========================================================

insert into public.permissions (code, name, description)
values
  ('organization.read', 'Read Organization',
   'View organization information.'),
  ('organization.manage', 'Manage Organization',
   'Manage organization configuration.'),
  ('hospital.read', 'Read Hospital',
   'View hospital information.'),
  ('hospital.manage', 'Manage Hospital',
   'Manage hospital configuration.'),
  ('branch.read', 'Read Branch',
   'View branch information.'),
  ('branch.manage', 'Manage Branch',
   'Manage branch configuration.'),
  ('department.read', 'Read Department',
   'View department information.'),
  ('department.manage', 'Manage Department',
   'Manage department configuration.'),
  ('membership.read', 'Read Memberships',
   'View organization memberships.'),
  ('membership.manage', 'Manage Memberships',
   'Manage organization memberships.')
on conflict (code) do nothing;

-- =========================================================
-- 23. UPDATED_AT TRIGGER
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger hospitals_set_updated_at
before update on public.hospitals
for each row execute function public.set_updated_at();

create trigger branches_set_updated_at
before update on public.branches
for each row execute function public.set_updated_at();

create trigger departments_set_updated_at
before update on public.departments
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger memberships_set_updated_at
before update on public.organization_memberships
for each row execute function public.set_updated_at();

-- =========================================================
-- END MIGRATION 001
-- =========================================================
