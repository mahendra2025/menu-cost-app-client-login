import type {
  ManpowerDepartment,
  ManpowerInputs,
  ServiceStyle,
} from './types';

export type ManpowerRoleMaster = {
  id: string;
  role: string;
  department: ManpowerDepartment;
  rate: number;
  aliases: string[];
  auto: boolean;
};

export type ManpowerRuleConfig = {
  standardBuffetGuestsPerWaiter: number;
  premiumBuffetGuestsPerWaiter: number;
  vipBuffetGuestsPerWaiter: number;

  standardTableGuestsPerWaiter: number;
  premiumTableGuestsPerWaiter: number;
  vipTableGuestsPerWaiter: number;

  standardPackedGuestsPerWaiter: number;
  premiumPackedGuestsPerWaiter: number;
  vipPackedGuestsPerWaiter: number;

  standardLiveGuestsPerWaiter: number;
  premiumLiveGuestsPerWaiter: number;
  vipLiveGuestsPerWaiter: number;

  waitersPerCaptain: number;
  serviceStaffPerSupervisor: number;
  serviceSupervisorMinGuests: number;

  bottleCounterGuestsPerWaterStaff: number;
  bottleTableGuestsPerWaterStaff: number;
  glassServiceGuestsPerWaterStaff: number;
  tableServiceGuestsPerWaterStaff: number;

  counterSmallMaxGuests: number;
  counterMediumMaxGuests: number;
  counterSmallStaffPerStation: number;
  counterMediumStaffPerStation: number;
  counterLargeGuestsPerStaff: number;
  beverageGuestsPerStaff: number;

  chefDishesPerCook: number;
  liveCooksPerHelper: number;
  breadCooksPerHelper: number;

  headChefMinGuests: number;
  headChefMinProductionCooks: number;
  assistantCooksPerProductionCook: number;
  kitchenSupervisorMinGuests: number;
  kitchenSupervisorMinProductionCooks: number;

  prepGuestsPerHelper: number;
  prepDishesPerExtraHelper: number;

  disposableGuestsPerDishwasher: number;
  standardGuestsPerDishwasher: number;
  premiumGuestsPerDishwasher: number;

  indoorGuestsPerCleaner: number;
  outdoorGuestsPerCleaner: number;
  liveFoodGuestsPerCleaner: number;

  wasteMinGuests: number;
  wasteGuestsPerStaff: number;
  loadingMinGuests: number;
  loadingGuestsPerHelper: number;

  eventManagerMinGuests: number;
  eventManagerMinRecommendedStaff: number;
};

export type ManpowerRuleDefinition = {
  key: keyof ManpowerRuleConfig;
  group:
    | 'Service'
    | 'Water Service'
    | 'Counters'
    | 'Live Counters'
    | 'Bread'
    | 'Kitchen'
    | 'Preparation'
    | 'Utility'
    | 'Logistics & Management';
  label: string;
  unit: string;
  description: string;
  min: number;
  max: number;
  step: number;
};

export const DEFAULT_MANPOWER_INPUTS: Required<ManpowerInputs> = {
  venueType: 'INDOOR',
  waterService: 'BOTTLE_COUNTER',
  crockeryType: 'STANDARD',
  serviceLevel: 'STANDARD',
};

