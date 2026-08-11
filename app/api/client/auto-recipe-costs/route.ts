import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import defaultRecipesData from '../../../../lib/defaultRecipes.json';
import { requireClientTenantId } from '../../../../lib/billingAuth';
import { normalizeIngredientRate } from '../../../../lib/ingredientCatalog';
import { prisma } from '../../../../lib/prisma';
import {
  buildRecipeMap,
  calculateRecipeCost,
  normalizeRecipeName,
  readCostableRecipe,
  type CostableRecipe,
} from '../../../../lib/recipeCosting';

const MAX_DISHES = 80;
const DEFAULT_MODEL = 'gpt-5.6-sol';

type RequestedDish = {
  name: string;
  category: string;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
};

function outputText(value: OpenAIResponse) {
  if (typeof value.output_text === 'string') return value.output_text;
  return (value.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === 'output_text')
    .map((item) => item.text ?? '')
    .join('');
}

function cleanDish(value: unknown): RequestedDish | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const name = String(row.name || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  if (!name) return null;

  return {
    name,
    category: String(row.category || 'Other').trim().slice(0, 60) || 'Other',
  };
}

async function generateRecipes(
  dishes: RequestedDish[],
  availableIngredients: Array<{ name: string; unit: string }>,
) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || !dishes.length) return [];

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MENU_MODEL?.trim() || DEFAULT_MODEL,
      store: false,
      max_output_tokens: 10_000,
      instructions: [
        'Create practical Indian catering production recipes for exactly 100 guests.',
        'Return one recipe for every requested dish and do not add extra dishes.',
        'Use only ingredient names and purchase units from the supplied ingredient catalog.',
        'Quantities must be realistic production quantities, not per-person quantities.',
        'Use kg, gram, ltr, ml, piece, or packet exactly as supplied.',
        'This is an editable costing estimate, so prefer a concise ingredient list of the material cost drivers.',
      ].join('\n'),
      input: [{
        role: 'user',
        content: [{
          type: 'input_text',
          text: JSON.stringify({ dishes, availableIngredients }),
        }],
      }],
      text: {
        format: {
          type: 'json_schema',
          name: 'generated_catering_recipes',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['recipes'],
            properties: {
              recipes: {
                type: 'array',
                maxItems: MAX_DISHES,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['name', 'baseGuests', 'ingredients'],
                  properties: {
                    name: { type: 'string' },
                    baseGuests: { type: 'integer', const: 100 },
                    ingredients: {
                      type: 'array',
                      minItems: 1,
                      maxItems: 30,
                      items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['name', 'quantity', 'unit'],
                        properties: {
                          name: { type: 'string' },
                          quantity: { type: 'number', exclusiveMinimum: 0 },
                          unit: {
                            type: 'string',
                            enum: ['kg', 'gram', 'ltr', 'ml', 'piece', 'packet'],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    console.error('Automatic recipe generation failed:', response.status);
    return [];
  }

  const raw = outputText(await response.json() as OpenAIResponse);
  if (!raw) return [];

  const parsed = JSON.parse(raw) as { recipes?: unknown[] };
  return (parsed.recipes ?? [])
    .map(readCostableRecipe)
    .filter((recipe): recipe is CostableRecipe => Boolean(recipe));
}

export async function POST(request: Request) {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'Client login required' }, { status: 401 });
    }

    const body = await request.json() as Record<string, unknown>;
    const unique = new Map<string, RequestedDish>();
    (Array.isArray(body.dishes) ? body.dishes.slice(0, MAX_DISHES) : [])
      .map(cleanDish)
      .forEach((dish) => {
        if (!dish) return;
        const key = normalizeRecipeName(dish.name);
        if (key) unique.set(key, dish);
      });

    if (!unique.size) {
      return NextResponse.json({ results: [], generated: 0 });
    }

    const [catalog, overrides, savedRecipes] = await Promise.all([
      prisma.recipeCatalog.findUnique({
        where: { id: 'global' },
        select: { dishes: true, rates: true },
      }),
      prisma.tenantIngredientRate.findMany({
        where: { tenantId },
        select: { ingredientId: true, rate: true },
      }),
      prisma.tenantAutoRecipe.findMany({ where: { tenantId } }),
    ]);

    const masterRates = Array.isArray(catalog?.rates) ? catalog.rates : [];
    const overrideMap = new Map(
      overrides.map((item) => [item.ingredientId, item.rate]),
    );
    const catalogMap = buildRecipeMap([
      ...(Array.isArray(defaultRecipesData) ? defaultRecipesData : []),
      ...(Array.isArray(catalog?.dishes) ? catalog.dishes : []),
    ]);
    const savedMap = new Map(
      savedRecipes.flatMap((saved) => {
        const recipe = readCostableRecipe({
          name: saved.name,
          baseGuests: saved.baseGuests,
          ingredients: saved.ingredients,
        });
        return recipe ? [[saved.normalizedName, recipe] as const] : [];
      }),
    );

    const missing = Array.from(unique.entries())
      .filter(([key]) => !catalogMap.has(key) && !savedMap.has(key))
      .map(([, dish]) => dish);
    const ingredientCatalog = masterRates
      .map(normalizeIngredientRate)
      .filter((rate): rate is NonNullable<typeof rate> => Boolean(rate))
      .filter((rate) => (overrideMap.get(rate.id) ?? rate.rate) > 0)
      .slice(0, 800)
      .map((rate) => ({ name: rate.name, unit: rate.unit }));
    const generated = ingredientCatalog.length
      ? await generateRecipes(missing, ingredientCatalog)
      : [];

    for (const recipe of generated) {
      const key = normalizeRecipeName(recipe.name);
      const requested = unique.get(key);
      if (!requested) continue;
      const costing = calculateRecipeCost(recipe, masterRates, overrideMap);
      await prisma.tenantAutoRecipe.upsert({
        where: { tenantId_normalizedName: { tenantId, normalizedName: key } },
        create: {
          tenantId,
          normalizedName: key,
          name: requested.name,
          category: requested.category,
          baseGuests: recipe.baseGuests,
          ingredients: recipe.ingredients as Prisma.InputJsonValue,
          costPerPlate: costing.costPerPlate,
        },
        update: {
          name: requested.name,
          category: requested.category,
          baseGuests: recipe.baseGuests,
          ingredients: recipe.ingredients as Prisma.InputJsonValue,
          costPerPlate: costing.costPerPlate,
        },
      });
      savedMap.set(key, { ...recipe, name: requested.name });
    }

    const results = Array.from(unique.entries()).map(([key, dish]) => {
      const catalogRecipe = catalogMap.get(key);
      const recipe = catalogRecipe || savedMap.get(key);
      const costing = recipe
        ? calculateRecipeCost(recipe, masterRates, overrideMap)
        : { costPerPlate: 0, missingRates: 0 };

      return {
        requestedName: dish.name,
        matchedName: recipe?.name || dish.name,
        costPerPlate: costing.costPerPlate,
        missingRates: costing.missingRates,
        recipeAvailable: Boolean(recipe),
        source: catalogRecipe ? 'catalog_recipe' : recipe ? 'ai_recipe' : 'unresolved',
      };
    });

    return NextResponse.json({
      results,
      generated: generated.length,
    });
  } catch (error) {
    console.error('Automatic recipe costing failed:', error);
    return NextResponse.json(
      { error: 'Automatic recipe costing is temporarily unavailable' },
      { status: 500 },
    );
  }
}
