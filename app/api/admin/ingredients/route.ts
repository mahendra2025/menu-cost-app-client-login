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
  const usage = new Map<string, Array<{ id: string; name: string; quantity: number; unit: string }>>();
  if (!Array.isArray(dishes)) return usage;
  dishes.forEach((dish, index) => {
    if (!dish || typeof dish !== 'object') return;
    const recipe = dish as Record<string, unknown>;
    const ingredients = recipe.ingredients;
    if (!Array.isArray(ingredients)) return;
    const name = String(recipe.name || recipe.dishName || `Recipe ${index + 1}`).trim();
    const id = String(recipe.id || `recipe_${index + 1}`).trim();
    const recipeUsage = new Map<string, { quantity: number; unit: string }>();
    ingredients.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const ingredient = item as Record<string, unknown>;
      const rateKey = String(ingredient.rateKey || '').trim();
      if (!rateKey) return;
      const quantity = Math.max(0, Number(ingredient.qty ?? ingredient.quantity) || 0);
      const unit = String(ingredient.unit || ingredient.rateUnit || '').trim();
      const existing = recipeUsage.get(rateKey);
      recipeUsage.set(rateKey, {
        quantity: existing && existing.unit === unit ? existing.quantity + quantity : quantity,
        unit: unit || existing?.unit || '',
      });
    });
    recipeUsage.forEach((amount, rateKey) => {
      usage.set(rateKey, [...(usage.get(rateKey) || []), { id, name, ...amount }]);
    });
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

