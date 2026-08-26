-- AlterEnum
ALTER TYPE "PositionOrganizationLevel" ADD VALUE 'GENERAL_MANAGEMENT';

-- AlterTable
ALTER TABLE "positions" ADD COLUMN     "general_management_id" TEXT;

-- CreateTable
CREATE TABLE "general_managements" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '50000001',
    "name" TEXT NOT NULL DEFAULT 'Genel Mudurluk',
    "description" TEXT,
    "manager_position_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "general_managements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "general_managements_company_id_key" ON "general_managements"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "general_managements_manager_position_id_key" ON "general_managements"("manager_position_id");

-- CreateIndex
CREATE INDEX "general_managements_is_active_idx" ON "general_managements"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "general_managements_company_id_code_key" ON "general_managements"("company_id", "code");

-- CreateIndex
CREATE INDEX "positions_general_management_id_idx" ON "positions"("general_management_id");

-- AddForeignKey
ALTER TABLE "general_managements" ADD CONSTRAINT "general_managements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "general_managements" ADD CONSTRAINT "general_managements_manager_position_id_fkey" FOREIGN KEY ("manager_position_id") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_general_management_id_fkey" FOREIGN KEY ("general_management_id") REFERENCES "general_managements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
