import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import defaultRecipesData from '../../../lib/defaultRecipes.json';
import {
  getClientCookieName,
  readClientSessionToken,
} from '../../../lib/clientAuth';
import { prisma } from '../../../lib/prisma';

type PublicRecipe = {
  name: string;
  aliases: string[];
  baseGuests: number;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
};

function cleanText(value: unknown, maxLength = 160) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizeDishName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/\s+/g, ' ');
}

function readRecipe(value: unknown): PublicRecipe | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const row = value as Record<string, unknown>;
  const name = cleanText(row.name || row.dishName);

  if (!name) return null;

  const aliases = Array.isArray(row.aliases)
    ? row.aliases
        .map((alias) => cleanText(alias))
        .filter(Boolean)
    : [];

  const ingredients = Array.isArray(row.ingredients)
    ? row.ingredients.flatMap((value) => {
        if (
          !value ||
          typeof value !== 'object' ||
          Array.isArray(value)
        ) {
          return [];
        }

        const ingredient =
          value as Record<string, unknown>;

        const ingredientName = cleanText(
          ingredient.name ||
            ingredient.ingredientName,
        );

        const quantity = Math.max(
          0,
          Number(
            ingredient.quantity ??
              ingredient.qty,
          ) || 0,
        );

        const unit = cleanText(
          ingredient.unit ||
            ingredient.rateUnit,
          30,
        );

        if (
          !ingredientName ||
          !(quantity > 0) ||
          !unit
        ) {
          return [];
        }

        return [{
          name: ingredientName,
          quantity,
          unit,
        }];
      })
    : [];

  return {
    name,
    aliases,
    baseGuests: Math.max(
      1,
      Number(row.baseGuests) || 100,
    ),
    ingredients,
  };
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(
      getClientCookieName(),
    )?.value;

    if (!readClientSessionToken(sessionToken)) {
      return NextResponse.json(
        { error: 'Client login required' },
        { status: 401 },
      );
    }

    const body =
      await request.json() as Record<
        string,
        unknown
      >;

    const requestedNames = Array.isArray(
      body.dishNames,
    )
      ? Array.from(
          new Set(
            body.dishNames
              .map((name) => cleanText(name))
              .filter(Boolean)
              .slice(0, 500),
          ),
        )
      : [];

    if (!requestedNames.length) {
      return NextResponse.json({
        recipes: [],
      });
    }

    const catalog =
      await prisma.recipeCatalog.findUnique({
        where: { id: 'global' },
        select: { dishes: true },
      });

    const sourceRecipes = [
      ...(Array.isArray(defaultRecipesData)
        ? defaultRecipesData
        : []),
      ...(Array.isArray(catalog?.dishes)
        ? catalog.dishes
        : []),
    ];

    const recipeByKey =
      new Map<string, PublicRecipe>();

    sourceRecipes.forEach((value) => {
      const recipe = readRecipe(value);
      if (!recipe) return;

      [
        recipe.name,
        ...recipe.aliases,
      ].forEach((key) => {
        const normalized =
          normalizeDishName(key);

        if (normalized) {
          recipeByKey.set(
            normalized,
            recipe,
          );
        }
      });
    });

    const matchedRecipes =
      new Map<string, PublicRecipe>();

    requestedNames.forEach((dishName) => {
      const recipe = recipeByKey.get(
        normalizeDishName(dishName),
      );

      if (recipe) {
        matchedRecipes.set(
          normalizeDishName(recipe.name),
          recipe,
        );
      }
    });

    return NextResponse.json({
      recipes: Array.from(
        matchedRecipes.values(),
      ),
    });
  } catch (error) {
    console.error(
      'Recipe ingredient lookup failed:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to load recipe ingredients',
      },
      { status: 500 },
    );
  }
}
