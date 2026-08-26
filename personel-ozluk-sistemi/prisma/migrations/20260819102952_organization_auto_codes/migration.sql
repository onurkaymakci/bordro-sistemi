/*
  Warnings:

  - Made the column `code` on table `directorates` required. This step will fail if there are existing NULL values in that column.
  - Made the column `code` on table `managements` required. This step will fail if there are existing NULL values in that column.
  - Made the column `code` on table `organization_departments` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "directorates" ALTER COLUMN "code" SET NOT NULL;

-- AlterTable
ALTER TABLE "managements" ALTER COLUMN "code" SET NOT NULL;

-- AlterTable
ALTER TABLE "organization_departments" ALTER COLUMN "code" SET NOT NULL;

-- CreateTable
CREATE TABLE "directorate_sequences" (
    "company_id" TEXT NOT NULL,
    "next_number" INTEGER NOT NULL DEFAULT 80000001,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "directorate_sequences_pkey" PRIMARY KEY ("company_id")
);

-- CreateTable
CREATE TABLE "management_sequences" (
    "company_id" TEXT NOT NULL,
    "next_number" INTEGER NOT NULL DEFAULT 70000001,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "management_sequences_pkey" PRIMARY KEY ("company_id")
);

-- CreateTable
CREATE TABLE "organization_department_sequences" (
    "company_id" TEXT NOT NULL,
    "next_number" INTEGER NOT NULL DEFAULT 60000001,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_department_sequences_pkey" PRIMARY KEY ("company_id")
);

-- AddForeignKey
ALTER TABLE "directorate_sequences" ADD CONSTRAINT "directorate_sequences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "management_sequences" ADD CONSTRAINT "management_sequences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_department_sequences" ADD CONSTRAINT "organization_department_sequences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
