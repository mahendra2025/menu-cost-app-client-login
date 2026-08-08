import {
  cookies,
} from 'next/headers';

import {
  NextResponse,
} from 'next/server';

import {
  getClientCookieName,
  readClientSessionToken,
} from '../../../../lib/clientAuth';

import {
  prisma,
} from '../../../../lib/prisma';

async function tenantIdFromSession() {
  const cookieStore =
    await cookies();

  return readClientSessionToken(
    cookieStore.get(
      getClientCookieName(),
    )?.value,
  );
}

export async function GET() {
  try {
    const tenantId =
      await tenantIdFromSession();

    if (!tenantId) {
      return NextResponse.json(
        {
          error:
            'Client login required',
        },
        { status: 401 },
      );
    }

    const tenant =
      await prisma.tenant.findUnique({
        where: {
          id: tenantId,
        },

        select: {
          id: true,
          name: true,
          email: true,
          ownerName: true,
          phone: true,
          city: true,
          onboardingCompleted: true,
        },
      });

    if (!tenant) {
      return NextResponse.json(
        {
          error:
            'Account not found',
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      tenant,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          'Could not load onboarding.',
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
) {
  try {
    const tenantId =
      await tenantIdFromSession();

    if (!tenantId) {
      return NextResponse.json(
        {
          error:
            'Client login required',
        },
        { status: 401 },
      );
    }

    const body =
      await request.json() as {
        businessName?: string;
        ownerName?: string;
        phone?: string;
        city?: string;
        completed?: boolean;
      };

    const data: {
      name?: string;
      ownerName?: string;
      phone?: string;
      city?: string;
      onboardingCompleted?: boolean;
    } = {};

    if (
      body.businessName !==
      undefined
    ) {
      const value =
        String(
          body.businessName,
        )
          .trim()
          .replace(/\s+/g, ' ');

      if (!value) {
        return NextResponse.json(
          {
            error:
              'Business name is required.',
          },
          { status: 400 },
        );
      }

      data.name =
        value.slice(
          0,
          120,
        );
    }

    if (
      body.ownerName !==
      undefined
    ) {
      data.ownerName =
        String(
          body.ownerName,
        )
          .trim()
          .slice(
            0,
            100,
          );
    }

    if (
      body.phone !==
      undefined
    ) {
      data.phone =
        String(
          body.phone,
        )
          .trim()
          .slice(
            0,
            30,
          );
    }

    if (
      body.city !==
      undefined
    ) {
      data.city =
        String(
          body.city,
        )
          .trim()
          .slice(
            0,
            100,
          );
    }

    if (
      body.completed ===
      true
    ) {
      data.onboardingCompleted =
        true;
    }

    const tenant =
      await prisma.tenant.update({
        where: {
          id: tenantId,
        },

        data,

        select: {
          id: true,
          name: true,
          email: true,
          ownerName: true,
          phone: true,
          city: true,
          onboardingCompleted: true,
        },
      });

    return NextResponse.json({
      ok: true,
      tenant,
    });
  } catch (error) {
    console.error(
      'Onboarding save:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Could not save onboarding.',
      },
      { status: 500 },
    );
  }
}
