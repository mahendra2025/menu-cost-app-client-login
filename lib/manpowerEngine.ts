import {
  CATEGORY_WORKLOAD,
  DEFAULT_MANPOWER_INPUTS,
  MANPOWER_ROLE_MASTER,
  cleaningRatio,
  dishwashingRatio,
  normalizeManpowerRules,
  waiterRatio,
  waterServiceRatio,
  type ManpowerRuleConfig,
} from './manpowerMaster';
import type {
  ManpowerInputs,
  ManpowerRow,
  MenuItem,
  ServiceStyle,
} from './types';

type Recommendation = {
  quantity: number;
  reason: string;
  workloadScore?: number;
  stationLabel?: string;
};

export type MealManpowerEngineInput = {
  mealKey: string;
  menu: MenuItem[];
  guests: number;
  serviceStyle?: ServiceStyle;
  inputs?: ManpowerInputs;
  existingRows?: ManpowerRow[];
  serviceId?: string;
  dayLabel?: string;
  mealLabel?: string;
  allowLegacyRows?: boolean;
  rules?: Partial<ManpowerRuleConfig> | null;
};

function normalize(value: unknown) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/&/g, ' and ')
    .replace(/[\/_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function categoryKey(item: MenuItem) {
  return normalize(item.category);
}

function matchesCategory(item: MenuItem, keys: string[]) {
  const category = categoryKey(item);
  return keys.some((key) => category === key || category.includes(key));
}

function countByCategory(menu: MenuItem[], keys: string[]) {
  return menu.filter((item) => matchesCategory(item, keys)).length;
}

function ceilRatio(value: number, ratio: number) {
  if (!(value > 0) || !(ratio > 0)) return 0;
  return Math.ceil(value / ratio);
}

function resolveInputs(inputs?: ManpowerInputs): Required<ManpowerInputs> {
  return {
    venueType: inputs?.venueType ?? DEFAULT_MANPOWER_INPUTS.venueType,
    waterService: inputs?.waterService ?? DEFAULT_MANPOWER_INPUTS.waterService,
    crockeryType: inputs?.crockeryType ?? DEFAULT_MANPOWER_INPUTS.crockeryType,
    serviceLevel: inputs?.serviceLevel ?? DEFAULT_MANPOWER_INPUTS.serviceLevel,
  };
}

function resolveServiceStyle(
  menu: MenuItem[],
  explicit?: ServiceStyle,
): ServiceStyle {
  if (explicit) return explicit;
  return menu.find((item) => item.serviceStyle)?.serviceStyle ?? 'BUFFET';
}

function dishWorkload(item: MenuItem) {
  const category = categoryKey(item);
  const exact = CATEGORY_WORKLOAD[category];
  if (exact !== undefined) return exact;

  const partial = Object.entries(CATEGORY_WORKLOAD).find(([key]) =>
    category.includes(key),
  );

  return partial?.[1] ?? 0.7;
}

export function calculateMenuWorkload(menu: MenuItem[]) {
  return menu.reduce((sum, item) => sum + dishWorkload(item), 0);
}

export function detectMenuStations(menu: MenuItem[]) {
  const stations = new Set<string>();

  menu.forEach((item) => {
    const category = categoryKey(item);

    if (category.includes('welcome drink') || category.includes('mocktail') || category.includes('beverage')) {
      stations.add('Beverage');
      return;
    }
    if (category.includes('sweet') || category.includes('ice cream')) {
      stations.add('Sweet');
      return;
    }
    if (category.includes('farsan') || category.includes('starter')) {
      stations.add('Farsan / Starter');
      return;
    }
    if (
      category.includes('paneer') ||
      category.includes('sabji') ||
      category.includes('vegetable') ||
      category.includes('punjabi') ||
      category.includes('gujarati') ||
      category.includes('kathiyawadi') ||
      category.includes('rajasthani')
    ) {
      stations.add('Main Course');
      return;
    }
    if (category.includes('dal') || category.includes('kadhi') || category.includes('rice')) {
      stations.add('Dal / Rice');
      return;
    }
    if (category.includes('bread')) {
      stations.add('Bread');
      return;
    }
    if (category.includes('chaat')) {
      stations.add('Chaat');
      return;
    }
    if (category.includes('chinese')) {
      stations.add('Chinese');
      return;
    }
    if (category.includes('italian')) {
      stations.add('Italian');
      return;
    }
    if (category.includes('south indian')) {
      stations.add('South Indian');
      return;
    }
    if (category.includes('salad')) {
      stations.add('Salad');
      return;
    }
    if (category.includes('fruit')) {
      stations.add('Fruit');
      return;
    }
  });

  return Array.from(stations);
}

function generalCounterStationCount(menu: MenuItem[]) {
  return detectMenuStations(menu).filter(
    (station) =>
      !['Bread', 'Chaat', 'Chinese', 'Italian', 'South Indian'].includes(station),
  ).length;
}

function isOtherLiveDish(item: MenuItem) {
  const category = categoryKey(item);
  if (
    ['chaat', 'chinese', 'italian', 'south indian', 'bread'].some((key) =>
      category.includes(key),
    )
  ) {
    return false;
  }

  const name = normalize(item.name);
  return /\b(live|grill|barbecue|bbq|pizza|jalebi|malpua|momos|tawa|fry)\b/.test(name) ||
    category.includes('live counter');
}

function rowBelongsToMeal(
  row: ManpowerRow,
  input: MealManpowerEngineInput,
) {
  const rowServiceId = normalize(row.serviceId);
  const serviceId = normalize(input.serviceId);

  if (rowServiceId && serviceId) {
    return rowServiceId === serviceId;
  }

  if (rowServiceId || serviceId) return false;

  return (
    normalize(row.dayLabel) === normalize(input.dayLabel) &&
    normalize(row.mealLabel) === normalize(input.mealLabel)
  );
}

function isLegacyGlobalRow(row: ManpowerRow) {
  return !(
    normalize(row.serviceId) ||
    normalize(row.dayLabel) ||
    normalize(row.mealLabel)
  );
}

function existingForMaster(
  role: (typeof MANPOWER_ROLE_MASTER)[number],
  input: MealManpowerEngineInput,
) {
  const aliases = new Set(
    [role.role, ...role.aliases].map(normalize),
  );

  return (input.existingRows ?? []).find((row) => {
    if (!aliases.has(normalize(row.role))) return false;
    if (rowBelongsToMeal(row, input)) return true;
    return Boolean(input.allowLegacyRows && isLegacyGlobalRow(row));
  });
}

function buildRecommendations(input: MealManpowerEngineInput) {
  const menu = input.menu ?? [];
  const guests = Math.max(0, Number(input.guests) || 0);
  const serviceStyle = resolveServiceStyle(menu, input.serviceStyle);
  const settings = resolveInputs(input.inputs);
  const rules = normalizeManpowerRules(input.rules);
  const recommendations = new Map<string, Recommendation>();
  const workload = calculateMenuWorkload(menu);

  const waiters = ceilRatio(
    guests,
    waiterRatio(serviceStyle, settings.serviceLevel, rules),
  );
  recommendations.set('waiter', {
    quantity: waiters,
    reason: `${guests} guests ÷ ${waiterRatio(serviceStyle, settings.serviceLevel, rules)} per ${serviceStyle.toLowerCase().replace(/_/g, ' ')} waiter`,
  });

  const captains = waiters > 0 ? Math.ceil(waiters / rules.waitersPerCaptain) : 0;
  recommendations.set('captain', {
    quantity: captains,
    reason: waiters > 0 ? `1 captain per ${rules.waitersPerCaptain} waiters · ${waiters} waiters` : 'No waiter team detected',
  });

  const waterRatio = waterServiceRatio(settings.waterService, rules);
  const waterStaff = ceilRatio(
    guests,
    waterRatio,
  );
  recommendations.set('water_staff', {
    quantity: waterStaff,
    reason: `${guests} guests ÷ ${waterRatio} for ${settings.waterService.toLowerCase().replace(/_/g, ' ')}`,
  });

  const serviceTeam = waiters + captains + waterStaff;
  const serviceSupervisors = serviceTeam > 0
    ? Math.max(
        guests >= rules.serviceSupervisorMinGuests ? 1 : 0,
        Math.ceil(serviceTeam / rules.serviceStaffPerSupervisor),
      )
    : 0;
  recommendations.set('service_supervisor', {
    quantity: serviceSupervisors,
    reason: serviceTeam > 0 ? `1 supervisor per ${rules.serviceStaffPerSupervisor} service staff · ${serviceTeam} service staff` : 'No service team detected',
  });

  const stations = generalCounterStationCount(menu);
  const attendantsPerStation =
    guests <= rules.counterSmallMaxGuests
      ? rules.counterSmallStaffPerStation
      : guests <= rules.counterMediumMaxGuests
        ? rules.counterMediumStaffPerStation
        : Math.max(
            rules.counterMediumStaffPerStation,
            Math.ceil(guests / rules.counterLargeGuestsPerStaff),
          );
  recommendations.set('counter_attendant', {
    quantity: stations * attendantsPerStation,
    reason: `${stations} detected serving stations × ${attendantsPerStation} attendant(s)`,
  });

  const beverageDishes = countByCategory(menu, ['welcome drink', 'mocktail', 'beverage']);
  recommendations.set('juice_mocktail', {
    quantity: beverageDishes > 0 ? Math.max(1, ceilRatio(guests, rules.beverageGuestsPerStaff)) : 0,
    reason: beverageDishes > 0 ? `${beverageDishes} beverage dish(es) · 1 staff per ${rules.beverageGuestsPerStaff} guests` : 'No beverage station detected',
    stationLabel: beverageDishes > 0 ? 'Beverage' : undefined,
  });

  const chaatCount = countByCategory(menu, ['chaat']);
  const chaatCooks = chaatCount > 0 ? Math.max(1, ceilRatio(guests, rules.chaatGuestsPerCook)) : 0;
  recommendations.set('chaat_cook', {
    quantity: chaatCooks,
    reason: chaatCount > 0 ? `${chaatCount} chaat dish(es) · 1 cook per ${rules.chaatGuestsPerCook} guests` : 'No chaat station detected',
    stationLabel: chaatCount > 0 ? 'Chaat' : undefined,
  });

  const chineseCount = countByCategory(menu, ['chinese']);
  recommendations.set('chinese_cook', {
    quantity: chineseCount > 0 ? Math.max(1, ceilRatio(guests, rules.chineseGuestsPerCook)) : 0,
    reason: chineseCount > 0 ? `${chineseCount} Chinese dish(es) · 1 cook per ${rules.chineseGuestsPerCook} guests` : 'No Chinese station detected',
    stationLabel: chineseCount > 0 ? 'Chinese' : undefined,
  });

  const italianCount = countByCategory(menu, ['italian']);
  recommendations.set('italian_cook', {
    quantity: italianCount > 0 ? Math.max(1, ceilRatio(guests, rules.italianGuestsPerCook)) : 0,
    reason: italianCount > 0 ? `${italianCount} Italian/Pasta dish(es) · 1 cook per ${rules.italianGuestsPerCook} guests` : 'No Italian station detected',
    stationLabel: italianCount > 0 ? 'Italian' : undefined,
  });

  const southIndianCount = countByCategory(menu, ['south indian']);
  recommendations.set('south_indian_cook', {
    quantity: southIndianCount > 0 ? Math.max(1, ceilRatio(guests, rules.southIndianGuestsPerCook)) : 0,
    reason: southIndianCount > 0 ? `${southIndianCount} South Indian dish(es) · 1 cook per ${rules.southIndianGuestsPerCook} guests` : 'No South Indian station detected',
    stationLabel: southIndianCount > 0 ? 'South Indian' : undefined,
  });

  const otherLiveCount = menu.filter(isOtherLiveDish).length;
  const liveCooks = otherLiveCount > 0
    ? Math.max(1, ceilRatio(guests, rules.liveCounterGuestsPerCook)) * Math.min(2, otherLiveCount)
    : 0;
  recommendations.set('live_counter_cook', {
    quantity: liveCooks,
    reason: otherLiveCount > 0 ? `${otherLiveCount} other live dish(es) · capacity based on ${rules.liveCounterGuestsPerCook} guests per cook` : 'No other live counter detected',
    stationLabel: otherLiveCount > 0 ? 'Live Counter' : undefined,
  });
  recommendations.set('live_counter_helper', {
    quantity: liveCooks > 0 ? Math.ceil(liveCooks / rules.liveCooksPerHelper) : 0,
    reason: liveCooks > 0 ? `1 helper per ${rules.liveCooksPerHelper} live cooks · ${liveCooks} live cooks` : 'No live cooks detected',
    stationLabel: otherLiveCount > 0 ? 'Live Counter' : undefined,
  });

  const breadCount = countByCategory(menu, ['bread', 'indian bread']);
  const breadCooks = breadCount > 0
    ? Math.max(1, ceilRatio(guests, rules.breadGuestsPerCook)) +
        (breadCount >= rules.breadVarietyBonusThreshold1 ? 1 : 0) +
        (breadCount >= rules.breadVarietyBonusThreshold2 ? 1 : 0)
    : 0;
  recommendations.set('bread_cook', {
    quantity: breadCooks,
    reason: breadCount > 0 ? `${breadCount} bread variet${breadCount === 1 ? 'y' : 'ies'} · guest capacity plus variety load` : 'No bread section detected',
    workloadScore: breadCount * 1.5,
    stationLabel: breadCount > 0 ? 'Bread' : undefined,
  });
  recommendations.set('bread_helper', {
    quantity: breadCooks > 0 ? Math.ceil(breadCooks / rules.breadCooksPerHelper) : 0,
    reason: breadCooks > 0 ? `1 helper per ${rules.breadCooksPerHelper} bread cooks · ${breadCooks} bread cooks` : 'No bread cooks detected',
    stationLabel: breadCount > 0 ? 'Bread' : undefined,
  });

  const mainCourseCount = countByCategory(menu, [
    'paneer',
    'sabji',
    'vegetable',
    'dal',
    'kadhi',
    'rice',
    'punjabi',
    'gujarati',
    'kathiyawadi',
    'rajasthani',
  ]);
  const mainCourseCooks = mainCourseCount > 0
    ? Math.max(
        1,
        ceilRatio(guests, rules.mainCourseGuestsPerCook) +
          Math.max(0, Math.ceil(mainCourseCount / rules.mainCourseDishesPerExtraCook) - 1),
      )
    : 0;
  recommendations.set('main_course_cook', {
    quantity: mainCourseCooks,
    reason: mainCourseCount > 0 ? `${mainCourseCount} main-course dish(es) · guest and dish workload` : 'No main-course production detected',
    workloadScore: workload,
  });

  const farsanCount = countByCategory(menu, ['farsan']);
  const farsanCooks = farsanCount > 0
    ? Math.max(
        1,
        ceilRatio(guests, rules.farsanGuestsPerCook) +
          Math.floor(Math.max(0, farsanCount - 1) / rules.farsanDishesPerExtraCook),
      )
    : 0;
  recommendations.set('farsan_cook', {
    quantity: farsanCooks,
    reason: farsanCount > 0 ? `${farsanCount} farsan dish(es) · frying/preparation workload` : 'No farsan production detected',
    workloadScore: farsanCount,
  });

  const sweetCount = countByCategory(menu, ['sweet']);
  const sweetCooks = sweetCount > 0
    ? Math.max(
        1,
        ceilRatio(guests, rules.sweetGuestsPerCook) +
          Math.floor(Math.max(0, sweetCount - 1) / rules.sweetDishesPerExtraCook),
      )
    : 0;
  recommendations.set('sweet_halwai', {
    quantity: sweetCooks,
    reason: sweetCount > 0 ? `${sweetCount} sweet dish(es) · halwai workload` : 'No sweet production detected',
    workloadScore: sweetCount * 1.5,
  });

  const productionCooks =
    mainCourseCooks +
    farsanCooks +
    sweetCooks +
    breadCooks +
    chaatCooks +
    (recommendations.get('chinese_cook')?.quantity ?? 0) +
    (recommendations.get('italian_cook')?.quantity ?? 0) +
    (recommendations.get('south_indian_cook')?.quantity ?? 0) +
    liveCooks;

  recommendations.set('head_chef', {
    quantity: guests >= rules.headChefMinGuests || productionCooks >= rules.headChefMinProductionCooks ? 1 : 0,
    reason: guests >= rules.headChefMinGuests || productionCooks >= rules.headChefMinProductionCooks ? `${guests} guests and ${productionCooks} production cooks require kitchen leadership` : 'Small kitchen team',
    workloadScore: workload,
  });

  recommendations.set('assistant_cook', {
    quantity: productionCooks > 0 ? Math.ceil(productionCooks * rules.assistantCooksPerProductionCook) : 0,
    reason: productionCooks > 0 ? `${rules.assistantCooksPerProductionCook} assistant per production cook · ${productionCooks} production cooks` : 'No production cooks detected',
    workloadScore: workload,
  });

  recommendations.set('kitchen_supervisor', {
    quantity: guests >= rules.kitchenSupervisorMinGuests || productionCooks >= rules.kitchenSupervisorMinProductionCooks ? 1 : 0,
    reason: guests >= rules.kitchenSupervisorMinGuests || productionCooks >= rules.kitchenSupervisorMinProductionCooks ? `Large kitchen: ${guests} guests / ${productionCooks} production cooks` : 'Head Chef can supervise this kitchen size',
    workloadScore: workload,
  });

  const prepHeavyCount = menu.filter((item) =>
    matchesCategory(item, [
      'paneer',
      'sabji',
      'vegetable',
      'farsan',
      'chaat',
      'salad',
      'fruit',
      'starter',
      'bread',
    ]),
  ).length;
  const prepHelpers = menu.length > 0
    ? Math.max(
        1,
        ceilRatio(guests, rules.prepGuestsPerHelper) +
          Math.max(0, Math.ceil(prepHeavyCount / rules.prepDishesPerExtraHelper) - 1),
      )
    : 0;
  recommendations.set('prep_helper', {
    quantity: prepHelpers,
    reason: `${prepHeavyCount} prep-heavy dish(es) plus ${guests}-guest preparation load`,
    workloadScore: workload,
  });

  const dishwashRatio = dishwashingRatio(settings.crockeryType, rules);
  const dishwashers = ceilRatio(
    guests,
    dishwashRatio,
  );
  recommendations.set('dishwasher', {
    quantity: dishwashers,
    reason: `${guests} guests ÷ ${dishwashRatio} for ${settings.crockeryType.toLowerCase()} serviceware`,
  });

  const liveHeavy = chaatCount + chineseCount + italianCount + southIndianCount + otherLiveCount > 0;
  const baseCleaningRatio = cleaningRatio(settings.venueType, rules);
  const cleanerCapacity = liveHeavy
    ? Math.min(baseCleaningRatio, rules.liveFoodGuestsPerCleaner)
    : baseCleaningRatio;
  recommendations.set('cleaning', {
    quantity: ceilRatio(guests, cleanerCapacity),
    reason: `${guests} guests ÷ ${cleanerCapacity} for ${settings.venueType.toLowerCase()} venue${liveHeavy ? ' with live-food load' : ''}`,
  });

  recommendations.set('waste_utility', {
    quantity: guests >= rules.wasteMinGuests ? Math.max(1, ceilRatio(guests, rules.wasteGuestsPerStaff)) : 0,
    reason: guests >= rules.wasteMinGuests ? `1 waste/utility staff per ${rules.wasteGuestsPerStaff} guests` : 'Small event',
  });

  recommendations.set('loading_helper', {
    quantity: guests >= rules.loadingMinGuests
      ? Math.max(1, ceilRatio(guests, rules.loadingGuestsPerHelper))
      : 0,
    reason: guests >= rules.loadingMinGuests
      ? `1 loading/unloading helper per ${rules.loadingGuestsPerHelper} guests`
      : 'Small equipment load',
  });

  const autoCoreTotal = Array.from(recommendations.values()).reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  recommendations.set('event_manager', {
    quantity: guests >= rules.eventManagerMinGuests || autoCoreTotal >= rules.eventManagerMinRecommendedStaff ? 1 : 0,
    reason: guests >= rules.eventManagerMinGuests || autoCoreTotal >= rules.eventManagerMinRecommendedStaff ? `Event size requires one event manager · ${guests} guests, ${autoCoreTotal} recommended staff` : 'Event can run under section supervisors',
  });

  return recommendations;
}

export function generateMealManpowerRows(
  input: MealManpowerEngineInput,
): ManpowerRow[] {
  const recommendations = buildRecommendations(input);

  return MANPOWER_ROLE_MASTER.flatMap((master) => {
    const recommendation = recommendations.get(master.id) ?? {
      quantity: 0,
      reason: master.auto ? 'No automatic requirement detected' : 'Manual optional role',
    };

    const existing = existingForMaster(master, input);
    const legacyManual =
      Boolean(existing) &&
      existing?.recommendedQuantity === undefined &&
      existing?.calculationSource === undefined &&
      Math.max(0, Number(existing?.quantity) || 0) > 0;

    const manualOverride = Boolean(existing?.manualOverride || legacyManual);
    const recommendedQuantity = Math.max(0, Math.round(recommendation.quantity || 0));
    const quantity = manualOverride
      ? Math.max(0, Number(existing?.quantity) || 0)
      : recommendedQuantity;

    const shouldShow =
      master.auto ||
      quantity > 0 ||
      Boolean(existing);

    if (!shouldShow) return [];

    return [{
      id: `${input.mealKey}::${master.id}`,
      role: master.role,
      department: master.department,
      quantity,
      recommendedQuantity,
      rate: Math.max(0, Number(existing?.rate) || master.rate),
      calculationSource: manualOverride ? 'MANUAL' : 'AUTO',
      calculationReason: recommendation.reason,
      manualOverride,
      workloadScore: recommendation.workloadScore,
      stationLabel: recommendation.stationLabel,
      rateMode: existing?.rateMode ?? 'PER_MEAL',
      serviceId: input.serviceId,
      dayLabel: input.dayLabel || undefined,
      mealLabel: input.mealLabel,
      servicePax: Math.max(0, Number(input.guests) || 0),
      assignedDishIds: input.menu.map((item) => item.id),
      autoDishAssignment: master.department === 'LIVE_COUNTER' || master.department === 'BREAD',
      autoStationHelper: master.id === 'live_counter_helper' || master.id === 'bread_helper',
    } satisfies ManpowerRow];
  });
}
