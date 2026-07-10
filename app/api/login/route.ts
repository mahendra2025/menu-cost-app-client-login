import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '').trim();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { email },
    });

    if (!tenant || tenant.password !== password) {
      return NextResponse.json({ error: 'Invalid login' }, { status: 401 });
    }

    if (tenant.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Account inactive' }, { status: 403 });
    }

    return NextResponse.json({
      session: {
        tenantId: tenant.id,
        tenantName: tenant.name,
        email: tenant.email,
        plan: tenant.plan,
        status: tenant.status,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
