'use client';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import type { WorkState } from './types';

export type WorkOrderPdfLine = {
  functionLabel: string;
  requirement: string;
  detail: string;
  quantity: number;
  unit: string;
  rate: number;
  deliveryTime: string;
  pickupTime?: string;
  status: string;
};

export type WorkOrderPdfMeta = {
  workOrderNumber: string;
  confirmationStatus: string;
  paymentStatus: string;
  advancePaid: number;
  notes: string;
};

export type WorkOrderPdfVendor = {
  name: string;
  contactPerson?: string;
  phone?: string;
  city?: string;
  gst?: string;
  paymentTerms?: string;
};

function money(value: number) {
  return `INR ${Math.round(
    Math.max(
      0,
      Number(value) || 0,
    ),
  ).toLocaleString('en-IN')}`;
}

function dateTime(
  value: string,
) {
  if (!value) return '-';

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    'en-IN',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  );
}

function safeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      '-',
    )
    .replace(
      /^-+|-+$/g,
      '',
    )
    .slice(
      0,
      50,
    );
}

export function downloadWorkOrderPdf({
  work,
  vendor,
  lines,
  total,
  meta,
}: {
  work: WorkState;
  vendor: WorkOrderPdfVendor;
  lines: WorkOrderPdfLine[];
  total: number;
  meta: WorkOrderPdfMeta;
}) {
  const doc =
    new jsPDF({
      unit: 'mm',
      format: 'a4',
    });

  const businessName =
    work.profile.businessName ||
    'Catering Business';

  const eventName =
    work.event.eventName ||
    work.event.clientName ||
    'Event';

  const balance =
    Math.max(
      0,
      total -
        Math.max(
          0,
          meta.advancePaid,
        ),
    );

  doc.setFillColor(
    15,
    23,
    42,
  );
  doc.rect(
    0,
    0,
    210,
    40,
    'F',
  );

  doc.setFont(
    'helvetica',
    'bold',
  );
  doc.setFontSize(18);
  doc.setTextColor(
    255,
    255,
    255,
  );
  doc.text(
    businessName,
    14,
    17,
  );

  doc.setFontSize(8);
  doc.setFont(
    'helvetica',
    'normal',
  );
  doc.setTextColor(
    174,
    188,
    206,
  );
  doc.text(
    [
      work.profile.phone,
      work.profile.city,
    ]
      .filter(Boolean)
      .join(' · '),
    14,
    24,
  );

  doc.setFont(
    'helvetica',
    'bold',
  );
  doc.setFontSize(15);
  doc.setTextColor(
    255,
    255,
    255,
  );
  doc.text(
    'WORK ORDER',
    196,
    16,
    {
      align:
        'right',
    },
  );

  doc.setFont(
    'helvetica',
    'normal',
  );
  doc.setFontSize(8);
  doc.setTextColor(
    174,
    188,
    206,
  );
  doc.text(
    meta.workOrderNumber ||
      'Draft',
    196,
    23,
    {
      align:
        'right',
    },
  );

  let y = 51;

  autoTable(
    doc,
    {
      startY: y,
      body: [
        [
          'Event',
          eventName,
          'Date',
          work.event.eventDate ||
            '-',
        ],
        [
          'Venue',
          work.event.venue ||
            work.event.city ||
            '-',
          'Vendor',
          vendor.name,
        ],
        [
          'Contact',
          [
            vendor.contactPerson,
            vendor.phone,
          ]
            .filter(Boolean)
            .join(' · ') ||
            '-',
          'GST',
          vendor.gst ||
            '-',
        ],
      ],
      theme: 'plain',
      margin: {
        left: 14,
        right: 14,
      },
      styles: {
        font:
          'helvetica',
        fontSize: 8,
        cellPadding: 2.4,
        textColor: [
          51,
          65,
          85,
        ],
      },
      columnStyles: {
        0: {
          fontStyle:
            'bold',
          textColor: [
            100,
            116,
            139,
          ],
          cellWidth: 24,
        },
        1: {
          cellWidth: 67,
        },
        2: {
          fontStyle:
            'bold',
          textColor: [
            100,
            116,
            139,
          ],
          cellWidth: 24,
        },
        3: {
          cellWidth: 67,
        },
      },
    },
  );

  const tableDoc =
    doc as jsPDF & {
      lastAutoTable?: {
        finalY: number;
      };
    };

  y =
    (
      tableDoc
        .lastAutoTable
        ?.finalY ||
      y
    ) + 8;

  doc.setFont(
    'helvetica',
    'bold',
  );
  doc.setFontSize(10);
  doc.setTextColor(
    30,
    41,
    59,
  );
  doc.text(
    'Scope of Work',
    14,
    y,
  );

  y += 4;

  autoTable(
    doc,
    {
      startY: y,
      head: [[
        'Function',
        'Requirement',
        'Qty',
        'Rate',
        'Amount',
        'Delivery',
        'Pickup',
        'Status',
      ]],
      body:
        lines.map(
          (line) => [
            line.functionLabel,
            line.detail
              ? `${line.requirement}\n${line.detail}`
              : line.requirement,
            `${line.quantity} ${line.unit}`,
            money(
              line.rate,
            ),
            money(
              line.quantity *
                line.rate,
            ),
            dateTime(
              line.deliveryTime,
            ),
            dateTime(
              line.pickupTime ||
                '',
            ),
            line.status,
          ],
        ),
      margin: {
        left: 14,
        right: 14,
        bottom: 22,
      },
      styles: {
        font:
          'helvetica',
        fontSize: 7,
        cellPadding: 2,
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
        lineWidth: 0.12,
        overflow:
          'linebreak',
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
        fontStyle:
          'bold',
        fontSize: 6.8,
      },
      columnStyles: {
        0: {
          cellWidth: 24,
        },
        1: {
          cellWidth: 45,
        },
        2: {
          cellWidth: 18,
        },
        3: {
          cellWidth: 18,
          halign:
            'right',
        },
        4: {
          cellWidth: 21,
          halign:
            'right',
        },
        5: {
          cellWidth: 22,
        },
        6: {
          cellWidth: 22,
        },
        7: {
          cellWidth: 16,
        },
      },
      alternateRowStyles: {
        fillColor: [
          250,
          251,
          252,
        ],
      },
    },
  );

  y =
    (
      tableDoc
        .lastAutoTable
        ?.finalY ||
      y
    ) + 8;

  if (y > 235) {
    doc.addPage();
    y = 20;
  }

  autoTable(
    doc,
    {
      startY: y,
      body: [
        [
          'Work Order Total',
          money(total),
        ],
        [
          'Advance Paid',
          money(
            meta.advancePaid,
          ),
        ],
        [
          'Balance Due',
          money(balance),
        ],
        [
          'Confirmation',
          meta.confirmationStatus,
        ],
        [
          'Payment Status',
          meta.paymentStatus,
        ],
      ],
      theme: 'grid',
      margin: {
        left: 102,
        right: 14,
      },
      styles: {
        font:
          'helvetica',
        fontSize: 8,
        cellPadding: 2.5,
        lineColor: [
          226,
          232,
          240,
        ],
        lineWidth: 0.12,
      },
      columnStyles: {
        0: {
          fontStyle:
            'bold',
          textColor: [
            100,
            116,
            139,
          ],
        },
        1: {
          halign:
            'right',
          fontStyle:
            'bold',
          textColor: [
            30,
            41,
            59,
          ],
        },
      },
    },
  );

  y =
    (
      tableDoc
        .lastAutoTable
        ?.finalY ||
      y
    ) + 10;

  if (
    vendor.paymentTerms
  ) {
    doc.setFont(
      'helvetica',
      'bold',
    );
    doc.setFontSize(8);
    doc.setTextColor(
      100,
      116,
      139,
    );
    doc.text(
      'PAYMENT TERMS',
      14,
      y,
    );

    y += 5;

    doc.setFont(
      'helvetica',
      'normal',
    );
    doc.setFontSize(8);
    doc.setTextColor(
      51,
      65,
      85,
    );

    const lines =
      doc.splitTextToSize(
        vendor.paymentTerms,
        182,
      );

    doc.text(
      lines,
      14,
      y,
    );

    y +=
      lines.length *
        4 +
      7;
  }

  if (
    meta.notes
  ) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFont(
      'helvetica',
      'bold',
    );
    doc.setFontSize(8);
    doc.setTextColor(
      100,
      116,
      139,
    );
    doc.text(
      'WORK ORDER NOTES',
      14,
      y,
    );

    y += 5;

    doc.setFont(
      'helvetica',
      'normal',
    );
    doc.setFontSize(8);
    doc.setTextColor(
      51,
      65,
      85,
    );

    const noteLines =
      doc.splitTextToSize(
        meta.notes,
        182,
      );

    doc.text(
      noteLines,
      14,
      y,
    );
  }

  const pageCount =
    doc.getNumberOfPages();

  for (
    let page = 1;
    page <= pageCount;
    page += 1
  ) {
    doc.setPage(page);
    doc.setDrawColor(
      226,
      232,
      240,
    );
    doc.line(
      14,
      282,
      196,
      282,
    );
    doc.setFont(
      'helvetica',
      'normal',
    );
    doc.setFontSize(7);
    doc.setTextColor(
      100,
      116,
      139,
    );
    doc.text(
      `${businessName} · ${meta.workOrderNumber || 'Work Order'}`,
      14,
      287,
    );
    doc.text(
      `Page ${page} of ${pageCount}`,
      196,
      287,
      {
        align:
          'right',
      },
    );
  }

  doc.save(
    [
      'work-order',
      safeName(
        vendor.name,
      ),
      safeName(
        eventName,
      ),
    ]
      .filter(Boolean)
      .join('-') +
      '.pdf',
  );
}
