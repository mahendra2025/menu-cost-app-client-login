import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import defaultRecipesData from '../../../lib/defaultRecipes.json';
import {
  getClientCookieName,
  readClientSessionToken,
} from '../../../lib/clientAuth';
import { prisma } from '../../../lib/prisma';

function normalize(value: unknown) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/\s+/g, ' ');
}

function readRecipe(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const row = value as Record<string, unknown>;
  const name = String(row.name || row.dishName || '').trim();

  if (!name) return null;

  return {
    name,
    aliases: Array.isArray(row.aliases)
      ? row.aliases.map(String).map((item) => item.trim()).filter(Boolean)
      : [],
    baseGuests: Math.max(1, Number(row.baseGuests) || 100),
    ingredients: Array.isArray(row.ingredients)
      ? row.ingredients.flatMap((value) => {
          if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return [];
          }

          const ingredient = value as Record<string, unknown>;
          const ingredientName = String(
            ingredient.name || ingredient.ingredientName || '',
          ).trim();
          const quantity = Math.max(
            0,
            Number(ingredient.quantity ?? ingredient.qty) || 0,
          );
          const unit = String(
            ingredient.unit || ingredient.rateUnit || '',
          ).trim();

          if (!ingredientName || !(quantity > 0) || !unit) return [];

          return [{
            name: ingredientName,
            quantity,
            unit,
          }];
        })
      : [],
  };
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(getClientCookieName())?.value;

    if (!readClientSessionToken(token)) {
      return NextResponse.json(
        { error: 'Client login required' },
        { status: 401 },
      );
    }

    const body = await request.json() as Record<string, unknown>;
    const requestedNames = Array.isArray(body.dishNames)
      ? body.dishNames.map(normalize).filter(Boolean)
      : [];

    const catalog = await prisma.recipeCatalog.findUnique({
      where: { id: 'global' },
      select: { dishes: true },
    });

    const recipeMap = new Map<string, ReturnType<typeof readRecipe>>();

    [
      ...(Array.isArray(defaultRecipesData) ? defaultRecipesData : []),
      ...(Array.isArray(catalog?.dishes) ? catalog.dishes : []),
    ].forEach((value) => {
      const recipe = readRecipe(value);
      if (!recipe) return;

      [recipe.name, ...recipe.aliases].forEach((name) => {
        recipeMap.set(normalize(name), recipe);
      });
    });

    const matched = new Map<string, NonNullable<ReturnType<typeof readRecipe>>>();

    requestedNames.forEach((name) => {
      const recipe = recipeMap.get(name);
      if (recipe) matched.set(normalize(recipe.name), recipe);
    });

    return NextResponse.json({
      recipes: Array.from(matched.values()),
    });
  } catch (error) {
    console.error('Recipe ingredient lookup failed:', error);

    return NextResponse.json(
      { error: 'Failed to load recipe ingredients' },
      { status: 500 },
    );
  }
}