export const DEFAULT_MANPOWER_RULES: ManpowerRuleConfig = {
  standardBuffetGuestsPerWaiter: 30,
  premiumBuffetGuestsPerWaiter: 20,
  vipBuffetGuestsPerWaiter: 12,

  standardTableGuestsPerWaiter: 15,
  premiumTableGuestsPerWaiter: 12,
  vipTableGuestsPerWaiter: 8,

  standardPackedGuestsPerWaiter: 50,
  premiumPackedGuestsPerWaiter: 40,
  vipPackedGuestsPerWaiter: 30,

  standardLiveGuestsPerWaiter: 25,
  premiumLiveGuestsPerWaiter: 20,
  vipLiveGuestsPerWaiter: 15,

  waitersPerCaptain: 10,
  serviceStaffPerSupervisor: 25,
  serviceSupervisorMinGuests: 200,

  bottleCounterGuestsPerWaterStaff: 150,
  bottleTableGuestsPerWaterStaff: 80,
  glassServiceGuestsPerWaterStaff: 60,
  tableServiceGuestsPerWaterStaff: 40,

  counterSmallMaxGuests: 350,
  counterMediumMaxGuests: 800,
  counterSmallStaffPerStation: 1,
  counterMediumStaffPerStation: 2,
  counterLargeGuestsPerStaff: 400,
  beverageGuestsPerStaff: 250,

  // One chef for every chef-relevant dish by default.
  chefDishesPerCook: 1,
  liveCooksPerHelper: 2,
  breadCooksPerHelper: 2,

  headChefMinGuests: 151,
  headChefMinProductionCooks: 4,
  assistantCooksPerProductionCook: 0.5,
  kitchenSupervisorMinGuests: 1001,
  kitchenSupervisorMinProductionCooks: 12,

  prepGuestsPerHelper: 150,
  prepDishesPerExtraHelper: 6,

  disposableGuestsPerDishwasher: 350,
  standardGuestsPerDishwasher: 140,
  premiumGuestsPerDishwasher: 90,

  indoorGuestsPerCleaner: 150,
  outdoorGuestsPerCleaner: 120,
  liveFoodGuestsPerCleaner: 100,

  wasteMinGuests: 250,
  wasteGuestsPerStaff: 500,
  loadingMinGuests: 150,
  loadingGuestsPerHelper: 250,

  eventManagerMinGuests: 500,
  eventManagerMinRecommendedStaff: 40,
};

const D = (
  key: keyof ManpowerRuleConfig,
  group: ManpowerRuleDefinition['group'],
  label: string,
  unit: string,
  description: string,
  min = 0.01,
  max = 10000,
  step = 1,
): ManpowerRuleDefinition => ({
  key,
  group,
  label,
  unit,
  description,
  min,
  max,
  step,
});

