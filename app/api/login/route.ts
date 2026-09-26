import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

import {
  createAdminSessionToken,
  getAdminCookieName,
} from '../../../lib/adminAuth';
import {
  createClientSessionToken,
  getClientCookieName,
} from '../../../lib/clientAuth';
import { hashPassword } from '../../../lib/passwords';
import { prisma } from '../../../lib/prisma';

function credentialsMatch(
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
  const userId =
    (
      process.env.SINGLE_USER_ID ||
      process.env.SINGLE_USER_EMAIL ||
      process.env.ADMIN_USER_ID ||
      ''
    )
      .trim()
      .toLowerCase();

  const password =
    (
      process.env.SINGLE_USER_PASSWORD ||
      process.env.ADMIN_PASSWORD ||
      ''
    ).trim();

  const businessName =
    (
      process.env.SINGLE_USER_BUSINESS_NAME ||
      'My Catering Business'
    ).trim() ||
    'My Catering Business';

  return {
    userId,
    password,
    businessName,
  };
}

async function ensureSingleWorkspace(input: {
  userId: string;
  password: string;
  businessName: string;
}) {
  const matching =
    await prisma.tenant.findUnique({
      where: {
        email: input.userId,
      },
    });

  const existing =
    matching ||
    (await prisma.tenant.findFirst({
      orderBy: {
        createdAt: 'asc',
      },
    }));

  const passwordHash =
    hashPassword(input.password);

  if (existing) {
    return prisma.tenant.update({
      where: {
        id: existing.id,
      },
      data: {
        name:
          input.businessName,
        email:
          input.userId,
        password:
          passwordHash,

        // Legacy SaaS columns are retained only for
        // database compatibility. The product no longer
        // exposes plans, subscriptions or account states.
        plan: 'SINGLE',
        status: 'ACTIVE',
        onboardingCompleted: true,
        razorpayCustomerId: null,
        razorpaySubscriptionId: null,
        subscriptionStatus: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    });
  }

  return prisma.tenant.create({
    data: {
      name:
        input.businessName,
      email:
        input.userId,
      password:
        passwordHash,
      plan: 'SINGLE',
      status: 'ACTIVE',
      onboardingCompleted: true,
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

  /*
   * One owner login receives both cookies:
   * - client cookie for event/costing APIs
   * - admin cookie for master-data APIs
   *
   * There is no separate SaaS admin/client-account login.
   */
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

    if (
      !owner.userId ||
      !owner.password
    ) {
      return NextResponse.json(
        {
          error:
            'Single-business login is not configured. Set SINGLE_USER_ID and SINGLE_USER_PASSWORD.',
        },
        { status: 500 },
      );
    }

    if (
      !credentialsMatch(
        userId,
        owner.userId,
      ) ||
      !credentialsMatch(
        password,
        owner.password,
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

    const workspace =
      await ensureSingleWorkspace(
        owner,
      );

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
