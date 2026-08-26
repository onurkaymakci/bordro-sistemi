-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "MilitaryStatus" AS ENUM ('NOT_APPLICABLE', 'COMPLETED', 'EXEMPT', 'DEFERRED', 'ACTIVE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('INDEFINITE', 'FIXED_TERM', 'OTHER');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'OTHER');

-- CreateEnum
CREATE TYPE "FamilyRelationType" AS ENUM ('SPOUSE', 'CHILD', 'MOTHER', 'FATHER', 'OTHER');

-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('PRIMARY', 'SECONDARY', 'HIGH_SCHOOL', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'DOCTORATE', 'OTHER');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "contract_type" "ContractType",
ADD COLUMN     "disability_rate" DOUBLE PRECISION,
ADD COLUMN     "employment_type" "EmploymentType",
ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "incentive_code" TEXT,
ADD COLUMN     "is_disabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_name" TEXT,
ADD COLUMN     "marital_status" "MaritalStatus" DEFAULT 'UNSPECIFIED',
ADD COLUMN     "marriage_date" TIMESTAMP(3),
ADD COLUMN     "military_deferment_date" TIMESTAMP(3),
ADD COLUMN     "military_status" "MilitaryStatus" DEFAULT 'UNKNOWN',
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "occupation_code" TEXT,
ADD COLUMN     "sgk_document_type_code" TEXT,
ADD COLUMN     "termination_note" TEXT,
ADD COLUMN     "termination_reason_code" TEXT;

-- CreateTable
CREATE TABLE "employee_registry_sequences" (
    "company_id" TEXT NOT NULL,
    "next_number" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_registry_sequences_pkey" PRIMARY KEY ("company_id")
);

-- CreateTable
CREATE TABLE "bank_master" (
    "id" TEXT NOT NULL,
    "bank_code" TEXT,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "eft_code" TEXT,
    "bank_type" TEXT,
    "payroll_eligible" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "occupation_master" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "occupation_master_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "sgk_document_type_master" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sgk_document_type_master_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "incentive_law_master" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "legal_basis" TEXT,
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incentive_law_master_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "termination_reason_master" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "severance_eligible" BOOLEAN,
    "notice_eligible" BOOLEAN,
    "unemployment_eligible" BOOLEAN,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "termination_reason_master_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "employee_bank_accounts" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "bank_id" TEXT NOT NULL,
    "account_no" TEXT,
    "iban" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_educations" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "level" "EducationLevel",
    "school_name" TEXT,
    "department_name" TEXT,
    "start_date" TIMESTAMP(3),
    "graduation_date" TIMESTAMP(3),
    "is_graduated" BOOLEAN,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_family_members" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "relation_type" "FamilyRelationType" NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "national_id" TEXT,
    "birth_date" TIMESTAMP(3),
    "gender" "Gender" DEFAULT 'UNSPECIFIED',
    "education_level" "EducationLevel",
    "school_name" TEXT,
    "is_dependent" BOOLEAN,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_family_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_master_bank_code_key" ON "bank_master"("bank_code");

-- CreateIndex
CREATE INDEX "bank_master_name_idx" ON "bank_master"("name");

-- CreateIndex
CREATE INDEX "bank_master_eft_code_idx" ON "bank_master"("eft_code");

-- CreateIndex
CREATE INDEX "bank_master_is_active_idx" ON "bank_master"("is_active");

-- CreateIndex
CREATE INDEX "occupation_master_name_idx" ON "occupation_master"("name");

-- CreateIndex
CREATE INDEX "occupation_master_is_active_idx" ON "occupation_master"("is_active");

-- CreateIndex
CREATE INDEX "sgk_document_type_master_name_idx" ON "sgk_document_type_master"("name");

-- CreateIndex
CREATE INDEX "sgk_document_type_master_is_active_idx" ON "sgk_document_type_master"("is_active");

-- CreateIndex
CREATE INDEX "incentive_law_master_name_idx" ON "incentive_law_master"("name");

-- CreateIndex
CREATE INDEX "incentive_law_master_is_active_idx" ON "incentive_law_master"("is_active");

-- CreateIndex
CREATE INDEX "incentive_law_master_valid_from_idx" ON "incentive_law_master"("valid_from");

-- CreateIndex
CREATE INDEX "incentive_law_master_valid_to_idx" ON "incentive_law_master"("valid_to");

-- CreateIndex
CREATE INDEX "termination_reason_master_name_idx" ON "termination_reason_master"("name");

-- CreateIndex
CREATE INDEX "termination_reason_master_is_active_idx" ON "termination_reason_master"("is_active");

-- CreateIndex
CREATE INDEX "employee_bank_accounts_employee_id_idx" ON "employee_bank_accounts"("employee_id");

-- CreateIndex
CREATE INDEX "employee_bank_accounts_bank_id_idx" ON "employee_bank_accounts"("bank_id");

-- CreateIndex
CREATE INDEX "employee_bank_accounts_is_primary_idx" ON "employee_bank_accounts"("is_primary");

-- CreateIndex
CREATE UNIQUE INDEX "employee_bank_accounts_employee_id_iban_key" ON "employee_bank_accounts"("employee_id", "iban");

-- CreateIndex
CREATE INDEX "employee_educations_employee_id_idx" ON "employee_educations"("employee_id");

-- CreateIndex
CREATE INDEX "employee_family_members_employee_id_idx" ON "employee_family_members"("employee_id");

-- CreateIndex
CREATE INDEX "employee_family_members_relation_type_idx" ON "employee_family_members"("relation_type");

-- CreateIndex
CREATE INDEX "employee_family_members_national_id_idx" ON "employee_family_members"("national_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs"("entity");

-- CreateIndex
CREATE INDEX "audit_logs_entity_id_idx" ON "audit_logs"("entity_id");

-- CreateIndex
CREATE INDEX "departments_parent_id_idx" ON "departments"("parent_id");

-- CreateIndex
CREATE INDEX "employees_status_idx" ON "employees"("status");

-- CreateIndex
CREATE INDEX "employees_department_id_idx" ON "employees"("department_id");

-- CreateIndex
CREATE INDEX "employees_manager_id_idx" ON "employees"("manager_id");

-- CreateIndex
CREATE INDEX "employees_occupation_code_idx" ON "employees"("occupation_code");

-- CreateIndex
CREATE INDEX "employees_sgk_document_type_code_idx" ON "employees"("sgk_document_type_code");

-- CreateIndex
CREATE INDEX "employees_incentive_code_idx" ON "employees"("incentive_code");

-- CreateIndex
CREATE INDEX "employees_termination_reason_code_idx" ON "employees"("termination_reason_code");

-- CreateIndex
CREATE INDEX "leave_requests_status_idx" ON "leave_requests"("status");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- AddForeignKey
ALTER TABLE "employee_registry_sequences" ADD CONSTRAINT "employee_registry_sequences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_occupation_code_fkey" FOREIGN KEY ("occupation_code") REFERENCES "occupation_master"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_sgk_document_type_code_fkey" FOREIGN KEY ("sgk_document_type_code") REFERENCES "sgk_document_type_master"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_incentive_code_fkey" FOREIGN KEY ("incentive_code") REFERENCES "incentive_law_master"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_termination_reason_code_fkey" FOREIGN KEY ("termination_reason_code") REFERENCES "termination_reason_master"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_bank_accounts" ADD CONSTRAINT "employee_bank_accounts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_bank_accounts" ADD CONSTRAINT "employee_bank_accounts_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "bank_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_educations" ADD CONSTRAINT "employee_educations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_family_members" ADD CONSTRAINT "employee_family_members_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
