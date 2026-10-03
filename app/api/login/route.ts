import {
  timingSafeEqual,
} from 'crypto';
import {
  NextResponse,
} from 'next/server';

import {
  createAdminSessionToken,
  getAdminCookieName,
} from '../../../lib/adminAuth';
import {
  createClientSessionToken,
  getClientCookieName,
} from '../../../lib/clientAuth';
import {
  hashPassword,
  isPasswordHash,
  verifyPassword,
} from '../../../lib/passwords';
import {
  prisma,
} from '../../../lib/prisma';

function safeMatch(
  received: string,
  expected: string,
) {
  const receivedValue =
    Buffer.from(received);
  const expectedValue =
    Buffer.from(expected);

  return (
    receivedValue.length ===
      expectedValue.length &&
    timingSafeEqual(
      receivedValue,
      expectedValue,
    )
  );
}

function configuredBootstrapOwner() {
  const userIds = Array.from(
    new Set(
      [
        process.env.SINGLE_USER_ID,
        process.env.SINGLE_USER_EMAIL,
      ]
        .map((value) =>
          String(value || '')
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    ),
  );

  const passwords = Array.from(
    new Set(
      [
        process.env.SINGLE_USER_PASSWORD,
      ]
        .map((value) =>
          String(value || '').trim(),
        )
        .filter(Boolean),
    ),
  );

  return {
    userIds,
    passwords,
    businessName:
      String(
        process.env.SINGLE_USER_BUSINESS_NAME ||
        'My Catering Business',
      ).trim() ||
      'My Catering Business',
  };
}

function clientLoginResponse(
  workspace: {
    id: string;
    name: string;
    email: string;
  },
) {
  const response =
    NextResponse.json({
      session: {
        role: 'CLIENT',
        tenantId:
          workspace.id,
        tenantName:
          workspace.name,
        email:
          workspace.email,
        status: 'ACTIVE',
        onboardingCompleted:
          true,
        workspaceMode:
          'MULTI_TENANT',
      },
    });

  response.cookies.set({
    name:
      getClientCookieName(),
    value:
      createClientSessionToken(
        workspace.id,
      ),
    httpOnly: true,
    sameSite: 'lax',
    secure:
      process.env.NODE_ENV ===
      'production',
    path: '/',
  });

  /*
   * Client accounts never receive the global Super Admin cookie.
   * Global Dish / Recipe / Ingredient masters stay Super Admin only.
   */
  response.cookies.set({
    name:
      getAdminCookieName(),
    value: '',
    path: '/',
    maxAge: 0,
  });

  return response;
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      await request.json();

    const userId =
      String(
        body.userId ||
        body.email ||
        '',
      )
        .trim()
        .toLowerCase();

    const password =
      String(
        body.password || '',
      );

    if (!userId || !password) {
      return NextResponse.json(
        {
          error:
            'User ID and password required',
        },
        { status: 400 },
      );
    }

    const adminUserId =
      String(
        process.env.ADMIN_USER_ID ||
        '',
      )
        .trim()
        .toLowerCase();

    const adminPassword =
      String(
        process.env.ADMIN_PASSWORD ||
        '',
      );

    if (
      adminUserId &&
      adminPassword &&
      safeMatch(
        userId,
        adminUserId,
      ) &&
      safeMatch(
        password,
        adminPassword,
      )
    ) {
      const response =
        NextResponse.json({
          session: {
            role: 'ADMIN',
            tenantId: 'admin',
            tenantName:
              'Super Admin',
            email:
              adminUserId,
            status: 'ACTIVE',
            workspaceMode:
              'ADMIN',
          },
        });

      response.cookies.set({
        name:
          getAdminCookieName(),
        value:
          createAdminSessionToken(),
        httpOnly: true,
        sameSite: 'lax',
        secure:
          process.env.NODE_ENV ===
          'production',
        path: '/',
      });

      response.cookies.set({
        name:
          getClientCookieName(),
        value: '',
        path: '/',
        maxAge: 0,
      });

      return response;
    }

    const workspace =
      await prisma.tenant.findUnique({
        where: {
          email:
            userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          status: true,
        },
      });

    if (workspace) {
      if (
        String(
          workspace.status ||
          '',
        ).toUpperCase() !==
        'ACTIVE'
      ) {
        return NextResponse.json(
          {
            error:
              'This account is disabled. Contact your Super Admin.',
            code:
              'ACCOUNT_DISABLED',
          },
          { status: 403 },
        );
      }

      if (
        !verifyPassword(
          password,
          workspace.password,
        )
      ) {
        return NextResponse.json(
          {
            error:
              'Wrong user ID or password.',
          },
          { status: 401 },
        );
      }

      /*
       * Upgrade legacy plain-text tenant passwords after a successful login.
       */
      if (
        !isPasswordHash(
          workspace.password,
        )
      ) {
        await prisma.tenant.update({
          where: {
            id:
              workspace.id,
          },
          data: {
            password:
              hashPassword(
                password,
              ),
          },
        });
      }

      return clientLoginResponse(
        workspace,
      );
    }

    /*
     * One-time migration/bootstrap path for installations that still use
     * SINGLE_USER_* environment credentials but do not yet have a Tenant row.
     * It never reassigns or overwrites another tenant.
     */
    const bootstrap =
      configuredBootstrapOwner();

    const bootstrapUserValid =
      bootstrap.userIds.some(
        (configuredUserId) =>
          safeMatch(
            userId,
            configuredUserId,
          ),
      );

    const bootstrapPasswordValid =
      bootstrap.passwords.some(
        (configuredPassword) =>
          safeMatch(
            password,
            configuredPassword,
          ),
      );

    if (
      bootstrapUserValid &&
      bootstrapPasswordValid
    ) {
      const created =
        await prisma.tenant.create({
          data: {
            name:
              bootstrap.businessName,
            email:
              userId,
            password:
              hashPassword(
                password,
              ),
            plan: 'PRO',
            status: 'ACTIVE',
            onboardingCompleted:
              true,
          },
        });

      return clientLoginResponse(
        created,
      );
    }

    return NextResponse.json(
      {
        error:
          'Wrong user ID or password.',
      },
      { status: 401 },
    );
  } catch (error) {
    console.error(
      'Login failed:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Login failed',
      },
      { status: 500 },
    );
  }
}
