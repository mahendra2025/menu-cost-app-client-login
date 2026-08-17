'use client';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { RowInput } from 'jspdf-autotable';
import { calculate } from './store';
import { buildIngredientRequirementRows } from './pdfIngredientRequirements';
import { inferIngredientCategory } from './ingredientCatalog';
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

type PdfRecipe = {
  name: string;
  aliases: string[];
  baseGuests: number;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
};

function normalizeRecipeName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/\s+/g, ' ');
}

function readPdfRecipe(
  value: unknown,
): PdfRecipe | null {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return null;
  }

  const row = value as Record<string, unknown>;

  const name = String(
    row.name || row.dishName || '',
  ).trim();

  if (!name) return null;

  const aliases = Array.isArray(row.aliases)
    ? row.aliases
        .map((alias) =>
          String(alias || '').trim(),
        )
        .filter(Boolean)
    : [];

  const ingredients = Array.isArray(
    row.ingredients,
  )
    ? row.ingredients.flatMap((value) => {
        if (
          !value ||
          typeof value !== 'object' ||
          Array.isArray(value)
        ) {
          return [];
        }

        const ingredient =
          value as Record<string, unknown>;

        const ingredientName = String(
          ingredient.name ||
            ingredient.ingredientName ||
            '',
        ).trim();

        const quantity = Math.max(
          0,
          Number(
            ingredient.quantity ??
              ingredient.qty,
          ) || 0,
        );

        const unit = String(
          ingredient.unit ||
            ingredient.rateUnit ||
            '',
        ).trim();

        if (
          !ingredientName ||
          !(quantity > 0) ||
          !unit
        ) {
          return [];
        }

        return [{
          name: ingredientName,
          quantity,
          unit,
        }];
      })
    : [];

  return {
    name,
    aliases,
    baseGuests: Math.max(
      1,
      Number(row.baseGuests) || 100,
    ),
    ingredients,
  };
}

