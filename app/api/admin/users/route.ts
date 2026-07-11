import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  try {
    const users = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        plan: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '').trim();
    const plan = String(body.plan || 'PRO').trim();
    const status = String(body.status || 'ACTIVE').trim();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password required' }, { status: 400 });
    }

    const existing = await prisma.tenant.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const user = await prisma.tenant.create({
      data: {
        name,
        email,
        password,
        plan,
        status,
      },
    });

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = String(body.id || '').trim();

    if (!id) {
      return NextResponse.json({ error: 'User id required' }, { status: 400 });
    }

    const data: {
      name?: string;
      email?: string;
      password?: string;
      plan?: string;
      status?: string;
    } = {};

    if (body.name) data.name = String(body.name).trim();
    if (body.email) data.email = String(body.email).trim().toLowerCase();
    if (body.password) data.password = String(body.password).trim();
    if (body.plan) data.plan = String(body.plan).trim();
    if (body.status) data.status = String(body.status).trim();

    const user = await prisma.tenant.update({
      where: { id },
      data,
    });

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User id required' }, { status: 400 });
    }

    await prisma.tenant.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
