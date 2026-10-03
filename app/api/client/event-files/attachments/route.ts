import { NextResponse } from 'next/server';
import { requireClientTenantId } from '../../../../../lib/billingAuth';
import { prisma } from '../../../../../lib/prisma';
import { findEventWork } from '../../../../../lib/eventFileServer';
import { MAX_ATTACHMENT_BYTES, validateAttachment } from '../../../../../lib/eventFiles';

export async function POST(request: Request) {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Client login required' }, { status: 401 });
    const url = new URL(request.url);
    const costingId = url.searchParams.get('costingId');
    if (!costingId || !await findEventWork(tenantId, costingId)) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    // Read a bounded stream, including requests without a Content-Length header.
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ error: 'File required' }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_ATTACHMENT_BYTES) {
        await reader.cancel();
        return NextResponse.json({ error: 'File must be 5 MB or smaller.' }, { status: 413 });
      }
      chunks.push(value);
    }
    let name: string;
    try { name = validateAttachment(url.searchParams.get('name') || '', size); }
    catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
    const file = await prisma.tenantEventFile.upsert({ where: { tenantId_costingId: { tenantId, costingId } }, create: { tenantId, costingId }, update: {} });
    const attachment = await prisma.eventAttachment.create({
      data: { eventFileId: file.id, name, size, data: Buffer.concat(chunks) },
      select: { id: true, name: true, size: true, createdAt: true },
    });
    return NextResponse.json({ attachment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Could not upload file. Please try again.' }, { status: 500 });
  }
}
export async function GET(request: Request) {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Client login required' }, { status: 401 });
    const id = new URL(request.url).searchParams.get('id') || '';
    const attachment = await prisma.eventAttachment.findFirst({ where: { id, eventFile: { tenantId } } });
    if (!attachment) return NextResponse.json({ error: 'File not found' }, { status: 404 });
    return new Response(new Uint8Array(attachment.data), { headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(attachment.name).replace(/'/g, '%27')}`,
      'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store',
    } });
  } catch {
    return NextResponse.json({ error: 'Could not download file.' }, { status: 500 });
  }
}
export async function DELETE(request: Request) {
  try {
    const tenantId = await requireClientTenantId();
    if (!tenantId) return NextResponse.json({ error: 'Client login required' }, { status: 401 });
    const id = new URL(request.url).searchParams.get('id') || '';
    const result = await prisma.eventAttachment.deleteMany({ where: { id, eventFile: { tenantId } } });
    if (!result.count) return NextResponse.json({ error: 'File not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not remove file.' }, { status: 500 });
  }
}
