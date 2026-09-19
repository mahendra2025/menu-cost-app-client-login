-- Add automatic LPG / gas cost masters and optional dish-level override.

ALTER TABLE "DishMasterItem"
ADD COLUMN "gasKgPer100" DOUBLE PRECISION;

CREATE TABLE "GasCategoryRate" (
  "id" TEXT NOT NULL,
  "categoryName" TEXT NOT NULL,
  "lpgKgPer100" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "basePax" INTEGER NOT NULL DEFAULT 100,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GasCategoryRate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LpgSetting" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "cylinderPrice" DOUBLE PRECISION NOT NULL DEFAULT 1800,
  "cylinderWeightKg" DOUBLE PRECISION NOT NULL DEFAULT 19,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LpgSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GasCategoryRate_categoryName_key"
ON "GasCategoryRate"("categoryName");

CREATE INDEX "GasCategoryRate_active_categoryName_idx"
ON "GasCategoryRate"("active", "categoryName");
