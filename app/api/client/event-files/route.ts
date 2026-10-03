import { NextResponse } from 'next/server';
import { requireClientTenantId } from '../../../../lib/billingAuth';
import { prisma } from '../../../../lib/prisma';
import { findEventWork } from '../../../../lib/eventFileServer';
import { validateEventPlan } from '../../../../lib/eventFiles';

export async function GET(request: Request) {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Client login required' }, { status: 401 });
    const costingId = new URL(request.url).searchParams.get('costingId');
    if (!costingId) {
      const files = await prisma.tenantEventFile.findMany({ where: { tenantId }, select: { costingId: true, status: true } });
      return NextResponse.json({ files });
    }
    const work = await findEventWork(tenantId, costingId);
    if (!work) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    const file = await prisma.tenantEventFile.findUnique({
      where: { tenantId_costingId: { tenantId, costingId } },
      select: { status: true, phone: true, email: true, notes: true, attachments: {
        select: { id: true, name: true, size: true, createdAt: true }, orderBy: { createdAt: 'desc' },
      } },
    });
    return NextResponse.json({ work, file: file ?? { status: 'Enquiry', phone: '', email: '', notes: '', attachments: [] } });
  } catch {
    return NextResponse.json({ error: 'Could not load event files. Please try again.' }, { status: 500 });
  }
}
export async function PUT(request: Request) {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Client login required' }, { status: 401 });
    const costingId = new URL(request.url).searchParams.get('costingId');
    if (!costingId || !await findEventWork(tenantId, costingId)) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    const text = await request.text();
    if (text.length > 20000) return NextResponse.json({ error: 'Planning details are too large.' }, { status: 413 });
    let plan;
    try { plan = validateEventPlan(JSON.parse(text)); }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid details' }, { status: 400 }); }
    await prisma.tenantEventFile.upsert({
      where: { tenantId_costingId: { tenantId, costingId } },
      create: { tenantId, costingId, ...plan }, update: plan,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not save event details. Please try again.' }, { status: 500 });
  }
}
