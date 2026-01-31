# Enum Migration Guide v1.0.0

**Date:** 2026-01-31  
**Status:** READY FOR PRODUCTION  
**Breaking Changes:** YES (enum values changed)

---

## Overview

This migration aligns the Prisma schema with the frozen enum contract defined in `src/domain/shared/enums.ts`.

### What Changed

#### 1. **UserRole Enum** (Breaking Change)
**Before:** `Role` with uppercase values
```prisma
enum Role {
  OPERATOR
  SITE_MANAGER  
  PROJECT_MANAGER
  COMPANY_ADMIN
}
```

**After:** `UserRole` with lowercase values
```prisma
enum UserRole {
  worker
  site_manager
  safety_officer  // NEW
  admin
}
```

**Impact:**
- `OPERATOR` → `worker`
- `SITE_MANAGER` → `site_manager`
- `PROJECT_MANAGER` → **REMOVED** (merged into `admin`)
- `COMPANY_ADMIN` → `admin`
- **NEW:** `safety_officer` added

**Database Impact:** All `Worker.role` values will be migrated.

---

#### 2. **ApplicationState Enum** (Breaking Change)
**Before:** `ApplicationStatus`
```prisma
enum ApplicationStatus {
  applied
  rejected
  accepted
}
```

**After:** `ApplicationState` with expanded states
```prisma
enum ApplicationState {
  applied
  pending    // NEW
  approved   // was "accepted"
  rejected
  withdrawn  // NEW
}
```

**Impact:**
- `accepted` → `approved`
- **NEW:** `pending` (intermediate review state)
- **NEW:** `withdrawn` (worker cancellation)

**Database Impact:** All `ShiftApplication.status` values will be migrated.

---

#### 3. **ShiftState Enum** (Breaking Change)
**Before:**
```prisma
enum ShiftState {
  assigned
  broadcasted
  applied
  pending_approval
  completed
}
```

**After:**
```prisma
enum ShiftState {
  draft        // NEW
  broadcasted
  assigned
  completed
  cancelled    // NEW - was implicitly handled
}
```

**Impact:**
- **REMOVED:** `applied` (applications tracked separately)
- **REMOVED:** `pending_approval` (use `completed` + `approved=false`)
- **NEW:** `draft` (pre-broadcast state)
- **NEW:** `cancelled` (terminal state)

**Database Impact:** All `Shift.state` values will be migrated with these rules:
- `applied` → `broadcasted` (if applications exist)
- `pending_approval` → `completed` (with `approved=false`)

---

#### 4. **ShiftType Enum** (NEW)
**Added:**
```prisma
enum ShiftType {
  regular
  overtime
  emergency
}
```

**Impact:** New field `Shift.shiftType` added with default `regular`.

**Database Impact:** All existing shifts will default to `regular`.

---

#### 5. **NotificationType Enum** (Breaking Change)
**Before:**
```prisma
enum NotificationType {
  shift_broadcast         // typo: missing 'ed'
  application_selected    // inconsistent naming
  // ... other values
}
```

**After:**
```prisma
enum NotificationType {
  shift_broadcasted       // FIXED
  application_approved    // RENAMED for consistency
  shift_cancelled         // NEW
  // ... other values
}
```

**Impact:**
- `shift_broadcast` → `shift_broadcasted`
- `application_selected` → `application_approved`
- **NEW:** `shift_cancelled`

**Database Impact:** All `Notification.type` values will be migrated.

---

#### 6. **AuditAction Enum** (Additions)
**Added new actions:**
```prisma
enum AuditAction {
  // ... existing actions
  shift_cancelled                  // NEW
  shift_application_approved       // RENAMED from shift_application_accepted
  shift_application_withdrawn      // NEW
}
```

**Impact:**
- `shift_application_accepted` → `shift_application_approved`
- **NEW:** `shift_cancelled`
- **NEW:** `shift_application_withdrawn`

**Database Impact:** Existing audit logs retain old values (append-only table).

---

## Migration Strategy

### Phase 1: Data Migration SQL (CRITICAL)

The following SQL must be run **BEFORE** applying Prisma migration:

