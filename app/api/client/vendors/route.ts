import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import { requireClientTenantId } from '../../../../lib/billingAuth';
import { prisma } from '../../../../lib/prisma';

const MAX_VENDORS = 250;
const MAX_RATES = 120;

type VendorRate = {
  id: string;
  kind: string;
  item: string;
  unit: string;
  rate: number;
};

type Vendor = {
  id: string;
  name: string;
  type: 'VENDOR' | 'AGENCY' | 'INDIVIDUAL';
  category: string;
  contactPerson: string;
  phone: string;
  city: string;
  gst: string;
  paymentTerms: string;
  notes: string;
  active: boolean;
  rates: VendorRate[];
};

function recordId(tenantId: string) {
  return `vendor_master:${tenantId}`;
}

function text(value: unknown, max = 160) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
}

function cleanRates(value: unknown): VendorRate[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, MAX_RATES).flatMap((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];

    const row = item as Record<string, unknown>;
    const itemName = text(row.item, 140);
    if (!itemName) return [];

    return [{
      id: text(row.id, 160) || `rate_${index + 1}`,
      kind: text(row.kind, 40).toUpperCase() || 'GENERAL',
      item: itemName,
      unit: text(row.unit, 40) || 'unit',
      rate: Math.max(0, Number(row.rate) || 0),
    }];
  });
}

function cleanVendors(value: unknown): Vendor[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, MAX_VENDORS).flatMap((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];

    const row = item as Record<string, unknown>;
    const name = text(row.name, 140);
    if (!name) return [];

    const rawType = text(row.type, 30).toUpperCase();
    const type =
      rawType === 'AGENCY' || rawType === 'INDIVIDUAL'
        ? rawType
        : 'VENDOR';

    return [{
      id: text(row.id, 160) || `vendor_${index + 1}`,
      name,
      type,
      category: text(row.category, 80) || 'General',
      contactPerson: text(row.contactPerson, 120),
      phone: text(row.phone, 40),
      city: text(row.city, 100),
      gst: text(row.gst, 40).toUpperCase(),
      paymentTerms: text(row.paymentTerms, 160),
      notes: text(row.notes, 500),
      active: row.active !== false,
      rates: cleanRates(row.rates),
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
      return NextResponse.json({ vendors: [] });
    }

    const data =
      record.workData &&
      typeof record.workData === 'object' &&
      !Array.isArray(record.workData)
        ? record.workData as Record<string, unknown>
        : {};

    return NextResponse.json({
      vendors: cleanVendors(data.vendors),
    });
  } catch (error) {
    console.error('Vendor master GET error:', error);
    return NextResponse.json({ error: 'Could not load vendors' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'Client login required' }, { status: 401 });
    }

    const body = await request.json();
    const vendors = cleanVendors(body?.vendors);

    const workData = {
      type: 'VENDOR_MASTER',
      vendors,
    } as Prisma.InputJsonValue;

    await prisma.menuWork.upsert({
      where: { id: recordId(tenantId) },
      create: {
        id: recordId(tenantId),
        tenantId,
        workData,
      },
      update: { workData },
    });

    return NextResponse.json({ ok: true, vendors });
  } catch (error) {
    console.error('Vendor master PUT error:', error);
    return NextResponse.json({ error: 'Could not save vendors' }, { status: 500 });
  }
}
