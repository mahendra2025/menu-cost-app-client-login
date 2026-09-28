'use client';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import type {
  FunctionGroceryItem,
  FunctionGroceryPlan,
} from './functionGrocery';
import {
  inferIngredientCategory,
} from './ingredientCatalog';
import {
  calculateDisposableCost,
} from './disposableCost';
import type {
  EventGasCostBreakdown,
} from './gasCost';
import {
  calculate,
} from './store';
import { buildDishManpowerAssignments } from './dishManpower';
import type {
  WorkState,
} from './types';

type PdfWithTable =
  jsPDF & {
    lastAutoTable?: {
      finalY: number;
    };
  };

function money(
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
    .replace(
      /\.?0+$/,
      '',
    );
}

function safeFilePart(
  value: string,
) {
  return String(
    value || '',
  )
    .trim()
    .toLocaleLowerCase(
      'en-IN',
    )
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
      48,
    );
}

function tableEnd(
  doc: PdfWithTable,
  fallback: number,
) {
  return (
    doc.lastAutoTable
      ?.finalY ??
    fallback
  );
}

const GROCERY_CATEGORY_ORDER = [
  'Vegetables & Herbs',
  'Fruits',
  'Dairy',
  'Grains & Flour',
  'Pulses & Legumes',
  'Spices & Seasonings',
  'Oils & Fats',
  'Sweeteners',
  'Sauces & Condiments',
  'Beverages',
  'Bakery & Packaged',
  'Other',
] as const;

function groceryCategoryRank(
  category: string,
) {
  const index =
    GROCERY_CATEGORY_ORDER
      .findIndex(
        (value) =>
          value ===
          category,
      );

  return index >= 0
    ? index
    : GROCERY_CATEGORY_ORDER.length;
}

function groupGroceryItems(
  items: FunctionGroceryItem[],
) {
  const groups =
    new Map<
      string,
      FunctionGroceryItem[]
    >();

  items.forEach(
    (item) => {
      const category =
        inferIngredientCategory(
          item.name,
        );

      groups.set(
        category,
        [
          ...(
            groups.get(
              category,
            ) || []
          ),
          item,
        ],
      );
    },
  );

  return Array.from(
    groups.entries(),
  )
    .map(
      ([
        category,
        groupItems,
      ]) => ({
        category,
        items:
          groupItems.sort(
            (left, right) =>
              left.name.localeCompare(
                right.name,
              ),
          ),
      }),
    )
    .sort(
      (left, right) =>
        groceryCategoryRank(
          left.category,
        ) -
          groceryCategoryRank(
            right.category,
          ) ||
        left.category.localeCompare(
          right.category,
        ),
    );
}

function addFooter(
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
      'normal',
    );
    doc.setFontSize(7);
    doc.setTextColor(
      100,
      116,
      139,
    );

    doc.text(
      `${businessName} · Grocery & Menu Cost Report`,
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
      14,
      y + 5,
    );
  }
}

