-- AlterTable
ALTER TABLE "positions" ADD COLUMN     "organization_unit_id" TEXT;

-- CreateTable
CREATE TABLE "organization_unit_types" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_unit_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_units" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type_id" TEXT NOT NULL,
    "parent_unit_id" TEXT,
    "manager_position_id" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_unit_sequences" (
    "company_id" TEXT NOT NULL,
    "next_number" INTEGER NOT NULL DEFAULT 80000001,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_unit_sequences_pkey" PRIMARY KEY ("company_id")
);

-- CreateIndex
CREATE INDEX "organization_unit_types_company_id_idx" ON "organization_unit_types"("company_id");

-- CreateIndex
CREATE INDEX "organization_unit_types_level_order_idx" ON "organization_unit_types"("level_order");

-- CreateIndex
CREATE INDEX "organization_unit_types_is_active_idx" ON "organization_unit_types"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "organization_unit_types_company_id_code_key" ON "organization_unit_types"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "organization_unit_types_company_id_name_key" ON "organization_unit_types"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "organization_units_manager_position_id_key" ON "organization_units"("manager_position_id");

-- CreateIndex
CREATE INDEX "organization_units_company_id_idx" ON "organization_units"("company_id");

-- CreateIndex
CREATE INDEX "organization_units_type_id_idx" ON "organization_units"("type_id");

-- CreateIndex
CREATE INDEX "organization_units_parent_unit_id_idx" ON "organization_units"("parent_unit_id");

-- CreateIndex
CREATE INDEX "organization_units_is_active_idx" ON "organization_units"("is_active");

-- CreateIndex
CREATE INDEX "organization_units_sort_order_idx" ON "organization_units"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "organization_units_company_id_code_key" ON "organization_units"("company_id", "code");

-- CreateIndex
CREATE INDEX "positions_organization_unit_id_idx" ON "positions"("organization_unit_id");

-- AddForeignKey
ALTER TABLE "organization_unit_types" ADD CONSTRAINT "organization_unit_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_units" ADD CONSTRAINT "organization_units_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_units" ADD CONSTRAINT "organization_units_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "organization_unit_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_units" ADD CONSTRAINT "organization_units_parent_unit_id_fkey" FOREIGN KEY ("parent_unit_id") REFERENCES "organization_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_units" ADD CONSTRAINT "organization_units_manager_position_id_fkey" FOREIGN KEY ("manager_position_id") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_unit_sequences" ADD CONSTRAINT "organization_unit_sequences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_organization_unit_id_fkey" FOREIGN KEY ("organization_unit_id") REFERENCES "organization_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
