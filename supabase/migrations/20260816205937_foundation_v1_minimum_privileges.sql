-- NIRVANA Foundation V1
-- Minimum application-role privileges

BEGIN;

-- Remove write privileges from the anonymous application role.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON ALL TABLES IN SCHEMA public
FROM anon;

-- Remove write privileges from the authenticated application role.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON ALL TABLES IN SCHEMA public
FROM authenticated;

-- Prevent future public tables from automatically receiving
-- write privileges for application roles.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON TABLES FROM anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON TABLES FROM authenticated;

COMMIT;
