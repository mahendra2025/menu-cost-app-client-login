import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  getAdminCookieName,
  isValidAdminSessionToken,
} from '../../../../lib/adminAuth';
import {
  normalizeCityKey,
  normalizeCityName,
} from '../../../../lib/cityIngredientRates';
import { prisma } from '../../../../lib/prisma';

async function requireAdmin() {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      getAdminCookieName(),
    )?.value;

  if (
    !isValidAdminSessionToken(
      token,
    )
  ) {
    return NextResponse.json(
      {
        error:
          'Admin login required',
      },
      { status: 401 },
    );
  }

  return null;
}

function editDistance(
  left: string,
  right: string,
) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previous =
    Array.from(
      { length: right.length + 1 },
      (_, index) => index,
    );

  for (
    let i = 1;
    i <= left.length;
    i += 1
  ) {
    const current =
      [i];

    for (
      let j = 1;
      j <= right.length;
      j += 1
    ) {
      const cost =
        left[i - 1] ===
        right[j - 1]
          ? 0
          : 1;

      current[j] =
        Math.min(
          current[j - 1] + 1,
          previous[j] + 1,
          previous[j - 1] +
            cost,
        );
    }

    for (
      let j = 0;
      j < current.length;
      j += 1
    ) {
      previous[j] =
        current[j];
    }
  }

  return previous[
    right.length
  ];
}

function suspiciouslyClose(
  cityKey: string,
  existingKey: string,
) {
  const compactCity =
    cityKey.replace(
      /\s+/g,
      '',
    );

  const compactExisting =
    existingKey.replace(
      /\s+/g,
      '',
    );

  if (
    compactCity ===
    compactExisting
  ) {
    return true;
  }

  const longest =
    Math.max(
      compactCity.length,
      compactExisting.length,
    );

  if (longest < 5) {
    return false;
  }

  return (
    editDistance(
      compactCity,
      compactExisting,
    ) <= 1
  );
}

export async function GET() {
  try {
    const authError =
      await requireAdmin();

    if (authError) {
      return authError;
    }

    const cities =
      await prisma.ingredientCity.findMany(
        {
          where: {
            active: true,
          },
          orderBy: {
            city: 'asc',
          },
          select: {
            id: true,
            city: true,
            cityKey: true,
            active: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      );

    return NextResponse.json({
      cities,
    });
  } catch (error) {
    console.error(
      'Ingredient city master GET failed:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to load city master',
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const authError =
      await requireAdmin();

    if (authError) {
      return authError;
    }

    const body =
      (await request.json()) as {
        city?: string;
      };

    const city =
      normalizeCityName(
        body.city,
      );

    const cityKey =
      normalizeCityKey(city);

    if (!cityKey) {
      return NextResponse.json(
        {
          error:
            'Enter a city name',
        },
        { status: 400 },
      );
    }

    if (
      city.length > 80
    ) {
      return NextResponse.json(
        {
          error:
            'City name is too long',
        },
        { status: 400 },
      );
    }

    const existing =
      await prisma.ingredientCity.findMany(
        {
          select: {
            id: true,
            city: true,
            cityKey: true,
            active: true,
          },
        },
      );

    const exact =
      existing.find(
        (item) =>
          item.cityKey ===
          cityKey,
      );

    if (exact) {
      if (!exact.active) {
        const restored =
          await prisma.ingredientCity.update(
            {
              where: {
                id: exact.id,
              },
              data: {
                city,
                active: true,
              },
            },
          );

        return NextResponse.json({
          ok: true,
          city: restored,
          restored: true,
        });
      }

      return NextResponse.json(
        {
          error:
            `${exact.city} already exists in City Master`,
          city: exact,
        },
        { status: 409 },
      );
    }

    const closeMatch =
      existing.find(
        (item) =>
          suspiciouslyClose(
            cityKey,
            item.cityKey,
          ),
      );

    if (closeMatch) {
      return NextResponse.json(
        {
          error:
            `City looks very similar to "${closeMatch.city}". Use the existing city or correct the spelling.`,
          similarCity:
            closeMatch.city,
        },
        { status: 409 },
      );
    }

    const created =
      await prisma.ingredientCity.create(
        {
          data: {
            city,
            cityKey,
            active: true,
          },
        },
      );

    return NextResponse.json(
      {
        ok: true,
        city: created,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      'Ingredient city master POST failed:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to add city',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
) {
  try {
    const authError =
      await requireAdmin();

    if (authError) {
      return authError;
    }

    const body =
      (await request.json()) as {
        cityKey?: string;
      };

    const cityKey =
      normalizeCityKey(
        body.cityKey,
      );

    if (!cityKey) {
      return NextResponse.json(
        {
          error:
            'City is required',
        },
        { status: 400 },
      );
    }

    const existing =
      await prisma.ingredientCity.findUnique(
        {
          where: {
            cityKey,
          },
        },
      );

    if (!existing) {
      return NextResponse.json(
        {
          error:
            'City was not found',
        },
        { status: 404 },
      );
    }

    const rateCount =
      await prisma.ingredientCityRate.count(
        {
          where: {
            cityKey,
          },
        },
      );

    if (rateCount > 0) {
      return NextResponse.json(
        {
          error:
            `Remove ${rateCount} saved city rate${rateCount === 1 ? '' : 's'} before removing this city from City Master.`,
        },
        { status: 409 },
      );
    }

    await prisma.ingredientCity.update(
      {
        where: {
          cityKey,
        },
        data: {
          active: false,
        },
      },
    );

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      'Ingredient city master DELETE failed:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to remove city',
      },
      { status: 500 },
    );
  }
}
