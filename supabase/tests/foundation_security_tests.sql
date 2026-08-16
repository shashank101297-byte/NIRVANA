BEGIN;

SELECT plan(4);

-- ============================================================
-- TEST USERS
-- ============================================================

INSERT INTO auth.users (
  id,
  is_sso_user,
  is_anonymous,
  email
)
VALUES
(
  '00000000-0000-0000-0000-000000000001',
  false,
  false,
  'nirvana-test-a@example.com'
),
(
  '00000000-0000-0000-0000-000000000002',
  false,
  false,
  'nirvana-test-b@example.com'
);

-- ============================================================
-- ORGANIZATIONS
-- Created by the corresponding auth users
-- ============================================================

INSERT INTO public.organizations (
  id,
  name,
  code,
  created_by
)
VALUES
(
  '10000000-0000-0000-0000-000000000001',
  'NIRVANA TEST ORG A',
  'TEST-A',
  '00000000-0000-0000-0000-000000000001'
),
(
  '20000000-0000-0000-0000-000000000002',
  'NIRVANA TEST ORG B',
  'TEST-B',
  '00000000-0000-0000-0000-000000000002'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.organizations
    WHERE id = '10000000-0000-0000-0000-000000000001'
  ),
  'test organization A created'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.organizations
    WHERE id = '20000000-0000-0000-0000-000000000002'
  ),
  'test organization B created'
);

-- ============================================================
-- MEMBERSHIPS
-- ============================================================

INSERT INTO public.organization_memberships (
  organization_id,
  user_id,
  status
)
VALUES
(
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'active'
),
(
  '20000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  'active'
);

-- ============================================================
-- SIMULATE USER A
-- ============================================================

SET LOCAL ROLE authenticated;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000001',
  true
);

-- User A should see Organization A
SELECT ok(
  EXISTS (
    SELECT 1
    FROM public.organizations
    WHERE id = '10000000-0000-0000-0000-000000000001'
  ),
  'User A can access Organization A'
);

-- User A must NOT see Organization B
SELECT is(
  (
    SELECT count(*)
    FROM public.organizations
    WHERE id = '20000000-0000-0000-0000-000000000002'
  ),
  0::bigint,
  'User A cannot access Organization B'
);

SELECT * FROM finish();

ROLLBACK;
