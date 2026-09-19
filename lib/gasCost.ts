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
  gasKgPer100: number;
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
  source:
    | 'DISH_OVERRIDE'
    | 'CATEGORY'
    | 'ZERO_FALLBACK';
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
  return (
    Array.isArray(rates) &&
    rates.length
      ? rates
      : [
          ...DEFAULT_GAS_CATEGORY_RATES,
        ]
  );
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

      const hasOverride =
        directOverride !==
          undefined ||
        (
          masterOverride &&
          Number.isFinite(
            Number(
              masterOverride
                .gasKgPer100,
            ),
          )
        );

      const gasKgPer100 =
        directOverride ??
        (
          masterOverride
            ? safe(
                masterOverride
                  .gasKgPer100,
              )
            : categoryGasKgPer100(
                item.category,
                categoryRates,
              )
        );

      const gasKg =
        gasKgPer100 *
        guests /
        100;

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
        source:
          hasOverride
            ? 'DISH_OVERRIDE'
            : gasKgPer100 > 0
              ? 'CATEGORY'
              : 'ZERO_FALLBACK',
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
