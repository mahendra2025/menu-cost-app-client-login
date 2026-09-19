'use client';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import type { WorkState } from './types';
import {
  calculateDisposableCost,
} from './disposableCost';
import type {
  FunctionGroceryPlan,
} from './functionGrocery';
import {
  normalizeOperationsState,
  type WorkWithOperations,
} from './operationsCost';

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
      `${businessName} · Complete Event Quotation`,
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
  groceryPlan?: FunctionGroceryPlan | null,
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
    'EVENT QUOTATION',
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

  const ensureSpace = (
    minimum = 34,
  ) => {
    if (y > 277 - minimum) {
      doc.addPage();
      y = 20;
    }
  };

  const sectionHeading = (
    title: string,
  ) => {
    ensureSpace(18);
    doc.setFont(
      'helvetica',
      'bold',
    );
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(
      title,
      14,
      y,
    );
    y += 5;
  };

  sectionHeading(
    'Function & Guest Summary',
  );

  autoTable(doc, {
    startY: y,
    head: [[
      'Function / Meal',
      'Guests',
      'Dishes',
    ]],
    body:
      groups.length
        ? groups.map((group) => [
            group.label,
            group.pax
              ? group.pax.toLocaleString('en-IN')
              : '-',
            String(group.dishes.length),
          ])
        : [[
            'Event Menu',
            quotation.totalCovers
              ? quotation.totalCovers.toLocaleString('en-IN')
              : '-',
            String(work.menu.length),
          ]],
    margin: {
      left: 14,
      right: 14,
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
    },
  });

  y =
    (tableDoc.lastAutoTable
      ?.finalY || y) + 10;

  sectionHeading(
    'Grocery Requirements',
  );

  if (
    groceryPlan &&
    groceryPlan.combinedItems.length
  ) {
    autoTable(doc, {
      startY: y,
      head: [[
        'Ingredient',
        'Required Qty',
        'Used In',
      ]],
      body:
        groceryPlan.combinedItems.map(
          (item) => [
            item.name,
            `${item.quantity
              .toFixed(3)
              .replace(/\.?0+$/, '')} ${item.unit}`,
            item.dishes.join(', '),
          ],
        ),
      margin: {
        left: 14,
        right: 14,
      },
      styles: {
        font: 'helvetica',
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [51, 65, 85],
        lineColor: [226, 232, 240],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 48 },
        1: {
          cellWidth: 30,
          halign: 'right',
        },
      },
    });

    y =
      (tableDoc.lastAutoTable
        ?.finalY || y) + 5;

    if (
      groceryPlan.unmatchedDishes.length
    ) {
      ensureSpace(16);
      doc.setFont(
        'helvetica',
        'normal',
      );
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);

      const pendingLines =
        doc.splitTextToSize(
          `Recipe pending for: ${groceryPlan.unmatchedDishes.join(', ')}`,
          178,
        );

      doc.text(
        pendingLines,
        14,
        y,
      );

      y +=
        pendingLines.length * 4 + 4;
    }
  } else {
    doc.setFont(
      'helvetica',
      'normal',
    );
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Grocery quantities are unavailable until saved recipes are available for the menu dishes.',
      14,
      y,
    );
    y += 8;
  }

  const activeManpower =
    (
      Array.isArray(
        work.manpower,
      )
        ? work.manpower
        : []
    ).filter(
      (row) =>
        Number(
          row.quantity,
        ) > 0,
    );

  sectionHeading(
    'Manpower Plan',
  );

  if (activeManpower.length) {
    autoTable(doc, {
      startY: y,
      head: [[
        'Function / Meal',
        'Role',
        'Qty',
      ]],
      body:
        activeManpower.map(
          (row) => [
            [
              row.dayLabel,
              row.mealLabel,
            ]
              .filter(Boolean)
              .join(' · ') ||
              'Event',
            row.role,
            String(
              Math.max(
                0,
                Number(
                  row.quantity,
                ) || 0,
              ),
            ),
          ],
        ),
      margin: {
        left: 14,
        right: 14,
      },
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2.1,
        textColor: [51, 65, 85],
        lineColor: [226, 232, 240],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 72 },
        2: {
          cellWidth: 22,
          halign: 'right',
        },
      },
    });

    y =
      (tableDoc.lastAutoTable
        ?.finalY || y) + 10;
  } else {
    doc.setFont(
      'helvetica',
      'normal',
    );
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'No manpower quantities have been entered.',
      14,
      y,
    );
    y += 8;
  }

  const disposable =
    calculateDisposableCost(
      work.disposableItems,
    );

  const activeDisposable =
    disposable.items.filter(
      (item) =>
        Number(
          item.quantity,
        ) > 0,
    );

  sectionHeading(
    'Plastic & Disposable Plan',
  );

  if (activeDisposable.length) {
    autoTable(doc, {
      startY: y,
      head: [[
        'Item',
        'Quantity',
      ]],
      body:
        activeDisposable.map(
          (item) => [
            item.name,
            String(
              Math.max(
                0,
                Number(
                  item.quantity,
                ) || 0,
              ),
            ),
          ],
        ),
      margin: {
        left: 14,
        right: 14,
      },
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2.1,
        textColor: [51, 65, 85],
        lineColor: [226, 232, 240],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        1: {
          cellWidth: 34,
          halign: 'right',
        },
      },
    });

    y =
      (tableDoc.lastAutoTable
        ?.finalY || y) + 10;
  } else {
    doc.setFont(
      'helvetica',
      'normal',
    );
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'No plastic or disposable quantities have been entered.',
      14,
      y,
    );
    y += 8;
  }

  const operations =
    normalizeOperationsState(
      work,
      (
        work as WorkWithOperations
      ).operations,
    );

  sectionHeading(
    'Gas & Transport Plan',
  );

  const operationRows:
    Array<[string, string, string]> = [];

  operations.functions.forEach(
    (row) => {
      const label =
        [
          row.dayLabel,
          row.mealLabel,
        ]
          .filter(Boolean)
          .join(' · ') ||
        'Event';

      const gas =
        row.gas.mode ===
          'CYLINDER'
          ? `${row.gas.cylindersUsed || 0} cylinder(s)`
          : row.gas.mode ===
              'KG'
            ? `${row.gas.usedKg || 0} kg LPG`
            : 'Manual gas plan';

      const transport =
        operations.transportMode ===
          'FUNCTION_WISE'
          ? `${row.transport.vehicleLabel || 'Vehicle'} · ${row.transport.vehicles || 0} vehicle(s) · ${row.transport.tripsPerVehicle || 0} trip(s)/vehicle`
          : 'Shared event transport';

      operationRows.push([
        label,
        gas,
        transport,
      ]);
    },
  );

  if (
    operations.transportMode ===
    'EVENT_SHARED'
  ) {
    const shared =
      operations.sharedTransport;

    operationRows.unshift([
      'Whole Event',
      '-',
      `${shared.vehicleLabel || 'Vehicle'} · ${shared.vehicles || 0} vehicle(s) · ${shared.tripsPerVehicle || 0} trip(s)/vehicle`,
    ]);
  }

  autoTable(doc, {
    startY: y,
    head: [[
      'Function / Meal',
      'Gas',
      'Transport',
    ]],
    body:
      operationRows.length
        ? operationRows
        : [[
            'Event',
            '-',
            '-',
          ]],
    margin: {
      left: 14,
      right: 14,
    },
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 58 },
      1: { cellWidth: 42 },
    },
  });

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
