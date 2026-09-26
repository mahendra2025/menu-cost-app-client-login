import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  getAdminCookieName,
  isValidAdminSessionToken,
} from '../../../../lib/adminAuth';
import {
  normalizeIngredientRate,
} from '../../../../lib/ingredientCatalog';
import {
  ingredientCityOptions,
  normalizeCityKey,
  normalizeCityName,
} from '../../../../lib/cityIngredientRates';
import { prisma } from '../../../../lib/prisma';

const CATALOG_ID = 'global';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(
      getAdminCookieName(),
    )?.value;

  if (!isValidAdminSessionToken(token)) {
    return NextResponse.json(
      { error: 'Admin login required' },
      { status: 401 },
    );
  }

  return null;
}

function validEffectiveDate(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime())
    ? null
    : date;
}

export async function GET(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const url = new URL(request.url);
    const city =
      normalizeCityName(
        url.searchParams.get('city') ||
          'Silvassa',
      );
    const cityKey =
      normalizeCityKey(city);

    if (!cityKey) {
      return NextResponse.json(
        { error: 'City is required' },
        { status: 400 },
      );
    }

    const [catalog, cityRates, cities] =
      await Promise.all([
        prisma.recipeCatalog.findUnique({
          where: { id: CATALOG_ID },
          select: {
            rates: true,
            updatedAt: true,
          },
        }),
        prisma.ingredientCityRate.findMany({
          where: { cityKey },
          select: {
            ingredientId: true,
            city: true,
            cityKey: true,
            rate: true,
            source: true,
            effectiveDate: true,
            updatedAt: true,
          },
        }),
        prisma.ingredientCityRate.findMany({
          distinct: ['cityKey'],
          orderBy: { city: 'asc' },
          select: {
            city: true,
            cityKey: true,
          },
        }),
      ]);

    const masterRates =
      Array.isArray(catalog?.rates)
        ? catalog.rates
            .map(normalizeIngredientRate)
            .filter(
              (
                item,
              ): item is NonNullable<
                typeof item
              > => Boolean(item),
            )
        : [];

    const cityMap =
      new Map(
        cityRates.map((item) => [
          item.ingredientId,
          item,
        ]),
      );

    return NextResponse.json({
      city,
      cityKey,
      cities:
        ingredientCityOptions(
          cities,
        ),
      rates: masterRates.map((master) => {
        const local =
          cityMap.get(master.id);

        return {
          ...master,
          globalRate: master.rate,
          cityRate:
            local?.rate ?? null,
          source:
            local?.source || '',
          effectiveDate:
            local?.effectiveDate
              ? local.effectiveDate
                  .toISOString()
                  .slice(0, 10)
              : '',
          cityUpdatedAt:
            local?.updatedAt || null,
        };
      }),
      updatedAt:
        catalog?.updatedAt || null,
    });
  } catch (error) {
    console.error(
      'Admin city ingredient rates GET:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to load city ingredient rates',
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body =
      (await request.json()) as {
        city?: string;
        rates?: Array<{
          ingredientId?: string;
          rate?: number | null;
          source?: string;
          effectiveDate?: string;
        }>;
        resetIngredientIds?: string[];
        copyFromCity?: string;
      };

    const city =
      normalizeCityName(body.city);
    const cityKey =
      normalizeCityKey(city);

    if (!cityKey) {
      return NextResponse.json(
        { error: 'City is required' },
        { status: 400 },
      );
    }

    const catalog =
      await prisma.recipeCatalog.findUnique({
        where: { id: CATALOG_ID },
        select: { rates: true },
      });

    if (!catalog) {
      return NextResponse.json(
        {
          error:
            'Ingredient Master not available',
        },
        { status: 404 },
      );
    }

    const validIds =
      new Set(
        (Array.isArray(catalog.rates)
          ? catalog.rates
              .map(normalizeIngredientRate)
              .filter(Boolean)
          : []
        ).map((item) => item!.id),
      );

    const submitted =
      Array.isArray(body.rates)
        ? body.rates
        : [];

    const resetIds =
      Array.isArray(
        body.resetIngredientIds,
      )
        ? Array.from(
            new Set(
              body.resetIngredientIds
                .map(String)
                .map((value) =>
                  value.trim(),
                )
                .filter(Boolean),
            ),
          )
        : [];

    for (const row of submitted) {
      const ingredientId =
        String(
          row.ingredientId || '',
        ).trim();
      const rate = Number(row.rate);

      if (!validIds.has(ingredientId)) {
        return NextResponse.json(
          {
            error:
              'Invalid ingredient in city rate update',
          },
          { status: 400 },
        );
      }

      if (
        !Number.isFinite(rate) ||
        !(rate > 0)
      ) {
        return NextResponse.json(
          {
            error:
              'Every saved city rate must be greater than ₹0',
          },
          { status: 400 },
        );
      }
    }

    for (const id of resetIds) {
      if (!validIds.has(id)) {
        return NextResponse.json(
          {
            error:
              'Invalid ingredient reset request',
          },
          { status: 400 },
        );
      }
    }

    const copyFromCity =
      normalizeCityName(
        body.copyFromCity,
      );
    const copyFromCityKey =
      normalizeCityKey(
        copyFromCity,
      );

    await prisma.$transaction(
      async (tx) => {
        if (
          copyFromCityKey &&
          copyFromCityKey !== cityKey
        ) {
          const sourceRows =
            await tx.ingredientCityRate.findMany(
              {
                where: {
                  cityKey:
                    copyFromCityKey,
                },
              },
            );

          for (const row of sourceRows) {
            if (
              !validIds.has(
                row.ingredientId,
              )
            ) {
              continue;
            }

            await tx.ingredientCityRate.upsert(
              {
                where: {
                  ingredientId_cityKey: {
                    ingredientId:
                      row.ingredientId,
                    cityKey,
                  },
                },
                create: {
                  ingredientId:
                    row.ingredientId,
                  city,
                  cityKey,
                  rate: row.rate,
                  source: row.source,
                  effectiveDate:
                    row.effectiveDate,
                },
                update: {
                  city,
                  rate: row.rate,
                  source: row.source,
                  effectiveDate:
                    row.effectiveDate,
                },
              },
            );
          }
        }

        if (resetIds.length) {
          await tx.ingredientCityRate.deleteMany(
            {
              where: {
                cityKey,
                ingredientId: {
                  in: resetIds,
                },
              },
            },
          );
        }

        for (const row of submitted) {
          const ingredientId =
            String(
              row.ingredientId,
            ).trim();
          const rate =
            Math.round(
              Number(row.rate) * 100,
            ) / 100;
          const source =
            String(
              row.source || '',
            )
              .trim()
              .slice(0, 120);
          const effectiveDate =
            validEffectiveDate(
              row.effectiveDate,
            );

          await tx.ingredientCityRate.upsert(
            {
              where: {
                ingredientId_cityKey: {
                  ingredientId,
                  cityKey,
                },
              },
              create: {
                ingredientId,
                city,
                cityKey,
                rate,
                source,
                effectiveDate,
              },
              update: {
                city,
                rate,
                source,
                effectiveDate,
              },
            },
          );
        }
      },
    );

    return NextResponse.json({
      ok: true,
      city,
      updated: submitted.length,
      reset: resetIds.length,
      copiedFrom:
        copyFromCityKey &&
        copyFromCityKey !== cityKey
          ? copyFromCity
          : null,
    });
  } catch (error) {
    console.error(
      'Admin city ingredient rates PUT:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to save city ingredient rates',
      },
      { status: 500 },
    );
  }
}
