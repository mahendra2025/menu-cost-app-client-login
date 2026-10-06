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

-- Preserve categories already used by tenant-private dishes.
INSERT INTO "TenantDishCategory" (
  "id",
  "tenantId",
  "normalizedName",
  "name",
  "createdAt",
  "updatedAt"
)
SELECT
  md5(random()::text || clock_timestamp()::text || "tenantId" || "category"),
  "tenantId",
  lower(trim(regexp_replace("category", '\\s+', ' ', 'g'))),
  trim(regexp_replace("category", '\\s+', ' ', 'g')),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "TenantDishMasterItem"
WHERE trim("category") <> ''
ON CONFLICT ("tenantId", "normalizedName") DO NOTHING;