export function downloadGroceryEventPdf(
  work: WorkState,
  plan: FunctionGroceryPlan,
  gasBreakdown?: EventGasCostBreakdown | null,
) {
  const doc =
    new jsPDF({
      unit:
        'mm',
      format:
        'a4',
    }) as PdfWithTable;

  const result =
    calculate(work);

  const disposable =
    calculateDisposableCost(
      work.disposableItems,
    );

  const totalCovers =
    Math.max(
      0,
      Number(
        result.totalCovers,
      ) || 0,
    );

  const gasTotal =
    Math.max(
      0,
      Number(
        gasBreakdown
          ?.totalGasCost ??
        work.extras.gasFuel,
      ) || 0,
    );

  const gasPerCover =
    totalCovers > 0
      ? gasTotal /
        totalCovers
      : 0;

  const disposablePerCover =
    totalCovers > 0
      ? disposable.total /
        totalCovers
      : 0;

  const foodGasPlasticTotal =
    result.menuFoodTotal +
    gasTotal +
    disposable.total;

  const foodGasPlasticPerCover =
    totalCovers > 0
      ? foodGasPlasticTotal /
        totalCovers
      : 0;

  const businessName =
    work.profile.businessName ||
    'Catering Business';

  const preparedDate =
    new Date()
      .toLocaleDateString(
        'en-IN',
        {
          day:
            '2-digit',
          month:
            'short',
          year:
            'numeric',
        },
      );

  doc.setProperties({
    title:
      `Grocery & Menu Cost - ${work.event.eventName || 'Catering Event'}`,
    subject:
      'Event menu, category-wise grocery list and food cost',
    author:
      businessName,
    creator:
      'Menu Costing App',
  });

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
    15,
  );

  doc.setFontSize(12);
  doc.text(
    'GROCERY & MENU COST REPORT',
    14,
    24,
  );

  doc.setFont(
    'helvetica',
    'normal',
  );
  doc.setFontSize(7.5);
  doc.setTextColor(
    190,
    200,
    214,
  );
  doc.text(
    `Prepared ${preparedDate}`,
    14,
    31,
  );

  autoTable(
    doc,
    {
      startY:
        46,
      margin: {
        left:
          14,
        right:
          14,
      },
      theme:
        'plain',
      body: [
        [
          'Client',
          work.event.clientName ||
            '-',
        ],
        [
          'Event',
          work.event.eventName ||
            work.event.functionType ||
            '-',
        ],
        [
          'Date',
          work.event.eventDate ||
            '-',
        ],
        [
          'Venue',
          [
            work.event.venue,
            work.event.city,
          ]
            .filter(
              Boolean,
            )
            .join(
              ', ',
            ) ||
            '-',
        ],
        [
          'Event Guests',
          Math.max(
            0,
            Number(
              work.event.pax,
            ) || 0,
          ).toLocaleString(
            'en-IN',
          ),
        ],
        [
          'Total Function Covers',
          Math.max(
            0,
            Number(
              result.totalCovers,
            ) || 0,
          ).toLocaleString(
            'en-IN',
          ),
        ],
      ],
      columnStyles: {
        0: {
          cellWidth:
            46,
          fontStyle:
            'bold',
          textColor: [
            100,
            116,
            139,
          ],
        },
        1: {
          textColor: [
            15,
            23,
            42,
          ],
        },
      },
      styles: {
        font:
          'helvetica',
        fontSize:
          8.5,
        cellPadding:
          2,
      },
    },
  );

  let y =
    tableEnd(
      doc,
      78,
    ) + 9;

  sectionTitle(
    doc,
    'Cost Summary',
    y,
    'Menu food, grocery reference, LPG gas and disposable costs. Grocery is shown only as a purchasing reference.',
  );

  const groceryPerCover =
    plan.totalFunctionCovers >
      0
      ? plan.combinedIngredientCost /
        plan.totalFunctionCovers
      : 0;

  autoTable(
    doc,
    {
      startY:
        y + 8,
      margin: {
        left:
          14,
        right:
          14,
      },
      theme:
        'grid',
      head: [[
        'Metric',
        'Per Plate / Cover',
        'Total Cost',
      ]],
      body: [
        [
          'Menu Food Cost',
          money(
            result.menuCostPerPlate,
          ),
          money(
            result.menuFoodTotal,
          ),
        ],
        [
          'Recipe Grocery Cost (Reference)',
          money(
            groceryPerCover,
          ),
          money(
            plan.combinedIngredientCost,
          ),
        ],
        [
          'LPG / Gas Cost',
          money(
            gasPerCover,
          ),
          money(
            gasTotal,
          ),
        ],
        [
          'Plastic / Disposable Cost',
          money(
            disposablePerCover,
          ),
          money(
            disposable.total,
          ),
        ],
        [
          'Menu + Gas + Plastic Total',
          money(
            foodGasPlasticPerCover,
          ),
          money(
            foodGasPlasticTotal,
          ),
        ],
      ],
      headStyles: {
        fillColor: [
          35,
          105,
          190,
        ],
        textColor:
          255,
        fontStyle:
          'bold',
      },
      columnStyles: {
        0: {
          cellWidth:
            78,
        },
        1: {
          halign:
            'right',
          fontStyle:
            'bold',
        },
        2: {
          halign:
            'right',
          fontStyle:
            'bold',
        },
      },
      styles: {
        font:
          'helvetica',
        fontSize:
          8.5,
        cellPadding:
          2.3,
      },
    },
  );

  y =
    tableEnd(
      doc,
      y + 28,
    ) + 9;

  if (y > 238) {
    doc.addPage();
    y = 18;
  }

  sectionTitle(
    doc,
    'Kitchen Manpower - Dish Wise',
    y,
    'Cook and helper responsibility saved from the Team page.',
  );

  const dishManpowerRows = buildDishManpowerAssignments(
    work.menu,
    work.manpower,
  ).map((assignment) => [
    assignment.functionLabel,
    assignment.category,
    assignment.dishName,
    assignment.roles.length
      ? assignment.roles
          .map((role) => `${role.quantity} ${role.role}`)
          .join(', ')
      : 'Not assigned',
  ]);

  autoTable(doc, {
    startY: y + 8,
    margin: {
      left: 10,
      right: 10,
      bottom: 16,
    },
    theme: 'grid',
    head: [[
      'Function',
      'Category',
      'Dish',
      'Cook / Helper Assignment',
    ]],
    body: dishManpowerRows.length
      ? dishManpowerRows
      : [[
          'Event Menu',
          '-',
          'No menu dishes added',
          'Not assigned',
        ]],
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 31 },
      2: { cellWidth: 51 },
      3: { cellWidth: 67 },
    },
    styles: {
      font: 'helvetica',
      fontSize: 7.2,
      cellPadding: 1.9,
      overflow: 'linebreak',
      valign: 'middle',
    },
  });

  y = tableEnd(doc, y + 30) + 10;

  if (y > 238) {
    doc.addPage();
    y = 18;
  }

  sectionTitle(
    doc,
    'Menu - Function & Category Wise',
    y,
    'Each dish shows the effective food cost per plate and total dish cost for that function.',
  );

  const menuRows:
    Array<
      Array<
        string | number
      >
    > = [];

  const sortedMenu =
    [
      ...result
        .menuBreakdown,
    ].sort(
      (left, right) => {
        const leftMeal =
          [
            left.dayLabel,
            left.mealLabel,
          ]
            .filter(
              Boolean,
            )
            .join(
              ' - ',
            );

        const rightMeal =
          [
            right.dayLabel,
            right.mealLabel,
          ]
            .filter(
              Boolean,
            )
            .join(
              ' - ',
            );

        return (
          leftMeal.localeCompare(
            rightMeal,
          ) ||
          String(
            left.category ||
              '',
          ).localeCompare(
            String(
              right.category ||
                '',
            ),
          ) ||
          left.name.localeCompare(
            right.name,
          )
        );
      },
    );

  let previousMeal =
    '';
  let previousCategory =
    '';

  sortedMenu.forEach(
    (item) => {
      const meal =
        [
          item.dayLabel,
          item.mealLabel,
        ]
          .filter(
            Boolean,
          )
          .join(
            ' - ',
          ) ||
        'Event Menu';

      const category =
        item.category ||
        'Other';

      if (
        meal !==
        previousMeal
      ) {
        menuRows.push([
          meal,
          '',
          '',
          '',
          '',
          '',
        ]);
        previousMeal =
          meal;
        previousCategory =
          '';
      }

      if (
        category !==
        previousCategory
      ) {
        menuRows.push([
          '',
          category,
          '',
          '',
          '',
          '',
        ]);
        previousCategory =
          category;
      }

      menuRows.push([
        '',
        '',
        item.name,
        item.effectivePax,
        money(
          item.adjustedCostPerPlate,
        ),
        money(
          item.itemTotalCost,
        ),
      ]);
    },
  );

  autoTable(
    doc,
    {
      startY:
        y + 8,
      margin: {
        left:
          10,
        right:
          10,
        bottom:
          16,
      },
      theme:
        'grid',
      head: [[
        'Function',
        'Category',
        'Dish',
        'Guests',
        'Cost / Plate',
        'Total Cost',
      ]],
      body:
        menuRows.length
          ? menuRows
          : [[
              '-',
              '-',
              'No menu dishes added',
              '-',
              '-',
              '-',
            ]],
      didParseCell:
        (data) => {
          if (
            data.section !==
            'body'
          ) {
            return;
          }

          const row =
            data.row.raw as
              Array<
                string | number
              >;

          if (
            row[0] &&
            !row[1] &&
            !row[2]
          ) {
            data.cell.styles.fillColor =
              [
                226,
                238,
                252,
              ];
            data.cell.styles.fontStyle =
              'bold';
            data.cell.styles.textColor =
              [
                15,
                23,
                42,
              ];
          } else if (
            !row[0] &&
            row[1] &&
            !row[2]
          ) {
            data.cell.styles.fillColor =
              [
                242,
                246,
                250,
              ];
            data.cell.styles.fontStyle =
              'bold';
            data.cell.styles.textColor =
              [
                51,
                65,
                85,
              ];
          }
        },
      headStyles: {
        fillColor: [
          15,
          23,
          42,
        ],
        textColor:
          255,
        fontStyle:
          'bold',
      },
      alternateRowStyles: {
        fillColor: [
          249,
          250,
          251,
        ],
      },
      columnStyles: {
        0: {
          cellWidth:
            31,
        },
        1: {
          cellWidth:
            27,
        },
        2: {
          cellWidth:
            52,
        },
        3: {
          cellWidth:
            18,
          halign:
            'right',
        },
        4: {
          cellWidth:
            28,
          halign:
            'right',
        },
        5: {
          cellWidth:
            31,
          halign:
            'right',
          fontStyle:
            'bold',
        },
      },
      styles: {
        font:
          'helvetica',
        fontSize:
          7.2,
        cellPadding:
          1.8,
        overflow:
          'linebreak',
        valign:
          'middle',
      },
    },
  );

  y =
    tableEnd(
      doc,
      y + 30,
    ) + 10;

  if (y > 238) {
    doc.addPage();
    y = 18;
  }

  sectionTitle(
    doc,
    'Grocery List - Category Wise',
    y,
    'Combined purchasing requirement for the full event with ingredient rate and estimated cost.',
  );

  y += 9;

  const groceryGroups =
    groupGroceryItems(
      plan.combinedItems,
    );

  if (
    !groceryGroups.length
  ) {
    autoTable(
      doc,
      {
        startY:
          y,
        margin: {
          left:
            14,
          right:
            14,
        },
        theme:
          'grid',
        body: [[
          'No linked recipe ingredients found. Add or link recipes to generate grocery quantities.',
        ]],
        styles: {
          font:
            'helvetica',
          fontSize:
            8.5,
          cellPadding:
            3,
        },
      },
    );

    y =
      tableEnd(
        doc,
        y + 12,
      ) + 8;
  } else {
    groceryGroups.forEach(
      (
        group,
        index,
      ) => {
        if (
          y > 244
        ) {
          doc.addPage();
          y = 18;
        }

        doc.setFont(
          'helvetica',
          'bold',
        );
        doc.setFontSize(
          9.5,
        );
        doc.setTextColor(
          35,
          105,
          190,
        );
        doc.text(
          group.category,
          14,
          y,
        );

        const categoryCost =
          group.items.reduce(
            (
              sum,
              item,
            ) =>
              sum +
              item.estimatedCost,
            0,
          );

        doc.setFont(
          'helvetica',
          'normal',
        );
        doc.setFontSize(
          7.5,
        );
        doc.setTextColor(
          100,
          116,
          139,
        );
        doc.text(
          `Category total ${money(categoryCost)}`,
          196,
          y,
          {
            align:
              'right',
          },
        );

        autoTable(
          doc,
          {
            startY:
              y + 3,
            margin: {
              left:
                14,
              right:
                14,
              bottom:
                16,
            },
            theme:
              'grid',
            head:
              index === 0
                ? [[
                    'Ingredient',
                    'Qty',
                    'Unit',
                    'Rate',
                    'Ingredient Cost',
                    'Used In',
                  ]]
                : undefined,
            body:
              group.items.map(
                (item) => [
                  item.name,
                  quantity(
                    item.quantity,
                  ),
                  item.unit,
                  item.hasRate
                    ? `${money(item.rate || 0)} / ${item.rateUnit || item.unit}`
                    : 'Rate missing',
                  money(
                    item.estimatedCost,
                  ),
                  item.dishes.join(
                    ', ',
                  ),
                ],
              ),
            headStyles: {
              fillColor: [
                15,
                23,
                42,
              ],
              textColor:
                255,
              fontStyle:
                'bold',
            },
            alternateRowStyles: {
              fillColor: [
                249,
                250,
                251,
              ],
            },
            columnStyles: {
              0: {
                cellWidth:
                  39,
              },
              1: {
                cellWidth:
                  18,
                halign:
                  'right',
                fontStyle:
                  'bold',
              },
              2: {
                cellWidth:
                  15,
              },
              3: {
                cellWidth:
                  32,
                halign:
                  'right',
              },
              4: {
                cellWidth:
                  29,
                halign:
                  'right',
                fontStyle:
                  'bold',
              },
              5: {
                cellWidth:
                  49,
              },
            },
            styles: {
              font:
                'helvetica',
              fontSize:
                6.8,
              cellPadding:
                1.7,
              overflow:
                'linebreak',
              valign:
                'middle',
            },
          },
        );

        y =
          tableEnd(
            doc,
            y + 15,
          ) + 7;
      },
    );
  }

  if (
    y > 235
  ) {
    doc.addPage();
    y = 18;
  }

  sectionTitle(
    doc,
    'Grocery Cost Total',
    y,
  );

  autoTable(
    doc,
    {
      startY:
        y + 4,
      margin: {
        left:
          14,
        right:
          14,
      },
      theme:
        'grid',
      body: [
        [
          'Priced Ingredients',
          plan.pricedIngredientCount.toLocaleString(
            'en-IN',
          ),
        ],
        [
          'Ingredients Missing Rate',
          plan.unpricedIngredientCount.toLocaleString(
            'en-IN',
          ),
        ],
        [
          'Grocery Cost / Cover',
          money(
            groceryPerCover,
          ),
        ],
        [
          'Total Grocery Cost',
          money(
            plan.combinedIngredientCost,
          ),
        ],
      ],
      columnStyles: {
        0: {
          cellWidth:
            112,
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
      styles: {
        font:
          'helvetica',
        fontSize:
          8.5,
        cellPadding:
          2.3,
      },
    },
  );

  y =
    tableEnd(
      doc,
      y + 24,
    ) + 8;

  if (
    y > 226
  ) {
    doc.addPage();
    y = 18;
  }

  sectionTitle(
    doc,
    'Gas Cost Details',
    y,
    'Dish-wise LPG calculation using the current LPG rate and each dish/category gas usage.',
  );

  const gasRows =
    gasBreakdown
      ?.rows ||
    [];

  const cylinderPrice =
    Math.max(
      0,
      Number(
        gasBreakdown
          ?.setting
          .cylinderPrice,
      ) || 0,
    );

  const cylinderWeightKg =
    Math.max(
      0,
      Number(
        gasBreakdown
          ?.setting
          .cylinderWeightKg,
      ) || 0,
    );

  autoTable(
    doc,
    {
      startY:
        y + 8,
      margin: {
        left:
          14,
        right:
          14,
      },
      theme:
        'grid',
      body: [
        [
          'Commercial Cylinder Price',
          money(
            cylinderPrice,
          ),
        ],
        [
          'Cylinder Weight',
          cylinderWeightKg > 0
            ? `${quantity(cylinderWeightKg)} kg`
            : '-',
        ],
        [
          'LPG Rate / kg',
          money(
            gasBreakdown
              ?.lpgRatePerKg ||
            0,
          ),
        ],
        [
          'Total LPG Used',
          gasBreakdown
            ? `${quantity(gasBreakdown.totalGasKg)} kg`
            : '-',
        ],
        [
          'Gas Cost / Cover',
          money(
            gasPerCover,
          ),
        ],
        [
          'Total Gas Cost',
          money(
            gasTotal,
          ),
        ],
      ],
      columnStyles: {
        0: {
          cellWidth:
            105,
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
      styles: {
        font:
          'helvetica',
        fontSize:
          8,
        cellPadding:
          2,
      },
    },
  );

  y =
    tableEnd(
      doc,
      y + 28,
    ) + 7;

  if (
    gasRows.length
  ) {
    autoTable(
      doc,
      {
        startY:
          y,
        margin: {
          left:
            8,
          right:
            8,
          bottom:
            16,
        },
        theme:
          'grid',
        head: [[
          'Function',
          'Dish',
          'Category',
          'Guests',
          'kg / 100',
          'LPG Used',
          'Rate / kg',
          'Gas Cost',
        ]],
        body:
          gasRows.map(
            (row) => [
              [
                row.dayLabel,
                row.mealLabel,
              ]
                .filter(
                  Boolean,
                )
                .join(
                  ' - ',
                ) ||
                'Event Menu',
              row.dish,
              row.category,
              row.guests.toLocaleString(
                'en-IN',
              ),
              quantity(
                row.gasKgPer100,
              ),
              `${quantity(row.gasKg)} kg`,
              money(
                row.lpgRatePerKg,
              ),
              money(
                row.gasCost,
              ),
            ],
          ),
        headStyles: {
          fillColor: [
            15,
            23,
            42,
          ],
          textColor:
            255,
          fontStyle:
            'bold',
        },
        alternateRowStyles: {
          fillColor: [
            249,
            250,
            251,
          ],
        },
        columnStyles: {
          0: {
            cellWidth:
              29,
          },
          1: {
            cellWidth:
              38,
          },
          2: {
            cellWidth:
              25,
          },
          3: {
            cellWidth:
              15,
            halign:
              'right',
          },
          4: {
            cellWidth:
              18,
            halign:
              'right',
          },
          5: {
            cellWidth:
              20,
            halign:
              'right',
          },
          6: {
            cellWidth:
              21,
            halign:
              'right',
          },
          7: {
            cellWidth:
              24,
            halign:
              'right',
            fontStyle:
              'bold',
          },
        },
        styles: {
          font:
            'helvetica',
          fontSize:
            6.3,
          cellPadding:
            1.45,
          overflow:
            'linebreak',
          valign:
            'middle',
        },
      },
    );

    y =
      tableEnd(
        doc,
        y + 28,
      ) + 7;

    const functionTotals =
      gasBreakdown
        ?.functionTotals ||
      [];

    if (
      functionTotals.length
    ) {
      if (
        y > 238
      ) {
        doc.addPage();
        y = 18;
      }

      doc.setFont(
        'helvetica',
        'bold',
      );
      doc.setFontSize(
        9,
      );
      doc.setTextColor(
        35,
        105,
        190,
      );
      doc.text(
        'Gas Function Subtotals',
        14,
        y,
      );

      autoTable(
        doc,
        {
          startY:
            y + 3,
          margin: {
            left:
              14,
            right:
              14,
          },
          theme:
            'grid',
          head: [[
            'Function',
            'Guests',
            'LPG Used',
            'Gas Cost',
          ]],
          body:
            functionTotals.map(
              (row) => [
                [
                  row.dayLabel,
                  row.mealLabel,
                ]
                  .filter(
                    Boolean,
                  )
                  .join(
                    ' - ',
                  ) ||
                  'Event Menu',
                row.guests.toLocaleString(
                  'en-IN',
                ),
                `${quantity(row.gasKg)} kg`,
                money(
                  row.gasCost,
                ),
              ],
            ),
          headStyles: {
            fillColor: [
              35,
              105,
              190,
            ],
            textColor:
              255,
            fontStyle:
              'bold',
          },
          columnStyles: {
            0: {
              cellWidth:
                80,
            },
            1: {
              halign:
                'right',
            },
            2: {
              halign:
                'right',
            },
            3: {
              halign:
                'right',
              fontStyle:
                'bold',
            },
          },
          styles: {
            font:
              'helvetica',
            fontSize:
              7.5,
            cellPadding:
              1.8,
          },
        },
      );

      y =
        tableEnd(
          doc,
          y + 22,
        ) + 9;
    }
  } else {
    autoTable(
      doc,
      {
        startY:
          y,
        margin: {
          left:
            14,
          right:
            14,
        },
        theme:
          'grid',
        body: [[
          'Detailed gas rows are unavailable. The saved gas total is shown above.',
        ]],
        styles: {
          font:
            'helvetica',
          fontSize:
            8,
          cellPadding:
            2.4,
        },
      },
    );

    y =
      tableEnd(
        doc,
        y + 12,
      ) + 9;
  }

  if (
    y > 232
  ) {
    doc.addPage();
    y = 18;
  }

  sectionTitle(
    doc,
    'Plastic / Disposable Cost Details',
    y,
    'Item-wise quantity, unit cost and total disposable cost used for this event.',
  );

  const disposableRows =
    disposable.items.filter(
      (item) =>
        item.quantity > 0 ||
        item.unitCost > 0,
    );

  autoTable(
    doc,
    {
      startY:
        y + 8,
      margin: {
        left:
          14,
        right:
          14,
        bottom:
          16,
      },
      theme:
        'grid',
      head: [[
        'Item',
        'Quantity',
        'Unit',
        'Rate / Unit',
        'Total Cost',
      ]],
      body:
        disposableRows.length
          ? disposableRows.map(
              (item) => [
                item.name,
                quantity(
                  item.quantity,
                ),
                item.unit || 'pcs',
                money(
                  item.unitCost,
                ),
                money(
                  item.lineTotal,
                ),
              ],
            )
          : [[
              'No plastic / disposable items entered',
              '-',
              '-',
              '-',
              money(0),
            ]],
      headStyles: {
        fillColor: [
          15,
          23,
          42,
        ],
        textColor:
          255,
        fontStyle:
          'bold',
      },
      alternateRowStyles: {
        fillColor: [
          249,
          250,
          251,
        ],
      },
      columnStyles: {
        0: {
          cellWidth:
            70,
        },
        1: {
          cellWidth:
            24,
          halign:
            'right',
        },
        2: {
          cellWidth:
            24,
        },
        3: {
          cellWidth:
            32,
          halign:
            'right',
        },
        4: {
          halign:
            'right',
          fontStyle:
            'bold',
        },
      },
      styles: {
        font:
          'helvetica',
        fontSize:
          8,
        cellPadding:
          2,
      },
    },
  );

  y =
    tableEnd(
      doc,
      y + 30,
    ) + 7;

  autoTable(
    doc,
    {
      startY:
        y,
      margin: {
        left:
          70,
        right:
          14,
      },
      theme:
        'grid',
      body: [
        [
          'Plastic / Disposable Cost / Cover',
          money(
            disposablePerCover,
          ),
        ],
        [
          'Total Plastic / Disposable Cost',
          money(
            disposable.total,
          ),
        ],
      ],
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
      styles: {
        font:
          'helvetica',
        fontSize:
          8,
        cellPadding:
          2,
      },
    },
  );

  y =
    tableEnd(
      doc,
      y + 16,
    ) + 9;

  if (
    plan.unmatchedDishes
      .length
  ) {
    if (
      y > 245
    ) {
      doc.addPage();
      y = 18;
    }

    sectionTitle(
      doc,
      'Dishes Missing Recipe',
      y,
      'These dishes are included in the menu but cannot contribute to the grocery list until a recipe is linked.',
    );

    autoTable(
      doc,
      {
        startY:
          y + 8,
        margin: {
          left:
            14,
          right:
            14,
          bottom:
            16,
        },
        theme:
          'grid',
        body:
          plan.unmatchedDishes.map(
            (dish) => [
              dish,
            ],
          ),
        styles: {
          font:
            'helvetica',
          fontSize:
            8,
          cellPadding:
            2,
        },
      },
    );
  }

  addFooter(
    doc,
    businessName,
  );

  const filePart =
    safeFilePart(
      work.event.eventName ||
        work.event.clientName ||
        '',
    ) ||
    'catering-event';

  doc.save(
    `grocery-menu-cost-${filePart}.pdf`,
  );
}
