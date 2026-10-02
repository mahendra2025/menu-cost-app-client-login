import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import { requireClientTenantId } from '../../../../lib/billingAuth';
import { prisma } from '../../../../lib/prisma';

const MAX_ITEMS = 120;
const MAX_PHOTO_CHARS = 140_000;

type EquipmentItem = {
  id: string;
  name: string;
  category: string;
  photoUrl: string;
  ownership: 'IN_HOUSE' | 'RENTAL';
  availableQty: number;
  unit: string;
  defaultRate: number;
  vendorId: string;
  vendorName: string;
  capacity: string;
  notes: string;
  active: boolean;
};

function recordId(tenantId: string) {
  return `equipment_master:${tenantId}`;
}

function cleanText(value: unknown, max = 180) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, max);
}

function cleanPhoto(value: unknown) {
  const photo = String(value || '').trim();

  if (!photo) return '';

  if (photo.length > MAX_PHOTO_CHARS) {
    return '';
  }

  if (
    photo.startsWith('data:image/') ||
    photo.startsWith('https://') ||
    photo.startsWith('http://')
  ) {
    return photo;
  }

  return '';
}

function cleanItems(value: unknown): EquipmentItem[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, MAX_ITEMS).flatMap((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return [];
    }

    const row = item as Record<string, unknown>;
    const name = cleanText(row.name, 140);

    if (!name) return [];

    return [{
      id:
        cleanText(row.id, 160) ||
        `equipment_${index + 1}`,
      name,
      category:
        cleanText(row.category, 80) ||
        'Cooking',
      photoUrl:
        cleanPhoto(row.photoUrl),
      ownership:
        cleanText(row.ownership, 30).toUpperCase() === 'RENTAL'
          ? 'RENTAL'
          : 'IN_HOUSE',
      availableQty:
        Math.max(0, Math.round(Number(row.availableQty) || 0)),
      unit:
        cleanText(row.unit, 40) ||
        'unit',
      defaultRate:
        Math.max(0, Number(row.defaultRate) || 0),
      vendorId:
        cleanText(row.vendorId, 160),
      vendorName:
        cleanText(row.vendorName, 140),
      capacity:
        cleanText(row.capacity, 120),
      notes:
        cleanText(row.notes, 500),
      active:
        row.active !== false,
    }];
  });
}

export async function GET() {
  try {
    const tenantId = await requireClientTenantId();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Client login required' },
        { status: 401 },
      );
    }

    const record =
      await prisma.menuWork.findUnique({
        where: {
          id: recordId(tenantId),
        },
        select: {
          tenantId: true,
          workData: true,
        },
      });

    if (
      !record ||
      record.tenantId !== tenantId
    ) {
      return NextResponse.json({
        equipment: [],
      });
    }

    const data =
      record.workData &&
      typeof record.workData === 'object' &&
      !Array.isArray(record.workData)
        ? record.workData as Record<string, unknown>
        : {};

    return NextResponse.json({
      equipment:
        cleanItems(data.equipment),
    });
  } catch (error) {
    console.error(
      'Equipment master GET error:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Could not load equipment master',
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
) {
  try {
    const tenantId =
      await requireClientTenantId();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Client login required' },
        { status: 401 },
      );
    }

    const body =
      await request.json();

    const equipment =
      cleanItems(body?.equipment);

    const workData = {
      type: 'EQUIPMENT_MASTER',
      equipment,
    } as Prisma.InputJsonValue;

    await prisma.menuWork.upsert({
      where: {
        id: recordId(tenantId),
      },
      create: {
        id: recordId(tenantId),
        tenantId,
        workData,
      },
      update: {
        workData,
      },
    });

    return NextResponse.json({
      ok: true,
      equipment,
    });
  } catch (error) {
    console.error(
      'Equipment master PUT error:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Could not save equipment master',
      },
      { status: 500 },
    );
  }
}
