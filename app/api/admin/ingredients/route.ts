import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAdminCookieName, isValidAdminSessionToken } from '../../../../lib/adminAuth';
import { normalizeIngredientRate } from '../../../../lib/ingredientCatalog';
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

function recipeIngredientUsage(dishes: unknown) {
  const usage = new Map<string, number>();
  if (!Array.isArray(dishes)) return usage;
  dishes.forEach((dish) => {
    if (!dish || typeof dish !== 'object') return;
    const ingredients = (dish as Record<string, unknown>).ingredients;
    if (!Array.isArray(ingredients)) return;
    new Set(ingredients.map((item) => item && typeof item === 'object' ? String((item as Record<string, unknown>).rateKey || '') : '').filter(Boolean))
      .forEach((id) => usage.set(id, (usage.get(id) || 0) + 1));
  });
  return usage;
}

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const catalog = await prisma.recipeCatalog.findUnique({
      where: { id: CATALOG_ID },
      select: { rates: true, dishes: true, updatedAt: true },
    });
    if (!catalog) return NextResponse.json({ rates: [], usage: {}, ready: false });
    const usage = Object.fromEntries(recipeIngredientUsage(catalog.dishes));
    const rates = Array.isArray(catalog.rates)
      ? catalog.rates.map(normalizeIngredientRate).filter(Boolean)
      : [];
    return NextResponse.json({ rates, usage, ready: true, updatedAt: catalog.updatedAt });
  } catch {
    return NextResponse.json({ error: 'Failed to load ingredients' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const body = await request.json() as Record<string, unknown>;
    if (!Array.isArray(body.rates)) return NextResponse.json({ error: 'Invalid ingredient catalog' }, { status: 400 });
    const rates = body.rates.map(normalizeIngredientRate);
    if (rates.some((rate) => !rate)) return NextResponse.json({ error: 'Every ingredient needs a name, category, rate and valid unit' }, { status: 400 });
    const cleanedRates = rates.filter((rate): rate is NonNullable<typeof rate> => Boolean(rate));
    if (new Set(cleanedRates.map((rate) => rate.id)).size !== cleanedRates.length) {
      return NextResponse.json({ error: 'Ingredient name and unit combinations must be unique' }, { status: 400 });
    }

    const catalog = await prisma.recipeCatalog.findUnique({ where: { id: CATALOG_ID } });
    if (!catalog) return NextResponse.json({ error: 'Open Recipe Studio once before creating the Ingredient Master' }, { status: 409 });
    const previousRates = Array.isArray(catalog.rates) ? catalog.rates : [];
    const previousIds = new Set(previousRates.map((rate) => rate && typeof rate === 'object' ? String((rate as Record<string, unknown>).id || '') : '').filter(Boolean));
    const nextIds = new Set(cleanedRates.map((rate) => rate.id));
    const usage = recipeIngredientUsage(catalog.dishes);
    const usedDeletions = [...previousIds].filter((id) => !nextIds.has(id) && (usage.get(id) || 0) > 0);
    if (usedDeletions.length) {
      return NextResponse.json({ error: 'An ingredient used by a recipe cannot be deleted' }, { status: 409 });
    }

    const saved = await prisma.recipeCatalog.update({
      where: { id: CATALOG_ID },
      data: { rates: cleanedRates },
      select: { updatedAt: true },
    });
    return NextResponse.json({ ok: true, updatedAt: saved.updatedAt });
  } catch {
    return NextResponse.json({ error: 'Failed to save ingredients' }, { status: 500 });
  }
}
