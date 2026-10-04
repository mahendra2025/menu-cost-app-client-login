'use client';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculate } from './workCosting';
import { normalizeOperationsState, type WorkWithOperations } from './operationsCost';
import type { WorkState, MenuItem } from './types';

export type EventFileAssignment = {
  kind: string; requirement: string; detail: string; quantity: number; unit: string;
  assignedTo: string; partnerType: string; rate: number; status: string;
  deliveryTime: string; pickupTime?: string; paymentTerms?: string; contactDetails?: string;
};
export type EventFileFunction = { key: string; dayLabel: string; mealLabel: string; pax: number; menu: MenuItem[]; rows: EventFileAssignment[] };
export type EventFileMetadata = { status: string; phone: string; email: string; notes: string; attachments: { name: string; size: number }[] };
const amount = (n: number) => `INR ${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const label = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');

export function createEventFilePdf(work: WorkState, functions: EventFileFunction[], file: EventFileMetadata) {
  const doc = new jsPDF();
  const totals = calculate(work);
  let y = 18;
  function table(title: string, head: string[], body: (string | number)[][]) {
    if (y > 245 || (body.length <= 18 && y + Math.max(1, body.length) * 10 + 20 > 279)) { doc.addPage(); y = 18; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(24, 49, 77);
    doc.text(title, 14, y); y += 5;
    autoTable(doc, { startY: y, head: [head], body: body.length ? body : [['Not recorded', ...head.slice(1).map(() => '')]],
      margin: { left: 14, right: 14, top: 18, bottom: 18 },
      styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak', textColor: [30, 40, 50] },
      headStyles: { fillColor: [24, 49, 77], textColor: [255, 255, 255] }, alternateRowStyles: { fillColor: [244, 247, 250] }, rowPageBreak: 'avoid',
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }
  doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.text('Complete Event File', 14, y); y += 10;
  table('Event & client', ['Detail', 'Value'], [
    ['Business', work.profile.businessName || '-'], ['Business contact', [work.profile.ownerName, work.profile.phone, work.profile.email].filter(Boolean).join(' / ') || '-'],
    ['Event', work.event.eventName || '-'], ['Client', work.event.clientName || '-'], ['Date', work.event.eventDate || '-'],
    ['Venue', work.event.venue || '-'], ['City', work.event.city || '-'], ['Guests', work.event.pax], ['Function type', work.event.functionType || '-'],
    ['Planning status', file.status], ['Client phone', file.phone || '-'], ['Client email', file.email || '-'],
    ['Event reference', work.costingId], ['Generated', new Date().toLocaleString('en-IN')],
  ]);
  table('Costing summary', ['Item', 'Amount'], [
    ['Total service covers', totals.totalCovers], ['Food cost', amount(totals.menuFoodTotal)], ['Other costs', amount(totals.extrasTotal)],
    ['Total event cost', amount(totals.totalCost)], ['Cost per cover', amount(totals.finalCostPerPlate)],
    ['Selling price per cover', amount(totals.sellingPricePerPlate)], ['Total selling value', amount(totals.totalSelling)], ['Estimated profit', amount(totals.totalProfit)],
  ]);
  for (const fn of functions) {
    doc.addPage(); y = 18;
    const title = [fn.dayLabel, fn.mealLabel].filter(Boolean).join(' / ') || 'Event function';
    table(title, ['Function detail', 'Value'], [['Guests', fn.pax], ['Menu dishes', fn.menu.length]]);
    table('Menu', ['Dish', 'Category', 'Rate per cover'], fn.menu.map(d => [d.name, d.category, amount(d.costPerPlate)]));
    for (const kind of ['MENU', 'MANPOWER', 'DRESS', 'GROCERY', 'DISPOSABLE', 'EQUIPMENT', 'CROCKERY', 'TRANSPORT']) {
      const rows = fn.rows.filter(r => r.kind === kind);
      if (!rows.length) continue;
      table(label(kind), ['Requirement / details', 'Partner / status', 'Quantity / rate / total', 'Schedule / terms'], rows.map(r => [
        [r.requirement, r.detail].filter(Boolean).join('\n'),
        [r.assignedTo || 'Unassigned', r.contactDetails, label(r.partnerType), label(r.status)].join('\n'),
        `${r.quantity} ${r.unit}\n${amount(r.rate)}\n${amount(r.quantity * r.rate)}`,
        [`Delivery: ${r.deliveryTime || 'Not set'}`, `Pickup: ${r.pickupTime || 'Not set'}`, r.paymentTerms].filter(Boolean).join('\n'),
      ]));
    }
    const missing = ['MENU', 'MANPOWER', 'DRESS', 'GROCERY', 'DISPOSABLE', 'EQUIPMENT', 'CROCKERY', 'TRANSPORT'].filter(kind => !fn.rows.some(row => row.kind === kind));
    if (missing.length) table('Categories without assignments', ['Not recorded'], [[missing.map(label).join(', ')]]);
    table('Assignment estimate', ['Item', 'Amount'], [['Function assignments', amount(fn.rows.reduce((sum, r) => sum + r.quantity * r.rate, 0))], ['Costing note', 'Planning assignments are separate estimates and are not added again to the event costing summary.']]);
  }
  table('Staffing cost inputs', ['Role / department', 'Quantity', 'Rate / billing basis'], work.manpower.map(r => [r.role + (r.department ? ` / ${r.department}` : ''), r.quantity, `${amount(r.rate)} / ${r.rateMode || 'PER_MEAL'}`]));
  table('Disposable cost inputs', ['Item', 'Quantity / unit', 'Unit cost'], work.disposableItems.map(r => [r.name, `${r.quantity} ${r.unit || 'pcs'}`, amount(r.unitCost)]));
  if ((work as WorkWithOperations).operations) {
    const operations = normalizeOperationsState(work as WorkWithOperations);
    table('Transport mode', ['Mode'], [[label(operations.transportMode)]]);
    const inputs = (value: Record<string, unknown>) => Object.entries(value).map(([key, value]) => `${label(key)}: ${value}`).join('\n');
    if (operations.transportMode === 'EVENT_SHARED') table('Shared transport inputs', ['Details'], [[inputs(operations.sharedTransport)]]);
    for (const row of operations.functions) table(`Operations: ${row.dayLabel} / ${row.mealLabel}`, ['Gas inputs', 'Transport inputs'], [[inputs(row.gas), operations.transportMode === 'FUNCTION_WISE' ? inputs(row.transport) : 'Shared event transport']]);
  }
  table('Extra cost inputs', ['Item', 'Value'], Object.entries(work.extras).map(([key, value]) => [label(key), amount(Number(value))]));
  table('Planning notes', ['Notes'], [[file.notes || 'No planning notes recorded.']]);
  table('Attachment register', ['File name', 'Size'], file.attachments.map(a => [a.name, `${Math.ceil(a.size / 1024)} KB`]));
  table('Document contents', ['Note'], [['This PDF contains the current event and all function assignments. Attached documents are listed above; their contents are downloaded separately from Event Manager.']]);
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100);
    doc.text('Event file - internal planning and costing', 14, 288);
    doc.text(`${page} / ${pages}`, 196, 288, { align: 'right' });
  }
  return doc;
}

const MANAGER_HIDDEN_INPUT = /(rate|cost|price|amount|charge|total|profit|margin|selling|billing)/i;

export function createManagerEventFilePdf(work: WorkState, functions: EventFileFunction[], file: EventFileMetadata) {
  const doc = new jsPDF();
  let y = 18;

  function table(title: string, head: string[], body: (string | number)[][]) {
    if (y > 245 || (body.length <= 18 && y + Math.max(1, body.length) * 10 + 20 > 279)) {
      doc.addPage();
      y = 18;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(24, 49, 77);
    doc.text(title, 14, y);
    y += 5;
    autoTable(doc, {
      startY: y,
      head: [head],
      body: body.length ? body : [['Not recorded', ...head.slice(1).map(() => '')]],
      margin: { left: 14, right: 14, top: 18, bottom: 18 },
      styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak', textColor: [30, 40, 50] },
      headStyles: { fillColor: [24, 49, 77], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [244, 247, 250] },
      rowPageBreak: 'avoid',
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  const safeInputs = (value: Record<string, unknown>) =>
    Object.entries(value)
      .filter(([key]) => !MANAGER_HIDDEN_INPUT.test(key))
      .map(([key, input]) => `${label(key)}: ${input}`)
      .join('\n') || 'Not recorded';

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Manager Event File', 14, y);
  y += 10;

  table('Event & client', ['Detail', 'Value'], [
    ['Business', work.profile.businessName || '-'],
    ['Business contact', [work.profile.ownerName, work.profile.phone, work.profile.email].filter(Boolean).join(' / ') || '-'],
    ['Event', work.event.eventName || '-'],
    ['Client', work.event.clientName || '-'],
    ['Date', work.event.eventDate || '-'],
    ['Venue', work.event.venue || '-'],
    ['City', work.event.city || '-'],
    ['Guests', work.event.pax],
    ['Function type', work.event.functionType || '-'],
    ['Planning status', file.status],
    ['Client phone', file.phone || '-'],
    ['Client email', file.email || '-'],
    ['Generated', new Date().toLocaleString('en-IN')],
  ]);

  for (const fn of functions) {
    doc.addPage();
    y = 18;
    const title = [fn.dayLabel, fn.mealLabel].filter(Boolean).join(' / ') || 'Event function';
    table(title, ['Function detail', 'Value'], [
      ['Guests', fn.pax],
      ['Menu dishes', fn.menu.length],
    ]);
    table('Menu', ['Dish', 'Category'], fn.menu.map(d => [d.name, d.category]));

    for (const kind of ['MENU', 'MANPOWER', 'DRESS', 'GROCERY', 'DISPOSABLE', 'EQUIPMENT', 'CROCKERY', 'TRANSPORT']) {
      const rows = fn.rows.filter(r => r.kind === kind);
      if (!rows.length) continue;
      table(label(kind), ['Requirement / details', 'Partner / status', 'Quantity', 'Schedule / terms'], rows.map(r => [
        [r.requirement, r.detail].filter(Boolean).join('\n'),
        [r.assignedTo || 'Unassigned', r.contactDetails, label(r.partnerType), label(r.status)].filter(Boolean).join('\n'),
        `${r.quantity} ${r.unit}`,
        [`Delivery: ${r.deliveryTime || 'Not set'}`, `Pickup: ${r.pickupTime || 'Not set'}`, r.paymentTerms].filter(Boolean).join('\n'),
      ]));
    }

    const missing = ['MENU', 'MANPOWER', 'DRESS', 'GROCERY', 'DISPOSABLE', 'EQUIPMENT', 'CROCKERY', 'TRANSPORT']
      .filter(kind => !fn.rows.some(row => row.kind === kind));
    if (missing.length) table('Categories without assignments', ['Not recorded'], [[missing.map(label).join(', ')]]);
  }

  table('Staffing plan', ['Role / department', 'Quantity'], work.manpower.map(r => [
    r.role + (r.department ? ` / ${r.department}` : ''),
    r.quantity,
  ]));

  table('Disposable plan', ['Item', 'Quantity / unit'], work.disposableItems.map(r => [
    r.name,
    `${r.quantity} ${r.unit || 'pcs'}`,
  ]));

  if ((work as WorkWithOperations).operations) {
    const operations = normalizeOperationsState(work as WorkWithOperations);
    table('Transport mode', ['Mode'], [[label(operations.transportMode)]]);
    if (operations.transportMode === 'EVENT_SHARED') {
      table('Shared transport plan', ['Details'], [[safeInputs(operations.sharedTransport as unknown as Record<string, unknown>)]]);
    }
    for (const row of operations.functions) {
      table(`Operations: ${row.dayLabel} / ${row.mealLabel}`, ['Gas plan', 'Transport plan'], [[
        safeInputs(row.gas as unknown as Record<string, unknown>),
        operations.transportMode === 'FUNCTION_WISE'
          ? safeInputs(row.transport as unknown as Record<string, unknown>)
          : 'Shared event transport',
      ]]);
    }
  }

  table('Planning notes', ['Notes'], [[file.notes || 'No planning notes recorded.']]);
  table('Attachment register', ['File name', 'Size'], file.attachments.map(a => [
    a.name,
    `${Math.ceil(a.size / 1024)} KB`,
  ]));
  table('Document contents', ['Note'], [[
    'Manager copy for event execution. Financial rates, costs, selling values, profit and payment amounts are intentionally excluded.',
  ]]);

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Manager event file - operations only - no rates or costs', 14, 288);
    doc.text(`${page} / ${pages}`, 196, 288, { align: 'right' });
  }
  return doc;
}

export function managerEventFilePdfName(work: WorkState) {
  return `${(work.event.eventName || 'event').replace(/[^a-z0-9]+/gi, '-').slice(0, 70)}-manager-event-file.pdf`;
}

export function eventFilePdfName(work: WorkState) {
  return `${(work.event.eventName || 'event').replace(/[^a-z0-9]+/gi, '-').slice(0, 70)}-complete-event-file.pdf`;
}
