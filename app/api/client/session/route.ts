import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  createAdminSessionToken,
  getAdminCookieName,
} from '../../../../lib/adminAuth';
import {
  getClientCookieName,
  readClientSessionToken,
} from '../../../../lib/clientAuth';
import { prisma } from '../../../../lib/prisma';

function configuredOwnerId() {
  return (
    process.env.SINGLE_USER_ID ||
    process.env.SINGLE_USER_EMAIL ||
    process.env.ADMIN_USER_ID ||
    ''
  )
    .trim()
    .toLowerCase();
}

async function retainedWorkspace() {
  const ownerId =
    configuredOwnerId();

  if (ownerId) {
    const matching =
      await prisma.tenant.findUnique({
        where: {
          email: ownerId,
        },
        select: {
          id: true,
        },
      });

    if (matching) {
      return matching;
    }
  }

  return prisma.tenant.findFirst({
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      id: true,
    },
  });
}

/**
 * Upgrade an existing authenticated browser into single-business
 * owner mode. Only the retained workspace may receive master-data
 * access; stale sessions from old secondary SaaS accounts are rejected.
 */
export async function POST() {
  const cookieStore =
    await cookies();

  const workspaceId =
    readClientSessionToken(
      cookieStore.get(
        getClientCookieName(),
      )?.value,
    );

  if (!workspaceId) {
    return NextResponse.json(
      {
        error:
          'Owner login required',
      },
      { status: 401 },
    );
  }

  const retained =
    await retainedWorkspace();

  if (
    !retained ||
    retained.id !== workspaceId
  ) {
    return NextResponse.json(
      {
        error:
          'This old account is no longer an active workspace. Sign in with the business owner login.',
        code:
          'SINGLE_BUSINESS_OWNER_REQUIRED',
      },
      { status: 403 },
    );
  }

  const response =
    NextResponse.json({
      ok: true,
      workspaceMode:
        'SINGLE_BUSINESS',
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

export async function DELETE() {
  const response =
    NextResponse.json({
      ok: true,
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
