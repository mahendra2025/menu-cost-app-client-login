import type {
  DisposableCostItem,
  ManpowerInputs,
  ManpowerRow,
  MenuItem,
} from './types';

export type DisposableCostLine = DisposableCostItem & {
  lineTotal: number;
};

export type DisposableCostSummary = {
  items: DisposableCostLine[];
  activeItemCount: number;
  total: number;
};

export type DisposableAutoRecommendation = {
  id: string;
  name: string;
  quantity: number;
  reason: string;
};

export type DisposableAutoAssignment = {
  items: DisposableCostItem[];
  recommendations: DisposableAutoRecommendation[];
  covers: number;
  disposableCovers: number;
  drinkCovers: number;
  packedMealCovers: number;
  foodHandlingStaff: number;
  totalSuggestedUnits: number;
};

type DisposableAutoAssignInput = {
  items: DisposableCostItem[];
  covers: number;
  menu?: MenuItem[];
  manpower?: ManpowerRow[];
  manpowerInputs?: ManpowerInputs;
};

type ServicePlan = {
  pax: number;
  serviceStyle: MenuItem['serviceStyle'];
  categories: Set<string>;
};

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function safeWhole(value: unknown) {
  return Math.max(0, Math.round(safeNumber(value)));
}

function normalize(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bufferedQuantity(quantity: number, bufferPercent: number) {
  const safeQuantity = safeWhole(quantity);
  return Math.ceil((safeQuantity * (100 + bufferPercent)) / 100);
}

function serviceKey(item: MenuItem) {
  const id = String(item.serviceId ?? '').trim();
  if (id) return `id:${id}`;

  const day = normalize(item.dayLabel);
  const meal = normalize(item.mealLabel);
  if (day || meal) return `label:${day}|${meal}`;

  return 'default';
}

function resolveServicePlans(menu: MenuItem[], fallbackCovers: number) {
  const plans = new Map<string, ServicePlan>();

  (Array.isArray(menu) ? menu : []).forEach((item) => {
    const key = serviceKey(item);
    const existing = plans.get(key) ?? {
      pax: 0,
      serviceStyle: undefined,
      categories: new Set<string>(),
    };

    existing.pax = Math.max(existing.pax, safeWhole(item.servicePax));
    existing.serviceStyle = item.serviceStyle ?? existing.serviceStyle;
    const category = normalize(item.category);
    if (category) existing.categories.add(category);
    plans.set(key, existing);
  });

  if (!plans.size && fallbackCovers > 0) {
    plans.set('default', {
      pax: fallbackCovers,
      serviceStyle: 'BUFFET',
      categories: new Set<string>(),
    });
  }

  const values = Array.from(plans.values());
  const knownCovers = values.reduce((sum, plan) => sum + plan.pax, 0);

  if (values.length === 1 && values[0].pax <= 0 && fallbackCovers > 0) {
    values[0].pax = fallbackCovers;
  } else if (values.length > 1 && knownCovers <= 0 && fallbackCovers > 0) {
    values[0].pax = fallbackCovers;
  }

  return values;
}

function categoryMatches(plan: ServicePlan, terms: string[]) {
  return Array.from(plan.categories).some((category) =>
    terms.some((term) => category.includes(term)),
  );
}

function foodHandlingStaff(manpower: ManpowerRow[]) {
  return (Array.isArray(manpower) ? manpower : []).reduce((sum, row) => {
    const role = normalize(row.role);
    if (
      !/(chef|cook|helper|kitchen|counter|bread|prep|dishwash)/.test(role)
    ) {
      return sum;
    }

    return sum + safeWhole(row.quantity);
  }, 0);
}

function setSuggestedQuantity(
  item: DisposableCostItem,
  quantityByName: Map<string, { quantity: number; reason: string }>,
) {
  const suggestion = quantityByName.get(normalize(item.name));
  if (!suggestion) return { ...item };

  return {
    ...item,
    quantity: suggestion.quantity,
  };
}

export function buildDisposableAutoAssignment({
  items,
  covers,
  menu = [],
  manpower = [],
  manpowerInputs,
}: DisposableAutoAssignInput): DisposableAutoAssignment {
  const safeCovers = safeWhole(covers);
  const services = resolveServicePlans(menu, safeCovers);
  const serviceCovers = services.reduce((sum, plan) => sum + plan.pax, 0);
  const effectiveCovers = Math.max(safeCovers, serviceCovers);

  const packedMealCovers = services.reduce(
    (sum, plan) =>
      sum + (plan.serviceStyle === 'PACKED_MEAL' ? plan.pax : 0),
    0,
  );

  const disposableCovers =
    manpowerInputs?.crockeryType === 'DISPOSABLE'
      ? effectiveCovers
      : packedMealCovers;

  const drinkCovers = services.reduce(
    (sum, plan) =>
      sum +
      (categoryMatches(plan, [
        'welcome drink',
        'welcome juice',
        'mocktail',
        'beverage',
        'juice',
      ])
        ? plan.pax
        : 0),
    0,
  );

  const waterCupCovers =
    manpowerInputs?.crockeryType === 'DISPOSABLE' &&
    (manpowerInputs?.waterService === 'GLASS_SERVICE' ||
      manpowerInputs?.waterService === 'TABLE_SERVICE')
      ? effectiveCovers
      : 0;

  const packedSweetCovers = services.reduce(
    (sum, plan) =>
      sum +
      (plan.serviceStyle === 'PACKED_MEAL' &&
      categoryMatches(plan, ['sweet', 'dessert'])
        ? plan.pax
        : 0),
    0,
  );

  const handlers = foodHandlingStaff(manpower);
  const functionCount = Math.max(services.length, effectiveCovers > 0 ? 1 : 0);

  const suggested = new Map<
    string,
    { quantity: number; reason: string }
  >();

  const assign = (name: string, quantity: number, reason: string) => {
    suggested.set(normalize(name), {
      quantity: safeWhole(quantity),
      reason,
    });
  };

  assign(
    'Tissue',
    bufferedQuantity(effectiveCovers, 10),
    '1 tissue per cover + 10% buffer',
  );
  assign(
    'Napkin',
    bufferedQuantity(effectiveCovers, 5),
    '1 napkin per cover + 5% buffer',
  );
  assign(
    'Cap',
    handlers,
    '1 cap per food-handling staff member',
  );
  assign(
    'Cafe Cap',
    0,
    'Kept manual because Cap already covers food-handling staff',
  );
  assign(
    'Gloves',
    handlers * 2,
    '2 glove pairs per food-handling staff member',
  );
  assign(
    'Packing Roll',
    effectiveCovers > 0
      ? Math.max(functionCount, Math.ceil(effectiveCovers / 200))
      : 0,
    'Approx. 1 roll per 200 covers, minimum 1 per function',
  );
  assign(
    'Table Roll',
    effectiveCovers > 0 ? Math.ceil(effectiveCovers / 50) : 0,
    'Approx. 1 table roll per 50 covers',
  );
  assign(
    'Disposable Cup',
    bufferedQuantity(drinkCovers + waterCupCovers, 10),
    'Drink/water cup demand + 10% buffer',
  );
  assign(
    'Plates',
    bufferedQuantity(disposableCovers, 10),
    'Disposable or packed-meal covers + 10% buffer',
  );
  assign(
    'Spoon',
    bufferedQuantity(disposableCovers, 10),
    'Disposable or packed-meal covers + 10% buffer',
  );
  assign(
    'Silver Roll',
    0,
    'Decorative/packing use varies by event; keep manual',
  );
  assign(
    'Toothpick',
    bufferedQuantity(effectiveCovers, 5),
    '1 toothpick per cover + 5% buffer',
  );
  assign(
    'Food Box',
    bufferedQuantity(packedMealCovers, 5),
    '1 food box per packed meal + 5% buffer',
  );
  assign(
    'Sweet Box',
    bufferedQuantity(packedSweetCovers, 5),
    '1 sweet box per packed sweet meal + 5% buffer',
  );
  assign(
    'Garbage Bag',
    effectiveCovers > 0
      ? Math.max(functionCount, Math.ceil(effectiveCovers / 50))
      : 0,
    'Approx. 1 garbage bag per 50 covers, minimum 1 per function',
  );
  assign(
    'Fuel',
    0,
    'Fuel stays in Gas & Transport and is never auto-assigned here',
  );

  const nextItems = (Array.isArray(items) ? items : []).map((item) =>
    setSuggestedQuantity(item, suggested),
  );

  const recommendations = nextItems
    .map((item) => {
      const suggestion = suggested.get(normalize(item.name));
      if (!suggestion || suggestion.quantity <= 0) return null;

      return {
        id: item.id,
        name: item.name,
        quantity: suggestion.quantity,
        reason: suggestion.reason,
      };
    })
    .filter(
      (item): item is DisposableAutoRecommendation =>
        Boolean(item),
    );

  return {
    items: nextItems,
    recommendations,
    covers: effectiveCovers,
    disposableCovers,
    drinkCovers: drinkCovers + waterCupCovers,
    packedMealCovers,
    foodHandlingStaff: handlers,
    totalSuggestedUnits: recommendations.reduce(
      (sum, item) => sum + item.quantity,
      0,
    ),
  };
}

export function calculateDisposableCost(
  items: DisposableCostItem[],
): DisposableCostSummary {
  const normalized = (Array.isArray(items) ? items : []).map((item) => {
    const quantity = safeNumber(item.quantity);
    const unitCost = safeNumber(item.unitCost);

    return {
      ...item,
      unit: String(item.unit || 'pcs').trim() || 'pcs',
      quantity,
      unitCost,
      lineTotal: quantity * unitCost,
    };
  });

  const total = normalized.reduce(
    (sum, item) => sum + item.lineTotal,
    0,
  );

  return {
    items: normalized,
    activeItemCount: normalized.filter((item) => item.lineTotal > 0).length,
    total,
  };
}

export function disposableCostPerCover(
  total: number,
  covers: number,
) {
  const safeTotal = safeNumber(total);
  const safeCovers = Math.max(0, Math.round(safeNumber(covers)));

  return safeCovers > 0 ? safeTotal / safeCovers : 0;
}
