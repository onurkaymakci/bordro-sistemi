/*
  Warnings:

  - A unique constraint covering the columns `[manager_position_id]` on the table `directorates` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[manager_position_id]` on the table `managements` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[manager_position_id]` on the table `organization_departments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "directorates" ADD COLUMN     "manager_position_id" TEXT;

-- AlterTable
ALTER TABLE "managements" ADD COLUMN     "manager_position_id" TEXT;

-- AlterTable
ALTER TABLE "organization_departments" ADD COLUMN     "manager_position_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "directorates_manager_position_id_key" ON "directorates"("manager_position_id");

-- CreateIndex
CREATE UNIQUE INDEX "managements_manager_position_id_key" ON "managements"("manager_position_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_departments_manager_position_id_key" ON "organization_departments"("manager_position_id");

-- AddForeignKey
ALTER TABLE "directorates" ADD CONSTRAINT "directorates_manager_position_id_fkey" FOREIGN KEY ("manager_position_id") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "managements" ADD CONSTRAINT "managements_manager_position_id_fkey" FOREIGN KEY ("manager_position_id") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_departments" ADD CONSTRAINT "organization_departments_manager_position_id_fkey" FOREIGN KEY ("manager_position_id") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
