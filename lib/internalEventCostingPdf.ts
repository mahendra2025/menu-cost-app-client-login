'use client';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import {
  calculate,
} from './store';
import {
  calculateDisposableCost,
} from './disposableCost';
import type {
  FunctionGroceryPlan,
} from './functionGrocery';
import {
  calculateManpowerCost,
  manpowerBillableCost,
  manpowerRateModeLabel,
} from './manpowerCost';
import { assignedDishNames } from './dishManpower';
import {
  calculateGasCost,
  calculateOperationsTotals,
  calculateTransportCost,
  normalizeOperationsState,
  type WorkWithOperations,
} from './operationsCost';
import type {
  WorkState,
} from './types';
import type {
  EventGasCostBreakdown,
} from './gasCost';
import { compareMenuCategoryPriority } from './menuCategoryPriority';

function money(
  value: number,
) {
  return `INR ${Math.round(
    Math.max(
      0,
      Number(value) || 0,
    ),
  ).toLocaleString('en-IN')}`;
}

function decimalMoney(
  value: number,
) {
  return `INR ${Math.max(
    0,
    Number(value) || 0,
  ).toLocaleString(
    'en-IN',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`;
}

function quantity(
  value: number,
) {
  return Math.max(
    0,
    Number(value) || 0,
  )
    .toFixed(3)
    .replace(/\.?0+$/, '');
}

function safeName(
  value: string,
) {
  return String(
    value || '',
  )
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
      45,
    );
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
      'bold',
    );

    doc.setFontSize(7.5);

    doc.setTextColor(
      185,
      28,
      28,
    );

    doc.text(
      'OWNER COPY · PRIVATE INTERNAL COSTING · NOT FOR CLIENT',
      14,
      287,
    );

    doc.setFont(
      'helvetica',
      'normal',
    );

    doc.setTextColor(
      100,
      116,
      139,
    );

    doc.text(
      `${businessName} · Page ${page} of ${pageCount}`,
      196,
      287,
      {
        align:
          'right',
      },
    );
  }
}

