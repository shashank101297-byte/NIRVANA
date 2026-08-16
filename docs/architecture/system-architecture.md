# NIRVANA System Architecture

## 1. Purpose
NIRVANA is a security-first healthcare platform for integrated Ayurveda and modern medicine workflows. The repository, database migrations, documentation, tests and deployment configuration are the authoritative project assets. AI coding tools are development assistants only.

## 2. Core Principles
- Security and privacy by design.
- Least privilege by default.
- PostgreSQL Row Level Security (RLS) is an authoritative data-access boundary.
- Frontend authorization is not a security control.
- Tenant isolation must be enforced server-side/database-side.
- Secrets must never be committed to source control.
- Development uses synthetic data until the Foundation security gate passes.
- Clinically significant AI output requires appropriate doctor verification.
- Security-sensitive actions must be auditable.
- NIRVANA must remain maintainable without any AI builder.

## 3. High-Level Architecture
User -> React + TypeScript -> Application Services -> Supabase -> PostgreSQL / Auth / Private Storage / RLS -> Audit and Security Controls

## 4. Organizational Hierarchy
Organization
  -> Hospital
    -> Branch
      -> Department
        -> Users and Roles

## 5. Frontend
Technology: React, TypeScript, Vite and ESLint. The frontend handles presentation, navigation, forms, client-side validation and session-aware user experience. Browser code must never contain service-role credentials, database passwords or other privileged secrets.

## 6. Service Layer
Business operations should use explicit service modules. Services must validate inputs, enforce workflow rules, use typed interfaces, minimize sensitive-data exposure and generate audit events where required.

## 7. Authentication and Authorization
Authentication establishes identity. Authorization determines permitted actions and data access. NIRVANA will use Supabase Auth, database-backed roles and permissions, organization context, PostgreSQL RLS and server-side validation. Frontend-only role checks are never sufficient.

## 8. Multi-Tenancy
Tenant-sensitive records must have an explicit ownership or access relationship. Security testing must include same-tenant access, cross-tenant reads, updates, deletes and role-boundary testing.

## 9. Sensitive Data
Healthcare and personal information must not be unnecessarily logged, placed in URLs, stored in browser local storage, sent to analytics systems, included in error reports or exposed to AI services without an approved data-flow design. Real patient data is prohibited during Foundation development.

## 10. AI Boundary
AI is an assistive component, not an autonomous clinical authority. AI workflows require appropriate access control, data minimization, auditability and doctor verification. High-risk clinical decisions require human oversight.

## 11. Audit
Security-sensitive and clinically significant actions should be auditable using actor identity, organization context, action, target resource, timestamp and relevant metadata. Audit records are themselves sensitive.

## 12. Storage
Confidential healthcare documents must use private storage with controlled access. Public storage must not be used for confidential clinical documents.

## 13. Environment Separation
Development and production environments must remain separate. Development uses synthetic data and non-production credentials. Production requires controlled credentials, backup and restore procedures, monitoring, auditing and formal security review.

## 14. Ownership and Portability
NIRVANA must not depend on proprietary state held only by an AI builder. Source code, database migrations, architecture, security rules, tests, configuration templates and deployment procedures must remain under project control.

## 15. Development Sequence
Architecture -> Supabase Integration -> Database Migrations -> Identity -> Organizations/Hospitals/Branches -> RBAC -> RLS -> Audit Logging -> Security Tests -> Foundation Security Verification -> Patient Management -> Clinical Modules -> AI-Assisted Clinical Workflows

## 16. Foundation Gate
Patient Management must not begin until authentication, authorization, tenant isolation, RLS, audit logging, secret handling, storage controls, security tests and backup/restore strategy have been reviewed.

## 17. Regulatory Position
This architecture does not itself constitute certification or legal compliance with DPDP Act, HIPAA, GDPR or another regulatory framework. Formal legal, regulatory, security and compliance assessment is required before applicable production deployment.

---
NIRVANA Foundation v1.1
