import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../../lib/prisma';
import { getAdminCookieName, isValidAdminSessionToken } from '../../../../lib/adminAuth';
import {
  DISH_DELETED_CATEGORIES_KEY,
  DISH_COST_ITEMS,
  filterDishCatalogByStoredCategories,
  mergeDishCatalog,
  readDeletedDishCategories,
} from '../../../../lib/dishCostMaster';

const CATEGORY_CATALOG_ID = 'global';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;
  if (!isValidAdminSessionToken(token)) {
    return NextResponse.json({ error: 'Admin login required' }, { status: 401 });
  }
  return null;
}

function normalizeItems(items: unknown) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const name = String(row.name || '').trim();
      const originalName = String(row.originalName || name).trim();
      const category = String(row.category || '').trim();
      const subcategory = String(row.subcategory || '').trim();
      const rate = Math.max(Number(row.rate) || 0, 0);
      const servingQuantity = Math.max(Number(row.servingQuantity) || 1, 0.01);
      const servingUnit = String(row.servingUnit || 'serving').trim() || 'serving';

      const pieceWeightGrams =
        servingUnit.toLowerCase() === 'piece'
          ? (
              Math.max(
                Number(
                  row.pieceWeightGrams,
                ) || 0,
                0,
              ) || undefined
            )
          : undefined;

      const aliases = Array.isArray(row.aliases)
        ? row.aliases.map((alias) => String(alias).trim()).filter(Boolean)
        : [];

      if (!name || !category || category.length > 60 || subcategory.length > 60) return null;

      return {
        name,
        category,
        subcategory,
        rate,
        servingQuantity,
        servingUnit,
        pieceWeightGrams,
        aliases,
        originalName,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function normalizeRateUpdates(items: unknown) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const name = String(row.name || '').trim();
      const originalName = String(row.originalName || name).trim();
      const category = String(row.category || '').trim();
      const subcategory = String(row.subcategory || '').trim();
      const rate = Math.max(Number(row.rate) || 0, 0);
      const aliases = Array.isArray(row.aliases)
        ? Array.from(new Map(
          row.aliases
            .map((alias) => String(alias).trim().replace(/\s+/g, ' '))
            .filter(Boolean)
            .map((alias) => [alias.toLocaleLowerCase(), alias]),
        ).values())
        : undefined;
      if (!name || !category || category.length > 60 || subcategory.length > 60) return null;
      return { name, originalName, category, subcategory, rate, aliases };
    })
    .filter((item): item is {
      name: string;
      originalName: string;
      category: string;
      subcategory: string;
      rate: number;
      aliases: string[] | undefined;
    } => item !== null);
}

function normalizeCategories(value: unknown, itemCategories: string[] = []) {
  const source = Array.isArray(value) ? value : [];
  const categories = [...source, ...itemCategories]
    .map((category) => String(category || '').trim().replace(/\s+/g, ' '))
    .filter((category) => category && category.length <= 60);
  const unique = new Map<string, string>();
  categories.forEach((category) => {
    const key = category.toLowerCase();
    if (!unique.has(key)) unique.set(key, category);
  });
  return Array.from(unique.values()).slice(0, 150);
}

function normalizeSubcategories(
  value: unknown,
  categories: string[],
  items: Array<{ category?: string; subcategory?: string }> = [],
) {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return Object.fromEntries(categories.map((category) => {
    const stored = Array.isArray(source[category]) ? source[category] as unknown[] : [];
    const assigned = items
      .filter((item) => item.category === category)
      .map((item) => item.subcategory);
    const unique = new Map<string, string>();
    [...stored, ...assigned].forEach((subcategory) => {
      const clean = String(subcategory || '').trim().replace(/\s+/g, ' ');
      if (!clean || clean.length > 60) return;
      const key = clean.toLowerCase();
      if (!unique.has(key)) unique.set(key, clean);
    });
    return [category, Array.from(unique.values()).slice(0, 150)];
  }));
}

