import { NextResponse } from 'next/server';
import { calculateCustomerEstimate } from '../../../../lib/customerPricing';
import { prisma } from '../../../../lib/prisma';
import type { ServiceStyle } from '../../../../lib/types';

const SERVICE_STYLES = new Set<ServiceStyle>([
  'BUFFET', 'TABLE_SERVICE', 'LIVE_COUNTER', 'PACKED_MEAL',
]);

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      pax?: unknown;
      dishIds?: unknown;
      serviceStyle?: unknown;
    };
    const pax = Math.round(Number(body.pax) || 0);
    const dishIds = Array.isArray(body.dishIds)
      ? Array.from(new Set(body.dishIds.map(String))).slice(0, 100)
      : [];
    const serviceStyle = String(body.serviceStyle || '') as ServiceStyle;

    if (pax < 1 || pax > 100000 || !dishIds.length || !SERVICE_STYLES.has(serviceStyle)) {
      return NextResponse.json({ error: 'Complete the event, menu and service details.' }, { status: 400 });
    }

    const dishes = await prisma.dishMasterItem.findMany({
      where: { id: { in: dishIds } },
      select: { id: true, name: true, category: true, rate: true },
    });
    const byId = new Map(dishes.map((dish) => [dish.id, dish]));
    const selectedDishes = dishIds
      .map((id) => byId.get(id))
      .filter((dish): dish is NonNullable<typeof dish> => Boolean(dish))
      .map((dish) => ({
        dishId: dish.id,
        name: dish.name,
        category: dish.category,
        internalFoodCost: dish.rate,
      }));

    if (!selectedDishes.length) {
      return NextResponse.json({ error: 'The selected menu is no longer available.' }, { status: 400 });
    }

    return NextResponse.json(calculateCustomerEstimate({
      pax, selectedDishes, serviceStyle,
    }));
  } catch (error) {
    console.error('Public customer estimate POST:', error);
    return NextResponse.json({ error: 'Estimate could not be calculated.' }, { status: 500 });
  }
}
