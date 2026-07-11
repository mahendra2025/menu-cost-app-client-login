import { NextResponse } from 'next/server';
import { getAdminPassword, getAdminUserId } from '../../../lib/adminCredentials';
import { createAdminSessionToken, getAdminCookieName } from '../../../lib/adminAuth';
import { hashPassword, isPasswordHash, verifyPassword } from '../../../lib/passwords';
import { prisma } from '../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '').trim();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    if (email === getAdminUserId() && password === getAdminPassword()) {
      const response = NextResponse.json({
        session: {
          role: 'ADMIN',
          tenantId: 'admin',
          tenantName: 'Super Admin',
          email: getAdminUserId(),
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

    if (tenant.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Account inactive' }, { status: 403 });
    }

    const response = NextResponse.json({
      session: {
        tenantId: tenant.id,
        tenantName: tenant.name,
        email: tenant.email,
        plan: tenant.plan,
        status: tenant.status,
      },
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
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