function ingredientQuantity(value: number) {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

/*
 * Catering display order used in the
 * Menu & Final Costing Report.
 *
 * The report stays meal-wise first,
 * then groups dishes category-wise
 * inside every meal.
 */
const MENU_CATEGORY_ORDER = [
  'Welcome Drink',
  'Mocktail',
  'Beverage',
  'Fruit',

  'Starter',
  'Soup',
  'Chaat',

  'Chinese',
  'Italian',
  'South Indian',
  'Sandwich',
  'Pizza',
  'Pasta',
  'Continental',
  'Mexican',
  'Thai',
  'Lebanese',
  'Sizzler',
  'Street Food',
  'Tandoor',
  'Live Counter',

  'Sweet',
  'Ice Cream',

  'Farsan',
  'Snacks',

  'Paneer',
  'Sabji',
  'Punjabi',
  'North Indian',
  'Rajasthani',
  'Gujarati',
  'Kathiyawadi',
  'Mughlai',
  'Awadhi',
  'Kashmiri',
  'Bengali',
  'Maharashtrian',
  'Sindhi',
  'Bihari',
  'Odia',
  'Hyderabadi',
  'Andhra',
  'Kerala',
  'Goan',
  'Main Course',

  'Jain',
  'Satvik',
  'Vegan',
  'Kids',

  'Bread',
  'Dal / Kadhi',
  'Rice',

  'Salad',
  'Raita',
  'Papad',
  'Pickle',
  'Condiments',

  'Bakery',
  'Dry Fruit',
  'Paan',
  'Mukhwas',

  'Fusion',
  'Other',
] as const;

function menuCategoryRank(
  category: string,
) {
  const index =
    MENU_CATEGORY_ORDER.findIndex(
      (value) =>
        value.toLowerCase() ===
        String(category || '')
          .trim()
          .toLowerCase(),
    );

  return index >= 0
    ? index
    : MENU_CATEGORY_ORDER.length;
}

const PURCHASE_CATEGORY_ORDER = [
  'Grocery',
  'Dairy',
  'Vegetables',
  'Fruits',
  'Spices',
  'Oils & Fats',
  'Beverages',
  'Bakery & Packaged',
  'Other',
] as const;

type PurchaseCategory =
  (typeof PURCHASE_CATEGORY_ORDER)[number];

function purchaseCategory(
  ingredientName: string,
): PurchaseCategory {
  const value =
    ingredientName
      .trim()
      .toLowerCase();

  // Fresh vegetables first so items such as
  // green chilli go to Vegetables, not Spices.
  const vegetableWords = [
    'onion',
    'tomato',
    'potato',
    'carrot',
    'cabbage',
    'capsicum',
    'spinach',
    'palak',
    'mint',
    'pudina',
    'garlic',
    'ginger',
    'green chilli',
    'green chili',
    'coriander leaves',
    'dhania leaves',
    'cauliflower',
    'broccoli',
    'gourd',
    'lauki',
    'beetroot',
    'pumpkin',
    'bhindi',
    'mushroom',
  ];

  if (
    vegetableWords.some(
      (word) => value.includes(word),
    )
  ) {
    return 'Vegetables';
  }

  const category =
    inferIngredientCategory(
      ingredientName,
    );

  switch (category) {
    case 'Dairy':
      return 'Dairy';

    case 'Vegetables & Herbs':
      return 'Vegetables';

    case 'Fruits':
      return 'Fruits';

    case 'Spices & Seasonings':
      return 'Spices';

    case 'Oils & Fats':
      return 'Oils & Fats';

    case 'Beverages':
      return 'Beverages';

    case 'Bakery & Packaged':
      return 'Bakery & Packaged';

    case 'Grains & Flour':
    case 'Pulses & Legumes':
    case 'Sweeteners':
    case 'Sauces & Condiments':
      return 'Grocery';

    default:
      // Cashew, almond, besan, atta and other
      // dry-store ingredients fall into Grocery.
      return 'Grocery';
  }
}

export function downloadFinalCostingPdf(
  work: WorkState,
  recipes: unknown[] = [],
) {
  const result = calculate(work);

  const recipeByName =
    new Map<string, PdfRecipe>();

  recipes.forEach((value) => {
    const recipe = readPdfRecipe(value);

    if (!recipe) return;

    [
      recipe.name,
      ...recipe.aliases,
    ].forEach((name) => {
      const key = normalizeRecipeName(name);

      if (key) {
        recipeByName.set(key, recipe);
      }
    });
  });

  const ingredientSummary = new Map<
    string,
    {
      name: string;
      quantity: number;
      unit: string;
      usedIn: Set<string>;
    }
  >();

  result.menuBreakdown.forEach((item) => {
    const recipe = recipeByName.get(
      normalizeRecipeName(item.name),
    );

    if (!recipe) return;

    const effectivePax = Math.max(
      0,
      Number(item.effectivePax) || 0,
    );

    const portionPercent = Math.max(
      0,
      Number(item.portionPercent) || 0,
    );

    const scale =
      (effectivePax / recipe.baseGuests) *
      (portionPercent / 100);

    const usedInLabel = [
      item.dayLabel,
      item.mealLabel,
      item.name,
    ]
      .filter(Boolean)
      .join(' - ');

    recipe.ingredients.forEach(
      (ingredient) => {
        const key = [
          ingredient.name
            .trim()
            .toLocaleLowerCase('en-IN'),
          ingredient.unit
            .trim()
            .toLocaleLowerCase('en-IN'),
        ].join('__');

        const requiredQuantity =
          ingredient.quantity * scale;

        const existing =
          ingredientSummary.get(key);

        if (existing) {
          existing.quantity +=
            requiredQuantity;

          existing.usedIn.add(
            usedInLabel || item.name,
          );

          return;
        }

        ingredientSummary.set(key, {
          name: ingredient.name,
          quantity: requiredQuantity,
          unit: ingredient.unit,
          usedIn: new Set([
            usedInLabel || item.name,
          ]),
        });
      },
    );
  });

  const ingredientRows: RowInput[] =
    PURCHASE_CATEGORY_ORDER.flatMap(
      (category) => {
        const items =
          Array.from(
            ingredientSummary.values(),
          )
            .filter(
              (ingredient) =>
                purchaseCategory(
                  ingredient.name,
                ) === category,
            )
            .sort(
              (left, right) =>
                left.name.localeCompare(
                  right.name,
                ),
            );

        if (!items.length) {
          return [];
        }

        const categoryRow: RowInput = [
          {
            content: category,
            colSpan: 4,
            styles: {
              fillColor: [
                230,
                238,
                248,
              ],
              textColor: [
                20,
                31,
                48,
              ],
              fontStyle: 'bold',
              fontSize: 9,
              cellPadding: 2.4,
            },
          },
        ];

        const rows: RowInput[] =
          items.map(
            (ingredient) => [
              ingredient.name,
              ingredientQuantity(
                ingredient.quantity,
              ),
              ingredient.unit,
              Array.from(
                ingredient.usedIn,
              ).join(', '),
            ],
          );

        return [
          categoryRow,
          ...rows,
        ];
      },
    );

  const menuCostingRows: RowInput[] = [];
  const activeManpowerRows = work.manpower.filter(
    (row) => Number(row.quantity) > 0,
  );

  const menuNameById =
    new Map(
      work.menu.map(
        (dish) => [
          dish.id,
          dish.name,
        ],
      ),
    );

  function manpowerDishNames(
    row: (typeof work.manpower)[number],
  ) {
    const ids =
      Array.isArray(
        row.assignedDishIds,
      )
        ? row.assignedDishIds
        : [];

    const names =
      ids
        .map(
          (id) =>
            menuNameById.get(id),
        )
        .filter(
          (
            name,
          ): name is string =>
            Boolean(name),
        );

    return names.length
      ? names.join(', ')
      : '-';
  }

  const manpowerTableRows: RowInput[] = activeManpowerRows.length
    ? activeManpowerRows.map((row) => [
        [row.dayLabel, row.mealLabel]
          .filter(Boolean)
          .join(' - ') || 'General Event',
        row.role || 'Staff',
        manpowerDishNames(row),
        Math.max(
          0,
          Number(row.quantity) || 0,
        ).toLocaleString('en-IN'),
        pdfMoney(
          Math.max(
            0,
            Number(row.rate) || 0,
          ),
        ),
        pdfMoney(
          Math.max(
            0,
            Number(row.quantity) || 0,
          ) *
            Math.max(
              0,
              Number(row.rate) || 0,
            ),
        ),
      ])
    : [[
        'General Event',
        'No manpower entered',
        '-',
        '-',
        '-',
        pdfMoney(0),
      ]];

  if (activeManpowerRows.length) {
    manpowerTableRows.push([
      '',
      '',
      '',
      '',
      'Total Manpower',
      pdfMoney(work.extras.staff),
    ]);
  }

  /*
   * Preserve original meal/function order,
   * but sort categories inside each meal.
   */
  const mealOrder =
    new Map<string, number>();

  result.menuBreakdown.forEach(
    (item) => {
      const mealKey =
        item.serviceId ||
        `${item.dayLabel || 'Event'}::${item.mealLabel || 'Event Menu'}`;

      if (!mealOrder.has(mealKey)) {
        mealOrder.set(
          mealKey,
          mealOrder.size,
        );
      }
    },
  );

  const orderedMenuBreakdown =
    result.menuBreakdown
      .map(
        (item, originalIndex) => ({
          item,
          originalIndex,
        }),
      )
      .sort((left, right) => {
        const leftMealKey =
          left.item.serviceId ||
          `${left.item.dayLabel || 'Event'}::${left.item.mealLabel || 'Event Menu'}`;

        const rightMealKey =
          right.item.serviceId ||
          `${right.item.dayLabel || 'Event'}::${right.item.mealLabel || 'Event Menu'}`;

        const mealDifference =
          (mealOrder.get(leftMealKey) ?? 9999) -
          (mealOrder.get(rightMealKey) ?? 9999);

        if (mealDifference !== 0) {
          return mealDifference;
        }

        const categoryDifference =
          menuCategoryRank(
            left.item.category,
          ) -
          menuCategoryRank(
            right.item.category,
          );

        if (categoryDifference !== 0) {
          return categoryDifference;
        }

        return (
          left.originalIndex -
          right.originalIndex
        );
      })
      .map(
        ({ item }) => item,
      );

  let previousMealKey = '';
  let previousCategory = '';

  orderedMenuBreakdown.forEach(
    (item) => {
      const mealKey =
        item.serviceId ||
        `${item.dayLabel || 'Event'}::${item.mealLabel || 'Event Menu'}`;

      const category =
        String(
          item.category ||
          'Other',
        ).trim() || 'Other';

      /*
       * New meal/function.
       */
      if (
        previousMealKey &&
        mealKey !== previousMealKey
      ) {
        menuCostingRows.push([
          {
            content: '',
            colSpan: 8,
            styles: {
              fillColor:
                [255, 255, 255],
              lineColor:
                [255, 255, 255],
              lineWidth: 0,
              minCellHeight: 5,
              cellPadding: 2,
            },
          },
        ]);

        previousCategory = '';
      }

      /*
       * Category heading inside the meal.
       */
      if (
        category !==
        previousCategory
      ) {
        menuCostingRows.push([
          {
            content:
              category,
            colSpan: 8,
            styles: {
              fillColor:
                [230, 238, 248],
              textColor:
                [20, 31, 48],
              fontStyle:
                'bold',
              fontSize: 8,
              cellPadding: 2.2,
            },
          },
        ]);

        previousCategory =
          category;
      }

      menuCostingRows.push([
        [
          item.dayLabel,
          item.mealLabel,
        ]
          .filter(Boolean)
          .join(' - ') ||
          'Event Menu',

        item.name,

        item.category,

        Number(
          item.portionQuantity,
        ) > 0
          ? `${item.portionQuantity} ${item.portionUnit || 'serving'}`
          : 'Not set',

        item.effectivePax
          .toLocaleString(
            'en-IN',
          ),

        pdfMoney(
          item.baseCostPerPlate,
        ),

        pdfMoney(
          item.adjustedCostPerPlate,
        ),

        pdfMoney(
          item.itemTotalCost,
        ),
      ]);

      previousMealKey =
        mealKey;
    },
  );
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
    author: work.profile.businessName || 'Menu Costing App',
    creator: 'Menu Costing App',
  });

  doc.setFillColor(16, 24, 39);
  doc.rect(0, 0, pageWidth, 38, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(work.profile.businessName || 'Menu Costing App', 14, 15);
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
  addSectionTitle(doc, 'Meal-wise Costing', cursorY);
  autoTable(doc, {
    startY: cursorY + 3,
    margin: { left: 14, right: 14, bottom: 16 },
    theme: 'grid',
    head: [['Day', 'Meal', 'Covers', 'Dishes', 'Food / Plate', 'Meal Food Total']],
    body: result.serviceSummaries.length
      ? result.serviceSummaries.map((service) => [
          service.dayLabel || '-',
          service.mealLabel || 'Event Menu',
          service.pax.toLocaleString('en-IN'),
          service.dishCount.toLocaleString('en-IN'),
          pdfMoney(service.menuCostPerPlate),
          pdfMoney(service.totalCost),
        ])
      : [['-', 'No meals added', '-', '-', '-', '-']],
    headStyles: { fillColor: [35, 105, 190], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [246, 249, 252] },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 45 },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
    },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.2 },
  });

  cursorY = tableEnd(doc, cursorY + 24) + 9;
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
    body: menuCostingRows.length
      ? menuCostingRows
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

  cursorY =
    tableEnd(
      doc,
      cursorY + 24,
    ) + 9;

  if (cursorY > 220) {
    doc.addPage();
    cursorY = 18;
  }

  addSectionTitle(
    doc,
    'Ingredient Purchase List - Category Wise',
    cursorY,
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 110, 126);
  doc.text(
    'Combined ingredient quantities for the full menu, grouped for purchasing.',
    14,
    cursorY + 5,
  );

  autoTable(doc, {
    startY: cursorY + 8,
    margin: {
      left: 14,
      right: 14,
      bottom: 16,
    },
    theme: 'grid',
    head: [[
      'Ingredient',
      'Required Quantity',
      'Unit',
      'Used In',
    ]],
    body: ingredientRows.length
      ? ingredientRows
      : [[
          'No linked recipe ingredients found',
          '-',
          '-',
          'Link dishes with recipes in Recipe Studio',
        ]],
    headStyles: {
      fillColor: [16, 24, 39],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [246, 249, 252],
    },
    columnStyles: {
      0: {
        cellWidth: 52,
      },
      1: {
        cellWidth: 32,
        halign: 'right',
        fontStyle: 'bold',
      },
      2: {
        cellWidth: 22,
      },
      3: {
        cellWidth: 76,
      },
    },
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 2,
      overflow: 'linebreak',
      valign: 'middle',
      textColor: [31, 41, 55],
    },
  });

  cursorY =
    tableEnd(
      doc,
      cursorY + 30,
    ) + 9;

  if (cursorY > 235) {
    doc.addPage();
    cursorY = 18;
  }

  addSectionTitle(
    doc,
    'Manpower Detail',
    cursorY,
  );
  autoTable(doc, {
    startY: cursorY + 3,
    margin: {
      left: 14,
      right: 14,
      bottom: 16,
    },
    theme: 'grid',
    head: [[
      'Function',
      'Staff Role',
      'Assigned Dishes',
      'People',
      'Rate / Person',
      'Total',
    ]],
    body: manpowerTableRows,
    headStyles: {
      fillColor: [16, 24, 39],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [246, 249, 252],
    },
    didParseCell: (data) => {
      if (
        data.section === 'body' &&
        data.row.index === manpowerTableRows.length - 1 &&
        activeManpowerRows.length > 0
      ) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [232, 240, 250];
      }
    },
    columnStyles: {
      0: {
        cellWidth: 32,
      },
      1: {
        cellWidth: 30,
      },
      2: {
        cellWidth: 50,
      },
      3: {
        cellWidth: 16,
        halign: 'right',
      },
      4: {
        cellWidth: 25,
        halign: 'right',
      },
      5: {
        cellWidth: 29,
        halign: 'right',
        fontStyle: 'bold',
      },
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.2,
      overflow: 'linebreak',
      valign: 'middle',
    },
  });

  cursorY = tableEnd(doc, cursorY + 30) + 9;
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
    doc.text('Generated by Menu Costing App', 14, 290);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - 14, 290, { align: 'right' });
  }

  const filePart =
    safeFilePart(work.event.eventName || work.event.clientName || '') ||
    'catering-event';
  doc.save(`final-costing-${filePart}.pdf`);
}
