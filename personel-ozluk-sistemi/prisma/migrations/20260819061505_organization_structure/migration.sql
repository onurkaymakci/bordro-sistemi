/*
  Warnings:

  - A unique constraint covering the columns `[position_master_id]` on the table `employees` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "position_master_id" TEXT;

-- CreateTable
CREATE TABLE "directorates" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "directorates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "managements" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "directorate_id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "managements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_departments" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "management_id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "position_sequences" (
    "company_id" TEXT NOT NULL,
    "next_number" INTEGER NOT NULL DEFAULT 90000001,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "position_sequences_pkey" PRIMARY KEY ("company_id")
);

-- CreateTable
CREATE TABLE "cost_centers" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_locations" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "position_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization_department_id" TEXT NOT NULL,
    "parent_position_id" TEXT,
    "cost_center_id" TEXT,
    "work_location_id" TEXT,
    "norm_count" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "directorates_company_id_idx" ON "directorates"("company_id");

-- CreateIndex
CREATE INDEX "directorates_is_active_idx" ON "directorates"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "directorates_company_id_name_key" ON "directorates"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "directorates_company_id_code_key" ON "directorates"("company_id", "code");

-- CreateIndex
CREATE INDEX "managements_company_id_idx" ON "managements"("company_id");

-- CreateIndex
CREATE INDEX "managements_directorate_id_idx" ON "managements"("directorate_id");

-- CreateIndex
CREATE INDEX "managements_is_active_idx" ON "managements"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "managements_company_id_name_key" ON "managements"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "managements_company_id_code_key" ON "managements"("company_id", "code");

-- CreateIndex
CREATE INDEX "organization_departments_company_id_idx" ON "organization_departments"("company_id");

-- CreateIndex
CREATE INDEX "organization_departments_management_id_idx" ON "organization_departments"("management_id");

-- CreateIndex
CREATE INDEX "organization_departments_is_active_idx" ON "organization_departments"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "organization_departments_company_id_name_key" ON "organization_departments"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "organization_departments_company_id_code_key" ON "organization_departments"("company_id", "code");

-- CreateIndex
CREATE INDEX "cost_centers_company_id_idx" ON "cost_centers"("company_id");

-- CreateIndex
CREATE INDEX "cost_centers_is_active_idx" ON "cost_centers"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_company_id_code_key" ON "cost_centers"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_company_id_name_key" ON "cost_centers"("company_id", "name");

-- CreateIndex
CREATE INDEX "work_locations_company_id_idx" ON "work_locations"("company_id");

-- CreateIndex
CREATE INDEX "work_locations_is_active_idx" ON "work_locations"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "work_locations_company_id_code_key" ON "work_locations"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "work_locations_company_id_name_key" ON "work_locations"("company_id", "name");

-- CreateIndex
CREATE INDEX "positions_company_id_idx" ON "positions"("company_id");

-- CreateIndex
CREATE INDEX "positions_organization_department_id_idx" ON "positions"("organization_department_id");

-- CreateIndex
CREATE INDEX "positions_parent_position_id_idx" ON "positions"("parent_position_id");

-- CreateIndex
CREATE INDEX "positions_cost_center_id_idx" ON "positions"("cost_center_id");

-- CreateIndex
CREATE INDEX "positions_work_location_id_idx" ON "positions"("work_location_id");

-- CreateIndex
CREATE INDEX "positions_is_active_idx" ON "positions"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "positions_company_id_position_code_key" ON "positions"("company_id", "position_code");

-- CreateIndex
CREATE UNIQUE INDEX "employees_position_master_id_key" ON "employees"("position_master_id");

-- AddForeignKey
ALTER TABLE "directorates" ADD CONSTRAINT "directorates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "managements" ADD CONSTRAINT "managements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "managements" ADD CONSTRAINT "managements_directorate_id_fkey" FOREIGN KEY ("directorate_id") REFERENCES "directorates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_departments" ADD CONSTRAINT "organization_departments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_departments" ADD CONSTRAINT "organization_departments_management_id_fkey" FOREIGN KEY ("management_id") REFERENCES "managements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_sequences" ADD CONSTRAINT "position_sequences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_locations" ADD CONSTRAINT "work_locations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_organization_department_id_fkey" FOREIGN KEY ("organization_department_id") REFERENCES "organization_departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_parent_position_id_fkey" FOREIGN KEY ("parent_position_id") REFERENCES "positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_work_location_id_fkey" FOREIGN KEY ("work_location_id") REFERENCES "work_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_position_master_id_fkey" FOREIGN KEY ("position_master_id") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
