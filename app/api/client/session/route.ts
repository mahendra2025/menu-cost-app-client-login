import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  createClientSessionToken,
  getClientCookieName,
  readClientSessionToken,
} from '../../../../lib/clientAuth';
import { prisma } from '../../../../lib/prisma';
import { shouldUseSecureSessionCookie } from '../../../../lib/sessionCookie';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const tenantId = readClientSessionToken(
    cookieStore.get(getClientCookieName())?.value,
  );

  if (!tenantId) {
    return NextResponse.json(
      { error: 'Client login required' },
      { status: 401 },
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      plan: true,
    },
  });

  if (!tenant) {
    return NextResponse.json(
      { error: 'Account not found' },
      { status: 401 },
    );
  }

  if (String(tenant.status || '').toUpperCase() !== 'ACTIVE') {
    return NextResponse.json(
      {
        error: 'This account is disabled. Contact your Super Admin.',
        code: 'ACCOUNT_DISABLED',
      },
      { status: 403 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      plan: tenant.plan,
      status: tenant.status,
    },
    workspaceMode: 'MULTI_TENANT',
  });

  response.cookies.set({
    name: getClientCookieName(),
    value: createClientSessionToken(tenant.id),
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureSessionCookie(request),
    path: '/',
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: getClientCookieName(),
    value: '',
    path: '/',
    maxAge: 0,
  });

  return response;
}
