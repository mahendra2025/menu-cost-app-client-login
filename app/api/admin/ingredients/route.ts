import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getAdminCookieName, isValidAdminSessionToken } from '../../../../lib/adminAuth';
import { INGREDIENT_CATEGORIES, normalizeIngredientRate, type IngredientRate } from '../../../../lib/ingredientCatalog';
import { prisma } from '../../../../lib/prisma';

const CATALOG_ID = 'global';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;
  if (!isValidAdminSessionToken(token)) {
    return NextResponse.json({ error: 'Admin login required' }, { status: 401 });
  }
  return null;
}

function recipeIngredientUsage(dishes: unknown) {
  const usage = new Map<string, number>();
  if (!Array.isArray(dishes)) return usage;
  dishes.forEach((dish) => {
    if (!dish || typeof dish !== 'object') return;
    const ingredients = (dish as Record<string, unknown>).ingredients;
    if (!Array.isArray(ingredients)) return;
    new Set(ingredients.map((item) => item && typeof item === 'object' ? String((item as Record<string, unknown>).rateKey || '') : '').filter(Boolean))
      .forEach((id) => usage.set(id, (usage.get(id) || 0) + 1));
  });
  return usage;
}

function normalizeCategories(value: unknown, rates: IngredientRate[]) {
  const supplied = Array.isArray(value) && value.length ? value : INGREDIENT_CATEGORIES;
  const seen = new Set<string>();
  return [...supplied, ...rates.map((rate) => rate.category), 'Other']
    .map((category) => String(category || '').trim().replace(/\s+/g, ' '))
    .filter((category) => {
      const key = category.toLowerCase();
      if (!category || category.length > 60 || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function updateRecipeIngredients(
  dishes: unknown,
  ratesByOriginalId: Map<string, IngredientRate>,
) {
  if (!Array.isArray(dishes)) return dishes;
  return dishes.map((dish) => {
    if (!dish || typeof dish !== 'object') return dish;
    const row = dish as Record<string, unknown>;
    if (!Array.isArray(row.ingredients)) return dish;
    return {
      ...row,
      ingredients: row.ingredients.map((ingredient) => {
        if (!ingredient || typeof ingredient !== 'object') return ingredient;
        const item = ingredient as Record<string, unknown>;
        const rate = ratesByOriginalId.get(String(item.rateKey || ''));
        if (!rate) return ingredient;
        return {
          ...item,
          name: rate.name,
          rateKey: rate.id,
          rate: rate.rate,
          rateUnit: rate.unit,
        };
      }),
    };
  });
}

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const catalog = await prisma.recipeCatalog.findUnique({
      where: { id: CATALOG_ID },
      select: { rates: true, ingredientCategories: true, dishes: true, updatedAt: true },
    });
    if (!catalog) return NextResponse.json({ rates: [], categories: INGREDIENT_CATEGORIES, usage: {}, ready: false });
    const usage = Object.fromEntries(recipeIngredientUsage(catalog.dishes));
    const rates = Array.isArray(catalog.rates)
      ? catalog.rates
        .map(normalizeIngredientRate)
        .filter((rate): rate is NonNullable<typeof rate> => Boolean(rate))
      : [];
    const categories = normalizeCategories(catalog.ingredientCategories, rates);
    return NextResponse.json({ rates, categories, usage, ready: true, updatedAt: catalog.updatedAt });
  } catch {
    return NextResponse.json({ error: 'Failed to load ingredients' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const body = await request.json() as Record<string, unknown>;
    if (!Array.isArray(body.rates)) return NextResponse.json({ error: 'Invalid ingredient catalog' }, { status: 400 });
    const rates = body.rates.map(normalizeIngredientRate);
    if (rates.some((rate) => !rate)) return NextResponse.json({ error: 'Every ingredient needs a name, category, rate and valid unit' }, { status: 400 });
    const cleanedRates = rates.filter((rate): rate is NonNullable<typeof rate> => Boolean(rate));
    if (new Set(cleanedRates.map((rate) => rate.id)).size !== cleanedRates.length) {
      return NextResponse.json({ error: 'Ingredient name and unit combinations must be unique' }, { status: 400 });
    }
    const categories = normalizeCategories(body.categories, cleanedRates);

    const catalog = await prisma.recipeCatalog.findUnique({ where: { id: CATALOG_ID } });
    if (!catalog) return NextResponse.json({ error: 'Open Recipe Studio once before creating the Ingredient Master' }, { status: 409 });
    const previousRates = Array.isArray(catalog.rates) ? catalog.rates : [];
    const previousIds = new Set(previousRates.map((rate) => rate && typeof rate === 'object' ? String((rate as Record<string, unknown>).id || '') : '').filter(Boolean));
    const nextIds = new Set(cleanedRates.map((rate) => rate.id));
    const ratesByOriginalId = new Map<string, IngredientRate>();
    body.rates.forEach((submitted, index) => {
      if (!submitted || typeof submitted !== 'object') return;
      const originalId = String((submitted as Record<string, unknown>).originalId || '').trim();
      if (originalId && previousIds.has(originalId)) ratesByOriginalId.set(originalId, cleanedRates[index]);
    });
    const usage = recipeIngredientUsage(catalog.dishes);
    const usedDeletions = [...previousIds].filter(
      (id) => !nextIds.has(id) && !ratesByOriginalId.has(id) && (usage.get(id) || 0) > 0,
    );
    if (usedDeletions.length) {
      return NextResponse.json({ error: 'An ingredient used by a recipe cannot be deleted' }, { status: 409 });
    }
    const dishes = updateRecipeIngredients(catalog.dishes, ratesByOriginalId);

    const saved = await prisma.recipeCatalog.update({
      where: { id: CATALOG_ID },
      data: {
        rates: cleanedRates,
        ingredientCategories: categories,
        dishes: dishes as Prisma.InputJsonValue,
      },
      select: { updatedAt: true },
    });
    return NextResponse.json({ ok: true, updatedAt: saved.updatedAt });
  } catch {
    return NextResponse.json({ error: 'Failed to save ingredients' }, { status: 500 });
  }
}
