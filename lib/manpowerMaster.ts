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

export const DEFAULT_MANPOWER_INPUTS: Required<ManpowerInputs> = {
  venueType: 'INDOOR',
  waterService: 'BOTTLE_COUNTER',
  crockeryType: 'STANDARD',
  serviceLevel: 'STANDARD',
};

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
  { id: 'starter_cook', role: 'Starter Cook', department: 'LIVE_COUNTER', rate: 2500, aliases: ['starter cook', 'starter'], auto: false },
  { id: 'soup_cook', role: 'Soup Cook', department: 'LIVE_COUNTER', rate: 2500, aliases: ['soup cook', 'soup'], auto: false },

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
) {
  const ratios = {
    STANDARD: {
      BUFFET: 30,
      TABLE_SERVICE: 15,
      PACKED_MEAL: 50,
      LIVE_COUNTER: 25,
    },
    PREMIUM: {
      BUFFET: 20,
      TABLE_SERVICE: 12,
      PACKED_MEAL: 40,
      LIVE_COUNTER: 20,
    },
    VIP: {
      BUFFET: 12,
      TABLE_SERVICE: 8,
      PACKED_MEAL: 30,
      LIVE_COUNTER: 15,
    },
  } as const;

  return ratios[level][serviceStyle];
}

export const WATER_SERVICE_RATIO: Record<Required<ManpowerInputs>['waterService'], number> = {
  BOTTLE_COUNTER: 150,
  BOTTLE_TABLE: 80,
  GLASS_SERVICE: 60,
  TABLE_SERVICE: 40,
};

export const DISHWASHING_RATIO: Record<Required<ManpowerInputs>['crockeryType'], number> = {
  DISPOSABLE: 350,
  STANDARD: 140,
  PREMIUM: 90,
};

export const CLEANING_RATIO: Record<Required<ManpowerInputs>['venueType'], number> = {
  INDOOR: 150,
  OUTDOOR: 120,
};

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
