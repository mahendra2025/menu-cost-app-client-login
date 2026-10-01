import { Prisma } from '@prisma/client';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  getAdminCookieName,
  isValidAdminSessionToken,
} from '../../../../lib/adminAuth';
import { prisma } from '../../../../lib/prisma';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(
      getAdminCookieName(),
    )?.value;

  return isValidAdminSessionToken(
    token,
  );
}

function clean(
  value: unknown,
  max = 160,
) {
  return String(value || '')
    .trim()
    .slice(0, max);
}

export async function GET() {
  if (!(await requireAdmin())) {
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

  const tenants =
    await prisma.tenant.findMany({
      orderBy: [
        {
          status: 'asc',
        },
        {
          name: 'asc',
        },
      ],
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        caterersOsWorkspaceId: true,
        caterersOsSyncEnabled: true,
        caterersOsLinkedAt: true,
      },
    });

  return NextResponse.json({
    tenants,
  });
}

export async function PATCH(
  request: Request,
) {
  if (!(await requireAdmin())) {
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

  const body =
    await request.json().catch(
      () => null,
    );

  if (
    !body ||
    typeof body !== 'object'
  ) {
    return NextResponse.json(
      {
        error:
          'Invalid request',
      },
      {
        status: 400,
      },
    );
  }

  const row =
    body as Record<
      string,
      unknown
    >;
  const tenantId =
    clean(row.tenantId, 120);
  const workspaceId =
    clean(
      row.workspaceId,
      120,
    );
  const enabled =
    Boolean(row.enabled) &&
    Boolean(workspaceId);

  if (!tenantId) {
    return NextResponse.json(
      {
        error:
          'Tenant id is required',
      },
      {
        status: 400,
      },
    );
  }

  try {
    const tenant =
      await prisma.tenant.update({
        where: {
          id: tenantId,
        },
        data: {
          caterersOsWorkspaceId:
            workspaceId ||
            null,
          caterersOsSyncEnabled:
            enabled,
          caterersOsLinkedAt:
            workspaceId
              ? new Date()
              : null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          caterersOsWorkspaceId: true,
          caterersOsSyncEnabled: true,
          caterersOsLinkedAt: true,
        },
      });

    return NextResponse.json({
      ok: true,
      tenant,
    });
  } catch (error) {
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        {
          error:
            'This CaterersOS workspace is already linked to another Menu Cost tenant.',
        },
        {
          status: 409,
        },
      );
    }

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return NextResponse.json(
        {
          error:
            'Tenant not found',
        },
        {
          status: 404,
        },
      );
    }

    console.error(
      'CaterersOS tenant link update failed:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Could not update CaterersOS link',
      },
      {
        status: 500,
      },
    );
  }
}
