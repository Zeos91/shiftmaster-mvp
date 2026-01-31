# ShiftMaster Enums - Business Domain Reference

**Version:** 1.0.0  
**Last Updated:** January 31, 2026  
**Status:** FROZEN CONTRACT ⚠️

---

## Overview

This document defines all enumeration types used across the ShiftMaster platform. These enums represent the business domain language and are **immutable contracts** shared between:

- Backend API (Node.js/Express)
- Database (PostgreSQL via Prisma)
- Web Frontend (React)
- Mobile App (React Native)
- OpenAPI/Swagger Documentation

### Change Policy

✅ **Allowed Changes:**
- Adding new enum values
- Adding new enums
- Deprecating values (mark as deprecated, keep in codebase)

❌ **Forbidden Changes:**
- Renaming existing enum values
- Removing enum values
- Changing enum value meanings

---

## User & Role Enums

### UserRole

**Purpose:** System-level user roles for authentication and authorization.

**Location:** `backend/src/domain/shared/enums.ts`

**Values:**

| Value | Description | Typical User |
|-------|-------------|--------------|
| `worker` | Regular shift worker | Crane operators, general workers |
| `site_manager` | Manages a specific site | Site supervisors |
| `safety_officer` | Reviews safety compliance | Safety inspectors |
| `admin` | Full system access | Company administrators |

**Permission Hierarchy:** `admin` > `safety_officer` > `site_manager` > `worker`

**Usage Examples:**
- Authorization middleware: Check if user has required role
- API filtering: Filter shifts by user role
- UI display: Show/hide features based on role

**Related Documentation:** See [docs/rbac.md](./rbac.md) for full permission matrix.

---

### JobRole

**Purpose:** Worker certifications and specialized skills.

**Important:** A worker can have **multiple** job roles (e.g., crane operator + signalman).

**Values:**

| Value | Description | Equipment Access |
|-------|-------------|------------------|
| `crane_operator` | Licensed crane operator | ✅ Crane equipment |
| `safety_assistant` | Safety support on site | ❌ No equipment |
| `signalman` | Crane signaling/spotting | ✅ Communication devices |
| `site_manager` | On-site management | ❌ No equipment |
| `safety_officer` | Safety compliance officer | ❌ No equipment |
| `general_worker` | General construction worker | ❌ No equipment |

**Business Rules:**
- Only `crane_operator` and `signalman` can be assigned equipment
- Shifts can require specific job roles
- Workers must have matching job roles to apply for shifts

**Usage Examples:**
- Shift creation: Specify `roleRequired` field
- Worker profile: List certifications
- Application validation: Check if worker has required role

---

## Shift Lifecycle Enums

### ShiftState

**Purpose:** Track the lifecycle of a shift from creation to completion.

**State Machine Diagram:**

```
┌─────────┐
│  draft  │ (Manager creates shift)
└────┬────┘
     │
     ↓
┌──────────────┐
│ broadcasted  │ (Open for worker applications)
└──────┬───────┘
       │
       ↓
┌──────────┐
│ assigned │ (Worker selected)
└─────┬────┘
      │
      ↓
┌───────────┐
│ completed │ (Work finished, awaiting approval)
└───────────┘

From any state → cancelled (Manager cancels shift)
```

**Values:**

| State | Description | Terminal? | User Actions |
|-------|-------------|-----------|--------------|
| `draft` | Shift created, not visible to workers | No | Manager: Edit, broadcast, cancel |
| `broadcasted` | Shift posted, accepting applications | No | Workers: Apply<br>Manager: Assign, cancel |
| `assigned` | Worker assigned to shift | No | Worker: Complete shift<br>Manager: Cancel |
| `completed` | Shift work done, awaiting approval | Yes* | Manager: Approve/reject hours |
| `cancelled` | Shift cancelled | Yes | None |

*Approval is tracked separately via `approved` boolean field.

**Valid Transitions:**