```sql
-- ============================================================
-- ENUM MIGRATION v1.0.0 - Data Transformation
-- ============================================================

BEGIN;

-- 1. Migrate Worker.role (Role → UserRole)
-- ============================================================
-- Create temporary mapping for role migration
ALTER TABLE "Worker" ADD COLUMN IF NOT EXISTS "role_new" TEXT;

-- Map old Role values to new UserRole values
UPDATE "Worker" SET "role_new" = 
  CASE 
    WHEN role::text = 'OPERATOR' THEN 'worker'
    WHEN role::text = 'SITE_MANAGER' THEN 'site_manager'
    WHEN role::text = 'PROJECT_MANAGER' THEN 'admin'
    WHEN role::text = 'COMPANY_ADMIN' THEN 'admin'
    ELSE 'worker' -- fallback
  END;

-- 2. Migrate ShiftApplication.status (ApplicationStatus → ApplicationState)
-- ============================================================
ALTER TABLE "ShiftApplication" ADD COLUMN IF NOT EXISTS "status_new" TEXT;

-- Map old status to new state
UPDATE "ShiftApplication" SET "status_new" = 
  CASE 
    WHEN status::text = 'applied' THEN 'applied'
    WHEN status::text = 'accepted' THEN 'approved'
    WHEN status::text = 'rejected' THEN 'rejected'
    ELSE 'applied' -- fallback
  END;

-- 3. Migrate Shift.state (ShiftState changes)
-- ============================================================
ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "state_new" TEXT;

-- Map old states to new states with business logic
UPDATE "Shift" SET "state_new" = 
  CASE 
    WHEN state::text = 'assigned' THEN 'assigned'
    WHEN state::text = 'broadcasted' THEN 'broadcasted'
    WHEN state::text = 'applied' THEN 'broadcasted'  -- applications now separate
    WHEN state::text = 'pending_approval' THEN 'completed'  -- use approved flag
    WHEN state::text = 'completed' THEN 'completed'
    ELSE 'assigned' -- fallback
  END;

-- 4. Migrate Notification.type (NotificationType changes)
-- ============================================================
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "type_new" TEXT;

-- Map old notification types to new types
UPDATE "Notification" SET "type_new" = 
  CASE 
    WHEN type::text = 'shift_broadcast' THEN 'shift_broadcasted'
    WHEN type::text = 'application_selected' THEN 'application_approved'
    WHEN type::text = 'application_received' THEN 'application_received'
    WHEN type::text = 'application_rejected' THEN 'application_rejected'
    WHEN type::text = 'hours_submitted' THEN 'hours_submitted'
    WHEN type::text = 'hours_approved' THEN 'hours_approved'
    WHEN type::text = 'shift_reminder' THEN 'shift_reminder'
    ELSE 'shift_broadcasted' -- fallback
  END;

-- 5. Add ShiftType column with default
-- ============================================================
ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "shiftType" TEXT DEFAULT 'regular';

-- Verify row counts before proceeding
DO $$
DECLARE
  worker_count INTEGER;
  application_count INTEGER;
  shift_count INTEGER;
  notification_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO worker_count FROM "Worker";
  SELECT COUNT(*) INTO application_count FROM "ShiftApplication";
  SELECT COUNT(*) INTO shift_count FROM "Shift";
  SELECT COUNT(*) INTO notification_count FROM "Notification";
  
  RAISE NOTICE 'Migration will affect:';
  RAISE NOTICE '  Workers: %', worker_count;
  RAISE NOTICE '  Applications: %', application_count;
  RAISE NOTICE '  Shifts: %', shift_count;
  RAISE NOTICE '  Notifications: %', notification_count;
  
  -- Validate migrations completed
  IF (SELECT COUNT(*) FROM "Worker" WHERE "role_new" IS NULL) > 0 THEN
    RAISE EXCEPTION 'Worker role migration incomplete';
  END IF;
  
  IF (SELECT COUNT(*) FROM "ShiftApplication" WHERE "status_new" IS NULL) > 0 THEN
    RAISE EXCEPTION 'Application status migration incomplete';
  END IF;
  
  IF (SELECT COUNT(*) FROM "Shift" WHERE "state_new" IS NULL) > 0 THEN
    RAISE EXCEPTION 'Shift state migration incomplete';
  END IF;
END $$;

COMMIT;
```

### Phase 2: Prisma Migration

After running the data migration SQL, apply the Prisma migration:

```bash
cd backend
npx prisma migrate dev --name align_enums_v1
```

This will:
1. Drop old enums
2. Create new enums
3. Swap temporary columns to real columns
4. Drop temporary columns

