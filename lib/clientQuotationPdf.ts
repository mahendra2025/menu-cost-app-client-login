'use client';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import type { WorkState } from './types';

export type ClientQuotationData = {
  quotationNumber: string;
  status: string;
  clientName: string;
  clientPhone: string;
  eventName: string;
  eventDate: string;
  venue: string;
  city: string;
  totalCovers: number;
  pricePerCover: number;
  includeTotal: boolean;
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  extraLabel: string;
  extraAmount: number;
  grandTotal: number;
  validityDays: number;
  advancePercent: number;
  paymentTerms: string;
  terms: string[];
  notes: string;
};

type PublicMenuItem = {
  name: string;
  category: string;
  dayLabel?: string;
  mealLabel?: string;
  serviceId?: string;
  servicePax?: number;
};

function money(value: number) {
  return `INR ${Math.round(value).toLocaleString('en-IN')}`;
}

function safeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 45);
}

function addPageFooter(
  doc: jsPDF,
  businessName: string,
) {
  const pageCount =
    doc.getNumberOfPages();

  for (
    let page = 1;
    page <= pageCount;
    page += 1
  ) {
    doc.setPage(page);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 282, 196, 282);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${businessName} · Client Quotation`,
      14,
      287,
    );
    doc.text(
      `Page ${page} of ${pageCount}`,
      196,
      287,
      { align: 'right' },
    );
  }
}

function groupMenu(menu: PublicMenuItem[]) {
  const groups = new Map<
    string,
    {
      label: string;
      pax: number;
      dishes: PublicMenuItem[];
    }
  >();

  menu.forEach((item) => {
    const label = [
      item.dayLabel,
      item.mealLabel,
    ]
      .filter(Boolean)
      .join(' · ') || 'Menu';

    const key =
      item.serviceId ||
      label.toLowerCase();

    const existing =
      groups.get(key);

    if (existing) {
      existing.dishes.push(item);
      existing.pax = Math.max(
        existing.pax,
        Number(item.servicePax) || 0,
      );
      return;
    }

    groups.set(key, {
      label,
      pax:
        Number(item.servicePax) || 0,
      dishes: [item],
    });
  });

  return Array.from(groups.values());
}

export function downloadClientQuotationPdf(
  work: WorkState,
  quotation: ClientQuotationData,
) {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
  });

  const businessName =
    work.profile.businessName ||
    'Menu Costing Client';

  const ownerName =
    work.profile.ownerName || '';

  const businessContact = [
    work.profile.phone,
    work.profile.city,
  ]
    .filter(Boolean)
    .join(' · ');

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 42, 'F');

  doc.setFont(
    'helvetica',
    'bold',
  );
  doc.setFontSize(21);
  doc.setTextColor(255, 255, 255);
  doc.text(
    businessName,
    14,
    17,
  );

  doc.setFont(
    'helvetica',
    'normal',
  );
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);

  if (businessContact) {
    doc.text(
      businessContact,
      14,
      24,
    );
  }

  doc.setFont(
    'helvetica',
    'bold',
  );
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(
    'QUOTATION',
    196,
    16,
    { align: 'right' },
  );

  doc.setFont(
    'helvetica',
    'normal',
  );
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(
    quotation.quotationNumber ||
      'Draft',
    196,
    24,
    { align: 'right' },
  );

  let y = 52;

  doc.setFont(
    'helvetica',
    'bold',
  );
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(
    'Prepared for',
    14,
    y,
  );

  doc.setFontSize(13);
  doc.text(
    quotation.clientName ||
      work.event.clientName ||
      'Client',
    14,
    y + 7,
  );

  doc.setFont(
    'helvetica',
    'normal',
  );
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);

  if (quotation.clientPhone) {
    doc.text(
      quotation.clientPhone,
      14,
      y + 13,
    );
  }

  doc.setFont(
    'helvetica',
    'bold',
  );
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(
    'Event',
    112,
    y,
  );

  doc.setFont(
    'helvetica',
    'normal',
  );
  doc.setFontSize(9);

  const eventLines = [
    quotation.eventName ||
      work.event.eventName ||
      work.event.functionType,
    quotation.eventDate,
    [
      quotation.venue,
      quotation.city,
    ]
      .filter(Boolean)
      .join(', '),
    quotation.totalCovers > 0
      ? `${quotation.totalCovers.toLocaleString('en-IN')} covers`
      : '',
  ].filter(Boolean);

  doc.text(
    eventLines,
    112,
    y + 7,
  );

  y += 33;

  doc.setFont(
    'helvetica',
    'bold',
  );
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(
    'Menu & Service',
    14,
    y,
  );

  y += 5;

  const groups =
    groupMenu(
      work.menu.map((item) => ({
        name: item.name,
        category: item.category,
        dayLabel: item.dayLabel,
        mealLabel: item.mealLabel,
        serviceId: item.serviceId,
        servicePax: item.servicePax,
      })),
    );

  const menuRows: Array<
    [string, string, string]
  > = [];

  groups.forEach((group) => {
    group.dishes.forEach(
      (dish, index) => {
        menuRows.push([
          index === 0
            ? group.label
            : '',
          dish.name,
          dish.category || '',
        ]);
      },
    );
  });

  autoTable(doc, {
    startY: y,
    head: [
      [
        'Function',
        'Dish',
        'Category',
      ],
    ],
    body:
      menuRows.length
        ? menuRows
        : [
            [
              'Menu',
              'Menu to be finalized',
              '',
            ],
          ],
    margin: {
      left: 14,
      right: 14,
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [
        51,
        65,
        85,
      ],
      lineColor: [
        226,
        232,
        240,
      ],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [
        30,
        41,
        59,
      ],
      textColor: [
        255,
        255,
        255,
      ],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: {
        cellWidth: 42,
        fontStyle: 'bold',
      },
      1: {
        cellWidth: 86,
      },
      2: {
        cellWidth: 40,
      },
    },
  });

  const tableDoc =
    doc as jsPDF & {
      lastAutoTable?: {
        finalY: number;
      };
    };

  y =
    (tableDoc.lastAutoTable
      ?.finalY || y) + 10;

  if (y > 220) {
    doc.addPage();
    y = 20;
  }

  doc.setFont(
    'helvetica',
    'bold',
  );
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(
    'Commercial Offer',
    14,
    y,
  );

  y += 5;

  const priceRows: Array<
    [string, string]
  > = [
    [
      'Rate per cover',
      money(
        quotation.pricePerCover,
      ),
    ],
  ];

  if (
    quotation.includeTotal
  ) {
    priceRows.push([
      'Subtotal',
      money(
        quotation.subtotal,
      ),
    ]);

    if (
      quotation.extraAmount > 0
    ) {
      priceRows.push([
        quotation.extraLabel ||
          'Additional charges',
        money(
          quotation.extraAmount,
        ),
      ]);
    }

    if (
      quotation.gstPercent > 0
    ) {
      priceRows.push([
        `GST ${quotation.gstPercent}%`,
        money(
          quotation.gstAmount,
        ),
      ]);
    }

    priceRows.push([
      'Grand Total',
      money(
        quotation.grandTotal,
      ),
    ]);
  }

  autoTable(doc, {
    startY: y,
    body: priceRows,
    margin: {
      left: 14,
      right: 112,
    },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 2.6,
      textColor: [
        51,
        65,
        85,
      ],
      lineColor: [
        226,
        232,
        240,
      ],
      lineWidth: 0.15,
    },
    columnStyles: {
      0: {
        fontStyle: 'bold',
      },
      1: {
        halign: 'right',
      },
    },
  });

  y =
    (tableDoc.lastAutoTable
      ?.finalY || y) + 10;

  if (y > 232) {
    doc.addPage();
    y = 20;
  }

  doc.setFont(
    'helvetica',
    'bold',
  );
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(
    'Terms',
    14,
    y,
  );

  y += 6;

  doc.setFont(
    'helvetica',
    'normal',
  );
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  const terms = [
    `Quotation validity: ${quotation.validityDays} days from issue date.`,
    quotation.advancePercent > 0
      ? `${quotation.advancePercent}% advance required to confirm the booking.`
      : '',
    quotation.paymentTerms,
    ...quotation.terms,
  ].filter(Boolean);

  terms.forEach(
    (term, index) => {
      const lines =
        doc.splitTextToSize(
          `${index + 1}. ${term}`,
          178,
        );

      if (
        y +
          lines.length * 4 >
        267
      ) {
        doc.addPage();
        y = 20;
      }

      doc.text(
        lines,
        14,
        y,
      );

      y +=
        lines.length * 4 + 2;
    },
  );

  if (
    quotation.notes.trim()
  ) {
    y += 2;

    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFont(
      'helvetica',
      'bold',
    );
    doc.setTextColor(30, 41, 59);
    doc.text(
      'Notes',
      14,
      y,
    );

    y += 5;

    doc.setFont(
      'helvetica',
      'normal',
    );
    doc.setTextColor(71, 85, 105);

    const lines =
      doc.splitTextToSize(
        quotation.notes,
        178,
      );

    doc.text(
      lines,
      14,
      y,
    );

    y +=
      lines.length * 4;
  }

  y += 12;

  if (y > 254) {
    doc.addPage();
    y = 30;
  }

  doc.setDrawColor(
    148,
    163,
    184,
  );
  doc.line(
    140,
    y,
    194,
    y,
  );

  doc.setFont(
    'helvetica',
    'normal',
  );
  doc.setFontSize(8);
  doc.setTextColor(
    100,
    116,
    139,
  );

  doc.text(
    ownerName ||
      'Authorized Signatory',
    167,
    y + 5,
    {
      align: 'center',
    },
  );

  addPageFooter(
    doc,
    businessName,
  );

  const filename = [
    'quotation',
    safeName(
      quotation.clientName ||
        work.event.clientName ||
        'client',
    ),
    safeName(
      quotation.eventName ||
        work.event.eventName ||
        'event',
    ),
  ]
    .filter(Boolean)
    .join('-');

  doc.save(
    `${filename || 'quotation'}.pdf`,
  );
}
