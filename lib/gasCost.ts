import type {
  MenuItem,
  WorkState,
} from './types';

export type LpgCostSetting = {
  cylinderPrice: number;
  cylinderWeightKg: number;
};

export type GasCategoryRateValue = {
  categoryName: string;
  lpgKgPer100: number;
  basePax?: number;
  active?: boolean;
};

export type DishGasOverrideValue = {
  name: string;
  category?: string;
  gasKgPer100?: number;
  gasBurnerKgPerHour?: number;
  gasCookingMinutes?: number;
  gasBurnerCount?: number;
  gasBatchPax?: number;
  gasNoGas?: boolean;
};

export type GasCostMaster = {
  setting: LpgCostSetting;
  categoryRates: GasCategoryRateValue[];
  dishOverrides: DishGasOverrideValue[];
};

export type GasDishCostRow = {
  key: string;
  serviceKey: string;
  serviceId?: string;
  dayLabel: string;
  mealLabel: string;
  dishId: string;
  dish: string;
  category: string;
  guests: number;
  gasKgPer100: number;
  gasKg: number;
  lpgRatePerKg: number;
  gasCost: number;
  gasBurnerKgPerHour?: number;
  gasCookingMinutes?: number;
  gasBurnerCount?: number;
  gasBatchPax?: number;
  gasBatches?: number;
  source:
    | 'REAL_DISH_PROFILE'
    | 'DISH_OVERRIDE'
    | 'CATEGORY'
    | 'SAFE_COOKING_FALLBACK'
    | 'NO_GAS_CATEGORY'
    | 'DISH_NO_GAS';
};

export type GasFunctionSubtotal = {
  serviceKey: string;
  serviceId?: string;
  dayLabel: string;
  mealLabel: string;
  guests: number;
  gasKg: number;
  gasCost: number;
};

export type EventGasCostBreakdown = {
  setting: LpgCostSetting;
  lpgRatePerKg: number;
  rows: GasDishCostRow[];
  functionTotals: GasFunctionSubtotal[];
  totalGasKg: number;
  totalGasCost: number;
};

export const DEFAULT_LPG_SETTING: LpgCostSetting = {
  cylinderPrice: 1800,
  cylinderWeightKg: 19,
};

// Safety net for a cooking dish whose category rate is missing, disabled,
// or accidentally configured as zero. This guarantees that cooking dishes
// never silently disappear from gas costing while a real dish profile is
// still being collected.
export const DEFAULT_COOKING_GAS_KG_PER_100 = 0.5;