| From | To | Triggered By |
|------|----|--------------| 
| `draft` | `broadcasted` | Manager broadcasts shift |
| `draft` | `cancelled` | Manager cancels draft |
| `broadcasted` | `assigned` | Manager assigns worker |
| `broadcasted` | `cancelled` | Manager cancels before assignment |
| `assigned` | `completed` | Worker completes shift |
| `assigned` | `cancelled` | Manager cancels assigned shift |

**Invalid Transitions:**
- Cannot transition from `completed` or `cancelled` (terminal states)
- Cannot skip states (e.g., draft → assigned without broadcasting)

**Usage Examples:**
- UI filtering: Show only broadcasted shifts to workers
- Notification triggers: Send alerts on state changes
- Validation: Prevent invalid state transitions

---

### ShiftType

**Purpose:** Classify shifts by business context for billing and prioritization.

**Values:**

| Type | Description | Billing Impact | Urgency |
|------|-------------|----------------|---------|
| `regular` | Standard scheduled shift | Normal rates | Normal |
| `overtime` | Extended hours or weekend shift | 1.5x rates | Medium |
| `emergency` | Urgent unplanned shift | 2x rates | High |

**Business Rules:**
- Emergency shifts bypass normal approval workflows
- Overtime shifts require manager authorization
- Regular shifts follow standard scheduling

**Usage Examples:**
- Billing calculations: Apply rate multipliers
- Shift priority: Sort emergency shifts first
- Worker notifications: Highlight urgent shifts

---

## Application Workflow Enums

### ApplicationState

**Purpose:** Track worker applications for broadcasted shifts.

**State Machine Diagram:**

```
┌─────────┐
│ applied │ (Worker submits application)
└────┬────┘
     │
     ├────────┐
     │        ↓
     │    ┌─────────────┐
     │    │  withdrawn  │ (Worker withdraws)
     │    └─────────────┘
     ↓
┌─────────┐
│ pending │ (Manager reviews)
└────┬────┘
     │
     ├──────────┐
     ↓          ↓
┌──────────┐  ┌──────────┐
│ approved │  │ rejected │
└──────────┘  └──────────┘
```

**Values:**

| State | Description | Terminal? | Actions Available |
|-------|-------------|-----------|-------------------|
| `applied` | Initial submission | No | Worker: Withdraw<br>Manager: Review (→ pending) |
| `pending` | Under manager review | No | Manager: Approve or reject |
| `approved` | Application accepted | Yes | None - worker assigned to shift |
| `rejected` | Application declined | Yes | None |
| `withdrawn` | Worker cancelled application | Yes | None |

**Valid Transitions:**

| From | To | Triggered By |
|------|----|--------------| 
| `applied` | `pending` | Manager starts review |
| `applied` | `withdrawn` | Worker withdraws |
| `pending` | `approved` | Manager approves |
| `pending` | `rejected` | Manager rejects |

**Business Rules:**
- Only one application per worker per shift
- Approving one application auto-rejects others
- Cannot withdraw after approval/rejection

**Usage Examples:**
- Worker dashboard: Show application status
- Manager review: Filter pending applications
- Notifications: Alert workers of status changes

---

## Audit & Tracking Enums

### AuditAction

**Purpose:** Log all system actions for compliance, security, and debugging.

**Categories:**

**Worker Actions:**
- `worker_created` - New worker account created
- `worker_role_updated` - User role changed
- `worker_cert_updated` - Job role/certification modified

**Shift Lifecycle:**
- `shift_created` - New shift created
- `shift_updated` - Shift details modified
- `shift_deleted` - Shift removed
- `shift_broadcasted` - Shift posted for applications
- `shift_assigned` - Worker assigned to shift
- `shift_approved` - Shift hours approved
- `shift_completed` - Shift marked complete
- `shift_cancelled` - Shift cancelled
- `shift_override_edit` - Edit made to locked shift

**Application Workflow:**
- `shift_applied` - Worker applied to shift
- `shift_application_approved` - Application approved
- `shift_application_rejected` - Application rejected
- `shift_application_withdrawn` - Application withdrawn

**Reporting:**
- `pdf_generated` - Report/invoice generated

