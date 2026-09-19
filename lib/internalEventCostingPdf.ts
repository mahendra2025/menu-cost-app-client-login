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
      'PRIVATE INTERNAL COSTING - NOT FOR CLIENT',
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

    doc.setFont(
      'helvetica',
      'bold',
    );

    doc.setFontSize(12);

    doc.setTextColor(
      15,
      23,
      42,
    );

    doc.text(
      title,
      14,
      y,
    );

    y += 5;

    if (subtitle) {
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

      const lines =
        doc.splitTextToSize(
          subtitle,
          178,
        );

      doc.text(
        lines,
        14,
        y,
      );

      y +=
        lines.length * 3.5 +
        2;
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
    'INTERNAL EVENT COSTING',
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
    'PRIVATE - NOT FOR CLIENT',
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
      y) + 10;

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

  sectionHeading(
    'Dish Rates & Food Cost',
    'Dish rate is the saved base cost per plate. Final cost per plate reflects the selected serving and portion allocation.',
  );

  const dishRows =
    result.menuBreakdown.map(
      (item) => [
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
        item.category ||
          '',
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
      ],
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
        cellWidth: 39,
      },
      2: {
        cellWidth: 22,
      },
      3: {
        cellWidth: 25,
        halign:
          'right',
      },
      4: {
        cellWidth: 16,
        halign:
          'right',
      },
      5: {
        cellWidth: 26,
        halign:
          'right',
      },
      6: {
        cellWidth: 14,
        halign:
          'right',
      },
      7: {
        cellWidth: 26,
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
        cellWidth: 47,
      },
      1: {
        cellWidth: 35,
      },
      2: {
        cellWidth: 14,
        halign:
          'right',
      },
      3: {
        cellWidth: 28,
        halign:
          'right',
      },
      4: {
        cellWidth: 27,
      },
      5: {
        cellWidth: 29,
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
      'Rate / Item',
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
      1: {
        cellWidth: 26,
        halign:
          'right',
      },
      2: {
        cellWidth: 31,
        halign:
          'right',
      },
      3: {
        cellWidth: 31,
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
    'Gas Cost Details',
  );

  const gasRows =
    operations.functions.map(
      (row) => {
        const label =
          [
            row.dayLabel,
            row.mealLabel,
          ]
            .filter(
              Boolean,
            )
            .join(' · ') ||
          'Event';

        let usage = '';
        let rate = '';

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
        } else {
          usage =
            'Manual';

          rate =
            '-';
        }

        return [
          label,
          row.gas.mode,
          usage,
          rate,
          money(
            calculateGasCost(
              row.gas,
            ),
          ),
        ];
      },
    );

  autoTable(doc, {
    startY: y,
    head: [[
      'Function / Meal',
      'Method',
      'Usage',
      'Rate',
      'Gas Cost',
    ]],
    body:
      gasRows.length
        ? gasRows
        : [[
            'Event',
            '-',
            '-',
            '-',
            '-',
          ]],
    margin: {
      left: 12,
      right: 12,
    },
    styles: {
      font: 'helvetica',
      fontSize: 7.6,
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
      fontStyle:
        'bold',
    },
    columnStyles: {
      0: {
        cellWidth: 56,
      },
      3: {
        halign:
          'right',
      },
      4: {
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
