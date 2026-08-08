import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  getClientCookieName,
  readClientSessionToken,
} from '../../../../lib/clientAuth';

import {
  hashPassword,
  verifyPassword,
} from '../../../../lib/passwords';

import { prisma } from '../../../../lib/prisma';

export async function PUT(
  request: Request,
) {
  try {
    const cookieStore =
      await cookies();

    const tenantId =
      readClientSessionToken(
        cookieStore.get(
          getClientCookieName(),
        )?.value,
      );

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
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
      };

    const currentPassword =
      String(
        body.currentPassword || '',
      ).trim();

    const newPassword =
      String(
        body.newPassword || '',
      ).trim();

    const confirmPassword =
      String(
        body.confirmPassword || '',
      ).trim();

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return NextResponse.json(
        {
          error:
            'Enter current password, new password and confirmation.',
        },
        { status: 400 },
      );
    }

    if (
      newPassword.length < 8
    ) {
      return NextResponse.json(
        {
          error:
            'New password must contain at least 8 characters.',
        },
        { status: 400 },
      );
    }

    if (
      newPassword.length > 128
    ) {
      return NextResponse.json(
        {
          error:
            'Password is too long.',
        },
        { status: 400 },
      );
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      return NextResponse.json(
        {
          error:
            'New password and confirmation do not match.',
        },
        { status: 400 },
      );
    }

    if (
      currentPassword ===
      newPassword
    ) {
      return NextResponse.json(
        {
          error:
            'New password must be different from your current password.',
        },
        { status: 400 },
      );
    }

    const tenant =
      await prisma.tenant.findUnique({
        where: {
          id: tenantId,
        },

        select: {
          id: true,
          password: true,
        },
      });

    if (!tenant) {
      return NextResponse.json(
        {
          error:
            'Account not found.',
        },
        { status: 404 },
      );
    }

    if (
      !verifyPassword(
        currentPassword,
        tenant.password,
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Current password is incorrect.',
        },
        { status: 400 },
      );
    }

    await prisma.tenant.update({
      where: {
        id: tenantId,
      },

      data: {
        password:
          hashPassword(
            newPassword,
          ),
      },
    });

    return NextResponse.json({
      ok: true,
      message:
        'Password changed successfully.',
    });
  } catch (error) {
    console.error(
      'Change password:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Could not change password.',
      },
      { status: 500 },
    );
  }
}
