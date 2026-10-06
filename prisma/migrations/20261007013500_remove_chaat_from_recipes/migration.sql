-- Remove Chaat only from recipe data.
-- Chaat remains available in Menu / Dish Master categories.

UPDATE "RecipeCatalog"
SET
  "dishes" = COALESCE(
    (
      SELECT jsonb_agg(recipe)
      FROM jsonb_array_elements(
        COALESCE("dishes"::jsonb, '[]'::jsonb)
      ) AS recipe
      WHERE lower(
        btrim(
          COALESCE(
            recipe ->> 'category',
            ''
          )
        )
      ) <> 'chaat'
    ),
    '[]'::jsonb
  ),
  "catalogVersion" = "catalogVersion" + 1
WHERE "id" = 'global';

DELETE FROM "TenantAutoRecipe"
WHERE lower(
  btrim(
    COALESCE(
      "category",
      ''
    )
  )
) = 'chaat';