export const MANPOWER_RULE_DEFINITIONS: ManpowerRuleDefinition[] = [
  D('standardBuffetGuestsPerWaiter', 'Service', 'Standard Buffet Waiter', 'guests / waiter', 'Standard buffet service capacity.'),
  D('premiumBuffetGuestsPerWaiter', 'Service', 'Premium Buffet Waiter', 'guests / waiter', 'Premium buffet service capacity.'),
  D('vipBuffetGuestsPerWaiter', 'Service', 'VIP Buffet Waiter', 'guests / waiter', 'VIP buffet service capacity.'),
  D('standardTableGuestsPerWaiter', 'Service', 'Standard Table Service Waiter', 'guests / waiter', 'Standard table service capacity.'),
  D('premiumTableGuestsPerWaiter', 'Service', 'Premium Table Service Waiter', 'guests / waiter', 'Premium table service capacity.'),
  D('vipTableGuestsPerWaiter', 'Service', 'VIP Table Service Waiter', 'guests / waiter', 'VIP table service capacity.'),
  D('standardPackedGuestsPerWaiter', 'Service', 'Standard Packed Meal Staff', 'guests / staff', 'Packed meal distribution capacity.'),
  D('premiumPackedGuestsPerWaiter', 'Service', 'Premium Packed Meal Staff', 'guests / staff', 'Premium packed meal distribution capacity.'),
  D('vipPackedGuestsPerWaiter', 'Service', 'VIP Packed Meal Staff', 'guests / staff', 'VIP packed meal distribution capacity.'),
  D('standardLiveGuestsPerWaiter', 'Service', 'Standard Live-Counter Service', 'guests / waiter', 'Service manpower around live counters.'),
  D('premiumLiveGuestsPerWaiter', 'Service', 'Premium Live-Counter Service', 'guests / waiter', 'Premium live-counter service capacity.'),
  D('vipLiveGuestsPerWaiter', 'Service', 'VIP Live-Counter Service', 'guests / waiter', 'VIP live-counter service capacity.'),
  D('waitersPerCaptain', 'Service', 'Captain Span', 'waiters / captain', 'How many waiters one captain supervises.'),
  D('serviceStaffPerSupervisor', 'Service', 'Service Supervisor Span', 'service staff / supervisor', 'Front-of-house staff per supervisor.'),
  D('serviceSupervisorMinGuests', 'Service', 'Service Supervisor Minimum Event', 'guests', 'Minimum guest count before a service supervisor is forced.'),

  D('bottleCounterGuestsPerWaterStaff', 'Water Service', 'Bottle Counter Water Staff', 'guests / staff', 'Water bottle counter capacity.'),
  D('bottleTableGuestsPerWaterStaff', 'Water Service', 'Bottle-on-Table Water Staff', 'guests / staff', 'Bottle placement and replenishment capacity.'),
  D('glassServiceGuestsPerWaterStaff', 'Water Service', 'Glass Water Service', 'guests / staff', 'Glass water service capacity.'),
  D('tableServiceGuestsPerWaterStaff', 'Water Service', 'Table Water Service', 'guests / staff', 'Dedicated table water service capacity.'),

  D('counterSmallMaxGuests', 'Counters', 'Small Event Limit', 'guests', 'Upper guest limit for small-event counter staffing.'),
  D('counterMediumMaxGuests', 'Counters', 'Medium Event Limit', 'guests', 'Upper guest limit for medium-event counter staffing.'),
  D('counterSmallStaffPerStation', 'Counters', 'Small Event Counter Staff', 'staff / station', 'Counter attendants per detected station for small events.'),
  D('counterMediumStaffPerStation', 'Counters', 'Medium Event Counter Staff', 'staff / station', 'Counter attendants per detected station for medium events.'),
  D('counterLargeGuestsPerStaff', 'Counters', 'Large Event Counter Capacity', 'guests / staff / station', 'Counter capacity when guest count exceeds the medium threshold.'),
  D('beverageGuestsPerStaff', 'Counters', 'Beverage Counter Staff', 'guests / staff', 'Welcome drink, mocktail and beverage staffing capacity.'),

  D('chefDishesPerCook', 'Kitchen', 'Chef Dish Ratio', 'dishes / chef', 'Chef requirement across chef-relevant menu categories. Default: 1 dish = 1 chef.', 1, 20, 1),
  D('liveCooksPerHelper', 'Live Counters', 'Live Counter Helper Span', 'cooks / helper', 'Number of live cooks supported by one helper.'),
  D('breadCooksPerHelper', 'Bread', 'Bread Helper Span', 'cooks / helper', 'Number of bread cooks supported by one helper.'),

  D('headChefMinGuests', 'Kitchen', 'Head Chef Minimum Guests', 'guests', 'Guest count that requires one Head Chef.'),
  D('headChefMinProductionCooks', 'Kitchen', 'Head Chef Cook-Team Trigger', 'production cooks', 'Production cook count that requires one Head Chef.'),
  D('assistantCooksPerProductionCook', 'Kitchen', 'Assistant Cook Ratio', 'assistants / cook', 'Assistant cooks per production cook.', 0.05, 3, 0.05),
  D('kitchenSupervisorMinGuests', 'Kitchen', 'Kitchen Supervisor Minimum Guests', 'guests', 'Guest count that requires a Kitchen Supervisor.'),
  D('kitchenSupervisorMinProductionCooks', 'Kitchen', 'Kitchen Supervisor Cook Trigger', 'production cooks', 'Production cook count that requires a Kitchen Supervisor.'),

  D('prepGuestsPerHelper', 'Preparation', 'Preparation Helper Capacity', 'guests / helper', 'Base preparation helper capacity.'),
  D('prepDishesPerExtraHelper', 'Preparation', 'Prep-Heavy Dish Load', 'dishes / extra helper', 'Additional helper trigger from prep-heavy dish count.'),

  D('disposableGuestsPerDishwasher', 'Utility', 'Disposable Service Utility', 'guests / staff', 'Utility staff capacity when serviceware is disposable.'),
  D('standardGuestsPerDishwasher', 'Utility', 'Standard Crockery Dishwasher', 'guests / dishwasher', 'Dishwashing capacity for standard crockery.'),
  D('premiumGuestsPerDishwasher', 'Utility', 'Premium Crockery Dishwasher', 'guests / dishwasher', 'Dishwashing capacity for premium multi-piece crockery.'),
  D('indoorGuestsPerCleaner', 'Utility', 'Indoor Cleaning Capacity', 'guests / cleaner', 'Cleaning capacity for indoor venues.'),
  D('outdoorGuestsPerCleaner', 'Utility', 'Outdoor Cleaning Capacity', 'guests / cleaner', 'Cleaning capacity for outdoor venues.'),
  D('liveFoodGuestsPerCleaner', 'Utility', 'Live-Food Cleaning Capacity', 'guests / cleaner', 'Cleaning capacity when live food creates heavier floor/waste load.'),

  D('wasteMinGuests', 'Logistics & Management', 'Waste Staff Minimum Event', 'guests', 'Minimum event size before dedicated waste staff is added.'),
  D('wasteGuestsPerStaff', 'Logistics & Management', 'Waste Staff Capacity', 'guests / staff', 'Waste-management capacity.'),
  D('loadingMinGuests', 'Logistics & Management', 'Loading Helper Minimum Event', 'guests', 'Minimum event size before loading/unloading helpers are added.'),
  D('loadingGuestsPerHelper', 'Logistics & Management', 'Loading Helper Capacity', 'guests / helper', 'Fallback loading/unloading helper capacity.'),
  D('eventManagerMinGuests', 'Logistics & Management', 'Event Manager Minimum Guests', 'guests', 'Guest count that requires an Event Manager.'),
  D('eventManagerMinRecommendedStaff', 'Logistics & Management', 'Event Manager Staff Trigger', 'recommended staff', 'Total recommended manpower that triggers an Event Manager.'),
];

