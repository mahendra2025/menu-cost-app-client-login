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
  MANPOWER_RULE_DEFINITIONS,
  type ManpowerRuleConfig,
} from '../../../../lib/manpowerMaster';

import {
  ensureManpowerMaster,
  readManpowerMaster,
  saveManpowerMaster,
} from '../../../../lib/manpowerMasterServer';

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

export async function GET() {
  try {
    const authError =
      await requireAdmin();

    if (authError) {
      return authError;
    }

    await ensureManpowerMaster();

    const master =
      await readManpowerMaster();

    return NextResponse.json(
      master,
    );
  } catch (error) {
    console.error(
      'Admin Manpower Master GET:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to load manpower master.',
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
        rules?:
          Partial<ManpowerRuleConfig>;
      };

    if (
      !body.rules ||
      typeof body.rules !==
        'object'
    ) {
      return NextResponse.json(
        {
          error:
            'Manpower rules are required.',
        },
        {
          status: 400,
        },
      );
    }

    for (
      const definition
      of MANPOWER_RULE_DEFINITIONS
    ) {
      const rawValue =
        body.rules[
          definition.key
        ];

      if (
        rawValue === undefined
      ) {
        continue;
      }

      const value =
        Number(rawValue);

      if (
        !Number.isFinite(
          value,
        ) ||
        value <
          definition.min ||
        value >
          definition.max
      ) {
        return NextResponse.json(
          {
            error:
              `${definition.label} must be between ${definition.min} and ${definition.max}.`,
          },
          {
            status: 400,
          },
        );
      }
    }

    const master =
      await saveManpowerMaster(
        body.rules,
      );

    return NextResponse.json({
      ok: true,
      ...master,
    });
  } catch (error) {
    console.error(
      'Admin Manpower Master PUT:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to save manpower master.',
      },
      {
        status: 500,
      },
    );
  }
}
