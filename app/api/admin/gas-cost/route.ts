import {
  cookies,
} from 'next/headers';
import {
  NextResponse,
} from 'next/server';

import {
  getAdminCookieName,
  isValidAdminSessionToken,
} from '../../../../lib/adminAuth';

import {
  DEFAULT_LPG_SETTING,
} from '../../../../lib/gasCost';

import {
  ensureGasCostMasters,
  readGasCostMaster,
} from '../../../../lib/gasCostMasterServer';

import {
  prisma,
} from '../../../../lib/prisma';

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
      {
        status: 401,
      },
    );
  }

  return null;
}

function numberValue(
  value: unknown,
) {
  const number =
    Number(value);

  return Number.isFinite(
    number,
  )
    ? number
    : NaN;
}

export async function GET() {
  try {
    const authError =
      await requireAdmin();

    if (authError) {
      return authError;
    }

    const master =
      await readGasCostMaster({
        includeInactive:
          true,
        includeDishOverrides:
          true,
      });

    return NextResponse.json(
      master,
    );
  } catch (error) {
    console.error(
      'Admin Gas Cost GET:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to load gas cost master.',
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(
  request: Request,
) {
  try {
    const authError =
      await requireAdmin();

    if (authError) {
      return authError;
    }

    const body =
      await request.json() as {
        setting?: {
          cylinderPrice?:
            number;
          cylinderWeightKg?:
            number;
        };
        categoryRates?: Array<{
          categoryName?:
            string;
          lpgKgPer100?:
            number;
          basePax?:
            number;
          active?:
            boolean;
        }>;
      };

    await ensureGasCostMasters();

    const setting =
      body.setting;

    if (setting) {
      const cylinderPrice =
        numberValue(
          setting.cylinderPrice,
        );

      const cylinderWeightKg =
        numberValue(
          setting.cylinderWeightKg,
        );

      if (
        !Number.isFinite(
          cylinderPrice,
        ) ||
        cylinderPrice <= 0 ||
        !Number.isFinite(
          cylinderWeightKg,
        ) ||
        cylinderWeightKg <= 0
      ) {
        return NextResponse.json(
          {
            error:
              'Cylinder price and cylinder weight must be greater than 0.',
          },
          {
            status: 400,
          },
        );
      }

      await prisma.lpgSetting.upsert({
        where: {
          id:
            'global',
        },
        create: {
          id:
            'global',
          cylinderPrice,
          cylinderWeightKg,
        },
        update: {
          cylinderPrice,
          cylinderWeightKg,
        },
      });
    }

    const categoryRates =
      Array.isArray(
        body.categoryRates,
      )
        ? body.categoryRates
        : [];

    for (
      const submitted
      of categoryRates
    ) {
      const categoryName =
        String(
          submitted.categoryName ||
          '',
        )
          .trim()
          .replace(
            /\s+/g,
            ' ',
          );

      const lpgKgPer100 =
        numberValue(
          submitted.lpgKgPer100,
        );

      const basePax =
        Math.max(
          1,
          Math.round(
            numberValue(
              submitted.basePax ??
              100,
            ) || 100,
          ),
        );

      if (
        !categoryName ||
        categoryName.length >
          80 ||
        !Number.isFinite(
          lpgKgPer100,
        ) ||
        lpgKgPer100 < 0
      ) {
        return NextResponse.json(
          {
            error:
              'Each gas category needs a valid category name and LPG kg / 100 value of 0 or more.',
          },
          {
            status: 400,
          },
        );
      }

      await prisma.gasCategoryRate.upsert({
        where: {
          categoryName,
        },
        create: {
          categoryName,
          lpgKgPer100,
          basePax,
          active:
            submitted.active !==
            false,
        },
        update: {
          lpgKgPer100,
          basePax,
          active:
            submitted.active !==
            false,
        },
      });
    }

    const master =
      await readGasCostMaster({
        includeInactive:
          true,
        includeDishOverrides:
          true,
      });

    return NextResponse.json({
      ok: true,
      ...master,
    });
  } catch (error) {
    console.error(
      'Admin Gas Cost PUT:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to save gas cost master.',
      },
      {
        status: 500,
      },
    );
  }
}
