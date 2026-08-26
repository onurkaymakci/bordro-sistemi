-- CreateEnum
CREATE TYPE "CollarType" AS ENUM ('WHITE_COLLAR', 'BLUE_COLLAR', 'OTHER');

-- AlterTable
ALTER TABLE "employee_educations" ADD COLUMN     "end_date" TIMESTAMP(3),
ADD COLUMN     "is_continuing" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "employee_family_members" ADD COLUMN     "child_allowance_eligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "education_end_date" TIMESTAMP(3),
ADD COLUMN     "education_start_date" TIMESTAMP(3),
ADD COLUMN     "is_education_continuing" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "city" TEXT,
ADD COLUMN     "collar_type" "CollarType",
ADD COLUMN     "corporate_email" TEXT,
ADD COLUMN     "country" TEXT;

-- CreateTable
CREATE TABLE "employee_emergency_contacts" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_emergency_contacts_employee_id_idx" ON "employee_emergency_contacts"("employee_id");

-- CreateIndex
CREATE INDEX "employee_emergency_contacts_is_primary_idx" ON "employee_emergency_contacts"("is_primary");

-- CreateIndex
CREATE INDEX "employee_educations_level_idx" ON "employee_educations"("level");

-- CreateIndex
CREATE INDEX "employee_educations_is_continuing_idx" ON "employee_educations"("is_continuing");

-- CreateIndex
CREATE INDEX "employee_family_members_child_allowance_eligible_idx" ON "employee_family_members"("child_allowance_eligible");

-- CreateIndex
CREATE INDEX "employee_family_members_is_education_continuing_idx" ON "employee_family_members"("is_education_continuing");

-- CreateIndex
CREATE INDEX "employees_collar_type_idx" ON "employees"("collar_type");

-- AddForeignKey
ALTER TABLE "employee_emergency_contacts" ADD CONSTRAINT "employee_emergency_contacts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