export const DEFAULT_GAS_CATEGORY_RATES:
  readonly GasCategoryRateValue[] = [
    { categoryName: 'Welcome Drink', lpgKgPer100: 0, basePax: 100, active: true },
    { categoryName: 'Mocktail', lpgKgPer100: 0, basePax: 100, active: true },
    { categoryName: 'Soup', lpgKgPer100: 0.70, basePax: 100, active: true },
    { categoryName: 'Starter', lpgKgPer100: 1.00, basePax: 100, active: true },
    { categoryName: 'Chaat', lpgKgPer100: 0.50, basePax: 100, active: true },
    { categoryName: 'Chinese', lpgKgPer100: 1.10, basePax: 100, active: true },
    { categoryName: 'Italian', lpgKgPer100: 0.80, basePax: 100, active: true },
    { categoryName: 'South Indian', lpgKgPer100: 1.20, basePax: 100, active: true },
    { categoryName: 'Punjabi', lpgKgPer100: 1.10, basePax: 100, active: true },
    { categoryName: 'Paneer', lpgKgPer100: 1.20, basePax: 100, active: true },
    { categoryName: 'Sabji', lpgKgPer100: 1.00, basePax: 100, active: true },
    { categoryName: 'Kathiyawadi', lpgKgPer100: 1.00, basePax: 100, active: true },
    { categoryName: 'Rajasthani', lpgKgPer100: 1.10, basePax: 100, active: true },
    { categoryName: 'Gujarati', lpgKgPer100: 0.90, basePax: 100, active: true },
    { categoryName: 'Dal / Kadhi', lpgKgPer100: 1.00, basePax: 100, active: true },
    { categoryName: 'Rice', lpgKgPer100: 0.70, basePax: 100, active: true },
    { categoryName: 'Bread', lpgKgPer100: 1.30, basePax: 100, active: true },
    { categoryName: 'Sweet', lpgKgPer100: 1.50, basePax: 100, active: true },
    { categoryName: 'Ice Cream', lpgKgPer100: 0, basePax: 100, active: true },
    { categoryName: 'Salad', lpgKgPer100: 0, basePax: 100, active: true },
    { categoryName: 'Papad', lpgKgPer100: 0.30, basePax: 100, active: true },
    { categoryName: 'Farsan', lpgKgPer100: 1.00, basePax: 100, active: true },
    { categoryName: 'Beverage', lpgKgPer100: 0.40, basePax: 100, active: true },
    { categoryName: 'Live Counter', lpgKgPer100: 1.50, basePax: 100, active: true },
    { categoryName: 'Breakfast', lpgKgPer100: 1.00, basePax: 100, active: true },
    { categoryName: 'Jain', lpgKgPer100: 1.00, basePax: 100, active: true },
    { categoryName: 'Kids', lpgKgPer100: 0.80, basePax: 100, active: true },
    { categoryName: 'Condiments', lpgKgPer100: 0.20, basePax: 100, active: true },
    { categoryName: 'Fruit', lpgKgPer100: 0, basePax: 100, active: true },
    { categoryName: 'Mexican', lpgKgPer100: 0.80, basePax: 100, active: true },
    { categoryName: 'Thai', lpgKgPer100: 0.90, basePax: 100, active: true },
    { categoryName: 'Greek', lpgKgPer100: 0.50, basePax: 100, active: true },
    { categoryName: 'Lebanese', lpgKgPer100: 0.80, basePax: 100, active: true },
    { categoryName: 'Mongolian', lpgKgPer100: 1.00, basePax: 100, active: true },
    { categoryName: 'Spanish', lpgKgPer100: 0.90, basePax: 100, active: true },
    { categoryName: 'Oriental', lpgKgPer100: 1.00, basePax: 100, active: true },
  ];

function safe(
  value: unknown,
) {
  const number =
    Number(value);

  return Number.isFinite(
    number,
  )
    ? Math.max(
        0,
        number,
      )
    : 0;
}

export function normalizeGasCategoryKey(
  value: unknown,
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
      '',
    );
}

const NO_GAS_CATEGORY_KEYS =
  new Set([
    'welcomedrink',
    'mocktail',
    'icecream',
    'salad',
    'fruit',
  ]);

export function isNoGasCategory(
  category: string,
) {
  return NO_GAS_CATEGORY_KEYS.has(
    normalizeGasCategoryKey(
      category,
    ),
  );
}

function normalizeDishKey(
  value: unknown,
) {
  return String(
    value || '',
  )
    .trim()
    .toLocaleLowerCase(
      'en-IN',
    )
    .replace(
      /\s+/g,
      ' ',
    );
}

function serviceIdentity(
  item: Pick<
    MenuItem,
    | 'serviceId'
    | 'dayLabel'
    | 'mealLabel'
  >,
) {
  const serviceId =
    String(
      item.serviceId ||
      '',
    ).trim();

  if (serviceId) {
    return `service:${serviceId}`;
  }

  return [
    'meal',
    String(
      item.dayLabel ||
      '',
    )
      .trim()
      .toLocaleLowerCase(
        'en-IN',
      ),
    String(
      item.mealLabel ||
      'Event Menu',
    )
      .trim()
      .toLocaleLowerCase(
        'en-IN',
      ),
  ].join('::');
}

