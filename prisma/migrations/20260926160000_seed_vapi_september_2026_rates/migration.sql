-- September 2026 Vapi ingredient-rate benchmark.
-- Fresh vegetables use nearby Valsad market observations.
-- Staples use Department of Consumer Affairs wholesale benchmarks.
-- The city-rate layer remains below any business-specific/TENANT rate.

INSERT INTO "IngredientCity" (
  "id",
  "city",
  "cityKey",
  "active",
  "createdAt",
  "updatedAt"
)
VALUES (
  'core_vapi',
  'Vapi',
  'vapi',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("cityKey") DO UPDATE
SET
  "city" = EXCLUDED."city",
  "active" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

WITH vapi_rates (
  "ingredientId",
  "rate",
  "source",
  "effectiveDate"
) AS (
  VALUES
    ('onion__kg', 43.00, 'Valsad local market proxy | Roz Ka Bhav', DATE '2026-09-25'),
    ('potato__kg', 32.00, 'Valsad local market proxy | Roz Ka Bhav', DATE '2026-09-25'),
    ('tomato__kg', 85.00, 'Valsad local market proxy | Roz Ka Bhav', DATE '2026-09-25'),
    ('cauliflower__kg', 33.00, 'Valsad local market proxy | Roz Ka Bhav', DATE '2026-09-25'),
    ('cabbage__kg', 18.00, 'Valsad local market proxy | Roz Ka Bhav', DATE '2026-09-25'),
    ('capsicum__kg', 97.00, 'Valsad local market proxy | Roz Ka Bhav', DATE '2026-09-25'),
    ('beans__kg', 212.00, 'Valsad local market proxy | Roz Ka Bhav', DATE '2026-09-25'),

    ('rice__kg', 41.89, 'Dept Consumer Affairs | India wholesale', DATE '2026-09-25'),
    ('atta__kg', 33.43, 'Dept Consumer Affairs | India wholesale', DATE '2026-09-25'),
    ('wheat flour__kg', 33.43, 'Dept Consumer Affairs | India wholesale', DATE '2026-09-25'),
    ('chana dal__kg', 81.11, 'Dept Consumer Affairs | India wholesale', DATE '2026-09-25'),
    ('toor dal__kg', 116.31, 'Dept Consumer Affairs | India wholesale', DATE '2026-09-25'),
    ('urad dal__kg', 114.00, 'Dept Consumer Affairs | India wholesale', DATE '2026-09-25'),
    ('moong dal__kg', 102.41, 'Dept Consumer Affairs | India wholesale', DATE '2026-09-25'),
    ('sugar__kg', 51.90, 'Dept Consumer Affairs | India wholesale', DATE '2026-09-25'),
    ('milk__ltr', 57.68, 'Dept Consumer Affairs | India wholesale benchmark', DATE '2026-09-25')
),
master_ids AS (
  SELECT DISTINCT
    rate_item ->> 'id' AS "ingredientId"
  FROM "RecipeCatalog" catalog
  CROSS JOIN LATERAL
    jsonb_array_elements(catalog."rates"::jsonb)
      AS rate_item
  WHERE catalog."id" = 'global'
)
INSERT INTO "IngredientCityRate" (
  "id",
  "ingredientId",
  "city",
  "cityKey",
  "rate",
  "source",
  "effectiveDate",
  "createdAt",
  "updatedAt"
)
SELECT
  CONCAT(
    'vapi_sep26_',
    SUBSTRING(
      md5(v."ingredientId")
      FROM 1 FOR 16
    )
  ),
  v."ingredientId",
  'Vapi',
  'vapi',
  v."rate",
  v."source",
  v."effectiveDate",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM vapi_rates v
INNER JOIN master_ids m
  ON m."ingredientId" = v."ingredientId"
ON CONFLICT (
  "ingredientId",
  "cityKey"
)
DO UPDATE SET
  "city" = EXCLUDED."city",
  "rate" = EXCLUDED."rate",
  "source" = EXCLUDED."source",
  "effectiveDate" = EXCLUDED."effectiveDate",
  "updatedAt" = CURRENT_TIMESTAMP;
