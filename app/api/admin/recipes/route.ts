import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAdminCookieName, isValidAdminSessionToken } from '../../../../lib/adminAuth';
import { prisma } from '../../../../lib/prisma';

const CATALOG_ID = 'global';

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

  return {
    dishes: body.dishes,
    rates: body.rates,
    deletedDishIds: Array.from(new Set(deletedDishIds)),
    catalogVersion: Math.max(1, Math.floor(Number(body.catalogVersion) || 1)),
  };
}

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

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

export async function PUT(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const catalog = readCatalogPayload(await request.json());
    if (!catalog) {
      return NextResponse.json({ error: 'Invalid recipe catalog' }, { status: 400 });
    }

    const saved = await prisma.recipeCatalog.upsert({
      where: { id: CATALOG_ID },
      create: { id: CATALOG_ID, ...catalog },
      update: catalog,
      select: { updatedAt: true },
    });

    return NextResponse.json({ ok: true, updatedAt: saved.updatedAt });
  } catch {
    return NextResponse.json({ error: 'Failed to save recipes' }, { status: 500 });
  }
}
