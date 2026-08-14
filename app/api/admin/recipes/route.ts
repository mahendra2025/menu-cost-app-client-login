import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getAdminCookieName, isValidAdminSessionToken } from '../../../../lib/adminAuth';
import {
  CATEGORIES,
  DISH_DELETED_CATEGORIES_KEY,
  readDeletedDishCategories,
} from '../../../../lib/dishCostMaster';
import {
  INGREDIENT_UNITS,
  inferIngredientCategory,
  normalizeIngredientId,
  normalizeIngredientRate,
  type IngredientRate,
  type IngredientUnit,
} from '../../../../lib/ingredientCatalog';
import { prisma } from '../../../../lib/prisma';

const CATALOG_ID = 'global';
const CATEGORY_CATALOG_ID = 'global';

function normalizeRecipeIngredientUnit(
  value: unknown,
): IngredientUnit | null {
  const unit = String(value || '')
    .trim()
    .toLowerCase();

  const aliases: Record<string, IngredientUnit> = {
    kg: 'kg',
    kgs: 'kg',
    kilogram: 'kg',
    kilograms: 'kg',
    g: 'gram',
    gm: 'gram',
    gms: 'gram',
    gram: 'gram',
    grams: 'gram',
    l: 'ltr',
    lt: 'ltr',
    ltr: 'ltr',
    litre: 'ltr',
    liter: 'ltr',
    litres: 'ltr',
    liters: 'ltr',
    ml: 'ml',
    pc: 'piece',
    pcs: 'piece',
    piece: 'piece',
    pieces: 'piece',
    pkt: 'packet',
    pack: 'packet',
    packet: 'packet',
    packets: 'packet',
  };

  const normalized = aliases[unit];

  return normalized &&
    INGREDIENT_UNITS.includes(normalized)
    ? normalized
    : null;
}

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;
  if (!isValidAdminSessionToken(token)) {
    return NextResponse.json({ error: 'Admin login required' }, { status: 401 });
  }
  return null;
}

function readCatalogPayload(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const body = value as Record<string, unknown>;
  if (!Array.isArray(body.dishes) || !Array.isArray(body.rates) || !Array.isArray(body.deletedDishIds)) {
    return null;
  }

  const deletedDishIds = body.deletedDishIds
    .map((id) => String(id).trim())
    .filter(Boolean);

  const rates = body.rates.map(normalizeIngredientRate);
  if (
    rates.some((rate) => !rate)
  ) {
    return null;
  }

  const ratesById = new Map(
    rates
      .filter(
        (rate): rate is IngredientRate => Boolean(rate),
      )
      .map((rate) => [rate.id, rate]),
  );

  let invalidIngredient = false;

  const dishes = body.dishes.map((dishValue) => {
    if (
      !dishValue ||
      typeof dishValue !== 'object' ||
      Array.isArray(dishValue)
    ) {
      return dishValue;
    }

    const dish = dishValue as Record<string, unknown>;

    if (!Array.isArray(dish.ingredients)) {
      return dishValue;
    }

    return {
      ...dish,
      ingredients: dish.ingredients.map((ingredientValue) => {
        if (
          !ingredientValue ||
          typeof ingredientValue !== 'object' ||
          Array.isArray(ingredientValue)
        ) {
          invalidIngredient = true;
          return ingredientValue;
        }

        const ingredient =
          ingredientValue as Record<string, unknown>;

        const name = String(
          ingredient.name ||
          ingredient.ingredientName ||
          '',
        )
          .trim()
          .replace(/\s+/g, ' ');

        const unit = normalizeRecipeIngredientUnit(
          ingredient.rateUnit ||
          ingredient.unit,
        );

        if (!name || !unit) {
          invalidIngredient = true;
          return ingredientValue;
        }

        const normalizedId = normalizeIngredientId(
          name,
          unit,
        );

        const linkedId = String(
          ingredient.rateKey || '',
        ).trim();

        let master =
          ratesById.get(linkedId) ||
          ratesById.get(normalizedId);

        if (!master) {
          const marketRate = [
            Number(ingredient.marketRate),
            Number(ingredient.rate),
          ].find(
            (rate) =>
              Number.isFinite(rate) &&
              rate > 0,
          );

          master = {
            id: normalizedId,
            name,
            category:
              inferIngredientCategory(name),
            rate: marketRate || 0,
            unit,
          };

          ratesById.set(master.id, master);
        }

        return {
          ...ingredient,
          name: master.name,
          rateKey: master.id,
          rate: master.rate,
          marketRate: master.rate,
          rateUnit: master.unit,
        };
      }),
    };
  });

  if (invalidIngredient) {
    return null;
  }

  return {
    dishes,
    rates: Array.from(ratesById.values()),
    deletedDishIds: Array.from(new Set(deletedDishIds)),
    catalogVersion: Math.max(1, Math.floor(Number(body.catalogVersion) || 1)),
  };
}