**Security:**
- `login_success` - User login successful
- `login_failed` - Failed login attempt
- `permissions_changed` - User permissions modified

**Usage Examples:**
- Compliance reports: Track all shift modifications
- Security monitoring: Detect suspicious login patterns
- Debugging: Trace user actions leading to issues

---

### AuditEntityType

**Purpose:** Categorize audit logs by entity type.

**Values:**

| Type | Description | Example Actions |
|------|-------------|-----------------|
| `worker` | Worker/user entities | Created, role updated |
| `shift` | Shift entities | Created, assigned, completed |
| `application` | Shift applications | Applied, approved, rejected |
| `report` | Generated reports | PDF generated |
| `auth` | Authentication events | Login, logout, password reset |

**Usage Examples:**
- Log filtering: Show only shift-related audits
- Compliance: Generate worker activity reports
- Security: Monitor authentication events

---

## Notification Enums

### NotificationType

**Purpose:** Categorize push notifications, emails, and in-app alerts.

**Values:**

| Type | Description | Recipients | Channels |
|------|-------------|------------|----------|
| `shift_broadcasted` | New shift available | All qualified workers | Push, In-app |
| `application_received` | Manager got new application | Site manager | Email, In-app |
| `application_approved` | Worker's application approved | Applicant worker | Push, Email, In-app |
| `application_rejected` | Worker's application rejected | Applicant worker | Push, In-app |
| `hours_submitted` | Worker submitted hours | Site manager | Email, In-app |
| `hours_approved` | Manager approved hours | Worker | Push, Email |
| `shift_reminder` | Upcoming shift reminder | Assigned worker | Push |
| `shift_cancelled` | Shift was cancelled | Assigned worker | Push, Email, SMS |

**Business Rules:**
- Critical notifications (cancelled) use multiple channels
- Reminders sent 24h and 1h before shift
- Users can configure notification preferences

**Usage Examples:**
- Push notification service: Route by type
- Email templates: Select template by type
- User preferences: Enable/disable by type

---

## State Transition Validation

### ShiftState Transitions

The `EnumValidators.canTransitionShiftState(from, to)` helper validates transitions:

```typescript
// ✅ Valid
canTransitionShiftState(ShiftState.DRAFT, ShiftState.BROADCASTED) // true
canTransitionShiftState(ShiftState.BROADCASTED, ShiftState.ASSIGNED) // true

// ❌ Invalid
canTransitionShiftState(ShiftState.COMPLETED, ShiftState.DRAFT) // false
canTransitionShiftState(ShiftState.DRAFT, ShiftState.COMPLETED) // false
```

### ApplicationState Transitions

The `EnumValidators.canTransitionApplicationState(from, to)` helper validates transitions:

```typescript
// ✅ Valid
canTransitionApplicationState(ApplicationState.APPLIED, ApplicationState.PENDING) // true
canTransitionApplicationState(ApplicationState.PENDING, ApplicationState.APPROVED) // true

// ❌ Invalid
canTransitionApplicationState(ApplicationState.APPROVED, ApplicationState.REJECTED) // false
canTransitionApplicationState(ApplicationState.WITHDRAWN, ApplicationState.APPLIED) // false
```

---

## Frontend Integration

### TypeScript Type Generation

Generate TypeScript types from enums:

```typescript
// Frontend types (auto-generated from OpenAPI)
type UserRole = 'worker' | 'site_manager' | 'safety_officer' | 'admin'
type ShiftState = 'draft' | 'broadcasted' | 'assigned' | 'completed' | 'cancelled'
type ApplicationState = 'applied' | 'pending' | 'approved' | 'rejected' | 'withdrawn'
```

### UI Display Mapping

Create user-friendly labels:

```typescript
const ShiftStateLabels: Record<ShiftState, string> = {
  draft: 'Draft',
  broadcasted: 'Open',
  assigned: 'Assigned',
  completed: 'Completed',
  cancelled: 'Cancelled'
}
```

### Icon/Color Mapping

