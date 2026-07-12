import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { DISH_COST_ITEMS } from '../../../lib/dishCostMaster';

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

    if (!items.length) {
      return NextResponse.json({ items: DISH_COST_ITEMS });
    }

    return NextResponse.json({
      items: items.map((item) => ({
        name: item.name,
        category: item.category,
        rate: item.rate,
        aliases: Array.isArray(item.aliases) ? item.aliases : [],
      })),
    });
  } catch {
    return NextResponse.json({ items: DISH_COST_ITEMS });
  }
}
