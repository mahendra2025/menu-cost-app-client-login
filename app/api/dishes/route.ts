import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { DISH_COST_ITEMS, mergeDishCatalog } from '../../../lib/dishCostMaster';

export async function GET() {
  try {
    const [items, categoryCatalog] = await Promise.all([
      prisma.dishMasterItem.findMany({
        orderBy: { name: 'asc' },
        select: {
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
        where: { id: 'global' },
        select: { categories: true },
      }),
    ]);

    const mergedItems = items.length
      ? mergeDishCatalog(items.map((item) => ({
        name: item.name,
        category: item.category,
        subcategory: item.subcategory,
        rate: item.rate,
        servingQuantity: item.servingQuantity,
        servingUnit: item.servingUnit,
        aliases: Array.isArray(item.aliases) ? item.aliases.map((alias) => String(alias).trim()).filter(Boolean) : [],
      })))
      : DISH_COST_ITEMS;
    const storedCategories = Array.isArray(categoryCatalog?.categories)
      ? categoryCatalog.categories
        .map((category) => String(category || '').trim().toLowerCase())
        .filter(Boolean)
      : [];
    const allowedCategories = new Set(storedCategories);
    const catalogItems = allowedCategories.size
      ? mergedItems.filter((item) => allowedCategories.has(item.category.trim().toLowerCase()))
      : mergedItems;

    return NextResponse.json({ items: catalogItems });
  } catch {
    return NextResponse.json({ items: DISH_COST_ITEMS });
  }
}
