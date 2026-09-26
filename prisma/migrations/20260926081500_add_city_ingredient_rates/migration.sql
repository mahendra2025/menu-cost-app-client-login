-- CreateTable
CREATE TABLE "IngredientCityRate" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "cityKey" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT '',
    "effectiveDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngredientCityRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IngredientCityRate_ingredientId_cityKey_key"
ON "IngredientCityRate"("ingredientId", "cityKey");

-- CreateIndex
CREATE INDEX "IngredientCityRate_cityKey_ingredientId_idx"
ON "IngredientCityRate"("cityKey", "ingredientId");
