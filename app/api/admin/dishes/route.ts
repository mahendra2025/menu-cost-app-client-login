import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '../../../../lib/prisma';
import { getAdminCookieName, isValidAdminSessionToken } from '../../../../lib/adminAuth';
import { CATEGORIES, DISH_COST_ITEMS, mergeDishCatalog } from '../../../../lib/dishCostMaster';

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
      const category = String(row.category || '').trim();
      const subcategory = String(row.subcategory || '').trim();
      const rate = Math.max(Number(row.rate) || 0, 0);
      const servingQuantity = Math.max(Number(row.servingQuantity) || 1, 0.01);
      const servingUnit = String(row.servingUnit || 'serving').trim() || 'serving';
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
        aliases,
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
      const category = String(row.category || '').trim();
      const subcategory = String(row.subcategory || '').trim();
      const rate = Math.max(Number(row.rate) || 0, 0);
      if (!name || !category || category.length > 60 || subcategory.length > 60) return null;
      return { name, category, subcategory, rate };
    })
    .filter((item): item is { name: string; category: string; subcategory: string; rate: number } => item !== null);
}

function normalizeCategories(value: unknown, itemCategories: string[] = []) {
  const source = Array.isArray(value) ? value : CATEGORIES;
  const categories = [...source, ...itemCategories, 'Other']
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

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const [items, categoryCatalog] = await Promise.all([
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
      : DISH_COST_ITEMS;

    const categories = normalizeCategories(
      categoryCatalog?.categories,
      mergedItems.map((item) => item.category),
    );
    const subcategories = normalizeSubcategories(
      categoryCatalog?.subcategories,
      categories,
      mergedItems,
    );

    return NextResponse.json({ items: mergedItems, categories, subcategories });
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

    await prisma.$transaction([
      prisma.dishMasterItem.deleteMany(),
      prisma.dishCategoryCatalog.upsert({
        where: { id: CATEGORY_CATALOG_ID },
        create: { id: CATEGORY_CATALOG_ID, categories, subcategories },
        update: { categories, subcategories },
      }),
      ...items.map((item) =>
        prisma.dishMasterItem.create({
          data: {
            name: item!.name,
            category: item!.category,
            subcategory: item!.subcategory,
            rate: item!.rate,
            servingQuantity: item!.servingQuantity,
            servingUnit: item!.servingUnit,
            aliases: item!.aliases,
          },
        }),
      ),
    ]);

    return NextResponse.json({ ok: true });
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
      for (const item of updates) {
        const existing = await tx.dishMasterItem.findFirst({
          where: { name: { equals: item.name, mode: 'insensitive' } },
          select: { id: true },
        });

        if (existing) {
          await tx.dishMasterItem.update({
            where: { id: existing.id },
            data: { name: item.name, category: item.category, subcategory: item.subcategory, rate: item.rate },
          });
        } else {
          const defaultDish = DISH_COST_ITEMS.find((dish) => dish.name.toLowerCase() === item.name.toLowerCase());
          await tx.dishMasterItem.create({
            data: {
              name: item.name,
              category: item.category,
              subcategory: item.subcategory,
              rate: item.rate,
              aliases: defaultDish?.aliases ?? [],
            },
          });
        }
      }
    });

    return NextResponse.json({ ok: true, updated: updates.length });
  } catch {
    return NextResponse.json({ error: 'Failed to update dish rates' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    await prisma.$transaction([
      prisma.dishMasterItem.deleteMany(),
      prisma.dishCategoryCatalog.deleteMany(),
    ]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to reset dishes' }, { status: 500 });
  }
}