export function normalizeManpowerRules(
  input?: Partial<ManpowerRuleConfig> | null,
): ManpowerRuleConfig {
  const next: ManpowerRuleConfig = {
    ...DEFAULT_MANPOWER_RULES,
  };

  if (!input || typeof input !== 'object') {
    return next;
  }

  MANPOWER_RULE_DEFINITIONS.forEach((definition) => {
    const value = Number(input[definition.key]);

    if (
      Number.isFinite(value) &&
      value >= definition.min &&
      value <= definition.max
    ) {
      next[definition.key] = value;
    }
  });

  return next;
}

export const MANPOWER_ROLE_MASTER: ManpowerRoleMaster[] = [
  { id: 'waiter', role: 'Waiter', department: 'SERVICE', rate: 750, aliases: ['waiter'], auto: true },
  { id: 'captain', role: 'Captain', department: 'SERVICE', rate: 1500, aliases: ['captain'], auto: true },
  { id: 'water_staff', role: 'Water Staff', department: 'SERVICE', rate: 750, aliases: ['water staff', 'water service'], auto: true },
  { id: 'service_supervisor', role: 'Service Supervisor', department: 'SERVICE', rate: 2000, aliases: ['service supervisor', 'supervisor'], auto: true },
  { id: 'tie_waiter', role: 'Tie Waiter', department: 'SERVICE', rate: 900, aliases: ['tie waiter'], auto: false },
  { id: 'pyaro', role: 'Pyaro', department: 'SERVICE', rate: 1000, aliases: ['pyaro'], auto: false },
  { id: 'girls', role: 'Girls', department: 'SERVICE', rate: 900, aliases: ['girls', 'girl'], auto: false },
  { id: 'models', role: 'Models', department: 'SERVICE', rate: 1500, aliases: ['models', 'model'], auto: false },

  { id: 'counter_attendant', role: 'Counter Attendant', department: 'COUNTER', rate: 900, aliases: ['counter attendant', 'counter staff'], auto: true },
  { id: 'juice_mocktail', role: 'Juice / Mocktail', department: 'COUNTER', rate: 1600, aliases: ['juice / mocktail', 'juice / mocktail maker', 'bartender'], auto: true },
  { id: 'paan_counter', role: 'Paan Counter', department: 'COUNTER', rate: 900, aliases: ['paan counter', 'pan counter', 'paan', 'pan'], auto: false },

  { id: 'live_counter_cook', role: 'Live Counter Cook', department: 'LIVE_COUNTER', rate: 2500, aliases: ['live counter cook', 'live counter'], auto: true },
  { id: 'live_counter_helper', role: 'Live Counter Helper', department: 'LIVE_COUNTER', rate: 900, aliases: ['live counter helper'], auto: true },
  { id: 'chaat_cook', role: 'Chaat Cook', department: 'LIVE_COUNTER', rate: 2500, aliases: ['chaat cook', 'chaat master', 'chaat'], auto: true },
  { id: 'chinese_cook', role: 'Chinese Cook', department: 'LIVE_COUNTER', rate: 2500, aliases: ['chinese cook', 'chinese'], auto: true },
  { id: 'south_indian_cook', role: 'South Indian Cook', department: 'LIVE_COUNTER', rate: 2500, aliases: ['south indian cook', 'south indian'], auto: true },
  { id: 'italian_cook', role: 'Italian / Pasta Cook', department: 'LIVE_COUNTER', rate: 2500, aliases: ['italian / pasta cook', 'italian cook', 'pasta cook', 'italian'], auto: true },
  { id: 'starter_cook', role: 'Starter Cook', department: 'LIVE_COUNTER', rate: 2500, aliases: ['starter cook', 'starter'], auto: true },
  { id: 'soup_cook', role: 'Soup Cook', department: 'LIVE_COUNTER', rate: 2500, aliases: ['soup cook', 'soup'], auto: true },

  { id: 'bread_cook', role: 'Bread Cook', department: 'BREAD', rate: 2500, aliases: ['bread cook', 'indian bread', 'indian bread / tandoor cook', 'tandoor cook'], auto: true },
  { id: 'bread_helper', role: 'Bread Helper', department: 'BREAD', rate: 900, aliases: ['bread helper', 'dough helper'], auto: true },

  { id: 'head_chef', role: 'Head Chef', department: 'KITCHEN', rate: 3500, aliases: ['head chef'], auto: true },
  { id: 'main_course_cook', role: 'Main Course Cook', department: 'KITCHEN', rate: 2500, aliases: ['main course cook', 'chef / cook', 'chef', 'cook'], auto: true },
  { id: 'farsan_cook', role: 'Farsan Cook', department: 'KITCHEN', rate: 2500, aliases: ['farsan cook'], auto: true },
  { id: 'sweet_halwai', role: 'Sweet / Halwai Cook', department: 'KITCHEN', rate: 2800, aliases: ['sweet / halwai cook', 'sweet cook', 'halwai'], auto: true },
  { id: 'assistant_cook', role: 'Assistant Cook', department: 'KITCHEN', rate: 1400, aliases: ['assistant cook'], auto: true },
  { id: 'kitchen_supervisor', role: 'Kitchen Supervisor', department: 'KITCHEN', rate: 2200, aliases: ['kitchen supervisor'], auto: true },

  { id: 'prep_helper', role: 'Preparation Helper', department: 'PREPARATION', rate: 700, aliases: ['preparation helper', 'prep helper', 'helper', 'helper / masi', 'masi'], auto: true },

  { id: 'dishwasher', role: 'Dishwasher', department: 'UTILITY', rate: 700, aliases: ['dishwasher', 'dishwashing'], auto: true },
  { id: 'cleaning', role: 'Cleaning', department: 'UTILITY', rate: 600, aliases: ['cleaning', 'cleaner'], auto: true },
  { id: 'waste_utility', role: 'Waste / Utility Staff', department: 'UTILITY', rate: 700, aliases: ['waste / utility staff', 'utility staff'], auto: true },
  { id: 'ghati', role: 'Ghati', department: 'UTILITY', rate: 900, aliases: ['ghati'], auto: false },
  { id: 'cc_boys', role: 'CC Boys', department: 'UTILITY', rate: 900, aliases: ['cc boy', 'cc boys'], auto: false },

  { id: 'loading_helper', role: 'Loading / Unloading Helper', department: 'LOGISTICS', rate: 800, aliases: ['loading / unloading helper', 'loading helper', 'unloading helper'], auto: true },
  { id: 'driver', role: 'Driver', department: 'LOGISTICS', rate: 1000, aliases: ['driver'], auto: false },

  { id: 'event_manager', role: 'Event Manager', department: 'MANAGEMENT', rate: 3500, aliases: ['event manager'], auto: true },
];

