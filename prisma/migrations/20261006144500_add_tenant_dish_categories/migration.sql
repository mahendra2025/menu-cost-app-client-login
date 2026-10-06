-- Add tenant-private dish categories.
-- Caterers can keep custom categories even when no dish has been added yet,
-- rename them later, and reuse them across future events.

CREATE TABLE "TenantDishCategory" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TenantDishCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantDishCategory_tenantId_normalizedName_key"
ON "TenantDishCategory"("tenantId", "normalizedName");

CREATE INDEX "TenantDishCategory_tenantId_updatedAt_idx"
ON "TenantDishCategory"("tenantId", "updatedAt");

ALTER TABLE "TenantDishCategory"
ADD CONSTRAINT "TenantDishCategory_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
