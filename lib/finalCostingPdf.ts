'use client';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculate } from './store';
import type { WorkState } from './types';

type PdfWithTable = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

function pdfMoney(value: number) {
  return `INR ${Math.round(value).toLocaleString('en-IN')}`;
}

function safeFilePart(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function tableEnd(doc: PdfWithTable, fallback: number) {
  return doc.lastAutoTable?.finalY ?? fallback;
}

function addSectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setTextColor(20, 31, 48);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title, 14, y);
}

export function downloadFinalCostingPdf(work: WorkState) {
  const result = calculate(work);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  }) as PdfWithTable;
  const pageWidth = doc.internal.pageSize.getWidth();
  const reportDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  doc.setProperties({
    title: `Final Costing - ${work.event.eventName || 'Catering Event'}`,
    subject: 'Menu and final costing report',
    author: work.profile.businessName || 'Menu Cost App',
    creator: 'Menu Cost App',
  });

  doc.setFillColor(16, 24, 39);
  doc.rect(0, 0, pageWidth, 38, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(work.profile.businessName || 'Menu Cost App', 14, 15);
  doc.setFontSize(11);
  doc.text('Menu and Final Costing Report', 14, 23);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(190, 200, 214);
  doc.text(`Prepared ${reportDate}`, 14, 30);

  autoTable(doc, {
    startY: 44,
    margin: { left: 14, right: 14 },
    theme: 'plain',
    body: [
      ['Client', work.event.clientName || '-'],
      ['Event', work.event.eventName || work.event.functionType || '-'],
      ['Date', work.event.eventDate || '-'],
      ['Venue', work.event.venue || work.event.city || '-'],
      ['Total meal covers', result.totalCovers.toLocaleString('en-IN')],
    ],
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold', textColor: [89, 99, 115] },
      1: { textColor: [20, 31, 48] },
    },
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.2 },
  });

  let cursorY = tableEnd(doc, 75) + 8;
  addSectionTitle(doc, 'Final Summary', cursorY);
  autoTable(doc, {
    startY: cursorY + 3,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    head: [['Cost / Cover', 'Selling / Cover', 'Total Cost', 'Total Selling', 'Profit', 'Margin']],
    body: [[
      pdfMoney(result.finalCostPerPlate),
      pdfMoney(result.sellingPricePerPlate),
      pdfMoney(result.totalCost),
      pdfMoney(result.totalSelling),
      pdfMoney(result.totalProfit),
      result.totalSelling > 0
        ? `${Math.round((result.totalProfit / result.totalSelling) * 100)}%`
        : '0%',
    ]],
    headStyles: { fillColor: [35, 105, 190], textColor: 255, fontStyle: 'bold' },
    bodyStyles: { textColor: [20, 31, 48], fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 2.4, halign: 'center' },
  });

  cursorY = tableEnd(doc, cursorY + 22) + 9;
  addSectionTitle(doc, 'Menu Costing', cursorY);
  autoTable(doc, {
    startY: cursorY + 3,
    margin: { left: 10, right: 10, bottom: 16 },
    theme: 'grid',
    head: [[
      'Day / Meal',
      'Dish',
      'Category',
      'Serving',
      'Covers',
      'Base / Plate',
      'Adjusted',
      'Total',
    ]],
    body: result.menuBreakdown.length
      ? result.menuBreakdown.map((item) => [
          [item.dayLabel, item.mealLabel].filter(Boolean).join(' - ') || 'Event Menu',
          item.name,
          item.category,
          Number(item.portionQuantity) > 0
            ? `${item.portionQuantity} ${item.portionUnit || 'serving'}`
            : 'Not set',
          item.effectivePax.toLocaleString('en-IN'),
          pdfMoney(item.baseCostPerPlate),
          pdfMoney(item.adjustedCostPerPlate),
          pdfMoney(item.itemTotalCost),
        ])
      : [['-', 'No menu dishes added', '-', '-', '-', '-', '-', '-']],
    headStyles: { fillColor: [16, 24, 39], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [246, 249, 252] },
    styles: {
      font: 'helvetica',
      fontSize: 6.8,
      cellPadding: 1.8,
      textColor: [31, 41, 55],
      overflow: 'linebreak',
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 34 },
      2: { cellWidth: 23 },
      3: { cellWidth: 20 },
      4: { cellWidth: 14, halign: 'right' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 22, halign: 'right' },
    },
  });

  cursorY = tableEnd(doc, cursorY + 24) + 9;
  if (cursorY > 250) {
    doc.addPage();
    cursorY = 18;
  }
  addSectionTitle(doc, 'Additional Costs', cursorY);
  autoTable(doc, {
    startY: cursorY + 3,
    margin: { left: 14, right: 14, bottom: 16 },
    theme: 'grid',
    head: [['Cost item', 'Amount']],
    body: [
      ['Manpower', pdfMoney(work.extras.staff)],
      ['Transport', pdfMoney(work.extras.transport)],
      ['Gas / Fuel', pdfMoney(work.extras.gasFuel)],
      ['Disposable items', pdfMoney(work.extras.disposable)],
      ['Other extra cost', pdfMoney(work.extras.other)],
      ['Total additional costs', pdfMoney(result.extrasTotal)],
    ],
    headStyles: { fillColor: [35, 105, 190], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [246, 249, 252] },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { halign: 'right', fontStyle: 'bold' },
    },
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.2 },
  });

  cursorY = tableEnd(doc, cursorY + 30) + 9;
  if (cursorY > 245) {
    doc.addPage();
    cursorY = 18;
  }
  addSectionTitle(doc, 'Disposable Item Detail', cursorY);
  const usedDisposableItems = work.disposableItems.filter(
    (item) => item.quantity > 0 || item.unitCost > 0,
  );
  autoTable(doc, {
    startY: cursorY + 3,
    margin: { left: 14, right: 14, bottom: 16 },
    theme: 'grid',
    head: [['Item', 'Quantity', 'Unit Cost', 'Total']],
    body: usedDisposableItems.length
      ? usedDisposableItems.map((item) => [
          item.name,
          item.quantity.toLocaleString('en-IN'),
          pdfMoney(item.unitCost),
          pdfMoney(item.quantity * item.unitCost),
        ])
      : [['No disposable item costs entered', '-', '-', pdfMoney(0)]],
    headStyles: { fillColor: [16, 24, 39], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [246, 249, 252] },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' },
    },
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.2 },
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(224, 229, 236);
    doc.line(14, 285, pageWidth - 14, 285);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(112, 122, 138);
    doc.text('Generated by Menu Cost App', 14, 290);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - 14, 290, { align: 'right' });
  }

  const filePart =
    safeFilePart(work.event.eventName || work.event.clientName || '') ||
    'catering-event';
  doc.save(`final-costing-${filePart}.pdf`);
}
