import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '../../../../lib/prisma';
import { getAdminCookieName, isValidAdminSessionToken } from '../../../../lib/adminAuth';
import { CATEGORIES, DISH_COST_ITEMS, mergeDishCatalog, type Category } from '../../../../lib/dishCostMaster';

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
      const rate = Math.max(Number(row.rate) || 0, 0);
      const servingQuantity = Math.max(Number(row.servingQuantity) || 1, 0.01);
      const servingUnit = String(row.servingUnit || 'serving').trim() || 'serving';
      const aliases = Array.isArray(row.aliases)
        ? row.aliases.map((alias) => String(alias).trim()).filter(Boolean)
        : [];

      if (!name || !CATEGORIES.includes(category as (typeof CATEGORIES)[number])) return null;

      return {
        name,
        category,
        rate,
        servingQuantity,
        servingUnit,
        aliases,
      };
    })
    .filter(Boolean);
}

function normalizeRateUpdates(items: unknown) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const name = String(row.name || '').trim();
      const category = String(row.category || '').trim();
      const rate = Math.max(Number(row.rate) || 0, 0);
      if (!name || !CATEGORIES.includes(category as (typeof CATEGORIES)[number])) return null;
      return { name, category, rate };
    })
    .filter((item): item is { name: string; category: string; rate: number } => item !== null);
}

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const items = await prisma.dishMasterItem.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        category: true,
        rate: true,
        servingQuantity: true,
        servingUnit: true,
        aliases: true,
      },
    });

    const mergedItems = items.length
      ? mergeDishCatalog(items.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category as Category,
        rate: item.rate,
        servingQuantity: item.servingQuantity,
        servingUnit: item.servingUnit,
        aliases: Array.isArray(item.aliases) ? item.aliases.map((alias) => String(alias).trim()).filter(Boolean) : [],
      })))
      : DISH_COST_ITEMS;

    return NextResponse.json({ items: mergedItems });
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

    await prisma.$transaction([
      prisma.dishMasterItem.deleteMany(),
      ...items.map((item) =>
        prisma.dishMasterItem.create({
          data: {
            name: item!.name,
            category: item!.category,
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
            data: { name: item.name, category: item.category, rate: item.rate },
          });
        } else {
          const defaultDish = DISH_COST_ITEMS.find((dish) => dish.name.toLowerCase() === item.name.toLowerCase());
          await tx.dishMasterItem.create({
            data: {
              name: item.name,
              category: item.category,
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

    await prisma.dishMasterItem.deleteMany();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to reset dishes' }, { status: 500 });
  }
}