export async function GET(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const catalog = await prisma.recipeCatalog.findUnique({
      where: { id: CATALOG_ID },
      select: { rates: true, ingredientCategories: true, dishes: true, updatedAt: true },
    });
    if (!catalog) return NextResponse.json({ rates: [], categories: INGREDIENT_CATEGORIES, usage: {}, ready: true });
    const usageMap =
      recipeIngredientUsage(
        catalog.dishes,
      );

    const usage =
      Object.fromEntries(
        usageMap,
      );
    const rates = Array.isArray(catalog.rates)
      ? catalog.rates
        .map(normalizeIngredientRate)
        .filter((rate): rate is NonNullable<typeof rate> => Boolean(rate))
      : [];
    const categories =
      normalizeCategories(
        catalog.ingredientCategories,
        rates,
      );

    const url =
      new URL(request.url);

    const paginationRequested =
      url.searchParams.has('page') ||
      url.searchParams.has('limit') ||
      url.searchParams.has('q') ||
      url.searchParams.has('category') ||
      url.searchParams.has('status') ||
      url.searchParams.has('sort');

    // Existing full-catalog calls remain unchanged.
    if (!paginationRequested) {
      return NextResponse.json({
        rates,
        categories,
        usage,
        ready: true,
        updatedAt:
          catalog.updatedAt,
      });
    }

    const query =
      String(
        url.searchParams.get('q') || '',
      )
        .trim()
        .toLowerCase();

    const category =
      String(
        url.searchParams.get('category') ||
        'ALL',
      ).trim();

    const status =
      String(
        url.searchParams.get('status') ||
        'ALL',
      ).trim();

    const sort =
      String(
        url.searchParams.get('sort') ||
        'NAME_ASC',
      );

    const pageSize =
      Math.min(
        100,
        Math.max(
          1,
          Number(
            url.searchParams.get('limit'),
          ) || 30,
        ),
      );

    const requestedPage =
      Math.max(
        1,
        Number(
          url.searchParams.get('page'),
        ) || 1,
      );

    const filteredRates =
      rates
        .filter((rate) => {
          const used =
            usageMap.get(rate.id)?.length || 0;

          const matchesStatus =
            status === 'ALL' ||
            (
              status === 'ATTENTION' &&
              !(Number(rate.rate) > 0)
            ) ||
            (
              status === 'LINKED' &&
              used > 0
            ) ||
            (
              status === 'UNLINKED' &&
              used === 0
            );

          const matchesQuery =
            !query ||
            rate.name
              .toLowerCase()
              .includes(query) ||
            rate.category
              .toLowerCase()
              .includes(query) ||
            rate.unit
              .toLowerCase()
              .includes(query);

          return (
            matchesStatus &&
            matchesQuery &&
            (
              category === 'ALL' ||
              rate.category === category
            )
          );
        })
        .sort((left, right) => {
          if (sort === 'RATE_HIGH') {
            return Number(right.rate) - Number(left.rate);
          }

          if (sort === 'RATE_LOW') {
            return Number(left.rate) - Number(right.rate);
          }

          if (sort === 'MOST_USED') {
            const usageOrder =
              (usageMap.get(right.id)?.length || 0) -
              (usageMap.get(left.id)?.length || 0);

            if (usageOrder) {
              return usageOrder;
            }
          }

          const order =
            left.name.localeCompare(
              right.name,
              undefined,
              { sensitivity: 'base' },
            );

          return sort === 'NAME_DESC'
            ? -order
            : order;
        });

    const total =
      filteredRates.length;

    const pageCount =
      Math.max(
        1,
        Math.ceil(total / pageSize),
      );

    const page =
      Math.min(
        requestedPage,
        pageCount,
      );

    const start =
      (page - 1) * pageSize;

    const pageRates =
      filteredRates.slice(
        start,
        start + pageSize,
      );

    return NextResponse.json({
      rates: pageRates,
      categories,

      usage:
        Object.fromEntries(
          pageRates.map((rate) => [
            rate.id,
            usageMap.get(rate.id) || [],
          ]),
        ),

      ready: true,
      updatedAt:
        catalog.updatedAt,

      pagination: {
        page,
        pageSize,
        pageCount,
        total,
        hasPrevious: page > 1,
        hasNext: page < pageCount,
      },
    });
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
    if (cleanedRates.some((rate) => !(Number(rate.rate) > 0))) {
      return NextResponse.json(
        { error: 'Every ingredient market rate must be greater than ₹0' },
        { status: 400 },
      );
    }
    if (new Set(cleanedRates.map((rate) => rate.id)).size !== cleanedRates.length) {
      return NextResponse.json({ error: 'Ingredient name and unit combinations must be unique' }, { status: 400 });
    }
    const categories = normalizeCategories(body.categories, cleanedRates);

    const catalog = await prisma.recipeCatalog.findUnique({ where: { id: CATALOG_ID } });
    const previousRates = Array.isArray(catalog?.rates) ? catalog.rates : [];
    const previousIds = new Set(previousRates.map((rate) => rate && typeof rate === 'object' ? String((rate as Record<string, unknown>).id || '') : '').filter(Boolean));
    const nextIds = new Set(cleanedRates.map((rate) => rate.id));
    const ratesByOriginalId = new Map<string, IngredientRate>();
    body.rates.forEach((submitted, index) => {
      if (!submitted || typeof submitted !== 'object') return;
      const originalId = String((submitted as Record<string, unknown>).originalId || '').trim();
      if (originalId && previousIds.has(originalId)) ratesByOriginalId.set(originalId, cleanedRates[index]);
    });
    const usage = recipeIngredientUsage(catalog?.dishes);
    const usedDeletions = [...previousIds].filter(
      (id) => !nextIds.has(id) && !ratesByOriginalId.has(id) && (usage.get(id)?.length || 0) > 0,
    );
    if (usedDeletions.length) {
      return NextResponse.json({ error: 'An ingredient used by a recipe cannot be deleted' }, { status: 409 });
    }
    const dishes = updateRecipeIngredients(catalog?.dishes ?? [], ratesByOriginalId);

    const saved = await prisma.recipeCatalog.upsert({
      where: { id: CATALOG_ID },
      create: {
        id: CATALOG_ID,
        rates: cleanedRates,
        ingredientCategories: categories,
        dishes: [],
        deletedDishIds: [],
      },
      update: {
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
