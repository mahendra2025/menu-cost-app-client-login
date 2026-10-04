import { Prisma } from '@prisma/client';

import { prisma } from './prisma';
import type { WorkState } from './types';
import { calculate } from './workCosting';

function normalizeDishName(value: unknown) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('en-IN')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function asRecord(value: unknown) {
  return value &&
    typeof value === 'object' &&
    !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number)
    ? number
    : 0;
}

function recipeReadyKeys(
  dishes: unknown,
) {
  const keys = new Set<string>();

  if (!Array.isArray(dishes)) {
    return keys;
  }

  dishes.forEach((value) => {
    const row = asRecord(value);

    if (!row) {
      return;
    }

    const name =
      text(
        row.dishName ||
        row.name,
      );

    const ingredients =
      Array.isArray(
        row.ingredients,
      )
        ? row.ingredients
        : [];

    if (
      !name ||
      !ingredients.length
    ) {
      return;
    }

    const names = [
      name,
      ...(
        Array.isArray(
          row.aliases,
        )
          ? row.aliases
          : []
      ),
    ];

    names.forEach((candidate) => {
      const key =
        normalizeDishName(
          candidate,
        );

      if (key) {
        keys.add(key);
      }
    });
  });

  return keys;
}

type GlobalDish = {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  rate: number;
  servingQuantity: number;
  servingUnit: string;
  aliases: string[];
};

function dishAliases(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) =>
          text(item),
        )
        .filter(Boolean)
    : [];
}

function menuNeedsGlobalRepair(
  item: Record<string, unknown>,
) {
  const coverage =
    text(
      item.coverageStatus,
    ).toUpperCase();

  const costSource =
    text(
      item.costSource,
    ).toLowerCase();

  const rate =
    Math.max(
      0,
      numberValue(
        item.costPerPlate,
      ),
    );

  return (
    rate <= 0 ||
    coverage === 'NEW_DISH_PENDING' ||
    coverage === 'UNRESOLVED' ||
    coverage === 'REVIEW' ||
    (
      costSource === 'manual' &&
      rate <= 0
    )
  );
}

function repairMenuItem(
  item: Record<string, unknown>,
  dish: GlobalDish,
) {
  if (
    !menuNeedsGlobalRepair(
      item,
    )
  ) {
    return item;
  }

  const servingQuantity =
    Math.max(
      0.01,
      numberValue(
        dish.servingQuantity,
      ) || 1,
    );

  return {
    ...item,
    name: dish.name,
    category:
      dish.category ||
      item.category ||
      'Other',
    costPerPlate:
      Math.max(
        0,
        numberValue(
          dish.rate,
        ),
      ),
    portionQuantity:
      numberValue(
        item.portionQuantity,
      ) > 0
        ? item.portionQuantity
        : servingQuantity,
    portionBaseQuantity:
      numberValue(
        item.portionBaseQuantity,
      ) > 0
        ? item.portionBaseQuantity
        : servingQuantity,
    portionUnit:
      text(
        item.portionUnit,
      ) ||
      dish.servingUnit ||
      'serving',
    detectionSource:
      'catalog',
    detectionConfidence: 100,
    detectionReason:
      'Super Admin published this dish and recipe to Global Dish Master.',
    costSource:
      'catalog_recipe',
    coverageStatus:
      'COSTED',
    costQualityStatus:
      'READY',
    costConfidence: 100,
    rateCoveragePercent: 100,
    coverageReason:
      'Global recipe and Dish Master rate are ready.',
    costApprovalStatus:
      'NOT_REQUIRED',
    costApprovedAt:
      undefined,
    costApprovalReason:
      'Global recipe and Dish Master rate are trusted.',
  };
}

