# NIRVANA Security Architecture

## 1. Security Objective
NIRVANA follows a security-first architecture designed to protect authentication data, organizational data, healthcare information and future clinical records.

Security controls must be enforced at the appropriate architectural layer and must not depend solely on the frontend.

## 2. Security Principles
- Least privilege
- Explicit authorization
- Tenant isolation
- Defense in depth
- Secure defaults
- Data minimization
- Auditability
- Secret protection
- Fail securely
- Version-controlled infrastructure

## 3. Authentication
Authentication will be handled through Supabase Auth.

The application must not store user passwords directly.

Authentication state must be validated before protected application operations are performed.

Session handling must use secure platform-supported mechanisms.

## 4. Authorization
Authentication establishes who the user is. Authorization determines what the user is allowed to access.

Authorization must be based on explicit organization membership, role and permission relationships.

The frontend may hide unavailable features, but the frontend must never be the final security boundary.

## 5. Tenant Isolation
NIRVANA must enforce logical tenant isolation for all tenant-scoped data.

Every tenant-sensitive record must be associated with an organization or an approved organizational access relationship.

A user must never be able to access another organization data merely by changing an identifier, URL parameter or frontend state.

Tenant isolation must be enforced at the database authorization layer.

## 6. Row Level Security
PostgreSQL Row Level Security (RLS) will be a primary database-level security control.

RLS policies must be designed around authenticated identity, organization membership, role and permitted scope.

Tables containing tenant-sensitive data must have appropriate RLS enabled before they are used by the application.

RLS policies must default to denying unauthorized access.

Service-level administrative access must be separately controlled and must not be exposed to the client application.

## 7. Secret Management
Environment secrets must never be committed to source control.

The client application may contain only values that are explicitly safe for client exposure.

Supabase service-role credentials and other privileged secrets must remain server-side and must never be embedded in the frontend bundle.

Secret files such as .env.local must remain excluded from Git.

## 8. Storage Security
Confidential healthcare documents must use private storage.

Storage access must be authorized using authenticated identity and applicable organization or resource scope.

Public storage URLs must not be used for confidential clinical documents.

## 9. Audit Logging
Security-relevant actions should be auditable.

Audit events should record the actor, action, resource, timestamp, result and applicable organization context where appropriate.

Audit logs must themselves be protected from unauthorized modification or disclosure.

## 10. Security Testing
Security controls must be tested before production use.

Testing must include authentication, authorization, tenant isolation, RLS behavior, storage access and privileged operations.

Negative tests must verify that unauthorized users cannot access protected resources.

Security testing must be repeated when material authorization or database changes are introduced.

## 11. Dependency and Supply Chain Security
Application dependencies must be tracked through package manifests and lockfiles.

Dependencies should be reviewed and updated regularly.

Known vulnerable dependencies must be assessed before production deployment.

## 12. Incident Response
Security incidents must have a documented response process.

The process should cover detection, containment, investigation, remediation, recovery and post-incident review.

Relevant audit records should be preserved during investigation.

## 13. Backup and Recovery Security
Backups must be protected against unauthorized access and modification.

Recovery procedures must be tested periodically.

Backup and recovery controls must preserve appropriate confidentiality, integrity and availability requirements.

## 14. Regulatory and Privacy Position
This architecture does not by itself constitute legal or regulatory compliance.

Applicable privacy, healthcare, data-protection and security requirements must be assessed before production deployment.

Formal legal, regulatory and security review is required before processing real patient data.

## 15. Foundation Security Gate
Patient Management must not begin until the Foundation security architecture has been reviewed.

The security gate must verify:
- Authentication design
- Authorization model
- Tenant isolation
- RLS strategy
- Secret management
- Storage security
- Audit logging
- Security testing approach
- Dependency security
- Incident response
- Backup and recovery

---
NIRVANA Foundation v1.1