export const CATEGORY_WORKLOAD: Record<string, number> = {
  'welcome drink': 0.2,
  mocktail: 0.25,
  beverage: 0.25,
  salad: 0.3,
  fruit: 0.35,
  rice: 0.6,
  'dal/kadhi': 0.6,
  dal: 0.6,
  kadhi: 0.6,
  sabji: 0.8,
  vegetable: 0.8,
  paneer: 0.9,
  farsan: 1,
  starter: 1.2,
  chinese: 1.2,
  italian: 1.2,
  'south indian': 1.25,
  chaat: 1.3,
  bread: 1.5,
  'indian bread': 1.5,
  sweet: 1.5,
  'live counter': 1.6,
};

export function waiterRatio(
  serviceStyle: ServiceStyle,
  level: Required<ManpowerInputs>['serviceLevel'],
  rulesInput?: Partial<ManpowerRuleConfig> | null,
) {
  const rules = normalizeManpowerRules(rulesInput);

  const ratios = {
    STANDARD: {
      BUFFET: rules.standardBuffetGuestsPerWaiter,
      TABLE_SERVICE: rules.standardTableGuestsPerWaiter,
      PACKED_MEAL: rules.standardPackedGuestsPerWaiter,
      LIVE_COUNTER: rules.standardLiveGuestsPerWaiter,
    },
    PREMIUM: {
      BUFFET: rules.premiumBuffetGuestsPerWaiter,
      TABLE_SERVICE: rules.premiumTableGuestsPerWaiter,
      PACKED_MEAL: rules.premiumPackedGuestsPerWaiter,
      LIVE_COUNTER: rules.premiumLiveGuestsPerWaiter,
    },
    VIP: {
      BUFFET: rules.vipBuffetGuestsPerWaiter,
      TABLE_SERVICE: rules.vipTableGuestsPerWaiter,
      PACKED_MEAL: rules.vipPackedGuestsPerWaiter,
      LIVE_COUNTER: rules.vipLiveGuestsPerWaiter,
    },
  } as const;

  return ratios[level][serviceStyle];
}

