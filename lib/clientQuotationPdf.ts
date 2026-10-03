'use client';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import type { WorkState } from './types';
import type {
  FunctionGroceryPlan,
} from './functionGrocery';

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

type MenuGroup = {
  key: string;
  label: string;
  dayLabel: string;
  mealLabel: string;
  pax: number;
  dishes: PublicMenuItem[];
};

const PAGE_LEFT = 14;
const PAGE_RIGHT = 196;
const CONTENT_WIDTH = 182;
const FOOTER_Y = 282;

function money(value: number) {
  return `INR ${Math.round(
    Math.max(0, Number(value) || 0),
  ).toLocaleString('en-IN')}`;
}

function safeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 45);
}

function formatDate(value: string) {
  if (!value) return '';

  const date =
    new Date(`${value}T00:00:00`);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  );
}

function initials(value: string) {
  const parts =
    value
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (!parts.length) return 'C';

  return parts
    .slice(0, 2)
    .map((part) =>
      part
        .slice(0, 1)
        .toUpperCase(),
    )
    .join('');
}

function groupMenu(
  menu: PublicMenuItem[],
) {
  const groups =
    new Map<
      string,
      MenuGroup
    >();

  menu.forEach((item) => {
    const dayLabel =
      item.dayLabel || '';

    const mealLabel =
      item.mealLabel || '';

    const label =
      [
        dayLabel,
        mealLabel,
      ]
        .filter(Boolean)
        .join(' · ') ||
      'Event Menu';

    const key =
      item.serviceId ||
      label.toLowerCase();

    const existing =
      groups.get(key);

    if (existing) {
      existing.dishes.push(
        item,
      );
      existing.pax =
        Math.max(
          existing.pax,
          Number(
            item.servicePax,
          ) || 0,
        );
      return;
    }

    groups.set(key, {
      key,
      label,
      dayLabel,
      mealLabel,
      pax:
        Number(
          item.servicePax,
        ) || 0,
      dishes: [item],
    });
  });

  return Array.from(
    groups.values(),
  );
}

function categoryRows(
  dishes: PublicMenuItem[],
) {
  const categories =
    new Map<
      string,
      string[]
    >();

  dishes.forEach((dish) => {
    const category =
      dish.category?.trim() ||
      'Menu';

    const existing =
      categories.get(
        category,
      );

    if (existing) {
      existing.push(
        dish.name,
      );
    } else {
      categories.set(
        category,
        [
          dish.name,
        ],
      );
    }
  });

  return Array.from(
    categories.entries(),
  ).map(
    ([
      category,
      names,
    ]) => [
      category,
      names.join(' · '),
    ],
  );
}

function addPageFooter(
  doc: jsPDF,
  businessName: string,
  quotationNumber: string,
) {
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
      PAGE_LEFT,
      FOOTER_Y,
      PAGE_RIGHT,
      FOOTER_Y,
    );

    doc.setFont(
      'helvetica',
      'normal',
    );
    doc.setFontSize(7.5);
    doc.setTextColor(
      100,
      116,
      139,
    );

    doc.text(
      `${businessName} · Client Quotation`,
      PAGE_LEFT,
      287,
    );

    if (quotationNumber) {
      doc.text(
        quotationNumber,
        105,
        287,
        {
          align:
            'center',
        },
      );
    }

    doc.text(
      `Page ${page} of ${pageCount}`,
      PAGE_RIGHT,
      287,
      {
        align:
          'right',
      },
    );
  }
}

