import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireClientTenantId } from '../../../../lib/billingAuth';
import { prisma } from '../../../../lib/prisma';

const MAX_ITEMS = 180;
const MAX_PHOTO_CHARS = 140000;

function recordId(tenantId: string) {
  return `crockery_master:${tenantId}`;
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

function cleanCategories(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Map(
      value
        .map((item) => cleanText(item, 80))
        .filter(Boolean)
        .map((item) => [
          item.toLocaleLowerCase('en-IN'),
          item,
        ]),
    ).values(),
  ).slice(0, 80);
}

function cleanItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_ITEMS).flatMap((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const name = cleanText(row.name, 140);
    if (!name) return [];

    return [{
      id: cleanText(row.id, 160) || `crockery_${index + 1}`,
      name,
      category: cleanText(row.category, 80) || 'Dinner Plate',
      photoUrl: cleanPhoto(row.photoUrl),
      ownership: cleanText(row.ownership, 30).toUpperCase() === 'RENTAL' ? 'RENTAL' : 'IN_HOUSE',
      availableQty: Math.max(0, Math.round(Number(row.availableQty) || 0)),
      unit: cleanText(row.unit, 40) || 'pcs',
      defaultRate: Math.max(0, Number(row.defaultRate) || 0),
      vendorId: cleanText(row.vendorId, 160),
      vendorName: cleanText(row.vendorName, 140),
      sizeType: cleanText(row.sizeType, 120),
      unitsPerGuest: Math.max(0, Number(row.unitsPerGuest) || 0),
      bufferPercent: Math.max(0, Math.min(100, Number(row.bufferPercent) || 0)),
      notes: cleanText(row.notes, 500),
      active: row.active !== false,
    }];
  });
}

export async function GET() {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Client login required' }, { status: 401 });

    const record = await prisma.menuWork.findUnique({
      where: { id: recordId(tenantId) },
      select: { tenantId: true, workData: true },
    });

    if (!record || record.tenantId !== tenantId) {
      return NextResponse.json({ crockery: [], categories: [] });
    }

    const data = record.workData && typeof record.workData === 'object' && !Array.isArray(record.workData)
      ? record.workData as Record<string, unknown>
      : {};

    return NextResponse.json({
      crockery: cleanItems(data.crockery),
      categories: cleanCategories(data.categories),
    });
  } catch (error) {
    console.error('Crockery master GET error:', error);
    return NextResponse.json({ error: 'Could not load crockery master' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Client login required' }, { status: 401 });

    const body = await request.json();
    const crockery = cleanItems(body?.crockery);
    const categories = cleanCategories(body?.categories);
    const workData = {
      type: 'CROCKERY_MASTER',
      crockery,
      categories,
    } as Prisma.InputJsonValue;

    await prisma.menuWork.upsert({
      where: { id: recordId(tenantId) },
      create: { id: recordId(tenantId), tenantId, workData },
      update: { workData },
    });

    return NextResponse.json({
      ok: true,
      crockery,
      categories,
    });
  } catch (error) {
    console.error('Crockery master PUT error:', error);
    return NextResponse.json({ error: 'Could not save crockery master' }, { status: 500 });
  }
}
