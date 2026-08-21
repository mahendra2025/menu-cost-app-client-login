import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createAdminSessionToken, getAdminCookieName } from '../../../lib/adminAuth';
import { hashPassword, isPasswordHash, verifyPassword } from '../../../lib/passwords';
import { prisma } from '../../../lib/prisma';
import { createClientSessionToken, getClientCookieName } from '../../../lib/clientAuth';

function credentialsMatch(received: string, expected: string) {
  const receivedValue = Buffer.from(received);
  const expectedValue = Buffer.from(expected);

  return receivedValue.length === expectedValue.length
    && timingSafeEqual(receivedValue, expectedValue);
}

function clientLoginResponse(tenant: {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  onboardingCompleted: boolean;
}) {
  const response = NextResponse.json({
    session: {
      tenantId: tenant.id,
      tenantName: tenant.name,
      email: tenant.email,
      plan: tenant.plan,
      status: tenant.status === 'ACTIVE' ? 'ACTIVE' : 'EXPIRED',
      onboardingCompleted: tenant.onboardingCompleted,
    },
  });

  response.cookies.set({
    name: getClientCookieName(),
    value: createClientSessionToken(tenant.id),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  response.cookies.set({
    name: getAdminCookieName(),
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  return response;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '').trim();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const singleUserEmail = process.env.SINGLE_USER_EMAIL?.trim().toLowerCase();
    const singleUserPassword = process.env.SINGLE_USER_PASSWORD?.trim();
    const singleUserName = process.env.SINGLE_USER_BUSINESS_NAME?.trim() || 'My Catering Business';
    const singleUserMode = Boolean(singleUserEmail || singleUserPassword);

    if (singleUserMode) {
      if (!singleUserEmail || !singleUserPassword) {
        return NextResponse.json(
          { error: 'Single-user login is not fully configured.' },
          { status: 500 },
        );
      }

      if (
        !credentialsMatch(email, singleUserEmail)
        || !credentialsMatch(password, singleUserPassword)
      ) {
        return NextResponse.json({ error: 'Wrong email or password.' }, { status: 401 });
      }

      const existingTenant = await prisma.tenant.findUnique({
        where: { email: singleUserEmail },
      });

      const tenant = existingTenant
        ? await prisma.tenant.update({
          where: { id: existingTenant.id },
          data: {
            name: singleUserName,
            password: verifyPassword(singleUserPassword, existingTenant.password)
              ? existingTenant.password
              : hashPassword(singleUserPassword),
            plan: 'PRO',
            status: 'ACTIVE',
            onboardingCompleted: true,
          },
        })
        : await prisma.tenant.create({
          data: {
            name: singleUserName,
            email: singleUserEmail,
            password: hashPassword(singleUserPassword),
            plan: 'PRO',
            status: 'ACTIVE',
            onboardingCompleted: true,
          },
        });

      return clientLoginResponse(tenant);
    }

    const adminUserId = process.env.ADMIN_USER_ID?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD?.trim();

    if (adminUserId && adminPassword && email === adminUserId && password === adminPassword) {
      const response = NextResponse.json({
        session: {
          role: 'ADMIN',
          tenantId: 'admin',
          tenantName: 'Super Admin',
          email: adminUserId,
          plan: 'ADMIN',
          status: 'ACTIVE',
        },
      });
      response.cookies.set({
        name: getAdminCookieName(),
        value: createAdminSessionToken(),
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      });
      response.cookies.set({ name: getClientCookieName(), value: '', path: '/', maxAge: 0 });
      return response;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { email },
    });

    if (!tenant || !verifyPassword(password, tenant.password)) {
      return NextResponse.json({ error: 'Invalid login' }, { status: 401 });
    }

    if (!isPasswordHash(tenant.password)) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { password: hashPassword(password) },
      });
    }

    if (tenant.status === 'INACTIVE') {
      return NextResponse.json({ error: 'Account inactive' }, { status: 403 });
    }

    return clientLoginResponse(tenant);
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
