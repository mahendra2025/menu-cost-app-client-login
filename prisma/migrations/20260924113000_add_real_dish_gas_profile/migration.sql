-- Add measurable real LPG profile fields per dish.
-- Actual event gas = burner kg/hour * burner count * cooking hours * batches.
-- Batches = ceil(event guests / batch pax).

ALTER TABLE "DishMasterItem"
ADD COLUMN "gasBurnerKgPerHour" DOUBLE PRECISION,
ADD COLUMN "gasCookingMinutes" DOUBLE PRECISION,
ADD COLUMN "gasBurnerCount" INTEGER,
ADD COLUMN "gasBatchPax" INTEGER;