function cleanText(
  value: unknown,
  maxLength = 120,
) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function convertQuantity(
  quantity: number,
  unit: string,
  rateUnit: string,
) {
  if (unit === rateUnit) return quantity;
  if (unit === 'gram' && rateUnit === 'kg') return quantity / 1000;
  if (unit === 'kg' && rateUnit === 'gram') return quantity * 1000;
  if (unit === 'ml' && rateUnit === 'ltr') return quantity / 1000;
  if (unit === 'ltr' && rateUnit === 'ml') return quantity * 1000;
  return quantity;
}

function normalizeRecipeDishes(
  dishes: unknown[],
  rates: unknown[],
) {
  const ratesById = new Map(
    rates.flatMap((value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
      const row = value as Record<string, unknown>;
      const id = cleanText(row.id, 180);
      if (!id) return [];
      return [[id, {
        rate: Math.max(0, Number(row.rate) || 0),
        unit: cleanText(row.unit, 30) || 'kg',
      }] as const];
    }),
  );
  const normalized = new Map<string, {
    name: string;
    category: string;
    subcategory: string;
    rate: number;
    servingQuantity: number;
    servingUnit: string;
    aliases: string[];
  }>();

  for (const value of dishes) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const row = value as Record<string, unknown>;
    const name = cleanText(row.name || row.dishName);
    const category = cleanText(row.category, 60);
    const subcategory = cleanText(row.subcategory, 60);
    if (!name || !category) continue;

    const baseGuests = Math.max(1, Number(row.baseGuests) || 100);
    const ingredients = Array.isArray(row.ingredients) ? row.ingredients : [];
    const totalCost = ingredients.reduce((total, ingredient) => {
      if (!ingredient || typeof ingredient !== 'object' || Array.isArray(ingredient)) return total;
      const item = ingredient as Record<string, unknown>;
      const quantity = Math.max(0, Number(item.qty ?? item.quantity) || 0);
      const unit = cleanText(item.unit, 30) || 'kg';
      const liveRate = ratesById.get(cleanText(item.rateKey, 180));
      const rate = liveRate?.rate ?? Math.max(0, Number(item.rate ?? item.marketRate) || 0);
      const rateUnit = liveRate?.unit || cleanText(item.rateUnit, 30) || unit;
      return total + convertQuantity(quantity, unit, rateUnit) * rate;
    }, 0);
    const catalogRate = Math.max(
      0,
      totalCost > 0
        ? totalCost / baseGuests
        : Number(row.catalogRate ?? row.dishRate) || 0,
    );
    const aliases = Array.isArray(row.aliases)
      ? Array.from(new Map(
        row.aliases
          .map((alias) => cleanText(alias))
          .filter(Boolean)
          .filter((alias) => alias.toLowerCase() !== name.toLowerCase())
          .map((alias) => [alias.toLowerCase(), alias]),
      ).values())
      : [];

    normalized.set(name.toLowerCase(), {
      name,
      category,
      subcategory,
      rate: Math.round(catalogRate * 100) / 100,
      servingQuantity: Math.max(0.01, Number(row.servingSize) || 1),
      servingUnit: cleanText(row.servingUnit, 30) || 'serving',
      aliases,
    });
  }

  return Array.from(normalized.values());
}