function withDeletedCategories(
  subcategories: Record<string, string[]>,
  deletedCategories: Iterable<string>,
) {
  const deleted = Array.from(new Map(
    Array.from(deletedCategories)
      .map((category) => String(category || '').trim().replace(/\s+/g, ' '))
      .filter(Boolean)
      .map((category) => [category.toLowerCase(), category]),
  ).values()).sort((left, right) => left.localeCompare(right));

  return deleted.length
    ? { ...subcategories, [DISH_DELETED_CATEGORIES_KEY]: deleted }
    : subcategories;
}

function readRecipeHierarchy(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const name = String(row.dishName || row.name || '').trim();
      const category = String(row.category || '').trim();
      const subcategory = String(row.subcategory || '').trim();

      const pieceWeightGrams =
        Math.max(
          Number(
            row.pieceWeightGrams,
          ) || 0,
          0,
        ) || undefined;

      if (!name || !category || category.length > 60 || subcategory.length > 60) return null;

      return {
        name,
        category,
        subcategory,
        pieceWeightGrams,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function alignRecipeCategories(
  value: unknown,
  items: Array<{ name: string; category: string; subcategory: string }>,
  categories: string[],
  deletedCategories: Set<string>,
) {
  if (!Array.isArray(value)) return value;
  const itemsByName = new Map(items.map((item) => [item.name.toLowerCase(), item]));
  const allowedCategories = new Set(categories);

  return value.flatMap((dish) => {
    if (!dish || typeof dish !== 'object' || Array.isArray(dish)) return [dish];
    const row = dish as Record<string, unknown>;
    const currentCategory = String(row.category || '').trim();
    if (deletedCategories.has(currentCategory)) return [];

    const name = String(row.dishName || row.name || '').trim();
    const matchingItem = itemsByName.get(name.toLowerCase());

    if (matchingItem) {
      return [{
        ...row,
        category: matchingItem.category,
        subcategory: matchingItem.subcategory,
      }];
    }

    if (!currentCategory || allowedCategories.has(currentCategory)) return [dish];
    return [{ ...row, category: 'Other', subcategory: '' }];
  });
}

function syncRecipeCatalogWithDishes(
  value: unknown,
  deletedDishIdsValue: unknown,
  items: ReturnType<typeof normalizeItems>,
  deletedCategories: Set<string>,
) {
  const source = Array.isArray(value) ? value : [];
  const itemByName = new Map<string, (typeof items)[number]>();
  items.forEach((item) => {
    itemByName.set(item.name.toLowerCase(), item);
    if (item.originalName) itemByName.set(item.originalName.toLowerCase(), item);
  });

  const matchedNames = new Set<string>();
  const removedRecipeIds: string[] = [];
  const dishes = source.flatMap<Record<string, unknown>>((dish) => {
    if (!dish || typeof dish !== 'object' || Array.isArray(dish)) return [];
    const row = dish as Record<string, unknown>;
    const currentName = String(row.dishName || row.name || '').trim();
    const item = itemByName.get(currentName.toLowerCase());
    const recipeId = String(row.id || '').trim();

    if (!item || deletedCategories.has(String(row.category || '').trim())) {
      if (recipeId) removedRecipeIds.push(recipeId);
      return [];
    }

    matchedNames.add(item.name.toLowerCase());
    return [{
      ...row,
      name: item.name,
      category: item.category,
      subcategory: item.subcategory,
      aliases: item.aliases,
      catalogRate: item.rate,
      servingSize: item.servingQuantity,
      servingUnit: item.servingUnit,

      pieceWeightGrams:
        item.servingUnit
          .toLowerCase() ===
          'piece'
          ? item.pieceWeightGrams
          : undefined,
    }];
  });

  items.forEach((item, index) => {
    if (matchedNames.has(item.name.toLowerCase())) return;
    const stableName = item.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 70);
    dishes.push({
      id: `catalog_${stableName || index}_${index}`,
      name: item.name,
      category: item.category,
      subcategory: item.subcategory,
      aliases: item.aliases,
      baseGuests: 100,
      catalogRate: item.rate,
      servingSize: item.servingQuantity,
      servingUnit: item.servingUnit,

      pieceWeightGrams:
        item.servingUnit
          .toLowerCase() ===
          'piece'
          ? item.pieceWeightGrams
          : undefined,

      ingredients: [],
    });
  });

  const deletedDishIds = Array.from(new Set([
    ...(Array.isArray(deletedDishIdsValue)
      ? deletedDishIdsValue.map((id) => String(id).trim()).filter(Boolean)
      : []),
    ...removedRecipeIds,
  ]));
  const activeIds = new Set(
    dishes
      .map((dish) => String((dish as Record<string, unknown>).id || '').trim())
      .filter(Boolean),
  );

  return {
    dishes,
    deletedDishIds: deletedDishIds.filter((id) => !activeIds.has(id)),
  };
}

export async function GET(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const [items, categoryCatalog, recipeCatalog] = await Promise.all([
      prisma.dishMasterItem.findMany({
        orderBy: { name: 'asc' },
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
      prisma.dishCategoryCatalog.findUnique({
        where: { id: CATEGORY_CATALOG_ID },
        select: { categories: true, subcategories: true },
      }),
      prisma.recipeCatalog.findUnique({
        where: { id: 'global' },
        select: { dishes: true },
      }),
    ]);

    const mergedItems = items.length
      ? mergeDishCatalog(items.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        subcategory: item.subcategory,
        rate: item.rate,
        servingQuantity: item.servingQuantity,
        servingUnit: item.servingUnit,
        aliases: Array.isArray(item.aliases) ? item.aliases.map((alias) => String(alias).trim()).filter(Boolean) : [],
      })))
      : [];
    const catalogItems = filterDishCatalogByStoredCategories(
      mergedItems,
      categoryCatalog?.categories,
      readDeletedDishCategories(categoryCatalog?.subcategories),
    );

    const recipeHierarchy =
      readRecipeHierarchy(
        recipeCatalog?.dishes,
      );
    const recipeByName = new Map(
      recipeHierarchy.map((item) => [item.name.toLowerCase(), item]),
    );
    const alignedItems = catalogItems.map((item) => {
      const recipe = recipeByName.get(item.name.trim().toLowerCase());
      return {
        ...item,

        subcategory:
          item.subcategory ||
          recipe?.subcategory ||
          '',

        pieceWeightGrams:
          recipe?.pieceWeightGrams,
      };
    });
    const categories = normalizeCategories(
      categoryCatalog?.categories,
      alignedItems.map((item) => item.category),
    );
    const subcategories = normalizeSubcategories(
      categoryCatalog?.subcategories,
      categories,
      [...alignedItems, ...recipeHierarchy],
    );

    const url =
      new URL(request.url);

    const paginationRequested =
      url.searchParams.has('page') ||
      url.searchParams.has('limit') ||
      url.searchParams.has('q') ||
      url.searchParams.has('category') ||
      url.searchParams.has('subcategory') ||
      url.searchParams.has('sort');

    // Keep old clients fully compatible.
    if (!paginationRequested) {
      return NextResponse.json({
        items: alignedItems,
        categories,
        subcategories,
        hierarchySource:
          recipeCatalog?.dishes
            ? 'recipes'
            : 'defaults',
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

    const subcategory =
      String(
        url.searchParams.get('subcategory') ||
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

    const filteredItems =
      alignedItems
        .filter((item) => {
          const aliases =
            Array.isArray(item.aliases)
              ? item.aliases
              : [];

          const matchesQuery =
            !query ||
            item.name
              .toLowerCase()
              .includes(query) ||
            item.category
              .toLowerCase()
              .includes(query) ||
            String(item.subcategory || '')
              .toLowerCase()
              .includes(query) ||
            aliases.some((alias) =>
              String(alias)
                .toLowerCase()
                .includes(query),
            );

          return (
            matchesQuery &&
            (
              category === 'ALL' ||
              item.category === category
            ) &&
            (
              subcategory === 'ALL' ||
              String(item.subcategory || '') ===
                subcategory
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
      filteredItems.length;

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

    return NextResponse.json({
      items:
        filteredItems.slice(
          start,
          start + pageSize,
        ),

      categories,
      subcategories,

      hierarchySource:
        recipeCatalog?.dishes
          ? 'recipes'
          : 'defaults',

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
    return NextResponse.json({ error: 'Failed to load dishes' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json();
    const items = normalizeItems(body.items);
    const categories = normalizeCategories(body.categories, items.map((item) => String(item?.category || '')));
    const subcategories = normalizeSubcategories(body.subcategories, categories, items);

    const syncedRecipes = await prisma.$transaction(async (tx) => {
      const [recipeCatalog, previousCategoryCatalog] = await Promise.all([
        tx.recipeCatalog.findUnique({
          where: { id: 'global' },
          select: { dishes: true, deletedDishIds: true },
        }),
        tx.dishCategoryCatalog.findUnique({
          where: { id: CATEGORY_CATALOG_ID },
          select: { categories: true, subcategories: true },
        }),
      ]);
      const previousCategories = Array.isArray(previousCategoryCatalog?.categories)
        ? previousCategoryCatalog.categories.map((category) => String(category))
        : [];
      const currentCategoryKeys = new Set(categories.map((category) => category.toLowerCase()));
      const deletedCategoryMap = new Map(
        readDeletedDishCategories(previousCategoryCatalog?.subcategories)
          .map((category) => [category.toLowerCase(), category]),
      );
      previousCategories
        .filter((category) => !currentCategoryKeys.has(category.toLowerCase()))
        .forEach((category) => deletedCategoryMap.set(category.toLowerCase(), category));
      categories.forEach((category) => deletedCategoryMap.delete(category.toLowerCase()));
      const deletedCategories = new Set(deletedCategoryMap.values());
      const storedSubcategories = withDeletedCategories(
        subcategories,
        deletedCategories,
      );

      await tx.dishMasterItem.deleteMany();
      await tx.dishCategoryCatalog.upsert({
        where: { id: CATEGORY_CATALOG_ID },
        create: { id: CATEGORY_CATALOG_ID, categories, subcategories: storedSubcategories },
        update: { categories, subcategories: storedSubcategories },
      });

      await Promise.all(items.map((item) =>
        tx.dishMasterItem.create({
          data: {
            name: item!.name,
            category: item!.category,
            subcategory: item!.subcategory,
            rate: item!.rate,
            servingQuantity: item!.servingQuantity,
            servingUnit: item!.servingUnit,
            aliases: item!.aliases,
          },
        })
      ));

      if (recipeCatalog) {
        const syncedRecipes = syncRecipeCatalogWithDishes(
          recipeCatalog.dishes,
          recipeCatalog.deletedDishIds,
          items,
          deletedCategories,
        );
        await tx.recipeCatalog.update({
          where: { id: 'global' },
          data: {
            dishes: syncedRecipes.dishes as Prisma.InputJsonValue,
            deletedDishIds: syncedRecipes.deletedDishIds,
          },
        });
        return syncedRecipes.dishes.length;
      }
      return 0;
    });

    return NextResponse.json({ ok: true, syncedRecipes });
  } catch {
    return NextResponse.json({ error: 'Failed to save dishes' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json();
    const updates = normalizeRateUpdates(body.items);
    if (!updates.length) {
      return NextResponse.json({ error: 'At least one valid dish rate is required' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const categoryCatalog = await tx.dishCategoryCatalog.findUnique({
        where: { id: CATEGORY_CATALOG_ID },
        select: { categories: true, subcategories: true },
      });
      const deletedCategoryKeys = new Set(
        readDeletedDishCategories(categoryCatalog?.subcategories)
          .map((category) => category.toLowerCase()),
      );
      const effectiveUpdates = updates.map((item) =>
        deletedCategoryKeys.has(item.category.toLowerCase())
          ? { ...item, category: 'Other', subcategory: '' }
          : item
      );

      for (const item of effectiveUpdates) {
        const existing = await tx.dishMasterItem.findFirst({
          where: {
            OR: [
              { name: { equals: item.originalName, mode: 'insensitive' } },
              { name: { equals: item.name, mode: 'insensitive' } },
            ],
          },
          select: { id: true },
        });

        if (existing) {
          await tx.dishMasterItem.update({
            where: { id: existing.id },
            data: {
              name: item.name,
              category: item.category,
              subcategory: item.subcategory,
              rate: item.rate,
              ...(item.aliases ? { aliases: item.aliases } : {}),
            },
          });
        } else {
          const defaultDish = DISH_COST_ITEMS.find((dish) => dish.name.toLowerCase() === item.name.toLowerCase());
          await tx.dishMasterItem.create({
            data: {
              name: item.name,
              category: item.category,
              subcategory: item.subcategory,
              rate: item.rate,
              aliases: item.aliases ?? defaultDish?.aliases ?? [],
            },
          });
        }
      }

      const categories = normalizeCategories(
        categoryCatalog?.categories,
        effectiveUpdates.map((item) => item.category),
      );
      const subcategories = normalizeSubcategories(
        categoryCatalog?.subcategories,
        categories,
        effectiveUpdates,
      );
      const storedSubcategories = withDeletedCategories(
        subcategories,
        readDeletedDishCategories(categoryCatalog?.subcategories),
      );
      await tx.dishCategoryCatalog.upsert({
        where: { id: CATEGORY_CATALOG_ID },
        create: { id: CATEGORY_CATALOG_ID, categories, subcategories: storedSubcategories },
        update: { categories, subcategories: storedSubcategories },
      });
    });

    return NextResponse.json({ ok: true, updated: updates.length });
  } catch {
    return NextResponse.json({ error: 'Failed to update dish rates' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const category = new URL(request.url).searchParams.get('category')?.trim();
    if (category) {
      if (category === 'Other' || category.length > 60) {
        return NextResponse.json({ error: 'This category cannot be deleted' }, { status: 400 });
      }

      const deleted = await prisma.$transaction(async (tx) => {
        const [categoryCatalog, recipeCatalog] = await Promise.all([
          tx.dishCategoryCatalog.findUnique({
            where: { id: CATEGORY_CATALOG_ID },
            select: { categories: true, subcategories: true },
          }),
          tx.recipeCatalog.findUnique({
            where: { id: 'global' },
            select: { dishes: true },
          }),
        ]);
        const currentCategories = normalizeCategories(categoryCatalog?.categories);
        const categories = currentCategories.filter(
          (item) => item.toLowerCase() !== category.toLowerCase(),
        );
        const subcategories = normalizeSubcategories(
          categoryCatalog?.subcategories,
          categories,
        );
        const deletedCategories = new Set([
          ...readDeletedDishCategories(categoryCatalog?.subcategories),
          category,
        ]);
        const storedSubcategories = withDeletedCategories(
          subcategories,
          deletedCategories,
        );

        const result = await tx.dishMasterItem.deleteMany({
          where: { category: { equals: category, mode: 'insensitive' } },
        });
        await tx.dishCategoryCatalog.upsert({
          where: { id: CATEGORY_CATALOG_ID },
          create: { id: CATEGORY_CATALOG_ID, categories, subcategories: storedSubcategories },
          update: { categories, subcategories: storedSubcategories },
        });

        if (recipeCatalog) {
          const dishes = alignRecipeCategories(
            recipeCatalog.dishes,
            [],
            categories,
            new Set([category]),
          );
          await tx.recipeCatalog.update({
            where: { id: 'global' },
            data: { dishes: dishes as Prisma.InputJsonValue },
          });
        }

        return result.count;
      });

      return NextResponse.json({ ok: true, deleted });
    }

    await prisma.$transaction(async (tx) => {
      await tx.dishMasterItem.deleteMany();

      await tx.recipeCatalog.updateMany({
        where: { id: 'global' },
        data: {
          dishes: [] as Prisma.InputJsonValue,
          deletedDishIds: [] as Prisma.InputJsonValue,
        },
      });

      await tx.dishCategoryCatalog.upsert({
        where: { id: CATEGORY_CATALOG_ID },
        create: {
          id: CATEGORY_CATALOG_ID,
          categories: [],
          subcategories: {},
        },
        update: {
          categories: [],
          subcategories: {},
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to reset dishes' }, { status: 500 });
  }
}