function sectionTitle(
  doc: jsPDF,
  title: string,
  y: number,
  subtitle?: string,
) {
  doc.setFont(
    'helvetica',
    'bold',
  );
  doc.setFontSize(11);
  doc.setTextColor(
    30,
    41,
    59,
  );
  doc.text(
    title,
    PAGE_LEFT,
    y,
  );

  if (subtitle) {
    doc.setFont(
      'helvetica',
      'normal',
    );
    doc.setFontSize(7.5);
    doc.setTextColor(
      100,
      116,
      139,
    );
    doc.text(
      subtitle,
      PAGE_RIGHT,
      y,
      {
        align:
          'right',
      },
    );
  }

  doc.setDrawColor(
    226,
    232,
    240,
  );
  doc.line(
    PAGE_LEFT,
    y + 3,
    PAGE_RIGHT,
    y + 3,
  );

  return y + 8;
}

function drawCommercialCard(
  doc: jsPDF,
  quotation: ClientQuotationData,
  startY: number,
) {
  const advancePercent =
    Math.min(
      100,
      Math.max(
        0,
        Number(
          quotation.advancePercent,
        ) || 0,
      ),
    );

  const advanceAmount =
    quotation.grandTotal *
    (advancePercent / 100);

  const balanceAmount =
    Math.max(
      0,
      quotation.grandTotal -
        advanceAmount,
    );

  const width = 88;
  const x = 108;

  doc.setFillColor(
    248,
    250,
    252,
  );
  doc.setDrawColor(
    226,
    232,
    240,
  );
  doc.roundedRect(
    x,
    startY,
    width,
    57,
    3,
    3,
    'FD',
  );

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
    'COMMERCIAL OFFER',
    x + 6,
    startY + 8,
  );

  doc.setFontSize(10);
  doc.setTextColor(
    30,
    41,
    59,
  );
  doc.text(
    'Rate / Cover',
    x + 6,
    startY + 17,
  );

  doc.setFontSize(16);
  doc.text(
    money(
      quotation.pricePerCover,
    ),
    x + width - 6,
    startY + 17,
    {
      align:
        'right',
    },
  );

  if (
    quotation.includeTotal
  ) {
    doc.setDrawColor(
      226,
      232,
      240,
    );
    doc.line(
      x + 6,
      startY + 22,
      x + width - 6,
      startY + 22,
    );

    const rows: Array<
      [
        string,
        string,
      ]
    > = [
      [
        'Subtotal',
        money(
          quotation.subtotal,
        ),
      ],
    ];

    if (
      quotation.extraAmount > 0
    ) {
      rows.push([
        quotation.extraLabel ||
          'Additional',
        money(
          quotation.extraAmount,
        ),
      ]);
    }

    if (
      quotation.gstPercent > 0
    ) {
      rows.push([
        `GST ${quotation.gstPercent}%`,
        money(
          quotation.gstAmount,
        ),
      ]);
    }

    let rowY =
      startY + 29;

    doc.setFont(
      'helvetica',
      'normal',
    );
    doc.setFontSize(7.5);

    rows.forEach(
      ([
        label,
        value,
      ]) => {
        doc.setTextColor(
          100,
          116,
          139,
        );
        doc.text(
          label,
          x + 6,
          rowY,
        );

        doc.setTextColor(
          51,
          65,
          85,
        );
        doc.text(
          value,
          x + width - 6,
          rowY,
          {
            align:
              'right',
          },
        );

        rowY += 5;
      },
    );

    doc.setFont(
      'helvetica',
      'bold',
    );
    doc.setFontSize(9);
    doc.setTextColor(
      15,
      23,
      42,
    );
    doc.text(
      'Grand Total',
      x + 6,
      startY + 46,
    );

    doc.setFontSize(11);
    doc.text(
      money(
        quotation.grandTotal,
      ),
      x + width - 6,
      startY + 46,
      {
        align:
          'right',
      },
    );

    doc.setFont(
      'helvetica',
      'normal',
    );
    doc.setFontSize(6.8);
    doc.setTextColor(
      100,
      116,
      139,
    );
    doc.text(
      `Advance ${advancePercent}%: ${money(advanceAmount)} · Balance: ${money(balanceAmount)}`,
      x + 6,
      startY + 53,
    );
  } else {
    doc.setFont(
      'helvetica',
      'normal',
    );
    doc.setFontSize(7.5);
    doc.setTextColor(
      100,
      116,
      139,
    );
    doc.text(
      'Total value is not displayed in this quotation.',
      x + 6,
      startY + 28,
    );
  }

  return startY + 57;
}

