import {
  DEFAULT_GAS_CATEGORY_RATES,
  DEFAULT_LPG_SETTING,
  type GasCostMaster,
} from './gasCost';

import {
  prisma,
} from './prisma';

const LPG_SETTING_ID =
  'global';

export async function ensureGasCostMasters() {
  await prisma.lpgSetting.upsert({
    where: {
      id:
        LPG_SETTING_ID,
    },
    create: {
      id:
        LPG_SETTING_ID,
      cylinderPrice:
        DEFAULT_LPG_SETTING
          .cylinderPrice,
      cylinderWeightKg:
        DEFAULT_LPG_SETTING
          .cylinderWeightKg,
    },
    update: {},
  });

  await prisma.gasCategoryRate.createMany({
    data:
      DEFAULT_GAS_CATEGORY_RATES.map(
        (rate) => ({
          categoryName:
            rate.categoryName,
          lpgKgPer100:
            rate.lpgKgPer100,
          basePax:
            rate.basePax ??
            100,
          active:
            rate.active !==
            false,
        }),
      ),
    skipDuplicates:
      true,
  });
}

export async function readGasCostMaster(
  options?: {
    includeInactive?:
      boolean;
    includeDishOverrides?:
      boolean;
  },
): Promise<GasCostMaster> {
  await ensureGasCostMasters();

  const [
    setting,
    categoryRates,
    dishOverrides,
  ] =
    await Promise.all([
      prisma.lpgSetting.findUnique({
        where: {
          id:
            LPG_SETTING_ID,
        },
        select: {
          cylinderPrice:
            true,
          cylinderWeightKg:
            true,
        },
      }),

      prisma.gasCategoryRate.findMany({
        where:
          options
            ?.includeInactive
            ? undefined
            : {
                active:
                  true,
              },
        orderBy: {
          categoryName:
            'asc',
        },
        select: {
          categoryName:
            true,
          lpgKgPer100:
            true,
          basePax:
            true,
          active:
            true,
        },
      }),

      options
        ?.includeDishOverrides ===
        false
        ? Promise.resolve(
            [],
          )
        : prisma.dishMasterItem.findMany({
            where: {
              OR: [
                {
                  gasKgPer100: {
                    not:
                      null,
                  },
                },
                {
                  gasBurnerKgPerHour: {
                    not:
                      null,
                  },
                },
              ],
            },
            select: {
              name: true,
              category:
                true,
              gasKgPer100:
                true,
              gasBurnerKgPerHour:
                true,
              gasCookingMinutes:
                true,
              gasBurnerCount:
                true,
              gasBatchPax:
                true,
            },
          }),
    ]);

  return {
    setting: {
      cylinderPrice:
        Number(
          setting?.cylinderPrice ??
          DEFAULT_LPG_SETTING
            .cylinderPrice,
        ),
      cylinderWeightKg:
        Number(
          setting?.cylinderWeightKg ??
          DEFAULT_LPG_SETTING
            .cylinderWeightKg,
        ),
    },
    categoryRates:
      categoryRates.map(
        (rate) => ({
          categoryName:
            rate.categoryName,
          lpgKgPer100:
            Number(
              rate.lpgKgPer100,
            ) || 0,
          basePax:
            Math.max(
              1,
              Number(
                rate.basePax,
              ) || 100,
            ),
          active:
            rate.active,
        }),
      ),
    dishOverrides:
      dishOverrides
        .filter(
          (dish) =>
            dish.gasKgPer100 !==
              null ||
            dish.gasBurnerKgPerHour !==
              null,
        )
        .map(
          (dish) => ({
            name:
              dish.name,
            category:
              dish.category,
            gasKgPer100:
              dish.gasKgPer100 === null
                ? undefined
                : Math.max(
                    0,
                    Number(
                      dish.gasKgPer100,
                    ) || 0,
                  ),
            gasBurnerKgPerHour:
              dish.gasBurnerKgPerHour === null
                ? undefined
                : Math.max(
                    0,
                    Number(
                      dish.gasBurnerKgPerHour,
                    ) || 0,
                  ),
            gasCookingMinutes:
              dish.gasCookingMinutes === null
                ? undefined
                : Math.max(
                    0,
                    Number(
                      dish.gasCookingMinutes,
                    ) || 0,
                  ),
            gasBurnerCount:
              dish.gasBurnerCount === null
                ? undefined
                : Math.max(
                    1,
                    Number(
                      dish.gasBurnerCount,
                    ) || 1,
                  ),
            gasBatchPax:
              dish.gasBatchPax === null
                ? undefined
                : Math.max(
                    1,
                    Number(
                      dish.gasBatchPax,
                    ) || 1,
                  ),
          }),
        ),
  };
}
