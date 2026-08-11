import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('../../node_modules/@prisma/client');
const prisma = new PrismaClient();

const outputDir = new URL('.', import.meta.url).pathname;
const outputPath = `${outputDir}dishes-without-recipes.xlsx`;

const normalize = (value) =>
  String(value || '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/\s+/g, ' ');

try {
  const [dishes, catalog] = await Promise.all([
    prisma.dishMasterItem.findMany({
      select: {
        name: true,
        category: true,
        subcategory: true,
        rate: true,
        servingQuantity: true,
        servingUnit: true,
      },
    }),
    prisma.recipeCatalog.findUnique({
      where: { id: 'global' },
      select: { dishes: true },
    }),
  ]);

  const recipesByName = new Map(
    (Array.isArray(catalog?.dishes) ? catalog.dishes : [])
      .filter((dish) => dish && typeof dish === 'object' && !Array.isArray(dish))
      .map((dish) => [normalize(dish.name || dish.dishName), dish]),
  );

  const noRecipeDishes = dishes
    .filter((dish) => {
      const recipe = recipesByName.get(normalize(dish.name));
      return !recipe || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0;
    })
    .sort((left, right) =>
      left.category.localeCompare(right.category, undefined, { sensitivity: 'base' }) ||
      left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
    );

  const workbook = Workbook.create();
  const sheet = workbook.worksheets.add('No Recipe Dishes');
  sheet.showGridLines = false;

  sheet.mergeCells('A1:G1');
  sheet.getRange('A1').values = [['Dishes Without Recipes']];
  sheet.getRange('A1:G1').format = {
    fill: '#172554',
    font: { bold: true, color: '#FFFFFF', size: 18 },
    verticalAlignment: 'center',
  };
  sheet.getRange('A1:G1').format.rowHeight = 34;

  sheet.mergeCells('A2:C2');
  sheet.getRange('A2').values = [['Total dishes without recipes']];
  sheet.getRange('D2').formulas = [[`=COUNTA(B6:B${noRecipeDishes.length + 5})`]];
  sheet.getRange('A2:D2').format = {
    fill: '#DBEAFE',
    font: { bold: true, color: '#1E3A8A' },
    borders: { preset: 'outside', style: 'thin', color: '#93C5FD' },
  };
  sheet.getRange('D2').format.numberFormat = '#,##0';

  sheet.mergeCells('A3:G3');
  sheet.getRange('A3').values = [[
    'Definition: published dishes with no matching recipe or an empty ingredient list.',
  ]];
  sheet.getRange('A3:G3').format = {
    font: { italic: true, color: '#475569' },
  };

  const headers = [[
    'S.No.',
    'Dish Name',
    'Category',
    'Subcategory',
    'Current Rate',
    'Serving Quantity',
    'Serving Unit',
  ]];
  sheet.getRange('A5:G5').values = headers;

  const rows = noRecipeDishes.map((dish, index) => [
    index + 1,
    dish.name,
    dish.category,
    dish.subcategory || '',
    Number(dish.rate) || 0,
    Number(dish.servingQuantity) || 0,
    dish.servingUnit,
  ]);

  if (rows.length) {
    sheet.getRange(`A6:G${rows.length + 5}`).values = rows;
    const table = sheet.tables.add(`A5:G${rows.length + 5}`, true, 'NoRecipeDishesTable');
    table.style = 'TableStyleMedium2';
    table.showBandedRows = true;
    table.showFilterButton = true;
  }

  sheet.getRange('A5:G5').format = {
    fill: '#1D4ED8',
    font: { bold: true, color: '#FFFFFF' },
    verticalAlignment: 'center',
  };
  sheet.getRange('A5:G5').format.rowHeight = 26;
  sheet.getRange(`A6:A${rows.length + 5}`).format.numberFormat = '#,##0';
  sheet.getRange(`E6:E${rows.length + 5}`).format.numberFormat = '₹#,##0.00';
  sheet.getRange(`F6:F${rows.length + 5}`).format.numberFormat = '#,##0.00';

  sheet.getRange('A:A').format.columnWidth = 9;
  sheet.getRange('B:B').format.columnWidth = 30;
  sheet.getRange('C:C').format.columnWidth = 24;
  sheet.getRange('D:D').format.columnWidth = 22;
  sheet.getRange('E:E').format.columnWidth = 16;
  sheet.getRange('F:F').format.columnWidth = 18;
  sheet.getRange('G:G').format.columnWidth = 16;
  sheet.freezePanes.freezeRows(5);

  const inspection = await workbook.inspect({
    kind: 'table',
    range: 'No Recipe Dishes!A1:G15',
    include: 'values,formulas',
    tableMaxRows: 15,
    tableMaxCols: 7,
  });
  console.log(inspection.ndjson);

  const errors = await workbook.inspect({
    kind: 'match',
    searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
    options: { useRegex: true, maxResults: 100 },
    summary: 'final formula error scan',
  });
  console.log(errors.ndjson);

  const preview = await workbook.render({
    sheetName: 'No Recipe Dishes',
    range: 'A1:G30',
    scale: 1.5,
    format: 'png',
  });
  await fs.writeFile(
    `${outputDir}preview.png`,
    new Uint8Array(await preview.arrayBuffer()),
  );

  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(outputPath);

  console.log(JSON.stringify({
    totalDishes: dishes.length,
    dishesWithoutRecipes: noRecipeDishes.length,
    dishesWithRecipes: dishes.length - noRecipeDishes.length,
    outputPath,
  }));
} finally {
  await prisma.$disconnect();
}