export function downloadClientQuotationPdf(
  work: WorkState,
  quotation: ClientQuotationData,
  _groceryPlan?: FunctionGroceryPlan | null,
) {
  const doc =
    new jsPDF({
      unit: 'mm',
      format: 'a4',
    });

  const businessName =
    work.profile.businessName ||
    'Catering Business';

  const ownerName =
    work.profile.ownerName ||
    '';

  const businessContact =
    [
      work.profile.phone,
      work.profile.email,
      work.profile.city,
    ]
      .filter(Boolean)
      .join(' · ');

  const quoteNumber =
    quotation.quotationNumber ||
    'DRAFT';

  const groups =
    groupMenu(
      work.menu
        .filter(
          (item) =>
            item.coverageStatus !==
            'REJECTED',
        )
        .map(
          (item) => ({
            name:
              item.name,
            category:
              item.category,
            dayLabel:
              item.dayLabel,
            mealLabel:
              item.mealLabel,
            serviceId:
              item.serviceId,
            servicePax:
              item.servicePax,
          }),
        ),
    );

  // Premium quotation header.
  doc.setFillColor(
    12,
    20,
    31,
  );
  doc.rect(
    0,
    0,
    210,
    48,
    'F',
  );

  doc.setFillColor(
    40,
    125,
    235,
  );
  doc.rect(
    0,
    47,
    210,
    1,
    'F',
  );

  doc.setFillColor(
    35,
    52,
    72,
  );
  doc.roundedRect(
    14,
    12,
    20,
    20,
    4,
    4,
    'F',
  );

  doc.setFont(
    'helvetica',
    'bold',
  );
  doc.setFontSize(10);
  doc.setTextColor(
    150,
    199,
    255,
  );
  doc.text(
    initials(
      businessName,
    ),
    24,
    24.5,
    {
      align:
        'center',
    },
  );

  doc.setFontSize(19);
  doc.setTextColor(
    255,
    255,
    255,
  );
  doc.text(
    businessName,
    40,
    19,
  );

  if (businessContact) {
    doc.setFont(
      'helvetica',
      'normal',
    );
    doc.setFontSize(8.5);
    doc.setTextColor(
      174,
      188,
      206,
    );
    doc.text(
      businessContact,
      40,
      26,
    );
  }

  doc.setFont(
    'helvetica',
    'bold',
  );
  doc.setFontSize(7);
  doc.setTextColor(
    126,
    184,
    255,
  );
  doc.text(
    work.profile.tagline?.trim() ||
      'PREMIUM EVENT CATERING',
    40,
    33,
  );

  doc.setFontSize(15);
  doc.setTextColor(
    255,
    255,
    255,
  );
  doc.text(
    'QUOTATION',
    PAGE_RIGHT,
    18,
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
    quoteNumber,
    PAGE_RIGHT,
    25,
    {
      align:
        'right',
    },
  );
  doc.text(
    `Issued ${new Date().toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      },
    )}`,
    PAGE_RIGHT,
    31,
    {
      align:
        'right',
    },
  );

  // Client + event summary.
  let y = 58;

  doc.setFillColor(
    248,
    250,
    252,
  );
  doc.setDrawColor(
    226,
    232,
    240,
  );
  doc.roundedRect(
    PAGE_LEFT,
    y,
    88,
    57,
    3,
    3,
    'FD',
  );

  doc.setFont(
    'helvetica',
    'bold',
  );
  doc.setFontSize(7);
  doc.setTextColor(
    100,
    116,
    139,
  );
  doc.text(
    'PREPARED FOR',
    20,
    y + 9,
  );

  doc.setFontSize(15);
  doc.setTextColor(
    30,
    41,
    59,
  );
  doc.text(
    quotation.clientName ||
      work.event.clientName ||
      'Client',
    20,
    y + 18,
  );

  if (
    quotation.clientPhone
  ) {
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
      quotation.clientPhone,
      20,
      y + 25,
    );
  }

  doc.setFont(
    'helvetica',
    'bold',
  );
  doc.setFontSize(7);
  doc.setTextColor(
    100,
    116,
    139,
  );
  doc.text(
    'EVENT',
    20,
    y + 35,
  );

  doc.setFontSize(10);
  doc.setTextColor(
    30,
    41,
    59,
  );

  const eventName =
    quotation.eventName ||
    work.event.eventName ||
    work.event.functionType ||
    'Event';

  doc.text(
    eventName,
    20,
    y + 42,
  );

  doc.setFont(
    'helvetica',
    'normal',
  );
  doc.setFontSize(7.5);
  doc.setTextColor(
    100,
    116,
    139,
  );

  const eventMeta =
    [
      formatDate(
        quotation.eventDate,
      ),
      [
        quotation.venue,
        quotation.city,
      ]
        .filter(Boolean)
        .join(', '),
    ]
      .filter(Boolean)
      .join(' · ');

  if (eventMeta) {
    const eventMetaLines =
      doc.splitTextToSize(
        eventMeta,
        76,
      );
    doc.text(
      eventMetaLines,
      20,
      y + 49,
    );
  }

  drawCommercialCard(
    doc,
    quotation,
    y,
  );

  y += 68;

  // Executive summary.
  y = sectionTitle(
    doc,
    'Event Summary',
    y,
    'Client-facing scope',
  );

  const summaryRows = [
    [
      'Functions',
      String(
        groups.length ||
          1,
      ),
      'Total Covers',
      quotation.totalCovers > 0
        ? quotation.totalCovers.toLocaleString(
            'en-IN',
          )
        : '-',
    ],
    [
      'Venue',
      [
        quotation.venue,
        quotation.city,
      ]
        .filter(Boolean)
        .join(', ') ||
        '-',
      'Validity',
      `${quotation.validityDays || 0} days`,
    ],
    [
      'Business Address',
      work.profile.address?.trim() ||
        '-',
      'GSTIN',
      work.profile.gstin?.trim() ||
        '-',
    ],
  ];

  autoTable(doc, {
    startY: y,
    body: summaryRows,
    theme: 'plain',
    margin: {
      left: PAGE_LEFT,
      right: PAGE_LEFT,
    },
    styles: {
      font:
        'helvetica',
      fontSize: 8,
      cellPadding: 2.5,
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
        cellWidth: 29,
      },
      1: {
        cellWidth: 62,
      },
      2: {
        fontStyle:
          'bold',
        textColor: [
          100,
          116,
          139,
        ],
        cellWidth: 29,
      },
      3: {
        cellWidth: 62,
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
      ?.finalY || y) + 9;

  // Function-wise menu. No internal rates or quantities are exposed.
  y = sectionTitle(
    doc,
    'Menu & Service',
    y,
    'Function-wise selection',
  );

  if (!groups.length) {
    doc.setFont(
      'helvetica',
      'normal',
    );
    doc.setFontSize(8.5);
    doc.setTextColor(
      100,
      116,
      139,
    );
    doc.text(
      'Menu to be finalized.',
      PAGE_LEFT,
      y,
    );
    y += 8;
  } else {
    groups.forEach(
      (
        group,
        groupIndex,
      ) => {
        if (y > 242) {
          doc.addPage();
          y = 20;
        }

        doc.setFillColor(
          245,
          249,
          255,
        );
        doc.setDrawColor(
          219,
          234,
          254,
        );
        doc.roundedRect(
          PAGE_LEFT,
          y,
          CONTENT_WIDTH,
          12,
          2.5,
          2.5,
          'FD',
        );

        doc.setFont(
          'helvetica',
          'bold',
        );
        doc.setFontSize(9.5);
        doc.setTextColor(
          30,
          64,
          112,
        );
        doc.text(
          group.label,
          18,
          y + 7.5,
        );

        if (group.pax > 0) {
          doc.setFont(
            'helvetica',
            'normal',
          );
          doc.setFontSize(7.5);
          doc.setTextColor(
            71,
            102,
            145,
          );
          doc.text(
            `${group.pax.toLocaleString(
              'en-IN',
            )} guests`,
            192,
            y + 7.5,
            {
              align:
                'right',
            },
          );
        }

        y += 15;

        autoTable(doc, {
          startY: y,
          head: [[
            'Category',
            'Menu Selection',
          ]],
          body:
            categoryRows(
              group.dishes,
            ),
          margin: {
            left: PAGE_LEFT,
            right: PAGE_LEFT,
            bottom: 20,
          },
          styles: {
            font:
              'helvetica',
            fontSize: 8,
            cellPadding: 2.3,
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
            fontSize: 7.5,
          },
          columnStyles: {
            0: {
              cellWidth: 42,
              fontStyle:
                'bold',
              textColor: [
                71,
                85,
                105,
              ],
            },
            1: {
              cellWidth: 140,
            },
          },
          alternateRowStyles: {
            fillColor: [
              250,
              251,
              252,
            ],
          },
        });

        y =
          (tableDoc.lastAutoTable
            ?.finalY || y) + 8;

        if (
          groupIndex <
          groups.length - 1
        ) {
          y += 1;
        }
      },
    );
  }

  // Client-safe commercial recap.
  if (y > 220) {
    doc.addPage();
    y = 20;
  }

  y = sectionTitle(
    doc,
    'Commercial Terms',
    y,
    quotation.includeTotal
      ? 'Final client offer'
      : 'Rate-based offer',
  );

  const advancePercent =
    Math.min(
      100,
      Math.max(
        0,
        Number(
          quotation.advancePercent,
        ) || 0,
      ),
    );

  const advanceAmount =
    quotation.grandTotal *
    (advancePercent / 100);

  const balanceAmount =
    Math.max(
      0,
      quotation.grandTotal -
        advanceAmount,
    );

  const commercialRows:
    Array<[string, string]> =
    [
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
    commercialRows.push([
      'Subtotal',
      money(
        quotation.subtotal,
      ),
    ]);

    if (
      quotation.extraAmount > 0
    ) {
      commercialRows.push([
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
      commercialRows.push([
        `GST ${quotation.gstPercent}%`,
        money(
          quotation.gstAmount,
        ),
      ]);
    }

    commercialRows.push([
      'Grand Total',
      money(
        quotation.grandTotal,
      ),
    ]);

    if (
      advancePercent > 0
    ) {
      commercialRows.push([
        `Booking Advance (${advancePercent}%)`,
        money(
          advanceAmount,
        ),
      ]);
      commercialRows.push([
        'Balance after advance',
        money(
          balanceAmount,
        ),
      ]);
    }
  }

  autoTable(doc, {
    startY: y,
    body:
      commercialRows,
    theme: 'grid',
    margin: {
      left: PAGE_LEFT,
      right: 82,
      bottom: 20,
    },
    styles: {
      font:
        'helvetica',
      fontSize: 8.5,
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
      lineWidth: 0.12,
    },
    columnStyles: {
      0: {
        fontStyle:
          'bold',
      },
      1: {
        halign:
          'right',
      },
    },
    didParseCell(data) {
      if (
        data.section ===
          'body' &&
        String(
          (
            data.row.raw as
              unknown[]
          )?.[0] ||
          '',
        ) ===
          'Grand Total'
      ) {
        data.cell.styles.fillColor =
          [
            239,
            246,
            255,
          ];
        data.cell.styles.textColor =
          [
            30,
            64,
            112,
          ];
        data.cell.styles.fontStyle =
          'bold';
      }
    },
  });

  y =
    (tableDoc.lastAutoTable
      ?.finalY || y) + 9;

  if (
    quotation.paymentTerms
      .trim()
  ) {
    doc.setFont(
      'helvetica',
      'bold',
    );
    doc.setFontSize(7.5);
    doc.setTextColor(
      100,
      116,
      139,
    );
    doc.text(
      'PAYMENT TERMS',
      PAGE_LEFT,
      y,
    );

    y += 5;

    doc.setFont(
      'helvetica',
      'normal',
    );
    doc.setFontSize(8.2);
    doc.setTextColor(
      51,
      65,
      85,
    );

    const paymentLines =
      doc.splitTextToSize(
        quotation.paymentTerms,
        CONTENT_WIDTH,
      );

    doc.text(
      paymentLines,
      PAGE_LEFT,
      y,
    );

    y +=
      paymentLines.length * 4 +
      7;
  }

  if (y > 226) {
    doc.addPage();
    y = 20;
  }

  y = sectionTitle(
    doc,
    'Terms & Confirmation',
    y,
  );

  const terms =
    [
      `Quotation validity: ${quotation.validityDays} days from issue date.`,
      advancePercent > 0
        ? `${advancePercent}% advance is required to confirm the booking.`
        : '',
      ...quotation.terms,
    ]
      .map(
        (term) =>
          String(
            term || '',
          ).trim(),
      )
      .filter(Boolean);

  doc.setFont(
    'helvetica',
    'normal',
  );
  doc.setFontSize(8.2);
  doc.setTextColor(
    71,
    85,
    105,
  );

  terms.forEach(
    (term, index) => {
      const lines =
        doc.splitTextToSize(
          `${index + 1}. ${term}`,
          CONTENT_WIDTH,
        );

      if (
        y +
          lines.length * 4 >
        266
      ) {
        doc.addPage();
        y = 20;
      }

      doc.text(
        lines,
        PAGE_LEFT,
        y,
      );

      y +=
        lines.length * 4 +
        2;
    },
  );

  if (
    quotation.notes.trim()
  ) {
    y += 3;

    if (y > 245) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(
      248,
      250,
      252,
    );
    doc.setDrawColor(
      226,
      232,
      240,
    );

    const noteLines =
      doc.splitTextToSize(
        quotation.notes,
        166,
      );

    const noteHeight =
      Math.max(
        18,
        noteLines.length * 4 +
          12,
      );

    doc.roundedRect(
      PAGE_LEFT,
      y,
      CONTENT_WIDTH,
      noteHeight,
      3,
      3,
      'FD',
    );

    doc.setFont(
      'helvetica',
      'bold',
    );
    doc.setFontSize(7.2);
    doc.setTextColor(
      100,
      116,
      139,
    );
    doc.text(
      'NOTE',
      20,
      y + 7,
    );

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
    doc.text(
      noteLines,
      20,
      y + 13,
    );

    y +=
      noteHeight + 8;
  }

  if (y > 245) {
    doc.addPage();
    y = 30;
  }

  doc.setDrawColor(
    148,
    163,
    184,
  );
  doc.line(
    137,
    y + 9,
    194,
    y + 9,
  );

  doc.setFont(
    'helvetica',
    'normal',
  );
  doc.setFontSize(7.5);
  doc.setTextColor(
    100,
    116,
    139,
  );
  doc.text(
    ownerName ||
      'Authorized Signatory',
    165.5,
    y + 14,
    {
      align:
        'center',
    },
  );

  doc.setFontSize(6.8);
  doc.text(
    businessName,
    165.5,
    y + 18,
    {
      align:
        'center',
    },
  );

  addPageFooter(
    doc,
    businessName,
    quoteNumber,
  );

  const filename =
    [
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
