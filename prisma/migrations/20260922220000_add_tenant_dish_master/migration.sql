-- Add tenant-private Dish Master items.
-- Each caterer can save custom dishes and rates without changing the global catalog.

CREATE TABLE "TenantDishMasterItem" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'Other',
  "subcategory" TEXT NOT NULL DEFAULT '',
  "rate" DOUBLE PRECISION NOT NULL,
  "servingQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "servingUnit" TEXT NOT NULL DEFAULT 'serving',
  "gasKgPer100" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TenantDishMasterItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantDishMasterItem_tenantId_normalizedName_key"
ON "TenantDishMasterItem"("tenantId", "normalizedName");

CREATE INDEX "TenantDishMasterItem_tenantId_updatedAt_idx"
ON "TenantDishMasterItem"("tenantId", "updatedAt");

ALTER TABLE "TenantDishMasterItem"
ADD CONSTRAINT "TenantDishMasterItem_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
