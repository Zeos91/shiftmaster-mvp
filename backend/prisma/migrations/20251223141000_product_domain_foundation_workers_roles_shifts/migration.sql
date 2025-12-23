-- CreateEnum for JobRole
CREATE TYPE "JobRole" AS ENUM ('crane_operator', 'safety_assistant', 'signalman', 'site_manager', 'safety_officer', 'general_worker');

-- CreateEnum for ShiftState
CREATE TYPE "ShiftState" AS ENUM ('assigned', 'broadcasted', 'applied', 'pending_approval', 'completed');

-- Step 1: Create Worker table from User data
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password" TEXT,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "roles" "JobRole"[],
    "certifications" TEXT[],
    "availabilityStatus" BOOLEAN NOT NULL DEFAULT true,
    "residenceLocation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- Step 2: Migrate data from User to Worker
INSERT INTO "Worker" ("id", "name", "email", "phone", "password", "phoneVerified", "role", "roles", "certifications", "availabilityStatus", "residenceLocation", "createdAt")
SELECT "id", "name", "email", "phone", "password", "phoneVerified", "role", 
       -- Initialize roles array based on role
       CASE WHEN "role" = 'OPERATOR' THEN ARRAY['crane_operator'::"JobRole"] ELSE ARRAY[]::"JobRole"[] END,
       ARRAY[]::text[],
       true,
       "residenceLocation",
       "createdAt"
FROM "User";

-- Step 3: Create unique constraint on Worker email
CREATE UNIQUE INDEX "Worker_email_key" ON "Worker"("email");

-- Step 4: Create WorkerRate table from OperatorRate data
CREATE TABLE "WorkerRate" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "hourlyRate" DECIMAL(8,2) NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkerRate_pkey" PRIMARY KEY ("id")
);

-- Step 5: Migrate data from OperatorRate to WorkerRate
INSERT INTO "WorkerRate" ("id", "workerId", "hourlyRate", "validFrom", "validTo", "createdAt")
SELECT "id", "operatorId", "hourlyRate", "validFrom", "validTo", "createdAt"
FROM "OperatorRate";

-- Step 6: Create foreign keys for WorkerRate
ALTER TABLE "WorkerRate" ADD CONSTRAINT "WorkerRate_workerId_fkey" 
  FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 7: Update Site table to reference Worker instead of User
ALTER TABLE "Site" DROP CONSTRAINT "Site_managerId_fkey";
ALTER TABLE "Site" ADD CONSTRAINT "Site_managerId_fkey" 
  FOREIGN KEY ("managerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 8: Update Shift table
-- First add new columns
ALTER TABLE "Shift" 
  ADD COLUMN "date" TEXT,
  ADD COLUMN "equipmentId" TEXT,
  ADD COLUMN "roleRequired" "JobRole",
  ADD COLUMN "state" "ShiftState" DEFAULT 'assigned',
  ADD COLUMN "workerId" TEXT;

-- Populate date from startTime (YYYY-MM-DD format)
UPDATE "Shift" SET "date" = TO_CHAR("startTime", 'YYYY-MM-DD') WHERE "startTime" IS NOT NULL;
UPDATE "Shift" SET "date" = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') WHERE "date" IS NULL;

-- Set roleRequired based on crane existence (if there's a crane, it's crane_operator)
UPDATE "Shift" SET "roleRequired" = 'crane_operator' WHERE "roleRequired" IS NULL;

-- Copy operatorId to workerId
UPDATE "Shift" SET "workerId" = "operatorId";

-- Make columns NOT NULL after populating
ALTER TABLE "Shift" ALTER COLUMN "date" SET NOT NULL;
ALTER TABLE "Shift" ALTER COLUMN "roleRequired" SET NOT NULL;
ALTER TABLE "Shift" ALTER COLUMN "workerId" SET NOT NULL;
ALTER TABLE "Shift" ALTER COLUMN "state" SET NOT NULL;

-- Drop old operatorId column
ALTER TABLE "Shift" DROP CONSTRAINT "Shift_operatorId_fkey";
ALTER TABLE "Shift" DROP COLUMN "operatorId";

-- Add foreign key for workerId
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_workerId_fkey" 
  FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Update approvedById foreign key
ALTER TABLE "Shift" DROP CONSTRAINT "Shift_approvedById_fkey";
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_approvedById_fkey" 
  FOREIGN KEY ("approvedById") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Make craneId nullable (it's now optional)
ALTER TABLE "Shift" ALTER COLUMN "craneId" DROP NOT NULL;

-- Step 9: Drop old tables
DROP TABLE "OperatorRate";
DROP TABLE "User";