export function waterServiceRatio(
  waterService: Required<ManpowerInputs>['waterService'],
  rulesInput?: Partial<ManpowerRuleConfig> | null,
) {
  const rules = normalizeManpowerRules(rulesInput);

  return {
    BOTTLE_COUNTER: rules.bottleCounterGuestsPerWaterStaff,
    BOTTLE_TABLE: rules.bottleTableGuestsPerWaterStaff,
    GLASS_SERVICE: rules.glassServiceGuestsPerWaterStaff,
    TABLE_SERVICE: rules.tableServiceGuestsPerWaterStaff,
  }[waterService];
}

export function dishwashingRatio(
  crockeryType: Required<ManpowerInputs>['crockeryType'],
  rulesInput?: Partial<ManpowerRuleConfig> | null,
) {
  const rules = normalizeManpowerRules(rulesInput);

  return {
    DISPOSABLE: rules.disposableGuestsPerDishwasher,
    STANDARD: rules.standardGuestsPerDishwasher,
    PREMIUM: rules.premiumGuestsPerDishwasher,
  }[crockeryType];
}

export function cleaningRatio(
  venueType: Required<ManpowerInputs>['venueType'],
  rulesInput?: Partial<ManpowerRuleConfig> | null,
) {
  const rules = normalizeManpowerRules(rulesInput);

  return {
    INDOOR: rules.indoorGuestsPerCleaner,
    OUTDOOR: rules.outdoorGuestsPerCleaner,
  }[venueType];
}

export const DEPARTMENT_ORDER: ManpowerDepartment[] = [
  'SERVICE',
  'COUNTER',
  'LIVE_COUNTER',
  'BREAD',
  'KITCHEN',
  'PREPARATION',
  'UTILITY',
  'LOGISTICS',
  'MANAGEMENT',
];