export function lpgRatePerKg(
  setting:
    | Partial<LpgCostSetting>
    | null
    | undefined,
) {
  const cylinderPrice =
    safe(
      setting?.cylinderPrice ??
      DEFAULT_LPG_SETTING
        .cylinderPrice,
    );

  const cylinderWeightKg =
    safe(
      setting
        ?.cylinderWeightKg ??
      DEFAULT_LPG_SETTING
        .cylinderWeightKg,
    );

  if (
    !(cylinderWeightKg > 0)
  ) {
    return 0;
  }

  return (
    cylinderPrice /
    cylinderWeightKg
  );
}

export function effectiveGasCategoryRates(
  rates:
    | GasCategoryRateValue[]
    | null
    | undefined,
) {
  return Array.isArray(
    rates,
  )
    ? rates
    : [
        ...DEFAULT_GAS_CATEGORY_RATES,
      ];
}

export function categoryGasKgPer100(
  category: string,
  rates:
    | GasCategoryRateValue[]
    | null
    | undefined,
) {
  const key =
    normalizeGasCategoryKey(
      category,
    );

  const matched =
    effectiveGasCategoryRates(
      rates,
    ).find(
      (rate) =>
        normalizeGasCategoryKey(
          rate.categoryName,
        ) === key,
    );

  if (
    !matched ||
    matched.active === false
  ) {
    return 0;
  }

  const basePax =
    safe(
      matched.basePax ??
      100,
    ) || 100;

  return (
    safe(
      matched.lpgKgPer100,
    ) *
    (
      100 /
      basePax
    )
  );
}

function directDishOverride(
  item: MenuItem,
) {
  const raw =
    (
      item as MenuItem & {
        gasKgPer100?: number;
      }
    ).gasKgPer100;

  if (
    raw === undefined ||
    raw === null
  ) {
    return undefined;
  }

  const number =
    Number(raw);

  return Number.isFinite(
    number,
  )
    ? Math.max(
        0,
        number,
      )
    : undefined;
}

type RealDishGasProfile = {
  gasBurnerKgPerHour: number;
  gasCookingMinutes: number;
  gasBurnerCount: number;
  gasBatchPax: number;
};

function realDishGasProfile(
  override:
    | DishGasOverrideValue
    | undefined,
): RealDishGasProfile | null {
  if (!override) return null;

  const gasBurnerKgPerHour =
    Number(
      override.gasBurnerKgPerHour,
    );
  const gasCookingMinutes =
    Number(
      override.gasCookingMinutes,
    );
  const gasBurnerCount =
    Number(
      override.gasBurnerCount,
    );
  const gasBatchPax =
    Number(
      override.gasBatchPax,
    );

  if (
    !Number.isFinite(gasBurnerKgPerHour) ||
    gasBurnerKgPerHour <= 0 ||
    !Number.isFinite(gasCookingMinutes) ||
    gasCookingMinutes <= 0 ||
    !Number.isFinite(gasBurnerCount) ||
    gasBurnerCount <= 0 ||
    !Number.isFinite(gasBatchPax) ||
    gasBatchPax <= 0
  ) {
    return null;
  }

  return {
    gasBurnerKgPerHour,
    gasCookingMinutes,
    gasBurnerCount:
      Math.max(
        1,
        Math.round(
          gasBurnerCount,
        ),
      ),
    gasBatchPax:
      Math.max(
        1,
        Math.round(
          gasBatchPax,
        ),
      ),
  };
}

function realDishGasKg(
  guests: number,
  profile: RealDishGasProfile,
) {
  if (!(guests > 0)) {
    return {
      gasKg: 0,
      batches: 0,
    };
  }

  const batches =
    Math.max(
      1,
      Math.ceil(
        guests /
        profile.gasBatchPax,
      ),
    );

  const gasKgPerBatch =
    profile.gasBurnerKgPerHour *
    profile.gasBurnerCount *
    (
      profile.gasCookingMinutes /
      60
    );

  return {
    gasKg:
      gasKgPerBatch *
      batches,
    batches,
  };
}