export function downloadInternalEventCostingPdf(
  work: WorkState,
  groceryPlan?: FunctionGroceryPlan | null,
  gasBreakdown?: EventGasCostBreakdown | null,
) {
  const doc =
    new jsPDF({
      unit: 'mm',
      format: 'a4',
    });

  const businessName =
    work.profile.businessName ||
    'Catering Business';

  const result =
    calculate(work);


  const manpowerTotal =
    calculateManpowerCost(
      Array.isArray(
        work.manpower,
      )
        ? work.manpower
        : [],
    );

  const disposable =
    calculateDisposableCost(
      work.disposableItems,
    );

  const operations =
    normalizeOperationsState(
      work,
      (
        work as WorkWithOperations
      ).operations,
    );

  const operationsTotals =
    calculateOperationsTotals(
      operations,
      gasBreakdown?.totalGasCost,
    );

  const otherCost =
    Math.max(
      0,
      Number(
        work.extras.other,
      ) || 0,
    );

  const totalCost =
    result.menuFoodTotal +
    manpowerTotal +
    disposable.total +
    operationsTotals.gasTotal +
    operationsTotals.transportTotal +
    otherCost;

  const tableDoc =
    doc as jsPDF & {
      lastAutoTable?: {
        finalY: number;
      };
    };

  let y = 14;

  const ensureSpace = (
    minimum = 34,
  ) => {
    if (
      y >
      277 - minimum
    ) {
      doc.addPage();
      y = 18;
    }
  };

  const sectionHeading = (
    title: string,
    subtitle?: string,
  ) => {
    ensureSpace(
      subtitle
        ? 24
        : 18,
    );

    doc.setFillColor(
      15,
      23,
      42,
    );
    doc.roundedRect(
      14,
      y - 4.2,
      3,
      6.2,
      1.2,
      1.2,
      'F',
    );

    doc.setFont(
      'helvetica',
      'bold',
    );
    doc.setFontSize(11.5);
    doc.setTextColor(
      15,
      23,
      42,
    );
    doc.text(
      title,
      20,
      y,
    );

    doc.setDrawColor(
      226,
      232,
      240,
    );
    doc.line(
      20,
      y + 2.4,
      196,
      y + 2.4,
    );

    y += 7;

    if (subtitle) {
      doc.setFont(
        'helvetica',
        'normal',
      );
      doc.setFontSize(7.8);
      doc.setTextColor(
        100,
        116,
        139,
      );

      const lines =
        doc.splitTextToSize(
          subtitle,
          176,
        );

      doc.text(
        lines,
        20,
        y,
      );

      y +=
        lines.length * 3.4 +
        2;
    }
  };

  const metricCard = (
    x: number,
    top: number,
    width: number,
    label: string,
    value: string,
    note?: string,
    emphasis = false,
  ) => {
    doc.setFillColor(
      emphasis
        ? 15
        : 248,
      emphasis
        ? 23
        : 250,
      emphasis
        ? 42
        : 252,
    );
    doc.setDrawColor(
      emphasis
        ? 15
        : 226,
      emphasis
        ? 23
        : 232,
      emphasis
        ? 42
        : 240,
    );
    doc.roundedRect(
      x,
      top,
      width,
      19,
      2.4,
      2.4,
      'FD',
    );

    doc.setFont(
      'helvetica',
      'normal',
    );
    doc.setFontSize(6.8);
    doc.setTextColor(
      emphasis
        ? 203
        : 100,
      emphasis
        ? 213
        : 116,
      emphasis
        ? 225
        : 139,
    );
    doc.text(
      label.toUpperCase(),
      x + 4,
      top + 5.2,
    );

    doc.setFont(
      'helvetica',
      'bold',
    );
    doc.setFontSize(11);
    doc.setTextColor(
      emphasis
        ? 255
        : 15,
      emphasis
        ? 255
        : 23,
      emphasis
        ? 255
        : 42,
    );
    doc.text(
      value,
      x + 4,
      top + 11.8,
    );

    if (note) {
      doc.setFont(
        'helvetica',
        'normal',
      );
      doc.setFontSize(6.3);
      doc.setTextColor(
        emphasis
          ? 203
          : 100,
        emphasis
          ? 213
          : 116,
        emphasis
          ? 225
          : 139,
      );
      doc.text(
        note,
        x + 4,
        top + 16.2,
      );
    }
  };

  doc.setFillColor(
    15,
    23,
    42,
  );

  doc.rect(
    0,
    0,
    210,
    46,
    'F',
  );

  doc.setFont(
    'helvetica',
    'bold',
  );

  doc.setFontSize(20);

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

  doc.setFontSize(15);

  doc.text(
    'OWNER COSTING REPORT',
    196,
    16,
    {
      align:
        'right',
    },
  );

  doc.setFontSize(8);

  doc.setTextColor(
    254,
    202,
    202,
  );

  doc.text(
    'INTERNAL · PRIVATE · NOT FOR CLIENT',
    196,
    24,
    {
      align:
        'right',
    },
  );

  const contact = [
    work.profile.ownerName,
    work.profile.phone,
    work.profile.city,
  ]
    .filter(
      Boolean,
    )
    .join(' · ');

  if (contact) {
    doc.setFont(
      'helvetica',
      'normal',
    );

    doc.setTextColor(
      203,
      213,
      225,
    );

    doc.text(
      contact,
      14,
      25,
    );
  }


  y = 56;

  sectionHeading(
    'Event Details',
  );

  autoTable(doc, {
    startY: y,
    body: [
      [
        'Client',
        work.event.clientName ||
          '-',
        'Event',
        work.event.eventName ||
          work.event.functionType ||
          '-',
      ],
      [
        'Date',
        work.event.eventDate ||
          '-',
        'Venue',
        work.event.venue ||
          '-',
      ],
      [
        'City',
        work.event.city ||
          '-',
        'Meal Covers',
        result.totalCovers.toLocaleString(
          'en-IN',
        ),
      ],
    ],
    margin: {
      left: 14,
      right: 14,
    },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.4,
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
        cellWidth: 24,
        fontStyle:
          'bold',
      },
      1: {
        cellWidth: 62,
      },
      2: {
        cellWidth: 26,
        fontStyle:
          'bold',
      },
    },
  });

  y =
    (tableDoc.lastAutoTable
      ?.finalY ||
      y) + 8;

  sectionHeading(
    'Executive Cost Snapshot',
    'Fast owner view of the event before reviewing detailed food, manpower, grocery and operations costing.',
  );

  const totalCovers =
    Math.max(
      0,
      Number(
        result.totalCovers,
      ) || 0,
    );

  const costPerCover =
    totalCovers > 0
      ? totalCost /
        totalCovers
      : 0;

  const cardGap = 4;
  const cardWidth =
    (182 - cardGap * 3) /
    4;

  metricCard(
    14,
    y,
    cardWidth,
    'Total Cost',
    money(
      totalCost,
    ),
    totalCovers > 0
      ? `${money(
          costPerCover,
        )} / cover`
      : 'No covers entered',
    true,
  );

  metricCard(
    14 +
      cardWidth +
      cardGap,
    y,
    cardWidth,
    'Food',
    money(
      result.menuFoodTotal,
    ),
    totalCovers > 0
      ? `${money(
          result.menuFoodTotal /
            totalCovers,
        )} / cover`
      : undefined,
  );

  metricCard(
    14 +
      (cardWidth +
        cardGap) *
        2,
    y,
    cardWidth,
    'Manpower',
    money(
      manpowerTotal,
    ),
    totalCovers > 0
      ? `${money(
          manpowerTotal /
            totalCovers,
        )} / cover`
      : undefined,
  );

  metricCard(
    14 +
      (cardWidth +
        cardGap) *
        3,
    y,
    cardWidth,
    'Gas',
    money(
      operationsTotals.gasTotal,
    ),
    totalCovers > 0
      ? `${money(
          operationsTotals.gasTotal /
            totalCovers,
        )} / cover`
      : undefined,
  );

  y += 24;

  const secondaryCardWidth =
    (182 - cardGap) /
    2;

  metricCard(
    14,
    y,
    secondaryCardWidth,
    'Disposable',
    money(
      disposable.total,
    ),
  );

  metricCard(
    14 +
      secondaryCardWidth +
      cardGap,
    y,
    secondaryCardWidth,
    'Transport',
    money(
      operationsTotals.transportTotal,
    ),
  );

  y += 27;

  sectionHeading(
    'Cost Index',
    'One-page event cost summary using the current food, manpower, disposable, gas and transport inputs.',
  );

  const indexRows:
    Array<
      [
        string,
        string,
      ]
    > = [
      [
        'Food Cost',
        money(
          result.menuFoodTotal,
        ),
      ],
      [
        'Manpower Cost',
        money(
          manpowerTotal,
        ),
      ],
      [
        'Plastic / Disposable Cost',
        money(
          disposable.total,
        ),
      ],
      [
        'Gas Cost',
        money(
          operationsTotals.gasTotal,
        ),
      ],
      [
        'Transport Cost',
        money(
          operationsTotals.transportTotal,
        ),
      ],
    ];

  if (otherCost > 0) {
    indexRows.push([
      'Other Cost',
      money(
        otherCost,
      ),
    ]);
  }

  if (result.totalCovers > 0) {
    indexRows.push([
      'Cost / Cover',
      decimalMoney(
        totalCost /
          result.totalCovers,
      ),
    ]);
  }

  indexRows.push([
    'TOTAL COST',
    money(
      totalCost,
    ),
  ]);

  autoTable(doc, {
    startY: y,
    body:
      indexRows,
    margin: {
      left: 14,
      right: 90,
    },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 3,
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
        fontStyle:
          'bold',
      },
      1: {
        halign:
          'right',
        fontStyle:
          'bold',
      },
    },
    didParseCell: (
      data,
    ) => {
      const isLast =
        data.row.index ===
        indexRows.length - 1;

      if (isLast) {
        data.cell.styles.fillColor =
          [
            15,
            23,
            42,
          ];

        data.cell.styles.textColor =
          [
            255,
            255,
            255,
          ];
      }
    },
  });

  y =
    (tableDoc.lastAutoTable
      ?.finalY ||
      y) + 10;

  doc.addPage();
  y = 18;

  sectionHeading(
    'Dish Rate Index',
    'Category-wise dish costing. Dish rate is the saved base cost per plate. Final cost per plate reflects the selected serving and portion allocation.',
  );

  const dishIndexCategory = (
    item: (typeof result.menuBreakdown)[number],
  ) => {
    const rawCategory =
      String(
        item.category || '',
      ).trim();

    const normalizedCategory =
      rawCategory
        .toLocaleLowerCase('en-IN')
        .replace(/\s+/g, ' ');

    const dishName =
      String(
        item.name || '',
      ).toLocaleLowerCase('en-IN');

    if (
      /\b(?:water|mineral water|water bottle|bottled water)\b/.test(
        dishName,
      )
    ) {
      return 'Water Bottle';
    }

    if (
      normalizedCategory ===
      'mocktail'
    ) {
      return 'Welcome Drink';
    }

    if (
      [
        'paneer',
        'sabji',
        'main course',
        'punjabi',
        'north indian',
        'kathiyawadi',
        'rajasthani',
        'gujarati',
        'mughlai',
        'awadhi',
        'kashmiri',
        'bengali',
        'maharashtrian',
        'sindhi',
        'bihari',
        'odia',
        'hyderabadi',
        'andhra',
        'kerala',
        'goan',
      ].includes(
        normalizedCategory,
      )
    ) {
      return 'Sabji';
    }

    if (
      normalizedCategory ===
      'bread'
    ) {
      return 'Indian Bread';
    }

    if (
      normalizedCategory ===
      'dal / kadhi'
    ) {
      return 'Dal/Kadhi';
    }

    if (
      [
        'pickle',
        'raita',
        'condiments',
      ].includes(
        normalizedCategory,
      )
    ) {
      return 'Condiments';
    }

    if (
      [
        'pizza',
        'pasta',
        'continental',
      ].includes(
        normalizedCategory,
      )
    ) {
      return 'Italian';
    }

    if (
      normalizedCategory ===
      'paan'
    ) {
      return 'Mukhwas';
    }

    return (
      rawCategory ||
      'Other'
    );
  };

  const sortedDishBreakdown =
    result.menuBreakdown
      .map(
        (item, index) => ({
          item,
          index,
        }),
      )
      .sort(
        (a, b) => {
          const categoryDifference =
            compareMenuCategoryPriority(
              {
                name: a.item.name,
                category:
                  a.item.category || '',
              },
              {
                name: b.item.name,
                category:
                  b.item.category || '',
              },
            );

          if (
            categoryDifference !==
            0
          ) {
            return categoryDifference;
          }

          return a.index - b.index;
        },
      )
      .map(
        ({ item }) => item,
      );

  const dishRows: any[] = [];
  let currentDishCategory = '';

  sortedDishBreakdown.forEach(
    (item) => {
      const category =
        dishIndexCategory(
          item,
        );

      if (
        category !==
        currentDishCategory
      ) {
        dishRows.push([
          {
            content:
              category.toUpperCase(),
            colSpan: 8,
            styles: {
              fillColor: [
                241,
                245,
                249,
              ],
              textColor: [
                15,
                23,
                42,
              ],
              fontStyle:
                'bold',
              cellPadding: 2.2,
            },
          },
        ]);

        currentDishCategory =
          category;
      }

      dishRows.push([
        [
          item.dayLabel,
          item.mealLabel,
        ]
          .filter(
            Boolean,
          )
          .join(' · ') ||
          'Event Menu',
        item.name,
        category,
        decimalMoney(
          item.baseCostPerPlate,
        ),
        `${quantity(
          item.portionPercent,
        )}%`,
        decimalMoney(
          item.adjustedCostPerPlate,
        ),
        String(
          item.effectivePax,
        ),
        money(
          item.itemTotalCost,
        ),
      ]);
    },
  );

  autoTable(doc, {
    startY: y,
    head: [[
      'Function / Meal',
      'Dish',
      'Category',
      'Dish Rate / Plate',
      'Portion',
      'Final Cost / Plate',
      'Guests',
      'Total',
    ]],
    body:
      dishRows.length
        ? dishRows
        : [[
            'Event',
            'No dishes',
            '',
            '-',
            '-',
            '-',
            '-',
            '-',
          ]],
    margin: {
      left: 8,
      right: 8,
    },
    styles: {
      font: 'helvetica',
      fontSize: 6.6,
      cellPadding: 1.6,
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
    alternateRowStyles: {
      fillColor: [
        248,
        250,
        252,
      ],
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
    },
    columnStyles: {
      0: {
        cellWidth: 28,
      },
      1: {
        cellWidth: 35,
      },
      2: {
        cellWidth: 20,
      },
      3: {
        cellWidth: 23,
        halign:
          'right',
      },
      4: {
        cellWidth: 14,
        halign:
          'right',
      },
      5: {
        cellWidth: 24,
        halign:
          'right',
      },
      6: {
        cellWidth: 13,
        halign:
          'right',
      },
      7: {
        cellWidth: 23,
        halign:
          'right',
      },
    },
  });

  y =
    (tableDoc.lastAutoTable
      ?.finalY ||
      y) + 10;

  sectionHeading(
    'Ingredient / Grocery Rates',
    'Combined event grocery generated from saved recipes. Missing recipe or rate data remains visibly marked.',
  );

  const groceryRows =
    groceryPlan
      ?.combinedItems
      .map(
        (item) => [
          item.name,
          `${quantity(
            item.quantity,
          )} ${item.unit}`,
          item.hasRate
            ? decimalMoney(
                Number(
                  item.rate,
                ) || 0,
              )
            : 'RATE MISSING',
          item.rateUnit ||
            item.unit,
          item.hasRate
            ? money(
                item.estimatedCost,
              )
            : '-',
          item.dishes.join(
            ', ',
          ),
        ],
      ) ||
    [];

  autoTable(doc, {
    startY: y,
    head: [[
      'Ingredient',
      'Required Qty',
      'Rate',
      'Rate Unit',
      'Estimated Cost',
      'Used In',
    ]],
    body:
      groceryRows.length
        ? groceryRows
        : [[
            'No grocery generated',
            '-',
            '-',
            '-',
            '-',
            'Saved recipes required',
          ]],
    margin: {
      left: 10,
      right: 10,
    },
    styles: {
      font: 'helvetica',
      fontSize: 7,
      cellPadding: 1.8,
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
    alternateRowStyles: {
      fillColor: [
        248,
        250,
        252,
      ],
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
    },
    columnStyles: {
      0: {
        cellWidth: 38,
      },
      1: {
        cellWidth: 25,
        halign:
          'right',
      },
      2: {
        cellWidth: 25,
        halign:
          'right',
      },
      3: {
        cellWidth: 20,
      },
      4: {
        cellWidth: 29,
        halign:
          'right',
      },
    },
    didParseCell: (
      data,
    ) => {
      if (
        data.section ===
          'body' &&
        data.column.index ===
          2 &&
        String(
          data.cell.raw ||
            '',
        ) ===
          'RATE MISSING'
      ) {
        data.cell.styles.fillColor =
          [
            254,
            242,
            242,
          ];
        data.cell.styles.textColor =
          [
            185,
            28,
            28,
          ];
        data.cell.styles.fontStyle =
          'bold';
      }
    },
  });

  y =
    (tableDoc.lastAutoTable
      ?.finalY ||
      y) + 6;

  if (
    groceryPlan
      ?.unmatchedDishes
      .length
  ) {
    ensureSpace(18);

    doc.setFont(
      'helvetica',
      'bold',
    );

    doc.setFontSize(8);

    doc.setTextColor(
      180,
      83,
      9,
    );

    const lines =
      doc.splitTextToSize(
        `Recipes missing: ${groceryPlan.unmatchedDishes.join(', ')}`,
        178,
      );

    doc.text(
      lines,
      14,
      y,
    );

    y +=
      lines.length * 4 +
      6;
  }

  sectionHeading(
    'Manpower Rates',
    'Billable cost follows the saved manpower billing basis (per meal, shift or day).',
  );

  const manpowerRows =
    (
      Array.isArray(
        work.manpower,
      )
        ? work.manpower
        : []
    )
      .filter(
        (row) =>
          Number(
            row.quantity,
          ) > 0,
      )
      .map(
        (row) => [
          [
            row.dayLabel,
            row.mealLabel,
          ]
            .filter(
              Boolean,
            )
            .join(' · ') ||
            'Event',
          row.role,
          assignedDishNames(
            row,
            work.menu,
          ).join(', ') || '-',
          String(
            Math.max(
              0,
              Number(
                row.quantity,
              ) || 0,
            ),
          ),
          decimalMoney(
            Number(
              row.rate,
            ) || 0,
          ),
          manpowerRateModeLabel(
            row,
          ),
          money(
            manpowerBillableCost(
              row,
              work.manpower,
            ),
          ),
        ],
      );

  autoTable(doc, {
    startY: y,
    head: [[
      'Function / Meal',
      'Role',
      'Assigned Dishes',
      'Qty',
      'Rate / Person',
      'Billing Basis',
      'Billable Cost',
    ]],
    body:
      manpowerRows.length
        ? manpowerRows
        : [[
            'Event',
            'No manpower entered',
            '-',
            '-',
            '-',
            '-',
            '-',
          ]],
    margin: {
      left: 10,
      right: 10,
    },
    styles: {
      font: 'helvetica',
      fontSize: 7.2,
      cellPadding: 1.9,
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
    alternateRowStyles: {
      fillColor: [
        248,
        250,
        252,
      ],
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
    },
    columnStyles: {
      0: {
        cellWidth: 34,
      },
      1: {
        cellWidth: 27,
      },
      2: {
        cellWidth: 47,
      },
      3: {
        cellWidth: 12,
        halign:
          'right',
      },
      4: {
        cellWidth: 23,
        halign:
          'right',
      },
      5: {
        cellWidth: 22,
      },
      6: {
        cellWidth: 25,
        halign:
          'right',
      },
    },
  });

  y =
    (tableDoc.lastAutoTable
      ?.finalY ||
      y) + 10;

  sectionHeading(
    'Plastic / Disposable Rates',
  );

  const disposableRows =
    disposable.items
      .filter(
        (item) =>
          Number(
            item.quantity,
          ) > 0,
      )
      .map(
        (item) => [
          item.name,
          quantity(
            item.quantity,
          ),
          item.unit || 'pcs',
          decimalMoney(
            item.unitCost,
          ),
          money(
            item.lineTotal,
          ),
        ],
      );

  autoTable(doc, {
    startY: y,
    head: [[
      'Item',
      'Quantity',
      'Unit',
      'Rate / Unit',
      'Total',
    ]],
    body:
      disposableRows.length
        ? disposableRows
        : [[
            'No disposable items entered',
            '-',
            '-',
            '-',
            '-',
          ]],
    margin: {
      left: 14,
      right: 50,
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
    alternateRowStyles: {
      fillColor: [
        248,
        250,
        252,
      ],
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
    },
    columnStyles: {
      0: {
        cellWidth: 50,
      },
      1: {
        cellWidth: 20,
        halign:
          'right',
      },
      2: {
        cellWidth: 18,
      },
      3: {
        cellWidth: 28,
        halign:
          'right',
      },
      4: {
        cellWidth: 30,
        halign:
          'right',
      },
    },
    didParseCell: (
      data,
    ) => {
      if (
        data.section ===
          'body' &&
        data.column.index ===
          3 &&
        String(
          data.cell.raw ||
            '',
        ).includes(
          '0.00',
        )
      ) {
        data.cell.styles.fillColor =
          [
            255,
            251,
            235,
          ];
        data.cell.styles.textColor =
          [
            180,
            83,
            9,
          ];
        data.cell.styles.fontStyle =
          'bold';
      }
    },
  });

  y =
    (tableDoc.lastAutoTable
      ?.finalY ||
      y) + 10;

  sectionHeading(
    'Gas Cost Details',
    'Dish-wise LPG calculation uses event override first, then Recipe / Gas Master, and scales to the function guest count.',
  );

  const automaticGasRows:
    string[][] = [];

  if (
    gasBreakdown &&
    gasBreakdown.rows.length
  ) {
    gasBreakdown.functionTotals.forEach(
      (group) => {
        const label =
          [
            group.dayLabel,
            group.mealLabel,
          ]
            .filter(Boolean)
            .join(' · ') ||
          'Event Menu';

        gasBreakdown.rows
          .filter(
            (row) =>
              row.serviceKey ===
              group.serviceKey,
          )
          .forEach(
            (row) => {
              automaticGasRows.push([
                label,
                row.dish,
                row.source ===
                  'EVENT_OVERRIDE'
                  ? row.category +
                    ' · EVENT OVERRIDE'
                  : row.category,
                String(
                  row.guests,
                ),
                quantity(
                  row.gasKgPer100,
                ),
                `${quantity(
                  row.gasKg,
                )} kg`,
                decimalMoney(
                  row.lpgRatePerKg,
                ),
                decimalMoney(
                  row.gasCost,
                ),
              ]);
            },
          );

        automaticGasRows.push([
          `${label} subtotal`,
          '',
          '',
          String(
            group.guests,
          ),
          '',
          `${quantity(
            group.gasKg,
          )} kg`,
          '',
          decimalMoney(
            group.gasCost,
          ),
        ]);
      },
    );

    automaticGasRows.push([
      'EVENT TOTAL',
      '',
      '',
      '',
      '',
      `${quantity(
        gasBreakdown.totalGasKg,
      )} kg`,
      decimalMoney(
        gasBreakdown.lpgRatePerKg,
      ),
      decimalMoney(
        gasBreakdown.totalGasCost,
      ),
    ]);
  } else {
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

        let usage = '-';
        let rate = '-';

        if (
          row.gas.mode ===
          'KG'
        ) {
          usage =
            `${quantity(
              row.gas.usedKg,
            )} kg`;

          rate =
            row.gas.cylinderSizeKg >
            0
              ? decimalMoney(
                  row.gas
                    .cylinderPrice /
                    row.gas
                      .cylinderSizeKg,
                )
              : '-';
        } else if (
          row.gas.mode ===
          'CYLINDER'
        ) {
          usage =
            `${quantity(
              row.gas
                .cylindersUsed,
            )} cylinder(s)`;

          rate =
            decimalMoney(
              row.gas
                .cylinderPrice,
            );
        }

        automaticGasRows.push([
          label,
          'Legacy gas entry',
          '-',
          String(
            row.pax,
          ),
          '-',
          usage,
          rate,
          decimalMoney(
            calculateGasCost(
              row.gas,
            ),
          ),
        ]);
      },
    );
  }

  autoTable(doc, {
    startY: y,
    head: [[
      'Function / Meal',
      'Dish',
      'Category',
      'Guests',
      'LPG kg / 100',
      'LPG Used',
      'LPG Rate/kg',
      'Gas Cost',
    ]],
    body:
      automaticGasRows.length
        ? automaticGasRows
        : [[
            'Event',
            'No gas usage',
            '-',
            '-',
            '-',
            '-',
            '-',
            decimalMoney(0),
          ]],
    margin: {
      left: 6,
      right: 6,
    },
    styles: {
      font: 'helvetica',
      fontSize: 6.2,
      cellPadding: 1.45,
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
    alternateRowStyles: {
      fillColor: [
        248,
        250,
        252,
      ],
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
    },
    columnStyles: {
      0: {
        cellWidth: 30,
      },
      1: {
        cellWidth: 34,
      },
      2: {
        cellWidth: 22,
      },
      3: {
        cellWidth: 13,
        halign:
          'right',
      },
      4: {
        cellWidth: 20,
        halign:
          'right',
      },
      5: {
        cellWidth: 19,
        halign:
          'right',
      },
      6: {
        cellWidth: 26,
        halign:
          'right',
      },
      7: {
        cellWidth: 25,
        halign:
          'right',
      },
    },
  });

  y =
    (tableDoc.lastAutoTable
      ?.finalY ||
      y) + 10;

  sectionHeading(
    'Transport Cost Details',
  );

  const transportRows:
    Array<
      string[]
    > = [];

  if (
    operations.transportMode ===
    'EVENT_SHARED'
  ) {
    const row =
      operations.sharedTransport;

    transportRows.push([
      'Whole Event',
      row.vehicleLabel ||
        'Vehicle',
      decimalMoney(
        row.ratePerTrip,
      ),
      quantity(
        row.vehicles,
      ),
      quantity(
        row.tripsPerVehicle,
      ),
      money(
        row.tollParking,
      ),
      money(
        row.loadingUnloading,
      ),
      money(
        row.other,
      ),
      money(
        calculateTransportCost(
          row,
        ),
      ),
    ]);
  } else {
    operations.functions.forEach(
      (item) => {
        const row =
          item.transport;

        transportRows.push([
          [
            item.dayLabel,
            item.mealLabel,
          ]
            .filter(
              Boolean,
            )
            .join(' · ') ||
            'Event',
          row.vehicleLabel ||
            'Vehicle',
          decimalMoney(
            row.ratePerTrip,
          ),
          quantity(
            row.vehicles,
          ),
          quantity(
            row.tripsPerVehicle,
          ),
          money(
            row.tollParking,
          ),
          money(
            row.loadingUnloading,
          ),
          money(
            row.other,
          ),
          money(
            calculateTransportCost(
              row,
            ),
          ),
        ]);
      },
    );
  }

  autoTable(doc, {
    startY: y,
    head: [[
      'Function',
      'Vehicle',
      'Rate / Trip',
      'Vehicles',
      'Trips',
      'Toll',
      'Loading',
      'Other',
      'Total',
    ]],
    body:
      transportRows.length
        ? transportRows
        : [[
            'Event',
            '-',
            '-',
            '-',
            '-',
            '-',
            '-',
            '-',
            '-',
          ]],
    margin: {
      left: 7,
      right: 7,
    },
    styles: {
      font: 'helvetica',
      fontSize: 6.4,
      cellPadding: 1.5,
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
    alternateRowStyles: {
      fillColor: [
        248,
        250,
        252,
      ],
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
    },
    columnStyles: {
      0: {
        cellWidth: 31,
      },
      1: {
        cellWidth: 24,
      },
      2: {
        cellWidth: 24,
        halign:
          'right',
      },
      3: {
        cellWidth: 14,
        halign:
          'right',
      },
      4: {
        cellWidth: 13,
        halign:
          'right',
      },
      5: {
        cellWidth: 20,
        halign:
          'right',
      },
      6: {
        cellWidth: 20,
        halign:
          'right',
      },
      7: {
        cellWidth: 18,
        halign:
          'right',
      },
      8: {
        cellWidth: 23,
        halign:
          'right',
      },
    },
  });

  y =
    (tableDoc.lastAutoTable
      ?.finalY ||
      y) + 12;

  sectionHeading(
    'Final Cost Index',
  );

  autoTable(doc, {
    startY: y,
    body:
      indexRows,
    margin: {
      left: 14,
      right: 90,
    },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 3,
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
        fontStyle:
          'bold',
      },
      1: {
        halign:
          'right',
        fontStyle:
          'bold',
      },
    },
    didParseCell: (
      data,
    ) => {
      const isLast =
        data.row.index ===
        indexRows.length - 1;

      if (isLast) {
        data.cell.styles.fillColor =
          [
            15,
            23,
            42,
          ];

        data.cell.styles.textColor =
          [
            255,
            255,
            255,
          ];
      }
    },
  });

  addPageFooter(
    doc,
    businessName,
  );

  const filename = [
    'internal-costing',
    safeName(
      work.event.clientName ||
        'client',
    ),
    safeName(
      work.event.eventName ||
        work.event.functionType ||
        'event',
    ),
  ]
    .filter(
      Boolean,
    )
    .join('-');

  doc.save(
    `${filename || 'internal-event-costing'}.pdf`,
  );
}
