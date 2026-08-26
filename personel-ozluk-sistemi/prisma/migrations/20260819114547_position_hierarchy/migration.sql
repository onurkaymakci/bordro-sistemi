-- CreateEnum
CREATE TYPE "PositionOrganizationLevel" AS ENUM ('DIRECTORATE', 'MANAGEMENT', 'DEPARTMENT');

-- AlterTable
ALTER TABLE "positions" ADD COLUMN     "directorate_id" TEXT,
ADD COLUMN     "management_id" TEXT,
ADD COLUMN     "organization_level" "PositionOrganizationLevel" NOT NULL DEFAULT 'DEPARTMENT',
ALTER COLUMN "organization_department_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "positions_organization_level_idx" ON "positions"("organization_level");

-- CreateIndex
CREATE INDEX "positions_directorate_id_idx" ON "positions"("directorate_id");

-- CreateIndex
CREATE INDEX "positions_management_id_idx" ON "positions"("management_id");

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_directorate_id_fkey" FOREIGN KEY ("directorate_id") REFERENCES "directorates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_management_id_fkey" FOREIGN KEY ("management_id") REFERENCES "managements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