export function calculateEventGas(
  work: WorkState,
  master?:
    | Partial<GasCostMaster>
    | null,
): EventGasCostBreakdown {
  const setting: LpgCostSetting = {
    cylinderPrice:
      safe(
        master?.setting
          ?.cylinderPrice ??
        DEFAULT_LPG_SETTING
          .cylinderPrice,
      ),
    cylinderWeightKg:
      safe(
        master?.setting
          ?.cylinderWeightKg ??
        DEFAULT_LPG_SETTING
          .cylinderWeightKg,
      ),
  };

  const ratePerKg =
    lpgRatePerKg(
      setting,
    );

  const categoryRates =
    effectiveGasCategoryRates(
      master?.categoryRates,
    );

  const overrideByDish =
    new Map<
      string,
      DishGasOverrideValue
    >();

  (
    master?.dishOverrides ||
    []
  ).forEach(
    (override) => {
      const key =
        normalizeDishKey(
          override.name,
        );

      if (!key) {
        return;
      }

      overrideByDish.set(
        key,
        override,
      );
    },
  );

  const fallbackPax =
    safe(
      work.event.pax,
    );

  const servicePax =
    new Map<
      string,
      number
    >();

  const serviceMeta =
    new Map<
      string,
      {
        serviceId?: string;
        dayLabel: string;
        mealLabel: string;
      }
    >();

  const menu =
    Array.isArray(
      work.menu,
    )
      ? work.menu
      : [];

  menu.forEach(
    (item) => {
      const serviceKey =
        serviceIdentity(
          item,
        );

      const pax =
        safe(
          item.servicePax,
        ) ||
        fallbackPax;

      servicePax.set(
        serviceKey,
        Math.max(
          servicePax.get(
            serviceKey,
          ) || 0,
          pax,
        ),
      );

      if (
        !serviceMeta.has(
          serviceKey,
        )
      ) {
        serviceMeta.set(
          serviceKey,
          {
            serviceId:
              item.serviceId
                ?.trim() ||
              undefined,
            dayLabel:
              String(
                item.dayLabel ||
                '',
              ).trim(),
            mealLabel:
              String(
                item.mealLabel ||
                work.event
                  .functionType ||
                'Event Menu',
              ).trim() ||
              'Event Menu',
          },
        );
      }
    },
  );

  const seen =
    new Set<string>();

  const rows:
    GasDishCostRow[] =
      [];

  menu.forEach(
    (item) => {
      const serviceKey =
        serviceIdentity(
          item,
        );

      const dishKey =
        normalizeDishKey(
          item.name,
        );

      const dedupeKey =
        `${serviceKey}::${dishKey}`;

      if (
        !dishKey ||
        seen.has(
          dedupeKey,
        )
      ) {
        return;
      }

      seen.add(
        dedupeKey,
      );

      const guests =
        servicePax.get(
          serviceKey,
        ) ||
        fallbackPax;

      const directOverride =
        directDishOverride(
          item,
        );

      const masterOverride =
        overrideByDish.get(
          dishKey,
        );

      const noGasDish =
        masterOverride
          ?.gasNoGas ===
        true;

      const realProfile =
        noGasDish
          ? null
          : realDishGasProfile(
              masterOverride,
            );

      const masterMeasuredGas =
        masterOverride &&
        masterOverride
          .gasKgPer100 !==
          undefined
          ? safe(
              masterOverride
                .gasKgPer100,
            )
          : undefined;

      const configuredDishGas =
        directOverride ??
        masterMeasuredGas;

      const noGasCategory =
        isNoGasCategory(
          item.category,
        );

      const categoryGas =
        categoryGasKgPer100(
          item.category,
          categoryRates,
        );

      const hasUsableOverride =
        noGasDish ||
        (
          configuredDishGas !==
            undefined &&
          (
            configuredDishGas > 0 ||
            noGasCategory
          )
        );

      const fallbackGasKgPer100 =
        noGasDish
          ? 0
          : hasUsableOverride
            ? (
                configuredDishGas ??
                0
              )
            : noGasCategory
              ? 0
              : categoryGas > 0
                ? categoryGas
                : DEFAULT_COOKING_GAS_KG_PER_100;

      const realGas =
        realProfile
          ? realDishGasKg(
              guests,
              realProfile,
            )
          : null;

      const gasKg =
        realGas
          ? realGas.gasKg
          : fallbackGasKgPer100 *
            guests /
            100;

      const gasKgPer100 =
        realProfile
          ? realDishGasKg(
              100,
              realProfile,
            ).gasKg
          : fallbackGasKgPer100;

      const gasCost =
        gasKg *
        ratePerKg;

      const meta =
        serviceMeta.get(
          serviceKey,
        );

      rows.push({
        key:
          dedupeKey,
        serviceKey,
        serviceId:
          meta?.serviceId,
        dayLabel:
          meta?.dayLabel ||
          '',
        mealLabel:
          meta?.mealLabel ||
          'Event Menu',
        dishId:
          item.id,
        dish:
          item.name,
        category:
          item.category,
        guests,
        gasKgPer100,
        gasKg,
        lpgRatePerKg:
          ratePerKg,
        gasCost,
        gasBurnerKgPerHour:
          realProfile
            ?.gasBurnerKgPerHour,
        gasCookingMinutes:
          realProfile
            ?.gasCookingMinutes,
        gasBurnerCount:
          realProfile
            ?.gasBurnerCount,
        gasBatchPax:
          realProfile
            ?.gasBatchPax,
        gasBatches:
          realGas
            ?.batches,
        source:
          realProfile
            ? 'REAL_DISH_PROFILE'
            : noGasDish
              ? 'DISH_NO_GAS'
              : hasUsableOverride
                ? 'DISH_OVERRIDE'
                : noGasCategory
                  ? 'NO_GAS_CATEGORY'
                  : categoryGas > 0
                    ? 'CATEGORY'
                    : 'SAFE_COOKING_FALLBACK',
      });
    },
  );

  const subtotalMap =
    new Map<
      string,
      GasFunctionSubtotal
    >();

  rows.forEach(
    (row) => {
      const current =
        subtotalMap.get(
          row.serviceKey,
        ) || {
          serviceKey:
            row.serviceKey,
          serviceId:
            row.serviceId,
          dayLabel:
            row.dayLabel,
          mealLabel:
            row.mealLabel,
          guests:
            row.guests,
          gasKg: 0,
          gasCost: 0,
        };

      current.guests =
        Math.max(
          current.guests,
          row.guests,
        );

      current.gasKg +=
        row.gasKg;

      current.gasCost +=
        row.gasCost;

      subtotalMap.set(
        row.serviceKey,
        current,
      );
    },
  );

  const functionTotals =
    Array.from(
      subtotalMap.values(),
    );

  const totalGasKg =
    rows.reduce(
      (sum, row) =>
        sum +
        row.gasKg,
      0,
    );

  const totalGasCost =
    rows.reduce(
      (sum, row) =>
        sum +
        row.gasCost,
      0,
    );

  return {
    setting,
    lpgRatePerKg:
      ratePerKg,
    rows,
    functionTotals,
    totalGasKg,
    totalGasCost,
  };
}

export function defaultGasCostMaster(): GasCostMaster {
  return {
    setting: {
      ...DEFAULT_LPG_SETTING,
    },
    categoryRates:
      DEFAULT_GAS_CATEGORY_RATES.map(
        (rate) => ({
          ...rate,
        }),
      ),
    dishOverrides: [],
  };
}
