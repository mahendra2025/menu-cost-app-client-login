import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import {
  filterDishCatalogByStoredCategories,
  readDeletedDishCategories,
} from '../../../../lib/dishCostMaster';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [items, categoryCatalog] = await Promise.all([
      prisma.dishMasterItem.findMany({
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, category: true, subcategory: true },
      }),
      prisma.dishCategoryCatalog.findUnique({
        where: { id: 'global' },
        select: { categories: true, subcategories: true },
      }),
    ]);
    const filtered = filterDishCatalogByStoredCategories(
      items.map((item) => ({ ...item, rate: 0 })),
      categoryCatalog?.categories,
      readDeletedDishCategories(categoryCatalog?.subcategories),
    );
    const allowed = new Set(filtered.map((item) => `${item.category}\u0000${item.name}`));
    return NextResponse.json({
      items: items
        .filter((item) => allowed.has(`${item.category}\u0000${item.name}`))
        .map(({ id, name, category }) => ({ id, name, category })),
    });
  } catch (error) {
    console.error('Public dish catalog GET:', error);
    return NextResponse.json({ items: [], error: 'Menu is temporarily unavailable.' }, { status: 500 });
  }
}
