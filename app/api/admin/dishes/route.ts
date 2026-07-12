import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '../../../../lib/prisma';
import { getAdminCookieName, isValidAdminSessionToken } from '../../../../lib/adminAuth';
import { CATEGORIES, DISH_COST_ITEMS } from '../../../../lib/dishCostMaster';

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
      const aliases = Array.isArray(row.aliases)
        ? row.aliases.map((alias) => String(alias).trim()).filter(Boolean)
        : [];

      if (!name || !CATEGORIES.includes(category as (typeof CATEGORIES)[number])) return null;

      return {
        name,
        category,
        rate,
        aliases,
      };
    })
    .filter(Boolean);
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
        aliases: true,
      },
    });

    if (!items.length) {
      return NextResponse.json({ items: DISH_COST_ITEMS });
    }

    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        rate: item.rate,
        aliases: Array.isArray(item.aliases) ? item.aliases : [],
      })),
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

    await prisma.$transaction([
      prisma.dishMasterItem.deleteMany(),
      ...items.map((item) =>
        prisma.dishMasterItem.create({
          data: {
            name: item!.name,
            category: item!.category,
            rate: item!.rate,
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
