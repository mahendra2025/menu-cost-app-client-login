import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireClientTenantId } from '../../../../lib/billingAuth';
import { prisma } from '../../../../lib/prisma';

const MAX_ROLES = 100;

type StaffRole = {
  id: string;
  role: string;
  rate: number;
};

function recordId(tenantId: string) {
  return `staff_roles:${tenantId}`;
}

function cleanRoles(value: unknown): StaffRole[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();

  return value.slice(0, MAX_ROLES).flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];

    const candidate = item as Record<string, unknown>;
    const role = String(candidate.role || '').trim().replace(/\s+/g, ' ').slice(0, 120);
    const normalizedRole = role.toLocaleLowerCase('en-IN');

    if (!role || seen.has(normalizedRole)) return [];
    seen.add(normalizedRole);

    return [{
      id: String(candidate.id || '').trim().slice(0, 160) || `staff_${seen.size}`,
      role,
      rate: Math.max(0, Number(candidate.rate) || 0),
    }];
  });
}

export async function GET() {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'Client login required' }, { status: 401 });
    }

    const record = await prisma.menuWork.findUnique({
      where: { id: recordId(tenantId) },
      select: { tenantId: true, workData: true },
    });

    if (!record || record.tenantId !== tenantId) {
      return NextResponse.json({ exists: false, roles: [] });
    }

    const data = record.workData && typeof record.workData === 'object' && !Array.isArray(record.workData)
      ? record.workData as Record<string, unknown>
      : {};

    return NextResponse.json({ exists: true, roles: cleanRoles(data.roles) });
  } catch (error) {
    console.error('Staff roles GET error:', error);
    return NextResponse.json({ error: 'Could not load staff roles' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'Client login required' }, { status: 401 });
    }

    const body = await request.json();
    const roles = cleanRoles(body?.roles);
    const workData = { type: 'CUSTOM_STAFF_ROLES', roles } as Prisma.InputJsonValue;

    await prisma.menuWork.upsert({
      where: { id: recordId(tenantId) },
      create: { id: recordId(tenantId), tenantId, workData },
      update: { workData },
    });

    return NextResponse.json({ ok: true, roles });
  } catch (error) {
    console.error('Staff roles PUT error:', error);
    return NextResponse.json({ error: 'Could not save staff roles' }, { status: 500 });
  }
}