async function syncRecipesToDishCatalog(
  tx: Prisma.TransactionClient,
  catalog: ReturnType<typeof readCatalogPayload> extends infer T
    ? Exclude<T, null>
    : never,
) {
  const recipeDishes = normalizeRecipeDishes(catalog.dishes, catalog.rates);
  if (!recipeDishes.length) return 0;

  const [existingDishes, categoryCatalog] = await Promise.all([
    tx.dishMasterItem.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        subcategory: true,
        rate: true,
        servingQuantity: true,
        servingUnit: true,
        aliases: true,
      },
    }),
    tx.dishCategoryCatalog.findUnique({
      where: { id: CATEGORY_CATALOG_ID },
      select: { categories: true, subcategories: true },
    }),
  ]);
  const existingByName = new Map(
    existingDishes.map((dish) => [dish.name.trim().toLowerCase(), dish]),
  );
  const creates: Prisma.DishMasterItemCreateManyInput[] = [];
  const updates: Array<ReturnType<typeof tx.dishMasterItem.update>> = [];

  for (const dish of recipeDishes) {
    const existing = existingByName.get(dish.name.toLowerCase());
    if (existing) {
      const existingAliases = Array.isArray(existing.aliases)
        ? existing.aliases.map(String).map((alias) => alias.toLowerCase()).sort()
        : [];
      const nextAliases = dish.aliases.map((alias) => alias.toLowerCase()).sort();
      const unchanged =
        existing.name === dish.name &&
        existing.category === dish.category &&
        existing.subcategory === dish.subcategory &&
        Math.abs(existing.rate - dish.rate) < 0.001 &&
        Math.abs(existing.servingQuantity - dish.servingQuantity) < 0.001 &&
        existing.servingUnit === dish.servingUnit &&
        JSON.stringify(existingAliases) === JSON.stringify(nextAliases);
      if (unchanged) continue;

      updates.push(tx.dishMasterItem.update({
        where: { id: existing.id },
        data: dish,
      }));
    } else {
      creates.push(dish);
    }
  }

  await Promise.all([
    ...updates,
    ...(creates.length
      ? [tx.dishMasterItem.createMany({ data: creates })]
      : []),
  ]);

  const categories = Array.from(new Map(
    [
      ...(Array.isArray(categoryCatalog?.categories)
        ? categoryCatalog.categories.map(String)
        : [...CATEGORIES]),
      ...recipeDishes.map((dish) => dish.category),
      'Other',
    ]
      .map((category) => cleanText(category, 60))
      .filter(Boolean)
      .map((category) => [category.toLowerCase(), category]),
  ).values());
  const subcategories =
    categoryCatalog?.subcategories &&
    typeof categoryCatalog.subcategories === 'object' &&
    !Array.isArray(categoryCatalog.subcategories)
      ? { ...categoryCatalog.subcategories as Record<string, unknown> }
      : {};

  for (const category of categories) {
    const stored = Array.isArray(subcategories[category])
      ? (subcategories[category] as unknown[]).map((value) => cleanText(value, 60)).filter(Boolean)
      : [];
    const imported = recipeDishes
      .filter((dish) => dish.category.toLowerCase() === category.toLowerCase())
      .map((dish) => dish.subcategory)
      .filter(Boolean);
    subcategories[category] = Array.from(new Map(
      [...stored, ...imported].map((subcategory) => [
        subcategory.toLowerCase(),
        subcategory,
      ]),
    ).values());
  }

  const importedCategoryKeys = new Set(
    recipeDishes.map((dish) => dish.category.toLowerCase()),
  );
  const deletedCategories = readDeletedDishCategories(subcategories)
    .filter((category) => !importedCategoryKeys.has(category.toLowerCase()));
  if (deletedCategories.length) {
    subcategories[DISH_DELETED_CATEGORIES_KEY] = deletedCategories;
  } else {
    delete subcategories[DISH_DELETED_CATEGORIES_KEY];
  }

  await tx.dishCategoryCatalog.upsert({
    where: { id: CATEGORY_CATALOG_ID },
    create: {
      id: CATEGORY_CATALOG_ID,
      categories,
      subcategories: subcategories as Prisma.InputJsonValue,
    },
    update: {
      categories,
      subcategories: subcategories as Prisma.InputJsonValue,
    },
  });

  return recipeDishes.length;
}

export async function GET(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const mode =
      new URL(request.url)
        .searchParams
        .get('mode');

    if (mode === 'version') {
      const version =
        await prisma.recipeCatalog.findUnique({
          where: {
            id: CATALOG_ID,
          },
          select: {
            updatedAt: true,
          },
        });

      return NextResponse.json({
        updatedAt:
          version?.updatedAt ??
          null,
      });
    }

    const catalog = await prisma.recipeCatalog.findUnique({
      where: { id: CATALOG_ID },
      select: {
        dishes: true,
        rates: true,
        deletedDishIds: true,
        catalogVersion: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ catalog });
  } catch {
    return NextResponse.json({ error: 'Failed to load recipes' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const authError =
      await requireAdmin();

    if (authError) {
      return authError;
    }

    const stored =
      await prisma.recipeCatalog.findUnique({
        where: {
          id: CATALOG_ID,
        },

        select: {
          dishes: true,
          rates: true,
          deletedDishIds: true,
          catalogVersion: true,
          updatedAt: true,
        },
      });

    if (!stored) {
      return NextResponse.json({
        ok: true,
        syncedDishes: 0,
        updatedAt: null,
      });
    }

    const catalog =
      readCatalogPayload({
        dishes:
          stored.dishes,
        rates:
          stored.rates,
        deletedDishIds:
          stored.deletedDishIds,
        catalogVersion:
          stored.catalogVersion,
      });

    if (!catalog) {
      return NextResponse.json(
        {
          error:
            'Invalid stored recipe catalog',
        },
        {
          status: 500,
        },
      );
    }

    const syncedDishes =
      await prisma.$transaction(
        async (tx) =>
          syncRecipesToDishCatalog(
            tx,
            catalog,
          ),
      );

    return NextResponse.json({
      ok: true,
      syncedDishes,
      updatedAt:
        stored.updatedAt,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          'Failed to sync recipes to Dish Master',
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const catalog = readCatalogPayload(await request.json());
    if (!catalog) {
      return NextResponse.json({ error: 'Invalid recipe catalog' }, { status: 400 });
    }

    const saved = await prisma.$transaction(async (tx) => {
      const recipeCatalog = await tx.recipeCatalog.upsert({
        where: { id: CATALOG_ID },
        create: { id: CATALOG_ID, ...catalog },
        update: catalog,
        select: { updatedAt: true },
      });
      const syncedDishes = await syncRecipesToDishCatalog(tx, catalog);
      return {
        updatedAt: recipeCatalog.updatedAt,
        syncedDishes,
      };
    });

    return NextResponse.json({
      ok: true,
      updatedAt: saved.updatedAt,
      syncedDishes: saved.syncedDishes,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to save recipes' }, { status: 500 });
  }
}
