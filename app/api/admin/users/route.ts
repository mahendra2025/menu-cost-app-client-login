import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import {
  getAdminCookieName,
  isValidAdminSessionToken,
} from '../../../../lib/adminAuth';
import { hashPassword } from '../../../../lib/passwords';
import { prisma } from '../../../../lib/prisma';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminCookieName())?.value;

  if (!isValidAdminSessionToken(token)) {
    return NextResponse.json(
      { error: 'Super Admin login required' },
      { status: 401 },
    );
  }

  return null;
}

function cleanText(value: unknown, max = 160) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, max);
}

function cleanUserId(value: unknown) {
  return cleanText(value, 180).toLowerCase();
}

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        status: true,
        ownerName: true,
        phone: true,
        city: true,
        onboardingCompleted: true,
        createdAt: true,
        _count: {
          select: {
            works: true,
            costingHistory: true,
            quotations: true,
          },
        },
      },
    });

    return NextResponse.json({
      users: tenants,
      summary: {
        total: tenants.length,
        active: tenants.filter((tenant) => tenant.status === 'ACTIVE').length,
        disabled: tenants.filter((tenant) => tenant.status !== 'ACTIVE').length,
      },
    });
  } catch (error) {
    console.error('Admin users GET failed:', error);
    return NextResponse.json(
      { error: 'Could not load caterer accounts' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json();

    const name = cleanText(body.businessName || body.name, 160);
    const ownerName = cleanText(body.ownerName, 140);
    const userId = cleanUserId(body.userId || body.email);
    const phone = cleanText(body.phone, 40);
    const city = cleanText(body.city, 120);
    const password = String(body.password || '');
    const plan = cleanText(body.plan, 40) || 'PRO';

    if (!name) {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 },
      );
    }

    if (userId.length < 3) {
      return NextResponse.json(
        { error: 'User ID must be at least 3 characters' },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 },
      );
    }

    const tenant = await prisma.tenant.create({
      data: {
        name,
        email: userId,
        password: hashPassword(password),
        ownerName,
        phone,
        city,
        plan,
        status: 'ACTIVE',
        onboardingCompleted: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        status: true,
        ownerName: true,
        phone: true,
        city: true,
        onboardingCompleted: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        user: tenant,
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'This User ID is already in use' },
        { status: 409 },
      );
    }

    console.error('Admin users POST failed:', error);
    return NextResponse.json(
      { error: 'Could not create caterer account' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json();
    const id = cleanText(body.id, 180);

    if (!id) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 },
      );
    }

    const existing = await prisma.tenant.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Caterer account not found' },
        { status: 404 },
      );
    }

    const data: Prisma.TenantUpdateInput = {};

    if (body.businessName !== undefined || body.name !== undefined) {
      const name = cleanText(body.businessName || body.name, 160);
      if (!name) {
        return NextResponse.json(
          { error: 'Business name cannot be empty' },
          { status: 400 },
        );
      }
      data.name = name;
    }

    if (body.userId !== undefined || body.email !== undefined) {
      const userId = cleanUserId(body.userId || body.email);
      if (userId.length < 3) {
        return NextResponse.json(
          { error: 'User ID must be at least 3 characters' },
          { status: 400 },
        );
      }
      data.email = userId;
    }

    if (body.ownerName !== undefined) {
      data.ownerName = cleanText(body.ownerName, 140);
    }

    if (body.phone !== undefined) {
      data.phone = cleanText(body.phone, 40);
    }

    if (body.city !== undefined) {
      data.city = cleanText(body.city, 120);
    }

    if (body.plan !== undefined) {
      data.plan = cleanText(body.plan, 40) || 'PRO';
    }

    if (body.status !== undefined) {
      const status = cleanText(body.status, 30).toUpperCase();
      if (!['ACTIVE', 'DISABLED'].includes(status)) {
        return NextResponse.json(
          { error: 'Status must be ACTIVE or DISABLED' },
          { status: 400 },
        );
      }
      data.status = status;
    }

    if (body.password !== undefined && String(body.password || '')) {
      const password = String(body.password);
      if (password.length < 8) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters' },
          { status: 400 },
        );
      }
      data.password = hashPassword(password);
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        status: true,
        ownerName: true,
        phone: true,
        city: true,
        onboardingCompleted: true,
        createdAt: true,
        _count: {
          select: {
            works: true,
            costingHistory: true,
            quotations: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      user: tenant,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'This User ID is already in use' },
        { status: 409 },
      );
    }

    console.error('Admin users PATCH failed:', error);
    return NextResponse.json(
      { error: 'Could not update caterer account' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body = await request.json();
    const id = cleanText(body.id, 180);
    const confirm = cleanText(body.confirm, 160);

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            works: true,
            costingHistory: true,
            quotations: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Caterer account not found' },
        { status: 404 },
      );
    }

    if (confirm !== tenant.name) {
      return NextResponse.json(
        { error: 'Type the business name exactly to delete this account' },
        { status: 400 },
      );
    }

    await prisma.tenant.delete({
      where: { id: tenant.id },
    });

    return NextResponse.json({
      ok: true,
      deletedId: tenant.id,
    });
  } catch (error) {
    console.error('Admin users DELETE failed:', error);
    return NextResponse.json(
      { error: 'Could not delete caterer account' },
      { status: 500 },
    );
  }
}
