-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "actualEndTime" TIMESTAMP(3),
ADD COLUMN     "actualStartTime" TIMESTAMP(3),
ADD COLUMN     "breakMinutes" INTEGER,
ADD COLUMN     "totalHours" DECIMAL(4,2);
