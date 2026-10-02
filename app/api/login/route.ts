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

function configuredOwner() {
  const userIds = Array.from(
    new Set(
      [
        process.env.SINGLE_USER_ID,
        process.env.SINGLE_USER_EMAIL,
        process.env.ADMIN_USER_ID,
      ]
        .map((value) =>
          String(value || '')
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    ),
  );

  const bootstrapPasswords = Array.from(
    new Set(
      [
        process.env.SINGLE_USER_PASSWORD,
        process.env.ADMIN_PASSWORD,
      ]
        .map((value) =>
          String(value || '').trim(),
        )
        .filter(Boolean),
    ),
  );

  const businessName =
    (
      process.env.SINGLE_USER_BUSINESS_NAME ||
      ''
    ).trim();

  return {
    userIds,
    bootstrapPasswords,
    businessName,
  };
}

async function currentWorkspace(
  preferredUserId: string,
) {
  if (preferredUserId) {
    const matching =
      await prisma.tenant.findUnique({
        where: {
          email:
            preferredUserId,
        },
      });

    if (matching) {
      return matching;
    }
  }

  /*
   * Migration-safe fallback:
   * when an older SaaS database already has rows, the oldest
   * workspace becomes the one retained single-business workspace.
   */
  return prisma.tenant.findFirst({
    orderBy: {
      createdAt: 'asc',
    },
  });
}

async function prepareWorkspace(input: {
  workspace:
    Awaited<
      ReturnType<
        typeof currentWorkspace
      >
    >;
  userId: string;
  password: string;
  businessName: string;
  usedBootstrapPassword: boolean;
}) {
  const {
    workspace,
    userId,
    password,
    businessName,
    usedBootstrapPassword,
  } = input;

  if (workspace) {
    return prisma.tenant.update({
      where: {
        id:
          workspace.id,
      },
      data: {
        name:
          businessName ||
          workspace.name ||
          'My Catering Business',
        email:
          userId,
        password:
          usedBootstrapPassword
            ? hashPassword(
                password,
              )
            : workspace.password,

        /*
         * These columns are legacy database compatibility only.
         * No plan, subscription, expiry or client-account UI uses them.
         */
        plan: 'SINGLE',
        status: 'ACTIVE',
        onboardingCompleted:
          true,
        razorpayCustomerId:
          null,
        razorpaySubscriptionId:
          null,
        subscriptionStatus:
          null,
        currentPeriodEnd:
          null,
        cancelAtPeriodEnd:
          false,
      },
    });
  }

  return prisma.tenant.create({
    data: {
      name:
        businessName ||
        'My Catering Business',
      email:
        userId,
      password:
        hashPassword(
          password,
        ),
      plan: 'SINGLE',
      status: 'ACTIVE',
      onboardingCompleted:
        true,
    },
  });
}

function ownerLoginResponse(
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
          'SINGLE_BUSINESS',
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
   * The same owner session can use admin master-data routes.
   * This replaces the old separate SaaS admin/client account split.
   */
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
      ).trim();

    if (!userId || !password) {
      return NextResponse.json(
        {
          error:
            'User ID and password required',
        },
        { status: 400 },
      );
    }

    const owner =
      configuredOwner();

    const existingWorkspace =
      await currentWorkspace(
        userId,
      );

    const workspaceUserId =
      (
        existingWorkspace?.email ||
        ''
      )
        .trim()
        .toLowerCase();

    const acceptedUserIds =
      Array.from(
        new Set(
          [
            ...owner.userIds,
            workspaceUserId,
          ].filter(Boolean),
        ),
      );

    if (acceptedUserIds.length === 0) {
      return NextResponse.json(
        {
          error:
            'Single-business owner login is not configured.',
        },
        { status: 500 },
      );
    }

    const userIdAllowed =
      acceptedUserIds.some(
        (configuredUserId) =>
          safeMatch(
            userId,
            configuredUserId,
          ),
      );

    if (!userIdAllowed) {
      return NextResponse.json(
        {
          error:
            'Wrong user ID or password.',
        },
        { status: 401 },
      );
    }

    const databasePasswordValid =
      Boolean(
        existingWorkspace &&
        verifyPassword(
          password,
          existingWorkspace.password,
        ),
      );

    /*
     * Treat both SINGLE_USER_PASSWORD and ADMIN_PASSWORD as valid owner
     * recovery credentials. This prevents stale optional SINGLE_USER_*
     * values from shadowing the real production admin login.
     */
    const bootstrapPasswordValid =
      owner.bootstrapPasswords.some(
        (configuredPassword) =>
          safeMatch(
            password,
            configuredPassword,
          ),
      );

    if (
      !databasePasswordValid &&
      !bootstrapPasswordValid
    ) {
      return NextResponse.json(
        {
          error:
            'Wrong user ID or password.',
        },
        { status: 401 },
      );
    }

    if (
      !existingWorkspace &&
      !bootstrapPasswordValid
    ) {
      return NextResponse.json(
        {
          error:
            'Single-business owner password is not configured.',
        },
        { status: 500 },
      );
    }

    const workspace =
      await prepareWorkspace({
        workspace:
          existingWorkspace,
        userId,
        password,
        businessName:
          owner.businessName,
        usedBootstrapPassword:
          !databasePasswordValid &&
          bootstrapPasswordValid,
      });

    return ownerLoginResponse(
      workspace,
    );
  } catch (error) {
    console.error(
      'Single-business login failed:',
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