```typescript
const ShiftStateColors: Record<ShiftState, string> = {
  draft: 'gray',
  broadcasted: 'blue',
  assigned: 'yellow',
  completed: 'green',
  cancelled: 'red'
}
```

---

## Database Schema Alignment

### Prisma Enum Definitions

All enums must match Prisma schema exactly:

```prisma
enum Role {
  worker
  site_manager
  safety_officer
  admin
}

enum ShiftState {
  draft
  broadcasted
  assigned
  completed
  cancelled
}

enum ApplicationState {
  applied
  pending
  approved
  rejected
  withdrawn
}
```

**Migration Required:** If you update enums, run:
```bash
npm run prisma migrate dev --name update_enums
```

---

## OpenAPI/Swagger Integration

### Enum Documentation

OpenAPI schema includes all enum values:

```yaml
ShiftState:
  type: string
  enum:
    - draft
    - broadcasted
    - assigned
    - completed
    - cancelled
  description: |
    Shift lifecycle state:
    - draft: Created but not visible
    - broadcasted: Open for applications
    - assigned: Worker selected
    - completed: Work finished
    - cancelled: Cancelled by manager
```

---

## Testing Guidelines

### Unit Tests

Test enum validation:

```typescript
describe('EnumValidators', () => {
  it('validates shift states', () => {
    expect(EnumValidators.isValidShiftState('broadcasted')).toBe(true)
    expect(EnumValidators.isValidShiftState('invalid')).toBe(false)
  })

  it('validates state transitions', () => {
    expect(EnumValidators.canTransitionShiftState(
      ShiftState.DRAFT,
      ShiftState.BROADCASTED
    )).toBe(true)
    
    expect(EnumValidators.canTransitionShiftState(
      ShiftState.COMPLETED,
      ShiftState.DRAFT
    )).toBe(false)
  })
})
```

---

## Migration Path (v1 → v2)

### Deprecated Enums

The following are deprecated and will be removed in v2.0.0:

**Role** (uppercase values):
```typescript
// ❌ Deprecated - use UserRole instead
enum Role {
  OPERATOR = 'OPERATOR',
  SITE_MANAGER = 'SITE_MANAGER',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  COMPANY_ADMIN = 'COMPANY_ADMIN'
}

// ✅ Current
enum UserRole {
  WORKER = 'worker',
  SITE_MANAGER = 'site_manager',
  SAFETY_OFFICER = 'safety_officer',
  ADMIN = 'admin'
}
```

**ApplicationStatus**:
```typescript
// ❌ Deprecated - use ApplicationState instead
enum ApplicationStatus {
  APPLIED = 'applied',
  REJECTED = 'rejected',
  ACCEPTED = 'accepted'  // missing states
}

// ✅ Current
enum ApplicationState {
  APPLIED = 'applied',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn'
}
```

---

## Support & Questions

For questions about enum usage or to propose new enum values:

1. Check this document first
2. Review [docs/architecture.md](./architecture.md)
3. Contact: tech-lead@shiftmaster.com

**Change Requests:**
- New enum proposals: Open GitHub issue with `enum-proposal` label
- Bug reports: Open GitHub issue with `bug` label

---

## Changelog

### v1.0.0 (2026-01-31)
- **BREAKING:** Replaced `Role` with `UserRole` (lowercase values)
- **BREAKING:** Replaced `ApplicationStatus` with `ApplicationState`
- **ADDED:** `ShiftType` enum (regular, overtime, emergency)
- **ADDED:** State transition validation helpers
- **ADDED:** Terminal state helpers
- **ADDED:** `ShiftState.DRAFT` and `ShiftState.CANCELLED`
- **ADDED:** `ApplicationState.PENDING` and `ApplicationState.WITHDRAWN`
- **UPDATED:** NotificationType values (standardized naming)
- **DEPRECATED:** Legacy `Role` enum (backward compatibility)
- **DEPRECATED:** Legacy `ApplicationStatus` enum

---

**Document Version:** 1.0.0  
**Enum Schema Version:** 1.0.0  
**Effective Date:** January 31, 2026
