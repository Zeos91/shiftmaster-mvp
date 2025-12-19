/*
  Warnings:

  - You are about to drop the column `date` on the `Shift` table. All the data in the column will be lost.
  - You are about to alter the column `hours` on the `Shift` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(4,2)`.
  - Added the required column `craneId` to the `Shift` table without a default value. This is not possible if the table is not empty.
  - Added the required column `operatorRate` to the `Shift` table without a default value. This is not possible if the table is not empty.
  - Added the required column `siteId` to the `Shift` table without a default value. This is not possible if the table is not empty.
  - Added the required column `siteRate` to the `Shift` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OPERATOR', 'SITE_MANAGER', 'PROJECT_MANAGER', 'COMPANY_ADMIN');

-- AlterTable
ALTER TABLE "Shift" DROP COLUMN "date",
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "craneId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "endTime" TIMESTAMP(3),
ADD COLUMN     "operatorRate" DECIMAL(8,2) NOT NULL,
ADD COLUMN     "overrideOperatorRate" DECIMAL(8,2),
ADD COLUMN     "overrideSiteRate" DECIMAL(8,2),
ADD COLUMN     "siteId" TEXT NOT NULL,
ADD COLUMN     "siteRate" DECIMAL(8,2) NOT NULL,
ADD COLUMN     "startTime" TIMESTAMP(3),
ALTER COLUMN "hours" SET DATA TYPE DECIMAL(4,2);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "residenceLocation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "managerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Crane" (
    "id" TEXT NOT NULL,
    "craneNumber" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Crane_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperatorRate" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "hourlyRate" DECIMAL(8,2) NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteRate" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "hourlyRate" DECIMAL(8,2) NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Crane" ADD CONSTRAINT "Crane_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_craneId_fkey" FOREIGN KEY ("craneId") REFERENCES "Crane"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorRate" ADD CONSTRAINT "OperatorRate_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteRate" ADD CONSTRAINT "SiteRate_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
