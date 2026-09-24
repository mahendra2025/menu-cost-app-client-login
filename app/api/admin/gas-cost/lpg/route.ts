import {
  cookies,
} from 'next/headers';
import {
  NextResponse,
} from 'next/server';

import {
  getAdminCookieName,
  isValidAdminSessionToken,
} from '../../../../../lib/adminAuth';

import {
  DEFAULT_LPG_SETTING,
  lpgRatePerKg,
} from '../../../../../lib/gasCost';

import {
  prisma,
} from '../../../../../lib/prisma';

const LPG_SETTING_ID =
  'global';

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

function positiveNumber(
  value: unknown,
) {
  const number =
    Number(value);

  return Number.isFinite(
    number,
  ) && number > 0
    ? number
    : NaN;
}

async function readSetting() {
  return prisma.lpgSetting.upsert({
    where: {
      id:
        LPG_SETTING_ID,
    },
    create: {
      id:
        LPG_SETTING_ID,
      cylinderPrice:
        DEFAULT_LPG_SETTING
          .cylinderPrice,
      cylinderWeightKg:
        DEFAULT_LPG_SETTING
          .cylinderWeightKg,
    },
    update: {},
    select: {
      cylinderPrice:
        true,
      cylinderWeightKg:
        true,
      updatedAt:
        true,
    },
  });
}

function responsePayload(
  setting: {
    cylinderPrice: number;
    cylinderWeightKg: number;
    updatedAt: Date;
  },
) {
  const normalized = {
    cylinderPrice:
      Number(
        setting.cylinderPrice,
      ),
    cylinderWeightKg:
      Number(
        setting.cylinderWeightKg,
      ),
  };

  return {
    setting:
      normalized,
    lpgRatePerKg:
      lpgRatePerKg(
        normalized,
      ),
    updatedAt:
      setting.updatedAt
        .toISOString(),
  };
}

export async function GET() {
  try {
    const authError =
      await requireAdmin();

    if (authError) {
      return authError;
    }

    const setting =
      await readSetting();

    return NextResponse.json(
      responsePayload(
        setting,
      ),
      {
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate',
        },
      },
    );
  } catch (error) {
    console.error(
      'Admin LPG Setting GET:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to load LPG setting.',
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
        cylinderPrice?:
          number;
        cylinderWeightKg?:
          number;
        setting?: {
          cylinderPrice?:
            number;
          cylinderWeightKg?:
            number;
        };
      };

    const source =
      body.setting ||
      body;

    const cylinderPrice =
      positiveNumber(
        source.cylinderPrice,
      );

    const cylinderWeightKg =
      positiveNumber(
        source.cylinderWeightKg,
      );

    if (
      !Number.isFinite(
        cylinderPrice,
      ) ||
      !Number.isFinite(
        cylinderWeightKg,
      )
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

    const setting =
      await prisma.lpgSetting.upsert({
        where: {
          id:
            LPG_SETTING_ID,
        },
        create: {
          id:
            LPG_SETTING_ID,
          cylinderPrice,
          cylinderWeightKg,
        },
        update: {
          cylinderPrice,
          cylinderWeightKg,
        },
        select: {
          cylinderPrice:
            true,
          cylinderWeightKg:
            true,
          updatedAt:
            true,
        },
      });

    return NextResponse.json(
      {
        ok: true,
        ...responsePayload(
          setting,
        ),
      },
      {
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate',
        },
      },
    );
  } catch (error) {
    console.error(
      'Admin LPG Setting PUT:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to save LPG setting.',
      },
      {
        status: 500,
      },
    );
  }
}
