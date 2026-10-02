import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import { requireClientTenantId } from '../../../../lib/billingAuth';
import { prisma } from '../../../../lib/prisma';

const MAX_ITEMS = 180;
const MAX_PHOTO_CHARS = 140000;

function recordId(tenantId: string) {
  return `disposable_master:${tenantId}`;
}

function cleanText(value: unknown, max = 180) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
}

function cleanPhoto(value: unknown) {
  const photo = String(value || '').trim();
  if (!photo || photo.length > MAX_PHOTO_CHARS) return '';
  return photo.startsWith('data:image/') || photo.startsWith('https://') || photo.startsWith('http://')
    ? photo
    : '';
}

function cleanItems(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, MAX_ITEMS).flatMap((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];

    const row = item as Record<string, unknown>;
    const name = cleanText(row.name, 140);
    if (!name) return [];

    return [{
      id: cleanText(row.id, 160) || `disposable_master_${index + 1}`,
      name,
      category: cleanText(row.category, 80) || 'Other',
      photoUrl: cleanPhoto(row.photoUrl),
      unit: cleanText(row.unit, 40) || 'pcs',
      defaultRate: Math.max(0, Number(row.defaultRate) || 0),
      supplierId: cleanText(row.supplierId, 160),
      supplierName: cleanText(row.supplierName, 140),
      notes: cleanText(row.notes, 500),
      active: row.active !== false,
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
      return NextResponse.json({ items: [] });
    }

    const data =
      record.workData &&
      typeof record.workData === 'object' &&
      !Array.isArray(record.workData)
        ? record.workData as Record<string, unknown>
        : {};

    return NextResponse.json({ items: cleanItems(data.items) });
  } catch (error) {
    console.error('Disposable master GET error:', error);
    return NextResponse.json({ error: 'Could not load disposable master' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'Client login required' }, { status: 401 });
    }

    const body = await request.json();
    const items = cleanItems(body?.items);
    const workData = { type: 'DISPOSABLE_MASTER', items } as Prisma.InputJsonValue;

    await prisma.menuWork.upsert({
      where: { id: recordId(tenantId) },
      create: { id: recordId(tenantId), tenantId, workData },
      update: { workData },
    });

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error('Disposable master PUT error:', error);
    return NextResponse.json({ error: 'Could not save disposable master' }, { status: 500 });
  }
}