export async function syncUnknownDishLifecycle() {
  const catalog =
    await prisma.recipeCatalog.findUnique({
      where: {
        id: 'global',
      },
      select: {
        dishes: true,
      },
    });

  const readyKeys =
    recipeReadyKeys(
      catalog?.dishes,
    );

  if (!readyKeys.size) {
    return {
      readySuggestions: 0,
      repairedDrafts: 0,
      repairedMenuItems: 0,
    };
  }

  const masterRows =
    await prisma.dishMasterItem.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        subcategory: true,
        rate: true,
        servingQuantity: true,
        servingUnit: true,
        aliases: true,
      },
    });

  const readyMasters:
    GlobalDish[] =
    masterRows.flatMap(
      (row) => {
        const nameKey =
          normalizeDishName(
            row.name,
          );

        const aliases =
          dishAliases(
            row.aliases,
          );

        const recipeMatched =
          readyKeys.has(
            nameKey,
          ) ||
          aliases.some(
            (alias) =>
              readyKeys.has(
                normalizeDishName(
                  alias,
                ),
              ),
          );

        if (
          !recipeMatched ||
          !(Number(row.rate) > 0)
        ) {
          return [];
        }

        return [{
          id: row.id,
          name: row.name,
          category: row.category,
          subcategory: row.subcategory,
          rate: row.rate,
          servingQuantity:
            row.servingQuantity,
          servingUnit:
            row.servingUnit,
          aliases,
        }];
      },
    );

  if (!readyMasters.length) {
    return {
      readySuggestions: 0,
      repairedDrafts: 0,
      repairedMenuItems: 0,
    };
  }

  const masterByKey =
    new Map<
      string,
      GlobalDish
    >();

  readyMasters.forEach(
    (dish) => {
      [
        dish.name,
        ...dish.aliases,
      ].forEach(
        (candidate) => {
          const key =
            normalizeDishName(
              candidate,
            );

          if (key) {
            masterByKey.set(
              key,
              dish,
            );
          }
        },
      );
    },
  );

  const suggestions =
    await prisma.pendingDishSuggestion.findMany({
      where: {
        status: {
          in: [
            'PENDING',
            'RECIPE_IN_PROGRESS',
            'APPROVED',
          ],
        },
      },
      select: {
        id: true,
        name: true,
        canonicalName: true,
        matchedDishName: true,
      },
    });

  let readySuggestions = 0;

  for (const suggestion of suggestions) {
    const candidateKeys =
      [
        suggestion.name,
        suggestion.canonicalName,
        suggestion.matchedDishName,
      ]
        .map(
          normalizeDishName,
        )
        .filter(Boolean);

    const matchedDish =
      candidateKeys
        .map(
          (key) =>
            masterByKey.get(
              key,
            ),
        )
        .find(Boolean);

    if (!matchedDish) {
      continue;
    }

    await prisma.pendingDishSuggestion.update({
      where: {
        id: suggestion.id,
      },
      data: {
        status:
          'GLOBAL_READY',
        canonicalName:
          matchedDish.name,
        matchedDishName:
          matchedDish.name,
        suggestedCategory:
          matchedDish.category,
        suggestedSubcategory:
          matchedDish.subcategory,
        recommendation:
          'GLOBAL_RECIPE_READY',
        analysisReason:
          'Global recipe and Dish Master rate are ready.',
        analyzedAt:
          new Date(),
      },
    });

    readySuggestions += 1;
  }

  const drafts =
    await prisma.tenantDraftCosting.findMany({
      select: {
        id: true,
        workData: true,
      },
    });

  let repairedDrafts = 0;
  let repairedMenuItems = 0;

  for (const draft of drafts) {
    try {
      const workRecord =
      asRecord(
        draft.workData,
      );

    if (
      !workRecord ||
      !Array.isArray(
        workRecord.menu,
      )
    ) {
      continue;
    }

    let changed = 0;

    const nextMenu =
      workRecord.menu.map(
        (value) => {
          const item =
            asRecord(
              value,
            );

          if (!item) {
            return value;
          }

          const key =
            normalizeDishName(
              item.name,
            );

          const master =
            masterByKey.get(
              key,
            );

          if (!master) {
            return value;
          }

          const repaired =
            repairMenuItem(
              item,
              master,
            );

          if (
            repaired !== item
          ) {
            changed += 1;
          }

          return repaired;
        },
      );

    if (!changed) {
      continue;
    }

    const nextWork = {
      ...workRecord,
      menu: nextMenu,
      updatedAt:
        new Date()
          .toISOString(),
    } as unknown as WorkState;

    const summary =
      calculate(
        nextWork,
      );

    const event =
      asRecord(
        nextWork.event,
      ) || {};

    await prisma.tenantDraftCosting.update({
      where: {
        id: draft.id,
      },
      data: {
        eventName:
          text(
            event.eventName,
          ),
        clientName:
          text(
            event.clientName,
          ),
        eventDate:
          text(
            event.eventDate,
          ),
        menuCount:
          nextMenu.length,
        totalCovers:
          Math.max(
            0,
            Math.round(
              summary.totalCovers,
            ),
          ),
        totalCost:
          summary.totalCost,
        sellingPricePerPlate:
          Math.max(
            0,
            numberValue(
              nextWork.sellingPricePerPlate,
            ),
          ),
        totalSelling:
          summary.totalSelling,
        totalProfit:
          summary.totalProfit,
        workData:
          nextWork as unknown as Prisma.InputJsonValue,
      },
    });

      repairedDrafts += 1;
      repairedMenuItems +=
        changed;
    } catch (draftRepairError) {
      console.error(
        'Unknown dish draft repair failed:',
        draft.id,
        draftRepairError,
      );
    }
  }

  return {
    readySuggestions,
    repairedDrafts,
    repairedMenuItems,
  };
}
