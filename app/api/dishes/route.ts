import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { DISH_COST_ITEMS, mergeDishCatalog, type Category } from '../../../lib/dishCostMaster';

export async function GET() {
  try {
    const items = await prisma.dishMasterItem.findMany({
      orderBy: { name: 'asc' },
      select: {
        name: true,
        category: true,
        rate: true,
        aliases: true,
      },
    });

    const mergedItems = items.length
      ? mergeDishCatalog(items.map((item) => ({
        name: item.name,
        category: item.category as Category,
        rate: item.rate,
        aliases: Array.isArray(item.aliases) ? item.aliases.map((alias) => String(alias).trim()).filter(Boolean) : [],
      })))
      : DISH_COST_ITEMS;

    return NextResponse.json({ items: mergedItems });
  } catch {
    return NextResponse.json({ items: DISH_COST_ITEMS });
  }
}
