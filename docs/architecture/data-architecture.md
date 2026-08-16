# NIRVANA Data Architecture

## 1. Purpose
This document defines the conceptual data architecture for NIRVANA before physical PostgreSQL tables and Row Level Security policies are implemented.

The data model must support healthcare operations, multi-tenant isolation, auditability, future clinical modules and long-term portability.

## 2. Core Data Principles
- Every tenant-sensitive record must have an explicit ownership or access relationship.
- Data access must be enforced at the database layer where appropriate.
- Sensitive healthcare data must be minimized and protected.
- Foreign-key relationships must preserve referential integrity.
- Schema changes must be version-controlled through Supabase migrations.
- Patient and clinical data must remain logically separated from platform identity data.
- Audit data must be treated as sensitive.
- Real patient data must not be used during Foundation development.

## 3. Organizational Hierarchy
Organization
  -> Hospital
    -> Branch
      -> Department

An organization represents the top-level tenant.

A hospital belongs to an organization.

A branch belongs to a hospital.

A department belongs to a branch.

This hierarchy provides the basis for tenant and organizational access control.

## 4. Identity Model
The identity layer will conceptually contain:
- Authenticated user identity.
- User profile.
- Organization membership.
- Hospital, branch and department membership where applicable.
- Role assignments.
- Permission definitions.

Authentication identity and application profile data should remain logically distinct.

## 5. Authorization Model
User
  -> Organization Membership
    -> Role
      -> Permissions

Additional scope may be applied at hospital, branch or department level.

Permissions must not be granted solely because a frontend route or UI element is visible.

## 6. Core Platform Entities
The Foundation is expected to establish:
- Organizations
- Hospitals
- Branches
- Departments
- User profiles
- Organization memberships
- Roles
- Permissions
- Role-permission relationships
- Audit events

The exact physical schema will be defined through version-controlled migrations.

## 7. Future Healthcare Entities
Patient Management will be introduced only after the Foundation security gate.

Future conceptual entities may include:
- Patients
- Patient identifiers
- Patient contacts
- Patient addresses
- Encounters
- Clinical notes
- Diagnoses
- Medications
- Prescriptions
- Investigations
- Documents
- Follow-ups

These entities must inherit appropriate tenant and organizational access relationships.

## 8. Clinical Data Separation
Clinical information must not be mixed unnecessarily with identity and authorization records.

The architecture should allow clinical modules to evolve independently while retaining consistent security and audit controls.

## 9. Audit Data
Audit events should capture, where appropriate:
- Actor
- Organization context
- Action
- Resource type
- Resource identifier
- Timestamp
- Result
- Relevant metadata

Audit records must not unnecessarily duplicate sensitive clinical content.

## 10. Data Access Boundary
React UI
  -> Application/service layer
    -> Supabase
      -> PostgreSQL
        -> RLS / database constraints

Client-side filtering must never be treated as tenant isolation.

## 11. Storage Data
Confidential healthcare documents should use private storage.

Stored files should have controlled ownership and access relationships.

Public URLs must not be used for confidential clinical documents.

## 12. Data Lifecycle
The final production data lifecycle must define:
- Creation
- Access
- Modification
- Retention
- Archival
- Deletion
- Backup
- Restoration

Retention and deletion policies must be finalized with appropriate legal and regulatory review before production deployment.

## 13. Migration Strategy
All production schema changes must be represented as version-controlled migration files under:

supabase/migrations/

Manual production-only schema changes should be avoided unless documented and captured in migration history.

## 14. Future Analytics
Analytics should use the minimum necessary data.

Where possible, reporting and analytics should use aggregate or approved metrics rather than exposing identifiable clinical information.

## 15. Foundation Data Boundary
Before Patient Management begins, the following must be reviewed:
- Identity relationships
- Organization hierarchy
- Role and permission model
- Tenant relationships
- RLS design
- Audit model
- Storage model
- Migration strategy
- Backup and recovery strategy

---
NIRVANA Foundation v1.1