### Phase 3: Verification

Run verification queries:

```sql
-- Verify Worker roles
SELECT role, COUNT(*) FROM "Worker" GROUP BY role ORDER BY role;
-- Expected: worker, site_manager, safety_officer, admin

-- Verify Application states
SELECT status, COUNT(*) FROM "ShiftApplication" GROUP BY status ORDER BY status;
-- Expected: applied, pending, approved, rejected, withdrawn

-- Verify Shift states
SELECT state, COUNT(*) FROM "Shift" GROUP BY state ORDER BY state;
-- Expected: draft, broadcasted, assigned, completed, cancelled

-- Verify Shift types
SELECT "shiftType", COUNT(*) FROM "Shift" GROUP BY "shiftType" ORDER BY "shiftType";
-- Expected: regular (most/all shifts initially)

-- Verify Notification types
SELECT type, COUNT(*) FROM "Notification" GROUP BY type ORDER BY type;
-- Expected: All new normalized values
```

---

## Rollback Plan

If migration fails, rollback with:

```bash
cd backend
npx prisma migrate resolve --rolled-back align_enums_v1
git checkout HEAD -- prisma/schema.prisma
npx prisma generate
```

Then restore from database backup.

---

## Code Changes Required

### Backend Code

**1. Update all references from `Role` to `UserRole`:**
```typescript
// ❌ OLD
import { Role } from '@prisma/client'
if (user.role === Role.OPERATOR) { ... }

// ✅ NEW
import { UserRole } from '../domain/shared/enums'
if (user.role === UserRole.WORKER) { ... }
```

**2. Update application status checks:**
```typescript
// ❌ OLD
if (app.status === 'accepted') { ... }

// ✅ NEW
if (app.status === ApplicationState.APPROVED) { ... }
```

**3. Update shift state logic:**
```typescript
// ❌ OLD
if (shift.state === 'pending_approval') { ... }

// ✅ NEW
if (shift.state === ShiftState.COMPLETED && !shift.approved) { ... }
```

**4. Add shift type handling:**
```typescript
// NEW - Shift type classification
const shiftType = isEmergency 
  ? ShiftType.EMERGENCY 
  : isWeekend 
    ? ShiftType.OVERTIME 
    : ShiftType.REGULAR
```

### Frontend Code

**1. Update role checks in UI:**
```typescript
// ❌ OLD
{user.role === 'OPERATOR' && <WorkerDashboard />}

// ✅ NEW
{user.role === 'worker' && <WorkerDashboard />}
```

**2. Update status badge colors:**
```typescript
const getStatusColor = (status: ApplicationState) => {
  switch(status) {
    case 'approved': return 'green'  // was 'accepted'
    case 'pending': return 'yellow'  // NEW
    case 'withdrawn': return 'gray'  // NEW
    // ...
  }
}
```

---

## Testing Checklist

### Pre-Migration
- [ ] Database backup created
- [ ] All existing shifts have valid states
- [ ] All workers have valid roles
- [ ] Migration SQL tested on staging database

### Post-Migration
- [ ] All enum values migrated correctly (verify with SQL)
- [ ] No NULL values in enum columns
- [ ] Backend starts successfully
- [ ] `npx prisma generate` runs without errors
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Frontend renders correctly with new enum values

### Production Readiness
- [ ] Migration tested on staging with production data snapshot
- [ ] Rollback plan tested
- [ ] Code deployed to all services (backend, web, mobile)
- [ ] Monitoring alerts configured for enum validation errors
- [ ] Team notified of breaking changes

---

## Timeline

1. **Code Review:** Review this migration guide
2. **Staging Test:** Run migration on staging database
3. **Frontend Update:** Deploy frontend code with new enum values
4. **Backend Update:** Deploy backend code with new enums
5. **Production Migration:** Execute migration during maintenance window
6. **Verification:** Run verification queries
7. **Monitor:** Watch for errors in first 24 hours

---

## Support

For migration issues:
- Check logs for enum validation errors
- Verify Prisma client regenerated: `npx prisma generate`
- Ensure frontend cache cleared
- Contact: tech-lead@shiftmaster.com

---

**Migration Status:** ✅ READY  
**Approver:** _______________  
**Date Approved:** _______________  
**Executed By:** _______________  
**Execution Date:** _______________
