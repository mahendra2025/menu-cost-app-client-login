CREATE TABLE "IngredientCity" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "cityKey" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngredientCity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IngredientCity_cityKey_key"
ON "IngredientCity"("cityKey");

CREATE INDEX "IngredientCity_active_city_idx"
ON "IngredientCity"("active", "city");

INSERT INTO "IngredientCity" (
  "id",
  "city",
  "cityKey",
  "active",
  "createdAt",
  "updatedAt"
)
VALUES
  ('core_silvassa', 'Silvassa', 'silvassa', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('core_vapi', 'Vapi', 'vapi', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('core_daman', 'Daman', 'daman', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("cityKey") DO NOTHING;

INSERT INTO "IngredientCity" (
  "id",
  "city",
  "cityKey",
  "active",
  "createdAt",
  "updatedAt"
)
SELECT
  CONCAT('rate_', md5("cityKey")),
  MIN("city"),
  "cityKey",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "IngredientCityRate"
WHERE TRIM("cityKey") <> ''
GROUP BY "cityKey"
ON CONFLICT ("cityKey") DO NOTHING;
