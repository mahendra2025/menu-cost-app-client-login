'use client';

import {
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import Link from 'next/link';

import AppShell from '../../components/AppShell';
import EventFilePanel from '../../components/EventFilePanel';

import {
  flushWorkSave,
  getSession,
  loadWork,
  saveWork,
  uid,
} from '../../../lib/store';

import type {
  MenuItem,
  WorkState,
} from '../../../lib/types';

import {
  buildFunctionGroceryPlan,
  type GroceryIngredientRate,
  type GroceryRecipe,
} from '../../../lib/functionGrocery';

type RequirementKind =
  | 'MENU'
  | 'MANPOWER'
  | 'DRESS'
  | 'GROCERY'
  | 'DISPOSABLE'
  | 'EQUIPMENT'
  | 'CROCKERY'
  | 'TRANSPORT';

type PartnerType =
  | 'IN_HOUSE'
  | 'VENDOR'
  | 'AGENCY';

type AssignmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'DELIVERED'
  | 'CLOSED';

type AssignmentRow = {
  id: string;
  kind: RequirementKind;
  requirement: string;
  detail: string;
  quantity: number;
  unit: string;
  assignedTo: string;
  partnerId?: string;
  equipmentId?: string;
  crockeryId?: string;
  uniformId?: string;
  disposableMasterId?: string;
  photoUrl?: string;
  availableQty?: number;
  unitsPerGuest?: number;
  bufferPercent?: number;
  partnerType: PartnerType;
  rate: number;
  deliveryTime: string;
  pickupTime?: string;
  paymentTerms?: string;
  status: AssignmentStatus;
};

type FunctionPlan = {
  key: string;
  serviceId: string;
  dayLabel: string;
  mealLabel: string;
  pax: number;
  menu: MenuItem[];
};

type StoredPlan = Record<string, AssignmentRow[]>;

type PlanningEventOption = {
  costingId: string;
  source: 'CURRENT' | 'DRAFT' | 'COMPLETED';
  eventName: string;
  clientName: string;
  eventDate: string;
  totalCovers: number;
  timestamp: string;
};

type VendorRate = {
  id: string;
  kind: RequirementKind | 'GENERAL';
  item: string;
  unit: string;
  rate: number;
};

type Vendor = {
  id: string;
  name: string;
  type: 'VENDOR' | 'AGENCY' | 'INDIVIDUAL';
  category: string;
  contactPerson: string;
  phone: string;
  city: string;
  gst: string;
  paymentTerms: string;
  notes: string;
  active: boolean;
  rates: VendorRate[];
};

type EquipmentItem = {
  id: string;
  name: string;
  category: string;
  photoUrl: string;
  ownership: 'IN_HOUSE' | 'RENTAL';
  availableQty: number;
  unit: string;
  defaultRate: number;
  vendorId: string;
  vendorName: string;
  capacity: string;
  notes: string;
  active: boolean;
};

type CrockeryItem = {
  id: string;
  name: string;
  category: string;
  photoUrl: string;
  ownership: 'IN_HOUSE' | 'RENTAL';
  availableQty: number;
  unit: string;
  defaultRate: number;
  vendorId: string;
  vendorName: string;
  sizeType: string;
  unitsPerGuest: number;
  bufferPercent: number;
  notes: string;
  active: boolean;
};

type UniformItem = {
  id: string;
  name: string;
  photoUrl: string;
  staffRole: string;
  components: string;
  sizes: string;
  ownership: 'IN_HOUSE' | 'RENTAL';
  availableQty: number;
  unit: string;
  defaultRate: number;
  vendorId: string;
  vendorName: string;
  laundryStatus: string;
  notes: string;
  active: boolean;
};

type DisposableMasterItem = {
  id: string;
  name: string;
  category: string;
  photoUrl: string;
  unit: string;
  availableQty: number;
  defaultRate: number;
  supplierId: string;
  supplierName: string;
  notes: string;
  active: boolean;
};

const TABS: Array<{
  kind: RequirementKind;
  label: string;
}> = [
  { kind: 'MENU', label: 'Menu Vendors' },
  { kind: 'MANPOWER', label: 'Manpower Agencies' },
  { kind: 'DRESS', label: 'Dress & Uniform' },
  { kind: 'GROCERY', label: 'Grocery Suppliers' },
  { kind: 'DISPOSABLE', label: 'Disposables' },
  { kind: 'EQUIPMENT', label: 'Equipment' },
  { kind: 'CROCKERY', label: 'Crockery & Cutlery' },
  { kind: 'TRANSPORT', label: 'Transport' },
];

type GrocerySupplierGroupKey =
  | 'GROCERY'
  | 'DAIRY'
  | 'VEGETABLE_FRUIT';

const GROCERY_SUPPLIER_GROUPS: Array<{
  key: GrocerySupplierGroupKey;
  label: string;
  detail: string;
}> = [
  {
    key: 'GROCERY',
    label: 'Grocery',
    detail: 'Grains, pulses, flour, spices, oil and dry grocery',
  },
  {
    key: 'DAIRY',
    label: 'Dairy',
    detail: 'Paneer, milk, curd, butter, cream and dairy products',
  },
  {
    key: 'VEGETABLE_FRUIT',
    label: 'Vegetables & Fruits',
    detail: 'Fresh vegetables, herbs, fruits and fresh produce',
  },
];

function grocerySupplierGroup(
  row: AssignmentRow,
): GrocerySupplierGroupKey {
  const value =
    normalized(
      `${row.requirement} ${row.detail}`,
    );

  if (
    /dairy|milk|paneer|curd|butter|cream/.test(
      value,
    )
  ) {
    return 'DAIRY';
  }

  if (
    /vegetable|fruit|herb|fresh produce/.test(
      value,
    )
  ) {
    return 'VEGETABLE_FRUIT';
  }

  return 'GROCERY';
}

type TransportPresetKey =
  | 'FOOD_KITCHEN'
  | 'EQUIPMENT_MATERIAL'
  | 'STAFF'
  | 'ADDITIONAL';

const TRANSPORT_PRESETS: Array<{
  key: TransportPresetKey;
  label: string;
  detail: string;
}> = [
  {
    key: 'FOOD_KITCHEN',
    label: 'Food & Kitchen Vehicle',
    detail: 'Food, kitchen material and production dispatch',
  },
  {
    key: 'EQUIPMENT_MATERIAL',
    label: 'Equipment & Material Vehicle',
    detail: 'Equipment, crockery, counters and event material',
  },
  {
    key: 'STAFF',
    label: 'Staff Vehicle',
    detail: 'Chef, service and support manpower movement',
  },
  {
    key: 'ADDITIONAL',
    label: 'Additional Trip',
    detail: 'Extra pickup, refill, emergency or return movement',
  },
];

function transportPresetKey(
  row: AssignmentRow,
): TransportPresetKey {
  const value =
    normalized(
      `${row.requirement} ${row.detail}`,
    );

  if (
    /staff|chef|manpower|service team/.test(
      value,
    )
  ) {
    return 'STAFF';
  }

  if (
    /equipment|material|crockery|counter/.test(
      value,
    )
  ) {
    return 'EQUIPMENT_MATERIAL';
  }

  if (
    /additional|extra|emergency|refill|return trip/.test(
      value,
    )
  ) {
    return 'ADDITIONAL';
  }

  return 'FOOD_KITCHEN';
}

function manpowerDepartmentLabel(
  row: AssignmentRow,
) {
  const value =
    normalized(
      `${row.detail} ${row.requirement}`,
    );

  if (
    /service|waiter|captain|water|supervisor/.test(
      value,
    )
  ) {
    return 'Service';
  }

  if (
    /counter|station|chaat|bread counter|sweet counter/.test(
      value,
    )
  ) {
    return 'Counters';
  }

  if (
    /kitchen|chef|cook|helper|assistant/.test(
      value,
    )
  ) {
    return 'Kitchen';
  }

  if (
    /utility|clean|dishwash/.test(
      value,
    )
  ) {
    return 'Utility';
  }

  return 'Other';
}

function menuCategoryFromRow(
  row: AssignmentRow,
) {
  return String(
    row.requirement || 'Menu',
  )
    .replace(
      /\s+station$/i,
      '',
    )
    .trim() ||
    'Menu';
}

function planKey(costingId: string) {
  return `menu_cost_event_planning_${costingId}_v1`;
}

function safeReadPlan(costingId: string): StoredPlan {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(planKey(costingId));
    if (!raw) return {};

    const parsed = JSON.parse(raw) as StoredPlan;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writePlan(costingId: string, plan: StoredPlan) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(planKey(costingId), JSON.stringify(plan));
}

function normalized(value: string) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function matchingVendorRate(
  vendor: Vendor,
  row: AssignmentRow,
) {
  const requirement = normalized(row.requirement);

  return (
    vendor.rates.find((rate) =>
      (rate.kind === row.kind || rate.kind === 'GENERAL') &&
      normalized(rate.item) === requirement,
    ) ||
    vendor.rates.find((rate) => {
      if (rate.kind !== row.kind && rate.kind !== 'GENERAL') {
        return false;
      }

      const item = normalized(rate.item);
      return Boolean(
        item &&
        requirement &&
        (item.includes(requirement) || requirement.includes(item)),
      );
    })
  );
}

function functionKey(item: MenuItem, fallbackMeal: string) {
  return (
    item.serviceId ||
    `${item.dayLabel || 'Event'}::${item.mealLabel || fallbackMeal || 'Event Menu'}`
  );
}

function buildFunctions(work: WorkState): FunctionPlan[] {
  const groups = new Map<string, FunctionPlan>();
  const fallbackMeal = work.event.functionType || 'Event Menu';

  work.menu.forEach((item) => {
    const key = functionKey(item, fallbackMeal);
    const existing = groups.get(key);

    if (existing) {
      existing.menu.push(item);
      existing.pax = Math.max(
        existing.pax,
        Number(item.servicePax) || 0,
      );
      return;
    }

    groups.set(key, {
      key,
      serviceId: item.serviceId || '',
      dayLabel: item.dayLabel || '',
      mealLabel: item.mealLabel || fallbackMeal,
      pax: Math.max(
        0,
        Number(item.servicePax) ||
          Number(work.event.pax) ||
          0,
      ),
      menu: [item],
    });
  });

  if (!groups.size) {
    groups.set('event', {
      key: 'event',
      serviceId: '',
      dayLabel: '',
      mealLabel: fallbackMeal,
      pax: Math.max(0, Number(work.event.pax) || 0),
      menu: [],
    });
  }

  return Array.from(groups.values());
}

function newRow(
  kind: RequirementKind,
  requirement: string,
  detail: string,
  quantity: number,
  unit: string,
  rate = 0,
): AssignmentRow {
  return {
    id: uid('assignment'),
    kind,
    requirement,
    detail,
    quantity: Math.max(0, Number(quantity) || 0),
    unit,
    assignedTo: '',
    partnerType: 'VENDOR',
    rate: Math.max(0, Number(rate) || 0),
    deliveryTime: '',
    pickupTime: '',
    paymentTerms: '',
    status: 'PENDING',
  };
}

function seedRows(
  fn: FunctionPlan,
  work: WorkState,
): AssignmentRow[] {
  const rows: AssignmentRow[] = [];
  const pax = Math.max(0, fn.pax || Number(work.event.pax) || 0);

  const byCategory = new Map<string, MenuItem[]>();
  fn.menu.forEach((item) => {
    const category = item.category || 'Other';
    const current = byCategory.get(category) || [];
    current.push(item);
    byCategory.set(category, current);
  });

  byCategory.forEach((items, category) => {
    rows.push(
      newRow(
        'MENU',
        `${category} station`,
        items.map((item) => item.name).join(', '),
        pax,
        'cover',
      ),
    );
  });

  const matchingManpower = work.manpower.filter((row) => {
    if (!(Number(row.quantity) > 0)) return false;
    if (fn.serviceId && row.serviceId) {
      return row.serviceId === fn.serviceId;
    }
    if (row.mealLabel && fn.mealLabel) {
      return row.mealLabel === fn.mealLabel;
    }
    return !row.serviceId && !row.mealLabel;
  });

  matchingManpower.forEach((row) => {
    rows.push(
      newRow(
        'MANPOWER',
        row.role,
        row.department
          ? `${row.department.replace(/_/g, ' ')} team`
          : 'Event manpower',
        Number(row.quantity) || 0,
        'person',
        Number(row.rate) || 0,
      ),
    );
  });

  [
    [
      'Grocery',
      'Grains, pulses, flour, spices, oil and dry grocery',
    ],
    [
      'Dairy',
      'Paneer, milk, curd, butter, cream and dairy products',
    ],
    [
      'Vegetables & Fruits',
      'Fresh vegetables, herbs, fruits and fresh produce',
    ],
  ].forEach(([name, detail]) => {
    rows.push(
      newRow(
        'GROCERY',
        name,
        detail,
        1,
        'lot',
      ),
    );
  });

  work.disposableItems
    .filter((item) => Number(item.quantity) > 0)
    .forEach((item) => {
      rows.push(
        newRow(
          'DISPOSABLE',
          item.name,
          'Event disposable requirement',
          Number(item.quantity) || 0,
          item.unit || 'pcs',
          Number(item.unitCost) || 0,
        ),
      );
    });

  const categories = new Set(
    fn.menu.map((item) =>
      String(item.category || '').toLowerCase(),
    ),
  );

  rows.push(
    newRow(
      'EQUIPMENT',
      'Gas burner',
      'Cooking line requirement',
      Math.max(1, Math.ceil(Math.max(pax, 1) / 150)),
      'unit',
    ),
  );

  if (
    categories.has('bread') ||
    categories.has('indian bread')
  ) {
    rows.push(
      newRow(
        'EQUIPMENT',
        'Tandoor / roti setup',
        'Bread production station',
        1,
        'unit',
      ),
    );
  }

  if (
    categories.has('starter') ||
    categories.has('farsan')
  ) {
    rows.push(
      newRow(
        'EQUIPMENT',
        'Fryer',
        'Starter / farsan production',
        1,
        'unit',
      ),
    );
  }

  const plateQty = Math.max(0, pax);
  [
    ['Dinner plate', plateQty, 'pcs'],
    ['Bowl', plateQty, 'pcs'],
    ['Spoon', plateQty, 'pcs'],
    ['Glass', plateQty, 'pcs'],
  ].forEach(([name, qty, unit]) => {
    rows.push(
      newRow(
        'CROCKERY',
        String(name),
        'Function service stock',
        Number(qty) || 0,
        String(unit),
      ),
    );
  });

  if (
    fn.menu.some((item) =>
      /sweet|dessert|ice cream/i.test(item.category),
    )
  ) {
    rows.push(
      newRow(
        'CROCKERY',
        'Dessert bowl / spoon',
        'Sweet and dessert service',
        plateQty,
        'set',
      ),
    );
  }

  rows.push(
    newRow(
      'TRANSPORT',
      'Food & Kitchen Vehicle',
      'Food, kitchen material and production dispatch',
      1,
      'trip',
    ),
  );

  return rows;
}

function currency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Number(value) || 0));
}

function readiness(rows: AssignmentRow[]) {
  if (!rows.length) return 0;

  const done = rows.filter((row) =>
    ['CONFIRMED', 'DELIVERED', 'CLOSED'].includes(
      row.status,
    ),
  ).length;

  return Math.round((done / rows.length) * 100);
}

function assignmentReady(
  row: AssignmentRow,
) {
  return [
    'CONFIRMED',
    'DELIVERED',
    'CLOSED',
  ].includes(
    row.status,
  );
}

function requiresExecutionTime(
  kind: RequirementKind,
) {
  return [
    'MENU',
    'MANPOWER',
    'GROCERY',
    'DISPOSABLE',
    'TRANSPORT',
  ].includes(
    kind,
  );
}

function hasStockShortage(
  row: AssignmentRow,
) {
  const linkedToMaster =
    Boolean(
      row.equipmentId ||
      row.crockeryId ||
      row.uniformId ||
      row.disposableMasterId,
    );

  if (
    !linkedToMaster ||
    row.availableQty === undefined
  ) {
    return false;
  }

  return (
    Math.max(
      0,
      Number(
        row.quantity,
      ) || 0,
    ) >
    Math.max(
      0,
      Number(
        row.availableQty,
      ) || 0,
    )
  );
}

function operationalReadiness(
  rows: AssignmentRow[],
) {
  if (!rows.length) return 0;

  const assigned =
    rows.filter(
      (row) =>
        Boolean(
          row.assignedTo.trim(),
        ),
    ).length;

  const confirmed =
    rows.filter(
      assignmentReady,
    ).length;

  const timingRows =
    rows.filter(
      (row) =>
        requiresExecutionTime(
          row.kind,
        ),
    );

  const timingReady =
    timingRows.length
      ? timingRows.filter(
          (row) =>
            Boolean(
              row.deliveryTime,
            ),
        ).length
      : rows.length;

  const assignmentScore =
    assigned /
    rows.length *
    35;

  const confirmationScore =
    confirmed /
    rows.length *
    45;

  const timingScore =
    (
      timingRows.length
        ? timingReady /
          timingRows.length
        : 1
    ) *
    20;

  const shortagePenalty =
    rows.filter(
      hasStockShortage,
    ).length /
    rows.length *
    30;

  const missingVendorRatePenalty =
    rows.filter(
      (row) =>
        row.partnerType !==
          'IN_HOUSE' &&
        Boolean(
          row.assignedTo.trim(),
        ) &&
        !(Number(row.rate) > 0),
    ).length /
    rows.length *
    10;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        assignmentScore +
        confirmationScore +
        timingScore -
        shortagePenalty -
        missingVendorRatePenalty,
      ),
    ),
  );
}

function ReadinessIcon({
  kind,
}: {
  kind:
    | 'menu'
    | 'recipes'
    | 'grocery'
    | 'manpower'
    | 'equipment'
    | 'vendors'
    | 'quotation';
}) {
  const paths: Record<
    typeof kind,
    ReactNode
  > = {
    menu: (
      <>
        <path d="M5 6h14M5 12h14M5 18h9" />
        <circle cx="3" cy="6" r=".8" />
        <circle cx="3" cy="12" r=".8" />
        <circle cx="3" cy="18" r=".8" />
      </>
    ),
    recipes: (
      <>
        <path d="M7 4h10v16H7z" />
        <path d="M10 8h4M10 12h4M10 16h3" />
      </>
    ),
    grocery: (
      <>
        <path d="M5 7h14l-1.4 10H6.4z" />
        <path d="M8 7V5h8v2M9 11h6M9 14h4" />
      </>
    ),
    manpower: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2.4" />
        <path d="M3.5 19c.5-3.6 2.3-5.4 5.5-5.4s5 1.8 5.5 5.4M15 15c2.8.1 4.4 1.5 4.8 4" />
      </>
    ),
    equipment: (
      <>
        <path d="M5 18h14M7 18V9h10v9" />
        <path d="M9 9V6h6v3M10 13h4" />
      </>
    ),
    vendors: (
      <>
        <path d="M4 9h16v10H4zM6 9l2-4h8l2 4" />
        <path d="M8 13h3M15 13h1" />
      </>
    ),
    quotation: (
      <>
        <path d="M6 3h9l3 3v15H6z" />
        <path d="M15 3v4h4M9 11h6M9 15h6" />
      </>
    ),
  };

  return (
    <span
      className="ep-readiness-icon"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths[kind]}
      </svg>
    </span>
  );
}

export default function EventPlanningPage() {
  const [work, setWork] =
    useState<WorkState | null>(null);
  const [plan, setPlan] =
    useState<StoredPlan>({});
  const [selectedFunction, setSelectedFunction] =
    useState('');
  const [tab, setTab] =
    useState<RequirementKind>('MENU');
  const [vendors, setVendors] =
    useState<Vendor[]>([]);
  const [equipment, setEquipment] =
    useState<EquipmentItem[]>([]);
  const [crockery, setCrockery] =
    useState<CrockeryItem[]>([]);
  const [uniforms, setUniforms] =
    useState<UniformItem[]>([]);
  const [disposableMaster, setDisposableMaster] =
    useState<DisposableMasterItem[]>([]);
  const [eventOptions, setEventOptions] =
    useState<PlanningEventOption[]>([]);
  const [selectedEventId, setSelectedEventId] =
    useState('');
  const [eventLoading, setEventLoading] =
    useState(false);
  const [eventError, setEventError] =
    useState('');
  const [readinessRecipes, setReadinessRecipes] =
    useState<GroceryRecipe[]>([]);
  const [readinessRates, setReadinessRates] =
    useState<GroceryIngredientRate[]>([]);
  const [quotationStatus, setQuotationStatus] =
    useState('');
  const [readinessLoading, setReadinessLoading] =
    useState(false);
  const [saveState, setSaveState] =
    useState<'SAVED' | 'SAVING' | 'ERROR'>('SAVED');
  const saveTimer =
    useRef<number | undefined>(undefined);
  const eventLoadSequence =
    useRef(0);
  const readinessLoadSequence =
    useRef(0);

  async function loadPlanningPlan(
    nextWork: WorkState,
  ) {
    const sequence =
      ++eventLoadSequence.current;
    const localPlan =
      safeReadPlan(nextWork.costingId);

    setPlan(localPlan);
    setSelectedFunction(
      buildFunctions(nextWork)[0]?.key ||
        'event',
    );

    try {
      const response =
        await fetch(
          `/api/client/event-planning?costingId=${encodeURIComponent(
            nextWork.costingId,
          )}`,
          { cache: 'no-store' },
        );

      if (
        sequence !==
        eventLoadSequence.current ||
        !response.ok
      ) {
        return;
      }

      const data =
        await response.json();
      const serverPlan =
        data.plan &&
        typeof data.plan === 'object' &&
        !Array.isArray(data.plan)
          ? data.plan as StoredPlan
          : {};

      if (
        data.exists &&
        Object.keys(serverPlan).length
      ) {
        setPlan(serverPlan);
        writePlan(
          nextWork.costingId,
          serverPlan,
        );
      }
    } catch {
      // Keep the local plan available if the server is temporarily unavailable.
    }
  }

  async function loadReadinessData(
    nextWork: WorkState,
  ) {
    const sequence =
      ++readinessLoadSequence.current;

    setReadinessLoading(true);

    const dishNames =
      Array.from(
        new Set(
          nextWork.menu
            .filter(
              (item) =>
                item.coverageStatus !==
                'REJECTED',
            )
            .map(
              (item) =>
                item.name,
            )
            .filter(Boolean),
        ),
      );

    try {
      const [
        recipeResponse,
        rateResponse,
        quotationResponse,
      ] =
        await Promise.all([
          fetch(
            '/api/recipe-ingredients',
            {
              method:
                'POST',
              cache:
                'no-store',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body:
                JSON.stringify({
                  dishNames,
                }),
            },
          ),
          fetch(
            `/api/client/ingredients?city=${encodeURIComponent(
              nextWork.event.city ||
                nextWork.profile.city ||
                '',
            )}`,
            {
              cache:
                'no-store',
            },
          ),
          fetch(
            `/api/client/quotations?costingId=${encodeURIComponent(
              nextWork.costingId,
            )}`,
            {
              cache:
                'no-store',
            },
          ),
        ]);

      if (
        sequence !==
        readinessLoadSequence.current
      ) {
        return;
      }

      const [
        recipeData,
        rateData,
        quotationData,
      ] =
        await Promise.all([
          recipeResponse.json(),
          rateResponse.json(),
          quotationResponse.json(),
        ]);

      setReadinessRecipes(
        recipeResponse.ok &&
        Array.isArray(
          recipeData.recipes,
        )
          ? recipeData.recipes as
              GroceryRecipe[]
          : [],
      );

      setReadinessRates(
        rateResponse.ok &&
        Array.isArray(
          rateData.rates,
        )
          ? rateData.rates as
              GroceryIngredientRate[]
          : [],
      );

      setQuotationStatus(
        quotationResponse.ok &&
        quotationData.quotation
          ? String(
              quotationData.quotation
                .status ||
                'DRAFT',
            ).toUpperCase()
          : '',
      );
    } catch {
      if (
        sequence !==
        readinessLoadSequence.current
      ) {
        return;
      }

      setReadinessRecipes([]);
      setReadinessRates([]);
      setQuotationStatus('');
    } finally {
      if (
        sequence ===
        readinessLoadSequence.current
      ) {
        setReadinessLoading(false);
      }
    }
  }

  async function activatePlanningEvent(
    nextWork: WorkState,
    syncWorkspace = true,
  ) {
    setWork(nextWork);
    setSelectedEventId(
      nextWork.costingId,
    );
    setEventError('');

    if (syncWorkspace) {
      const session =
        getSession();

      if (session) {
        saveWork(
          session.tenantId,
          nextWork,
        );
        flushWorkSave(
          session.tenantId,
        );
      }
    }

    await Promise.all([
      loadPlanningPlan(
        nextWork,
      ),
      loadReadinessData(
        nextWork,
      ),
    ]);
  }

  async function switchPlanningEvent(
    costingId: string,
  ) {
    if (!costingId) {
      return;
    }

    if (
      costingId ===
      work?.costingId
    ) {
      setSelectedEventId(
        costingId,
      );
      return;
    }

    const option =
      eventOptions.find(
        (item) =>
          item.costingId ===
          costingId,
      );

    if (!option) {
      return;
    }

    setEventLoading(true);
    setEventError('');

    try {
      let nextWork:
        WorkState | null =
          null;

      if (
        option.source ===
        'DRAFT'
      ) {
        const response =
          await fetch(
            `/api/client/drafts?costingId=${encodeURIComponent(
              costingId,
            )}`,
            { cache: 'no-store' },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Could not load draft event',
          );
        }

        nextWork =
          data.draft
            ?.workData as
            WorkState;
      } else if (
        option.source ===
        'COMPLETED'
      ) {
        const response =
          await fetch(
            `/api/client/costings?costingId=${encodeURIComponent(
              costingId,
            )}`,
            { cache: 'no-store' },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              'Could not load completed event',
          );
        }

        nextWork =
          data.costing
            ?.snapshot as
            WorkState;
      } else {
        const session =
          getSession();

        if (session) {
          nextWork =
            loadWork(
              session.tenantId,
            );
        }
      }

      if (
        !nextWork ||
        !nextWork.costingId
      ) {
        throw new Error(
          'Saved event data is unavailable',
        );
      }

      await activatePlanningEvent(
        nextWork,
        true,
      );
    } catch (error) {
      setEventError(
        error instanceof Error
          ? error.message
          : 'Could not load this event.',
      );
    } finally {
      setEventLoading(false);
    }
  }

  useEffect(() => {
    const session = getSession();

    if (!session) {
      window.location.assign('/login');
      return;
    }

    const currentWork =
      loadWork(session.tenantId);

    void activatePlanningEvent(
      currentWork,
      false,
    );

    void Promise.all([
      fetch('/api/client/vendors', {
        cache: 'no-store',
      }),
      fetch('/api/client/equipment', {
        cache: 'no-store',
      }),
      fetch('/api/client/crockery', {
        cache: 'no-store',
      }),
      fetch('/api/client/uniforms', {
        cache: 'no-store',
      }),
      fetch('/api/client/disposable-master', {
        cache: 'no-store',
      }),
      fetch('/api/client/drafts?limit=100', {
        cache: 'no-store',
      }),
      fetch('/api/client/costings?limit=100', {
        cache: 'no-store',
      }),
    ])
      .then(async ([
        vendorResponse,
        equipmentResponse,
        crockeryResponse,
        uniformResponse,
        disposableResponse,
        draftsResponse,
        costingsResponse,
      ]) => {
        if (vendorResponse.ok) {
          const vendorData =
            await vendorResponse.json();
          setVendors(
            Array.isArray(vendorData.vendors)
              ? vendorData.vendors as Vendor[]
              : [],
          );
        }

        if (equipmentResponse.ok) {
          const equipmentData =
            await equipmentResponse.json();
          setEquipment(
            Array.isArray(equipmentData.equipment)
              ? equipmentData.equipment as EquipmentItem[]
              : [],
          );
        }

        if (crockeryResponse.ok) {
          const crockeryData =
            await crockeryResponse.json();
          setCrockery(
            Array.isArray(crockeryData.crockery)
              ? crockeryData.crockery as CrockeryItem[]
              : [],
          );
        }

        if (uniformResponse.ok) {
          const uniformData =
            await uniformResponse.json();
          setUniforms(
            Array.isArray(uniformData.uniforms)
              ? uniformData.uniforms as UniformItem[]
              : [],
          );
        }

        if (disposableResponse.ok) {
          const disposableData =
            await disposableResponse.json();
          setDisposableMaster(
            Array.isArray(disposableData.items)
              ? disposableData.items as DisposableMasterItem[]
              : [],
          );
        }

        const options =
          new Map<
            string,
            PlanningEventOption
          >();

        if (costingsResponse.ok) {
          const data =
            await costingsResponse.json();

          const rows =
            Array.isArray(data.costings)
              ? data.costings
              : [];

          for (const item of rows) {
            const costingId =
              String(
                item.costingId || '',
              );

            if (!costingId) {
              continue;
            }

            options.set(
              costingId,
              {
                costingId,
                source:
                  'COMPLETED',
                eventName:
                  String(
                    item.eventName ||
                      '',
                  ),
                clientName:
                  String(
                    item.clientName ||
                      '',
                  ),
                eventDate:
                  String(
                    item.eventDate ||
                      '',
                  ),
                totalCovers:
                  Math.max(
                    0,
                    Number(
                      item.totalCovers,
                    ) || 0,
                  ),
                timestamp:
                  String(
                    item.updatedAt ||
                      item.completedAt ||
                      '',
                  ),
              },
            );
          }
        }

        if (draftsResponse.ok) {
          const data =
            await draftsResponse.json();

          const rows =
            Array.isArray(data.drafts)
              ? data.drafts
              : [];

          for (const item of rows) {
            const costingId =
              String(
                item.costingId || '',
              );

            if (!costingId) {
              continue;
            }

            options.set(
              costingId,
              {
                costingId,
                source:
                  'DRAFT',
                eventName:
                  String(
                    item.eventName ||
                      '',
                  ),
                clientName:
                  String(
                    item.clientName ||
                      '',
                  ),
                eventDate:
                  String(
                    item.eventDate ||
                      '',
                  ),
                totalCovers:
                  Math.max(
                    0,
                    Number(
                      item.totalCovers,
                    ) || 0,
                  ),
                timestamp:
                  String(
                    item.updatedAt ||
                      '',
                  ),
              },
            );
          }
        }

        const currentId =
          currentWork.costingId;

        if (
          currentId &&
          !options.has(currentId)
        ) {
          options.set(
            currentId,
            {
              costingId:
                currentId,
              source:
                'CURRENT',
              eventName:
                currentWork.event
                  .eventName,
              clientName:
                currentWork.event
                  .clientName,
              eventDate:
                currentWork.event
                  .eventDate,
              totalCovers:
                Math.max(
                  0,
                  Number(
                    currentWork.event
                      .pax,
                  ) || 0,
                ),
              timestamp:
                currentWork.updatedAt ||
                '',
            },
          );
        }

        const list =
          Array.from(
            options.values(),
          )
            .filter(
              (item) =>
                Boolean(
                  item.costingId,
                ),
            )
            .sort(
              (left, right) => {
                if (
                  left.costingId ===
                  currentId
                ) {
                  return -1;
                }

                if (
                  right.costingId ===
                  currentId
                ) {
                  return 1;
                }

                return (
                  new Date(
                    right.timestamp ||
                      right.eventDate ||
                      0,
                  ).getTime() -
                  new Date(
                    left.timestamp ||
                      left.eventDate ||
                      0,
                  ).getTime()
                );
              },
            );

        setEventOptions(list);
        setSelectedEventId(
          currentId,
        );
      })
      .catch(() => {
        if (
          currentWork.costingId
        ) {
          setEventOptions([
            {
              costingId:
                currentWork.costingId,
              source:
                'CURRENT',
              eventName:
                currentWork.event
                  .eventName,
              clientName:
                currentWork.event
                  .clientName,
              eventDate:
                currentWork.event
                  .eventDate,
              totalCovers:
                Math.max(
                  0,
                  Number(
                    currentWork.event
                      .pax,
                  ) || 0,
                ),
              timestamp:
                currentWork.updatedAt ||
                '',
            },
          ]);
        }
      });
  }, []);

  const functions = useMemo(
    () => (work ? buildFunctions(work) : []),
    [work],
  );

  const currentFunction = useMemo(
    () =>
      functions.find(
        (item) => item.key === selectedFunction,
      ) ||
      functions[0] ||
      null,
    [functions, selectedFunction],
  );

  const defaultRows = useMemo(
    () =>
      currentFunction && work
        ? seedRows(currentFunction, work)
        : [],
    [currentFunction, work],
  );

  const currentRows = useMemo(() => {
    if (!currentFunction) return [];
    return plan[currentFunction.key] || defaultRows;
  }, [currentFunction, defaultRows, plan]);

  const visibleRows = useMemo(
    () =>
      currentRows.filter(
        (row) => row.kind === tab,
      ),
    [currentRows, tab],
  );


  const grocerySupplierSummary =
    useMemo(
      () =>
        GROCERY_SUPPLIER_GROUPS.map(
          (group) => {
            const rows =
              currentRows.filter(
                (row) =>
                  row.kind ===
                    'GROCERY' &&
                  grocerySupplierGroup(
                    row,
                  ) === group.key,
              );

            const assigned =
              rows.filter(
                (row) =>
                  Boolean(
                    row.assignedTo.trim(),
                  ),
              );

            const confirmed =
              rows.filter(
                (row) =>
                  [
                    'CONFIRMED',
                    'DELIVERED',
                    'CLOSED',
                  ].includes(
                    row.status,
                  ),
              );

            const suppliers =
              Array.from(
                new Set(
                  assigned
                    .map(
                      (row) =>
                        row.assignedTo.trim(),
                    )
                    .filter(Boolean),
                ),
              );

            return {
              ...group,
              rows,
              assignedCount:
                assigned.length,
              confirmedCount:
                confirmed.length,
              suppliers,
              cost:
                rows.reduce(
                  (sum, row) =>
                    sum +
                    Math.max(
                      0,
                      Number(
                        row.quantity,
                      ) || 0,
                    ) *
                      Math.max(
                        0,
                        Number(
                          row.rate,
                        ) || 0,
                      ),
                  0,
                ),
              readiness:
                readiness(
                  rows,
                ),
            };
          },
        ),
      [currentRows],
    );

  const menuVendorRows =
    useMemo(
      () =>
        currentRows.filter(
          (row) =>
            row.kind ===
            'MENU',
        ),
      [currentRows],
    );

  const menuVendorSummary =
    useMemo(() => {
      const assigned =
        menuVendorRows.filter(
          (row) =>
            Boolean(
              row.assignedTo.trim(),
            ),
        ).length;

      const confirmed =
        menuVendorRows.filter(
          (row) =>
            [
              'CONFIRMED',
              'DELIVERED',
              'CLOSED',
            ].includes(
              row.status,
            ),
        ).length;

      const withSetupTime =
        menuVendorRows.filter(
          (row) =>
            Boolean(
              row.deliveryTime,
            ),
        ).length;

      const totalCost =
        menuVendorRows.reduce(
          (sum, row) =>
            sum +
            Math.max(
              0,
              Number(
                row.quantity,
              ) || 0,
            ) *
              Math.max(
                0,
                Number(
                  row.rate,
                ) || 0,
              ),
          0,
        );

      return {
        assigned,
        confirmed,
        withSetupTime,
        totalCost,
        readiness:
          readiness(
            menuVendorRows,
          ),
      };
    }, [menuVendorRows]);

  const manpowerAgencyRows =
    useMemo(
      () =>
        currentRows.filter(
          (row) =>
            row.kind ===
            'MANPOWER',
        ),
      [currentRows],
    );

  const manpowerAgencyGroups =
    useMemo(() => {
      const groups =
        new Map<
          string,
          AssignmentRow[]
        >();

      manpowerAgencyRows.forEach(
        (row) => {
          const department =
            manpowerDepartmentLabel(
              row,
            );

          const current =
            groups.get(
              department,
            ) || [];

          current.push(row);
          groups.set(
            department,
            current,
          );
        },
      );

      const order =
        [
          'Service',
          'Counters',
          'Kitchen',
          'Utility',
          'Other',
        ];

      return Array.from(
        groups.entries(),
      )
        .map(
          ([
            department,
            rows,
          ]) => ({
            department,
            rows,
          }),
        )
        .sort(
          (a, b) =>
            order.indexOf(
              a.department,
            ) -
            order.indexOf(
              b.department,
            ),
        );
    }, [manpowerAgencyRows]);

  const manpowerAgencySummary =
    useMemo(() => {
      const totalPeople =
        manpowerAgencyRows.reduce(
          (sum, row) =>
            sum +
            Math.max(
              0,
              Number(
                row.quantity,
              ) || 0,
            ),
          0,
        );

      const assignedPeople =
        manpowerAgencyRows
          .filter(
            (row) =>
              Boolean(
                row.assignedTo.trim(),
              ),
          )
          .reduce(
            (sum, row) =>
              sum +
              Math.max(
                0,
                Number(
                  row.quantity,
                ) || 0,
              ),
            0,
          );

      const assignedRoles =
        manpowerAgencyRows.filter(
          (row) =>
            Boolean(
              row.assignedTo.trim(),
            ),
        ).length;

      const confirmedRoles =
        manpowerAgencyRows.filter(
          (row) =>
            [
              'CONFIRMED',
              'DELIVERED',
              'CLOSED',
            ].includes(
              row.status,
            ),
        ).length;

      const withReportingTime =
        manpowerAgencyRows.filter(
          (row) =>
            Boolean(
              row.deliveryTime,
            ),
        ).length;

      const totalCost =
        manpowerAgencyRows.reduce(
          (sum, row) =>
            sum +
            Math.max(
              0,
              Number(
                row.quantity,
              ) || 0,
            ) *
              Math.max(
                0,
                Number(
                  row.rate,
                ) || 0,
              ),
          0,
        );

      return {
        totalPeople,
        assignedPeople,
        assignedRoles,
        confirmedRoles,
        withReportingTime,
        totalCost,
        readiness:
          readiness(
            manpowerAgencyRows,
          ),
      };
    }, [manpowerAgencyRows]);

  const transportRows =
    useMemo(
      () =>
        currentRows.filter(
          (row) =>
            row.kind ===
            'TRANSPORT',
        ),
      [currentRows],
    );

  const transportSummary =
    useMemo(() => {
      const assigned =
        transportRows.filter(
          (row) =>
            Boolean(
              row.assignedTo.trim(),
            ),
        ).length;

      const confirmed =
        transportRows.filter(
          (row) =>
            [
              'CONFIRMED',
              'DELIVERED',
              'CLOSED',
            ].includes(
              row.status,
            ),
        ).length;

      const totalTrips =
        transportRows.reduce(
          (sum, row) =>
            sum +
            Math.max(
              0,
              Number(
                row.quantity,
              ) || 0,
            ),
          0,
        );

      const totalCost =
        transportRows.reduce(
          (sum, row) =>
            sum +
            Math.max(
              0,
              Number(
                row.quantity,
              ) || 0,
            ) *
              Math.max(
                0,
                Number(
                  row.rate,
                ) || 0,
              ),
          0,
        );

      const withTiming =
        transportRows.filter(
          (row) =>
            Boolean(
              row.deliveryTime,
            ),
        ).length;

      return {
        assigned,
        confirmed,
        totalTrips,
        totalCost,
        withTiming,
        readiness:
          readiness(
            transportRows,
          ),
      };
    }, [transportRows]);

  const equipmentCategoryGroups =
    useMemo(() => {
      const groups =
        new Map<
          string,
          EquipmentItem[]
        >();

      equipment.forEach(
        (item) => {
          const category =
            item.category.trim() ||
            'Other';

          const current =
            groups.get(category) ||
            [];

          current.push(item);
          groups.set(
            category,
            current,
          );
        },
      );

      return Array.from(
        groups.entries(),
      )
        .map(
          ([
            category,
            items,
          ]) => ({
            category,
            items: [...items].sort(
              (a, b) => {
                if (
                  a.active !==
                  b.active
                ) {
                  return a.active
                    ? -1
                    : 1;
                }

                return a.name.localeCompare(
                  b.name,
                );
              },
            ),
          }),
        )
        .sort(
          (a, b) =>
            a.category.localeCompare(
              b.category,
            ),
        );
    }, [equipment]);

  const crockeryCategoryGroups =
    useMemo(() => {
      const groups =
        new Map<
          string,
          CrockeryItem[]
        >();

      crockery.forEach(
        (item) => {
          const category =
            item.category.trim() ||
            'Other';

          const current =
            groups.get(category) ||
            [];

          current.push(item);
          groups.set(
            category,
            current,
          );
        },
      );

      return Array.from(
        groups.entries(),
      )
        .map(
          ([
            category,
            items,
          ]) => ({
            category,
            items: [...items].sort(
              (a, b) => {
                if (
                  a.active !==
                  b.active
                ) {
                  return a.active
                    ? -1
                    : 1;
                }

                return a.name.localeCompare(
                  b.name,
                );
              },
            ),
          }),
        )
        .sort(
          (a, b) =>
            a.category.localeCompare(
              b.category,
            ),
        );
    }, [crockery]);

  const uniformRoleGroups =
    useMemo(() => {
      const groups =
        new Map<string, UniformItem[]>();

      uniforms.forEach((item) => {
        const role =
          item.staffRole.trim() ||
          'Other Staff';

        const current =
          groups.get(role) || [];

        current.push(item);
        groups.set(role, current);
      });

      return Array.from(groups.entries())
        .map(([role, items]) => ({
          role,
          items: [...items].sort((a, b) => {
            if (a.active !== b.active) {
              return a.active ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
          }),
        }))
        .sort((a, b) =>
          a.role.localeCompare(b.role),
        );
    }, [uniforms]);

  const disposableCategoryGroups =
    useMemo(() => {
      const groups =
        new Map<
          string,
          DisposableMasterItem[]
        >();

      disposableMaster.forEach(
        (item) => {
          const category =
            item.category.trim() ||
            'Other';

          const current =
            groups.get(category) ||
            [];

          current.push(item);
          groups.set(
            category,
            current,
          );
        },
      );

      return Array.from(
        groups.entries(),
      )
        .map(
          ([
            category,
            items,
          ]) => ({
            category,
            items: [...items].sort(
              (a, b) => {
                if (
                  a.active !==
                  b.active
                ) {
                  return a.active
                    ? -1
                    : 1;
                }

                return a.name.localeCompare(
                  b.name,
                );
              },
            ),
          }),
        )
        .sort(
          (a, b) =>
            a.category.localeCompare(
              b.category,
            ),
        );
    }, [disposableMaster]);

  const allRows = useMemo(() => {
    if (!work) return [];

    return functions.flatMap((fn) =>
      plan[fn.key] || seedRows(fn, work),
    );
  }, [functions, plan, work]);

  const totalAssignedCost = allRows.reduce(
    (sum, row) =>
      sum +
      Math.max(0, Number(row.quantity) || 0) *
        Math.max(0, Number(row.rate) || 0),
    0,
  );

  const assignedCount = allRows.filter(
    (row) => row.assignedTo.trim(),
  ).length;

  const confirmedCount = allRows.filter((row) =>
    ['CONFIRMED', 'DELIVERED', 'CLOSED'].includes(
      row.status,
    ),
  ).length;

  const activeMenuItems =
    work
      ? work.menu.filter(
          (item) =>
            item.coverageStatus !==
            'REJECTED',
        )
      : [];

  const uniqueMenuDishCount =
    new Set(
      activeMenuItems.map(
        (item) =>
          normalized(
            item.name,
          ),
      ),
    ).size;

  const eventGroceryPlan =
    useMemo(
      () =>
        work
          ? buildFunctionGroceryPlan(
              work,
              readinessRecipes,
              readinessRates,
            )
          : null,
      [
        work,
        readinessRecipes,
        readinessRates,
      ],
    );

  const recipeMatchedCount =
    eventGroceryPlan
      ?.matchedDishes.length ||
    0;

  const recipeCoverage =
    uniqueMenuDishCount > 0
      ? Math.min(
          100,
          Math.round(
            (
              recipeMatchedCount /
              uniqueMenuDishCount
            ) * 100,
          ),
        )
      : 0;

  const ingredientCount =
    eventGroceryPlan
      ?.combinedItems.length ||
    0;

  const groceryRateCoverage =
    ingredientCount > 0
      ? Math.min(
          100,
          Math.round(
            (
              (
                eventGroceryPlan
                  ?.pricedIngredientCount ||
                0
              ) /
              ingredientCount
            ) * 100,
          ),
        )
      : 0;

  const groceryReadinessScore =
    uniqueMenuDishCount > 0
      ? Math.round(
          (
            recipeCoverage +
            groceryRateCoverage
          ) / 2,
        )
      : 0;

  const manpowerPositiveRows =
    work
      ? work.manpower.filter(
          (row) =>
            Number(
              row.quantity,
            ) > 0,
        )
      : [];

  const manpowerScore =
    activeMenuItems.length > 0 &&
    manpowerPositiveRows.length > 0
      ? 100
      : 0;

  const equipmentRows =
    allRows.filter(
      (row) =>
        row.kind ===
        'EQUIPMENT',
    );

  const equipmentScore =
    readiness(
      equipmentRows,
    );

  const vendorRows =
    allRows.filter(
      (row) =>
        row.partnerType !==
          'IN_HOUSE' &&
        [
          'MENU',
          'MANPOWER',
          'GROCERY',
          'DISPOSABLE',
          'TRANSPORT',
        ].includes(
          row.kind,
        ),
    );

  const assignedVendorRows =
    vendorRows.filter(
      (row) =>
        Boolean(
          row.assignedTo.trim(),
        ),
    ).length;

  const vendorScore =
    vendorRows.length > 0
      ? Math.round(
          (
            assignedVendorRows /
            vendorRows.length
          ) * 100,
        )
      : 0;

  const quotationScore =
    quotationStatus
      ? 100
      : 0;

  const eventReadinessItems =
    [
      {
        key: 'menu',
        label: 'Menu',
        score:
          activeMenuItems.length > 0
            ? 100
            : 0,
        detail:
          activeMenuItems.length > 0
            ? `${activeMenuItems.length} dishes`
            : 'Add menu',
      },
      {
        key: 'recipes',
        label: 'Recipes',
        score:
          recipeCoverage,
        detail:
          uniqueMenuDishCount > 0
            ? `${recipeMatchedCount}/${uniqueMenuDishCount} linked`
            : 'No dishes',
      },
      {
        key: 'grocery',
        label: 'Grocery',
        score:
          groceryReadinessScore,
        detail:
          ingredientCount > 0
            ? `${eventGroceryPlan?.pricedIngredientCount || 0}/${ingredientCount} rates`
            : 'No ingredients',
      },
      {
        key: 'manpower',
        label: 'Manpower',
        score:
          manpowerScore,
        detail:
          manpowerPositiveRows.length > 0
            ? `${manpowerPositiveRows.reduce(
                (sum, row) =>
                  sum +
                  Math.max(
                    0,
                    Number(
                      row.quantity,
                    ) || 0,
                  ),
                0,
              )} staff planned`
            : 'Plan team',
      },
      {
        key: 'equipment',
        label: 'Equipment',
        score:
          equipmentScore,
        detail:
          equipmentRows.length > 0
            ? `${equipmentRows.filter(
                (row) =>
                  [
                    'CONFIRMED',
                    'DELIVERED',
                    'CLOSED',
                  ].includes(
                    row.status,
                  ),
              ).length}/${equipmentRows.length} confirmed`
            : 'No plan',
      },
      {
        key: 'vendors',
        label: 'Vendors',
        score:
          vendorScore,
        detail:
          vendorRows.length > 0
            ? `${assignedVendorRows}/${vendorRows.length} assigned`
            : 'No assignments',
      },
      {
        key: 'quotation',
        label: 'Quotation',
        score:
          quotationScore,
        detail:
          quotationStatus
            ? quotationStatus
            : 'Not saved',
      },
    ];

  const eventReadinessScore =
    eventReadinessItems.length
      ? Math.round(
          eventReadinessItems.reduce(
            (sum, item) =>
              sum +
              item.score,
            0,
          ) /
            eventReadinessItems.length,
        )
      : 0;


  const executionTabSummaries =
    TABS.map((item) => {
      const rows =
        allRows.filter(
          (row) =>
            row.kind ===
            item.kind,
        );

      const assigned =
        rows.filter(
          (row) =>
            Boolean(
              row.assignedTo.trim(),
            ),
        ).length;

      const confirmed =
        rows.filter(
          assignmentReady,
        ).length;

      const shortages =
        rows.filter(
          hasStockShortage,
        ).length;

      const missingTiming =
        rows.filter(
          (row) =>
            requiresExecutionTime(
              row.kind,
            ) &&
            !row.deliveryTime,
        ).length;

      const missingRates =
        rows.filter(
          (row) =>
            row.partnerType !==
              'IN_HOUSE' &&
            Boolean(
              row.assignedTo.trim(),
            ) &&
            !(Number(row.rate) > 0),
        ).length;

      const unassigned =
        rows.length -
        assigned;

      const pending =
        rows.filter(
          (row) =>
            !assignmentReady(
              row,
            ),
        ).length;

      const issueCount =
        unassigned +
        shortages +
        missingTiming +
        missingRates +
        pending;

      const cost =
        rows.reduce(
          (sum, row) =>
            sum +
            Math.max(
              0,
              Number(
                row.quantity,
              ) || 0,
            ) *
              Math.max(
                0,
                Number(
                  row.rate,
                ) || 0,
              ),
          0,
        );

      return {
        ...item,
        rows,
        assigned,
        confirmed,
        shortages,
        missingTiming,
        missingRates,
        unassigned,
        pending,
        issueCount,
        cost,
        score:
          operationalReadiness(
            rows,
          ),
      };
    });

  const eventExecutionReadiness =
    operationalReadiness(
      allRows,
    );

  const eventExecutionIssues =
    executionTabSummaries.reduce(
      (sum, item) =>
        sum +
        item.issueCount,
      0,
    );

  const executionBlockers =
    work
      ? functions.flatMap(
          (fn) => {
            const rows =
              plan[fn.key] ||
              seedRows(
                fn,
                work,
              );

        return rows.flatMap(
          (row) => {
            const blockers: Array<{
              key: string;
              functionKey: string;
              functionLabel: string;
              kind: RequirementKind;
              label: string;
              detail: string;
              severity: 'BLOCKED' | 'WARNING';
            }> = [];

            const functionLabel =
              `${fn.dayLabel || 'Event'} · ${fn.mealLabel}`;

            if (
              !row.assignedTo.trim()
            ) {
              blockers.push({
                key:
                  `${fn.key}:${row.id}:assignment`,
                functionKey:
                  fn.key,
                functionLabel,
                kind:
                  row.kind,
                label:
                  `${row.requirement}: partner not assigned`,
                detail:
                  functionLabel,
                severity:
                  'BLOCKED',
              });
            }

            if (
              hasStockShortage(
                row,
              )
            ) {
              blockers.push({
                key:
                  `${fn.key}:${row.id}:shortage`,
                functionKey:
                  fn.key,
                functionLabel,
                kind:
                  row.kind,
                label:
                  `${row.requirement}: stock shortage`,
                detail:
                  `Selected ${row.quantity} · Available ${row.availableQty || 0}`,
                severity:
                  'BLOCKED',
              });
            }

            if (
              requiresExecutionTime(
                row.kind,
              ) &&
              !row.deliveryTime
            ) {
              blockers.push({
                key:
                  `${fn.key}:${row.id}:time`,
                functionKey:
                  fn.key,
                functionLabel,
                kind:
                  row.kind,
                label:
                  `${row.requirement}: time not set`,
                detail:
                  functionLabel,
                severity:
                  'WARNING',
              });
            }

            if (
              row.partnerType !==
                'IN_HOUSE' &&
              Boolean(
                row.assignedTo.trim(),
              ) &&
              !(Number(row.rate) > 0)
            ) {
              blockers.push({
                key:
                  `${fn.key}:${row.id}:rate`,
                functionKey:
                  fn.key,
                functionLabel,
                kind:
                  row.kind,
                label:
                  `${row.requirement}: vendor rate missing`,
                detail:
                  row.assignedTo,
                severity:
                  'WARNING',
              });
            }

            if (
              Boolean(
                row.assignedTo.trim(),
              ) &&
              !assignmentReady(
                row,
              )
            ) {
              blockers.push({
                key:
                  `${fn.key}:${row.id}:confirm`,
                functionKey:
                  fn.key,
                functionLabel,
                kind:
                  row.kind,
                label:
                  `${row.requirement}: confirmation pending`,
                detail:
                  row.assignedTo,
                severity:
                  'WARNING',
              });
            }

            return blockers;
          },
        );
          },
        )
      : [];

  const currentFunctionBlockers =
    currentFunction
      ? executionBlockers.filter(
          (item) =>
            item.functionKey ===
            currentFunction.key,
        )
      : [];

  const currentFunctionExecutionReadiness =
    operationalReadiness(
      currentRows,
    );

  function queueServerSave(next: StoredPlan) {
    if (!work || typeof window === 'undefined') return;

    if (saveTimer.current !== undefined) {
      window.clearTimeout(saveTimer.current);
    }

    setSaveState('SAVING');

    saveTimer.current = window.setTimeout(() => {
      void fetch('/api/client/event-planning', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          costingId: work.costingId,
          plan: next,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Save failed');
          }
          setSaveState('SAVED');
        })
        .catch(() => {
          setSaveState('ERROR');
        });
    }, 550);
  }

  function persistPlan(next: StoredPlan) {
    if (!work) return;

    setPlan(next);
    writePlan(work.costingId, next);
    queueServerSave(next);
  }

  function persistRows(
    fnKey: string,
    rows: AssignmentRow[],
  ) {
    if (!work) return;

    persistPlan({
      ...plan,
      [fnKey]: rows,
    });
  }

  function updateRow(
    id: string,
    patch: Partial<AssignmentRow>,
  ) {
    if (!currentFunction) return;

    const baseRows =
      plan[currentFunction.key] || defaultRows;

    persistRows(
      currentFunction.key,
      baseRows.map((row) =>
        row.id === id
          ? { ...row, ...patch }
          : row,
      ),
    );
  }

  function vendorMatchesGroceryGroup(
    vendor: Vendor,
    row: AssignmentRow,
  ) {
    if (row.kind !== 'GROCERY') {
      return false;
    }

    const category =
      normalized(
        vendor.category,
      );

    const group =
      grocerySupplierGroup(
        row,
      );

    if (group === 'DAIRY') {
      return /dairy|milk|paneer/.test(
        category,
      );
    }

    if (
      group ===
      'VEGETABLE_FRUIT'
    ) {
      return /vegetable|fruit|fresh|produce/.test(
        category,
      );
    }

    return /grocery|provision|dry|kirana/.test(
      category,
    );
  }

  function vendorMatchesMenuRow(
    vendor: Vendor,
    row: AssignmentRow,
  ) {
    if (row.kind !== 'MENU') {
      return false;
    }

    if (
      matchingVendorRate(
        vendor,
        row,
      )
    ) {
      return true;
    }

    const vendorValue =
      normalized(
        `${vendor.category} ${vendor.type}`,
      );

    const category =
      normalized(
        menuCategoryFromRow(
          row,
        ),
      );

    return Boolean(
      /food|catering|caterer|kitchen|chef|live counter|sweet|farsan|bakery/.test(
        vendorValue,
      ) ||
      (
        category &&
        vendorValue.includes(
          category,
        )
      )
    );
  }

  function vendorMatchesManpowerAgency(
    vendor: Vendor,
  ) {
    const value =
      normalized(
        `${vendor.category} ${vendor.type}`,
      );

    return /manpower|staff|service|waiter|chef|labour|labor|agency/.test(
      value,
    ) ||
      vendor.type ===
        'AGENCY';
  }

  function vendorMatchesTransport(
    vendor: Vendor,
  ) {
    const value =
      normalized(
        `${vendor.category} ${vendor.type}`,
      );

    return /transport|vehicle|logistic|tempo|truck|cab|taxi/.test(
      value,
    );
  }

  function assignPartner(
    row: AssignmentRow,
    value: string,
  ) {
    if (value === '__in_house') {
      updateRow(row.id, {
        partnerId: '',
        assignedTo: 'In-house',
        partnerType: 'IN_HOUSE',
      });
      return;
    }

    const vendor = vendors.find(
      (item) => item.id === value,
    );

    if (!vendor) {
      updateRow(row.id, {
        partnerId: '',
        assignedTo: '',
      });
      return;
    }

    const matchedRate = matchingVendorRate(
      vendor,
      row,
    );

    updateRow(row.id, {
      partnerId: vendor.id,
      assignedTo: vendor.name,
      partnerType:
        vendor.type === 'AGENCY'
          ? 'AGENCY'
          : 'VENDOR',
      rate:
        matchedRate?.rate ??
        row.rate,
      unit:
        matchedRate?.unit ||
        row.unit,
      paymentTerms:
        vendor.paymentTerms ||
        row.paymentTerms ||
        '',
    });
  }

  function setEquipmentQuantity(
    item: EquipmentItem,
    quantity: number,
  ) {
    if (!currentFunction) return;

    const nextQuantity =
      Math.max(
        0,
        Math.round(
          Number(
            quantity,
          ) || 0,
        ),
      );

    const baseRows =
      plan[currentFunction.key] ||
      defaultRows;

    const existing =
      baseRows.find(
        (row) =>
          row.kind === 'EQUIPMENT' &&
          (
            row.equipmentId === item.id ||
            (
              !row.equipmentId &&
              normalized(
                row.requirement,
              ) ===
                normalized(
                  item.name,
                )
            )
          ),
      );

    if (
      existing &&
      nextQuantity <= 0
    ) {
      persistRows(
        currentFunction.key,
        baseRows.filter(
          (row) =>
            row.id !==
            existing.id,
        ),
      );
      return;
    }

    if (existing) {
      persistRows(
        currentFunction.key,
        baseRows.map(
          (row) =>
            row.id ===
            existing.id
              ? {
                  ...row,
                  equipmentId:
                    item.id,
                  requirement:
                    item.name,
                  detail:
                    [
                      item.category,
                      item.capacity,
                      item.notes,
                    ]
                      .filter(Boolean)
                      .join(
                        ' · ',
                      ),
                  quantity:
                    nextQuantity,
                  unit:
                    item.unit ||
                    row.unit ||
                    'unit',
                  photoUrl:
                    item.photoUrl ||
                    row.photoUrl,
                  availableQty:
                    item.availableQty,
                  rate:
                    Number(
                      row.rate,
                    ) > 0
                      ? row.rate
                      : item.defaultRate,
                  partnerId:
                    row.partnerId ||
                    (
                      item.ownership ===
                        'RENTAL'
                        ? item.vendorId
                        : ''
                    ),
                  assignedTo:
                    row.assignedTo ||
                    (
                      item.ownership ===
                        'RENTAL'
                        ? item.vendorName
                        : 'In-house'
                    ),
                  partnerType:
                    row.assignedTo
                      ? row.partnerType
                      : item.ownership ===
                          'RENTAL'
                        ? 'VENDOR'
                        : 'IN_HOUSE',
                }
              : row,
        ),
      );
      return;
    }

    if (nextQuantity <= 0) {
      return;
    }

    const row = newRow(
      'EQUIPMENT',
      item.name,
      [
        item.category,
        item.capacity,
        item.notes,
      ]
        .filter(Boolean)
        .join(' · '),
      nextQuantity,
      item.unit || 'unit',
      item.defaultRate,
    );

    persistRows(
      currentFunction.key,
      [
        ...baseRows,
        {
          ...row,
          equipmentId:
            item.id,
          photoUrl:
            item.photoUrl,
          availableQty:
            item.availableQty,
          partnerId:
            item.ownership ===
              'RENTAL'
              ? item.vendorId
              : '',
          assignedTo:
            item.ownership ===
              'RENTAL'
              ? item.vendorName
              : 'In-house',
          partnerType:
            item.ownership ===
              'RENTAL'
              ? 'VENDOR'
              : 'IN_HOUSE',
        },
      ],
    );
  }

  function addEquipmentFromMaster(
    item: EquipmentItem,
  ) {
    setEquipmentQuantity(
      item,
      selectedEquipmentQty(
        item.id,
      ) + 1,
    );
  }

  function selectedEquipmentQty(
    equipmentId: string,
  ) {
    const masterItem =
      equipment.find(
        (item) =>
          item.id ===
          equipmentId,
      );

    return currentRows
      .filter(
        (row) =>
          row.kind ===
            'EQUIPMENT' &&
          (
            row.equipmentId ===
              equipmentId ||
            (
              !row.equipmentId &&
              masterItem &&
              normalized(
                row.requirement,
              ) ===
                normalized(
                  masterItem.name,
                )
            )
          ),
      )
      .reduce(
        (sum, row) =>
          sum +
          Math.max(
            0,
            Number(row.quantity) || 0,
          ),
        0,
      );
  }

  function recommendedCrockeryQty(
    item: CrockeryItem,
  ) {
    const pax = Math.max(
      0,
      Number(currentFunction?.pax) || 0,
    );
    const base =
      pax *
      Math.max(
        0,
        Number(item.unitsPerGuest) || 0,
      );
    const withBuffer =
      base *
      (1 +
        Math.max(
          0,
          Number(item.bufferPercent) || 0,
        ) /
          100);

    return Math.max(
      0,
      Math.ceil(withBuffer),
    );
  }

  function setCrockeryQuantity(
    item: CrockeryItem,
    quantity: number,
  ) {
    if (!currentFunction) return;

    const nextQuantity =
      Math.max(
        0,
        Math.round(
          Number(
            quantity,
          ) || 0,
        ),
      );

    const baseRows =
      plan[currentFunction.key] ||
      defaultRows;

    const existing =
      baseRows.find(
        (row) =>
          row.kind ===
            'CROCKERY' &&
          (
            row.crockeryId ===
              item.id ||
            (
              !row.crockeryId &&
              normalized(
                row.requirement,
              ) ===
                normalized(
                  item.name,
                )
            )
          ),
      );

    if (
      existing &&
      nextQuantity <= 0
    ) {
      persistRows(
        currentFunction.key,
        baseRows.filter(
          (row) =>
            row.id !==
            existing.id,
        ),
      );
      return;
    }

    if (existing) {
      persistRows(
        currentFunction.key,
        baseRows.map(
          (row) =>
            row.id ===
            existing.id
              ? {
                  ...row,
                  crockeryId:
                    item.id,
                  requirement:
                    item.name,
                  detail:
                    [
                      item.category,
                      item.sizeType,
                      `${item.unitsPerGuest || 0} / guest`,
                      `${item.bufferPercent || 0}% buffer`,
                      item.notes,
                    ]
                      .filter(Boolean)
                      .join(
                        ' · ',
                      ),
                  quantity:
                    nextQuantity,
                  unit:
                    item.unit ||
                    row.unit ||
                    'pcs',
                  photoUrl:
                    item.photoUrl ||
                    row.photoUrl,
                  availableQty:
                    item.availableQty,
                  unitsPerGuest:
                    item.unitsPerGuest,
                  bufferPercent:
                    item.bufferPercent,
                  rate:
                    Number(
                      row.rate,
                    ) > 0
                      ? row.rate
                      : item.defaultRate,
                  partnerId:
                    row.partnerId ||
                    (
                      item.ownership ===
                        'RENTAL'
                        ? item.vendorId
                        : ''
                    ),
                  assignedTo:
                    row.assignedTo ||
                    (
                      item.ownership ===
                        'RENTAL'
                        ? item.vendorName
                        : 'In-house'
                    ),
                  partnerType:
                    row.assignedTo
                      ? row.partnerType
                      : item.ownership ===
                          'RENTAL'
                        ? 'VENDOR'
                        : 'IN_HOUSE',
                }
              : row,
        ),
      );
      return;
    }

    if (nextQuantity <= 0) {
      return;
    }

    const row = newRow(
      'CROCKERY',
      item.name,
      [
        item.category,
        item.sizeType,
        `${item.unitsPerGuest || 0} / guest`,
        `${item.bufferPercent || 0}% buffer`,
        item.notes,
      ]
        .filter(Boolean)
        .join(' · '),
      nextQuantity,
      item.unit || 'pcs',
      item.defaultRate,
    );

    persistRows(
      currentFunction.key,
      [
        ...baseRows,
        {
          ...row,
          crockeryId:
            item.id,
          photoUrl:
            item.photoUrl,
          availableQty:
            item.availableQty,
          unitsPerGuest:
            item.unitsPerGuest,
          bufferPercent:
            item.bufferPercent,
          partnerId:
            item.ownership ===
              'RENTAL'
              ? item.vendorId
              : '',
          assignedTo:
            item.ownership ===
              'RENTAL'
              ? item.vendorName
              : 'In-house',
          partnerType:
            item.ownership ===
              'RENTAL'
              ? 'VENDOR'
              : 'IN_HOUSE',
        },
      ],
    );
  }

  function addCrockeryFromMaster(
    item: CrockeryItem,
  ) {
    setCrockeryQuantity(
      item,
      selectedCrockeryQty(
        item.id,
      ) + 1,
    );
  }

  function useRecommendedCrockeryQty(
    item: CrockeryItem,
  ) {
    setCrockeryQuantity(
      item,
      recommendedCrockeryQty(
        item,
      ),
    );
  }

  function selectedCrockeryQty(
    crockeryId: string,
  ) {
    const masterItem =
      crockery.find(
        (item) =>
          item.id ===
          crockeryId,
      );

    return currentRows
      .filter(
        (row) =>
          row.kind ===
            'CROCKERY' &&
          (
            row.crockeryId ===
              crockeryId ||
            (
              !row.crockeryId &&
              masterItem &&
              normalized(
                row.requirement,
              ) ===
                normalized(
                  masterItem.name,
                )
            )
          ),
      )
      .reduce(
        (sum, row) =>
          sum +
          Math.max(
            0,
            Number(row.quantity) || 0,
          ),
        0,
      );
  }

  function requiredUniformQty(
    item: UniformItem,
  ) {
    const role = normalized(item.staffRole);
    if (!role) return 0;

    return currentRows
      .filter((row) => row.kind === 'MANPOWER')
      .filter((row) => {
        const manpowerRole = normalized(row.requirement);
        return (
          manpowerRole === role ||
          manpowerRole.includes(role) ||
          role.includes(manpowerRole)
        );
      })
      .reduce(
        (sum, row) =>
          sum +
          Math.max(0, Number(row.quantity) || 0),
        0,
      );
  }

  function selectedUniformQty(
    uniformId: string,
  ) {
    const masterItem =
      uniforms.find(
        (item) =>
          item.id === uniformId,
      );

    return currentRows
      .filter(
        (row) =>
          row.kind === 'DRESS' &&
          (
            row.uniformId === uniformId ||
            (
              !row.uniformId &&
              masterItem &&
              normalized(
                row.requirement,
              ) ===
                normalized(
                  masterItem.name,
                )
            )
          ),
      )
      .reduce(
        (sum, row) =>
          sum +
          Math.max(
            0,
            Number(row.quantity) || 0,
          ),
        0,
      );
  }

  function setUniformQuantity(
    item: UniformItem,
    quantity: number,
  ) {
    if (!currentFunction) return;

    const nextQuantity =
      Math.max(
        0,
        Math.round(
          Number(quantity) || 0,
        ),
      );

    const baseRows =
      plan[currentFunction.key] ||
      defaultRows;

    const existing =
      baseRows.find(
        (row) =>
          row.kind === 'DRESS' &&
          (
            row.uniformId === item.id ||
            (
              !row.uniformId &&
              normalized(
                row.requirement,
              ) === normalized(
                item.name,
              )
            )
          ),
      );

    if (existing && nextQuantity <= 0) {
      persistRows(
        currentFunction.key,
        baseRows.filter(
          (row) =>
            row.id !== existing.id,
        ),
      );
      return;
    }

    if (existing) {
      persistRows(
        currentFunction.key,
        baseRows.map(
          (row) =>
            row.id === existing.id
              ? {
                  ...row,
                  uniformId: item.id,
                  requirement: item.name,
                  detail: [
                    item.staffRole,
                    item.components,
                    item.sizes
                      ? `Sizes: ${item.sizes}`
                      : '',
                    item.laundryStatus
                      ? `Laundry: ${item.laundryStatus.replace(/_/g, ' ')}`
                      : '',
                    item.notes,
                  ]
                    .filter(Boolean)
                    .join(' · '),
                  quantity:
                    nextQuantity,
                  unit:
                    item.unit ||
                    row.unit ||
                    'set',
                  photoUrl:
                    item.photoUrl ||
                    row.photoUrl,
                  availableQty:
                    item.availableQty,
                  rate:
                    Number(row.rate) > 0
                      ? row.rate
                      : item.defaultRate,
                  partnerId:
                    row.partnerId ||
                    (
                      item.ownership === 'RENTAL'
                        ? item.vendorId
                        : ''
                    ),
                  assignedTo:
                    row.assignedTo ||
                    (
                      item.ownership === 'RENTAL'
                        ? item.vendorName
                        : 'In-house'
                    ),
                  partnerType:
                    row.assignedTo
                      ? row.partnerType
                      : item.ownership === 'RENTAL'
                        ? 'VENDOR'
                        : 'IN_HOUSE',
                }
              : row,
        ),
      );
      return;
    }

    if (nextQuantity <= 0) return;

    const row = newRow(
      'DRESS',
      item.name,
      [
        item.staffRole,
        item.components,
        item.sizes
          ? `Sizes: ${item.sizes}`
          : '',
        item.laundryStatus
          ? `Laundry: ${item.laundryStatus.replace(/_/g, ' ')}`
          : '',
        item.notes,
      ]
        .filter(Boolean)
        .join(' · '),
      nextQuantity,
      item.unit || 'set',
      item.defaultRate,
    );

    persistRows(
      currentFunction.key,
      [
        ...baseRows,
        {
          ...row,
          uniformId: item.id,
          photoUrl: item.photoUrl,
          availableQty: item.availableQty,
          partnerId:
            item.ownership === 'RENTAL'
              ? item.vendorId
              : '',
          assignedTo:
            item.ownership === 'RENTAL'
              ? item.vendorName
              : 'In-house',
          partnerType:
            item.ownership === 'RENTAL'
              ? 'VENDOR'
              : 'IN_HOUSE',
        },
      ],
    );
  }

  function addUniformFromMaster(
    item: UniformItem,
  ) {
    setUniformQuantity(
      item,
      selectedUniformQty(item.id) + 1,
    );
  }

  function useRequiredUniformQty(
    item: UniformItem,
  ) {
    setUniformQuantity(
      item,
      requiredUniformQty(item),
    );
  }

  function assignmentPhoto(
    row: AssignmentRow,
  ) {
    if (row.photoUrl) return row.photoUrl;

    const name = normalized(row.requirement);

    if (row.kind === 'DISPOSABLE') {
      return (
        disposableMaster.find(
          (item) =>
            normalized(item.name) === name,
        )?.photoUrl || ''
      );
    }

    if (row.kind === 'EQUIPMENT') {
      return (
        equipment.find(
          (item) =>
            normalized(item.name) === name,
        )?.photoUrl || ''
      );
    }

    if (row.kind === 'CROCKERY') {
      return (
        crockery.find(
          (item) =>
            normalized(item.name) === name,
        )?.photoUrl || ''
      );
    }

    if (row.kind === 'DRESS') {
      return (
        uniforms.find(
          (item) =>
            normalized(item.name) === name,
        )?.photoUrl || ''
      );
    }

    return '';
  }

  function selectedDisposableQty(
    masterId: string,
  ) {
    const masterItem =
      disposableMaster.find(
        (item) =>
          item.id === masterId,
      );

    return currentRows
      .filter(
        (row) =>
          row.kind ===
            'DISPOSABLE' &&
          (
            row.disposableMasterId ===
              masterId ||
            (
              !row.disposableMasterId &&
              masterItem &&
              normalized(
                row.requirement,
              ) ===
                normalized(
                  masterItem.name,
                )
            )
          ),
      )
      .reduce(
        (sum, row) =>
          sum +
          Math.max(
            0,
            Number(row.quantity) || 0,
          ),
        0,
      );
  }

  function eventDisposableQty(
    item: DisposableMasterItem,
  ) {
    if (!work) return 0;

    return work.disposableItems
      .filter(
        (row) =>
          normalized(
            row.name,
          ) ===
          normalized(
            item.name,
          ),
      )
      .reduce(
        (sum, row) =>
          sum +
          Math.max(
            0,
            Number(
              row.quantity,
            ) || 0,
          ),
        0,
      );
  }

  function setDisposableQuantity(
    item: DisposableMasterItem,
    quantity: number,
  ) {
    if (!currentFunction) return;

    const nextQuantity =
      Math.max(
        0,
        Math.round(
          Number(
            quantity,
          ) || 0,
        ),
      );

    const baseRows =
      plan[currentFunction.key] ||
      defaultRows;

    const existing =
      baseRows.find(
        (row) =>
          row.kind ===
            'DISPOSABLE' &&
          (
            row.disposableMasterId ===
              item.id ||
            (
              !row.disposableMasterId &&
              normalized(
                row.requirement,
              ) ===
                normalized(
                  item.name,
                )
            )
          ),
      );

    if (
      existing &&
      nextQuantity <= 0
    ) {
      persistRows(
        currentFunction.key,
        baseRows.filter(
          (row) =>
            row.id !==
            existing.id,
        ),
      );
      return;
    }

    if (existing) {
      persistRows(
        currentFunction.key,
        baseRows.map(
          (row) =>
            row.id ===
            existing.id
              ? {
                  ...row,
                  disposableMasterId:
                    item.id,
                  requirement:
                    item.name,
                  detail:
                    [
                      item.category,
                      item.notes,
                    ]
                      .filter(Boolean)
                      .join(
                        ' · ',
                      ),
                  quantity:
                    nextQuantity,
                  unit:
                    item.unit ||
                    row.unit ||
                    'pcs',
                  photoUrl:
                    item.photoUrl ||
                    row.photoUrl,
                  availableQty:
                    item.availableQty,
                  rate:
                    Number(
                      row.rate,
                    ) > 0
                      ? row.rate
                      : item.defaultRate,
                  partnerId:
                    row.partnerId ||
                    item.supplierId,
                  assignedTo:
                    row.assignedTo ||
                    item.supplierName,
                  partnerType:
                    row.assignedTo
                      ? row.partnerType
                      : item.supplierName
                        ? 'VENDOR'
                        : 'IN_HOUSE',
                }
              : row,
        ),
      );
      return;
    }

    if (nextQuantity <= 0) {
      return;
    }

    const row = newRow(
      'DISPOSABLE',
      item.name,
      [
        item.category,
        item.notes,
      ]
        .filter(Boolean)
        .join(' · '),
      nextQuantity,
      item.unit || 'pcs',
      item.defaultRate,
    );

    persistRows(
      currentFunction.key,
      [
        ...baseRows,
        {
          ...row,
          disposableMasterId:
            item.id,
          photoUrl:
            item.photoUrl,
          availableQty:
            item.availableQty,
          partnerId:
            item.supplierId,
          assignedTo:
            item.supplierName,
          partnerType:
            item.supplierName
              ? 'VENDOR'
              : 'IN_HOUSE',
        },
      ],
    );
  }

  function addDisposableFromMaster(
    item: DisposableMasterItem,
  ) {
    setDisposableQuantity(
      item,
      selectedDisposableQty(
        item.id,
      ) + 1,
    );
  }

  function useEventDisposableQty(
    item: DisposableMasterItem,
  ) {
    setDisposableQuantity(
      item,
      eventDisposableQty(
        item,
      ),
    );
  }

  function setMenuVendorCovers(
    row: AssignmentRow,
    covers: number,
  ) {
    const nextCovers =
      Math.max(
        0,
        Math.round(
          Number(
            covers,
          ) || 0,
        ),
      );

    if (
      nextCovers <= 0
    ) {
      removeRow(
        row.id,
      );
      return;
    }

    updateRow(
      row.id,
      {
        quantity:
          nextCovers,
        unit:
          'cover',
      },
    );
  }

  function useFunctionCovers(
    row: AssignmentRow,
  ) {
    const covers =
      Math.max(
        0,
        Number(
          currentFunction?.pax,
        ) || 0,
      );

    if (
      covers > 0
    ) {
      setMenuVendorCovers(
        row,
        covers,
      );
    }
  }

  function requiredManpowerQty(
    row: AssignmentRow,
  ) {
    if (!work || !currentFunction) {
      return 0;
    }

    const role =
      normalized(
        row.requirement,
      );

    return work.manpower
      .filter(
        (item) => {
          if (
            normalized(
              item.role,
            ) !== role
          ) {
            return false;
          }

          if (
            currentFunction.serviceId &&
            item.serviceId
          ) {
            return (
              item.serviceId ===
              currentFunction.serviceId
            );
          }

          if (
            item.mealLabel &&
            currentFunction.mealLabel
          ) {
            return (
              item.mealLabel ===
              currentFunction.mealLabel
            );
          }

          return (
            !item.serviceId &&
            !item.mealLabel
          );
        },
      )
      .reduce(
        (sum, item) =>
          sum +
          Math.max(
            0,
            Number(
              item.quantity,
            ) || 0,
          ),
        0,
      );
  }

  function setManpowerAgencyQuantity(
    row: AssignmentRow,
    quantity: number,
  ) {
    const nextQuantity =
      Math.max(
        0,
        Math.round(
          Number(
            quantity,
          ) || 0,
        ),
      );

    if (
      nextQuantity <= 0
    ) {
      removeRow(
        row.id,
      );
      return;
    }

    updateRow(
      row.id,
      {
        quantity:
          nextQuantity,
      },
    );
  }

  function useRequiredManpowerQty(
    row: AssignmentRow,
  ) {
    const required =
      requiredManpowerQty(
        row,
      );

    if (
      required > 0
    ) {
      setManpowerAgencyQuantity(
        row,
        required,
      );
    }
  }

  function setTransportQuantity(
    row: AssignmentRow,
    quantity: number,
  ) {
    if (!currentFunction) return;

    const nextQuantity =
      Math.max(
        0,
        Math.round(
          Number(
            quantity,
          ) || 0,
        ),
      );

    if (nextQuantity <= 0) {
      removeRow(
        row.id,
      );
      return;
    }

    updateRow(
      row.id,
      {
        quantity:
          nextQuantity,
      },
    );
  }

  function addTransportPreset(
    preset: (typeof TRANSPORT_PRESETS)[number],
  ) {
    if (!currentFunction) return;

    const baseRows =
      plan[currentFunction.key] ||
      defaultRows;

    const existing =
      baseRows.find(
        (row) =>
          row.kind ===
            'TRANSPORT' &&
          transportPresetKey(
            row,
          ) === preset.key,
      );

    if (existing) {
      persistRows(
        currentFunction.key,
        baseRows.map(
          (row) =>
            row.id ===
            existing.id
              ? {
                  ...row,
                  requirement:
                    preset.label,
                  detail:
                    preset.detail,
                  quantity:
                    Math.max(
                      1,
                      Number(
                        row.quantity,
                      ) || 0,
                    ) + 1,
                  unit:
                    row.unit ||
                    'trip',
                }
              : row,
        ),
      );
      return;
    }

    persistRows(
      currentFunction.key,
      [
        ...baseRows,
        newRow(
          'TRANSPORT',
          preset.label,
          preset.detail,
          1,
          'trip',
        ),
      ],
    );
  }

  function addRequirement() {
    if (!currentFunction) return;

    const baseRows =
      plan[currentFunction.key] || defaultRows;

    persistRows(
      currentFunction.key,
      [
        ...baseRows,
        newRow(
          tab,
          'New requirement',
          '',
          1,
          tab === 'MANPOWER'
            ? 'person'
            : tab === 'DRESS'
              ? 'set'
            : tab === 'TRANSPORT'
              ? 'trip'
              : 'unit',
        ),
      ],
    );
  }

  function removeRow(id: string) {
    if (!currentFunction) return;

    const baseRows =
      plan[currentFunction.key] || defaultRows;

    persistRows(
      currentFunction.key,
      baseRows.filter((row) => row.id !== id),
    );
  }

  function resetFunctionPlan() {
    if (!currentFunction || !work) return;

    const next = { ...plan };
    delete next[currentFunction.key];

    persistPlan(next);
  }

  if (!work || !currentFunction) {
    return (
      <AppShell
        title="Event Planning"
        subtitle="Assignments, vendors and function readiness"
        hidePageTitle
      >
        <section className="ep-loading">
          Opening event planning…
        </section>
      </AppShell>
    );
  }

  const eventName =
    work.event.eventName ||
    work.event.clientName ||
    'Current Event';

  return (
    <AppShell
      title="Event Planning"
      subtitle="Assignments, vendors and function readiness"
      hidePageTitle
    >
      <section className="ep-page">
        <style>{`
          .ep-page{display:grid;gap:14px;color:#eaf0f7}
          .ep-loading{display:grid;min-height:420px;place-items:center;color:#8b98a8}
          .ep-event-selector{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,420px);gap:14px;align-items:center;padding:14px;border:1px solid #2a323d;border-radius:15px;background:#10151c}
          .ep-event-selector-copy span,.ep-event-selector-copy b,.ep-event-selector-copy small{display:block}
          .ep-event-selector-copy>span{color:#78b5ff;font-size:8px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
          .ep-event-selector-copy>b{margin-top:4px;font-size:15px}
          .ep-event-selector-copy>small{margin-top:4px;color:#7f8c9c;font-size:9px;line-height:1.45}
          .ep-event-select{width:100%;min-height:44px;padding:0 12px;border:1px solid #34404d;border-radius:10px;outline:0;color:#e7edf5;background:#151c25;font:inherit;font-size:11px;font-weight:800;color-scheme:dark}
          .ep-event-select:focus{border-color:rgba(74,156,255,.65);box-shadow:0 0 0 3px rgba(74,156,255,.08)}
          .ep-event-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
          .ep-event-meta span{padding:5px 8px;border-radius:999px;color:#9aa8b8;background:#18202a;font-size:8px;font-weight:800}
          .ep-event-meta span.status{color:#8fc2ff;background:rgba(74,156,255,.09)}
          .ep-event-error{margin:0;padding:9px 11px;border:1px solid rgba(255,98,89,.2);border-radius:9px;color:#ff9891;background:rgba(255,98,89,.06);font-size:9px}
          .ep-readiness{display:grid;gap:11px;padding:14px;border:1px solid #2a323d;border-radius:15px;background:#10151c}
          .ep-readiness-head{display:flex;align-items:center;justify-content:space-between;gap:14px}
          .ep-readiness-title span,.ep-readiness-title b,.ep-readiness-title small{display:block}
          .ep-readiness-title span{color:#78b5ff;font-size:8px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
          .ep-readiness-title b{margin-top:4px;font-size:15px}
          .ep-readiness-title small{margin-top:3px;color:#7f8c9c;font-size:9px}
          .ep-readiness-score{display:grid;width:72px;height:72px;place-items:center;border-radius:50%;padding:6px;box-shadow:0 8px 22px rgba(0,0,0,.18)}
          .ep-readiness-score-inner{display:grid;width:100%;height:100%;place-items:center;border:1px solid rgba(255,255,255,.06);border-radius:50%;background:#10151c}
          .ep-readiness-score b{font-size:18px;letter-spacing:-.03em}
          .ep-readiness-score small{margin-top:-9px;color:#8392a4;font-size:6px;font-weight:900;text-transform:uppercase}
          .ep-readiness-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}
          .ep-readiness-item{position:relative;overflow:hidden;padding:10px;border:1px solid #28313c;border-radius:12px;background:linear-gradient(180deg,#10161d,#0c1117)}
          .ep-readiness-item::after{position:absolute;right:-18px;bottom:-22px;width:58px;height:58px;border-radius:50%;background:rgba(255,255,255,.02);content:""}
          .ep-readiness-item-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
          .ep-readiness-item-heading{display:flex;align-items:center;gap:7px;min-width:0}
          .ep-readiness-icon{display:grid;flex:0 0 auto;width:25px;height:25px;place-items:center;border:1px solid rgba(120,181,255,.16);border-radius:8px;color:#78b5ff;background:rgba(74,156,255,.07)}
          .ep-readiness-icon svg{width:14px;height:14px}
          .ep-readiness-item-top b{font-size:9px}
          .ep-readiness-item-top strong{font-size:9px}
          .ep-readiness-item small{display:block;margin-top:5px;color:#718094;font-size:7px;line-height:1.35}
          .ep-readiness-track{height:5px;overflow:hidden;margin-top:8px;border-radius:999px;background:#202833}
          .ep-readiness-fill{height:100%;border-radius:999px;background:#38c979}
          .ep-readiness-item.needs-work .ep-readiness-fill{background:#f2a12b}
          .ep-readiness-item.blocked .ep-readiness-fill{background:#ef6b63}
          .ep-readiness-item.needs-work .ep-readiness-item-top strong{color:#f3b45d}
          .ep-readiness-item.blocked .ep-readiness-item-top strong{color:#ff8c84}
          .ep-readiness-loading{color:#7f8c9c;font-size:8px;font-weight:800}
          .ep-operations-board{display:grid;gap:12px;padding:14px;border:1px solid #2a323d;border-radius:15px;background:linear-gradient(145deg,#101720,#0c1219)}
          .ep-operations-board-head{display:flex;align-items:center;justify-content:space-between;gap:18px}
          .ep-operations-board-head h2{margin:4px 0 4px;font-size:20px;letter-spacing:-.035em}
          .ep-operations-board-head p{margin:0;color:#7d8b9d;font-size:9px}
          .ep-operations-board-score{display:grid;grid-template-columns:72px minmax(130px,1fr);gap:10px;align-items:center;min-width:250px;padding:8px;border:1px solid rgba(148,163,184,.09);border-radius:12px;background:rgba(255,255,255,.02)}
          .ep-operations-score-ring{display:grid;width:66px;height:66px;padding:5px;place-items:center;border-radius:50%}
          .ep-operations-score-ring>span{display:grid;width:100%;height:100%;place-items:center;border-radius:50%;background:#101720}
          .ep-operations-score-ring b,.ep-operations-score-ring small{display:block;line-height:1}
          .ep-operations-score-ring b{font-size:16px}
          .ep-operations-score-ring small{margin-top:-8px;color:#718094;font-size:6px;font-weight:900;text-transform:uppercase}
          .ep-operations-board-score>div:last-child span,.ep-operations-board-score>div:last-child b,.ep-operations-board-score>div:last-child small{display:block}
          .ep-operations-board-score>div:last-child span{color:#718094;font-size:6px;font-weight:900;text-transform:uppercase}
          .ep-operations-board-score>div:last-child b{margin-top:3px;font-size:17px}
          .ep-operations-board-score>div:last-child small{margin-top:3px;color:#69788b;font-size:7px;line-height:1.35}
          .ep-operations-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
          .ep-operation-card{display:grid;gap:7px;min-width:0;padding:10px;border:1px solid #29333f;border-radius:11px;color:inherit;background:#0f151c;font:inherit;text-align:left;cursor:pointer}
          .ep-operation-card:hover{border-color:#3b4856;background:#111a24}
          .ep-operation-card.ready{border-color:rgba(85,217,143,.16)}
          .ep-operation-card.warning{border-color:rgba(244,173,84,.22)}
          .ep-operation-card.blocked{border-color:rgba(255,126,118,.24)}
          .ep-operation-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
          .ep-operation-card-top span{color:#91a2b6;font-size:7px;font-weight:900;text-transform:uppercase}
          .ep-operation-card-top b{font-size:10px}
          .ep-operation-card.ready .ep-operation-card-top b{color:#6edb9f}
          .ep-operation-card.warning .ep-operation-card-top b{color:#efb05e}
          .ep-operation-card.blocked .ep-operation-card-top b{color:#ff918a}
          .ep-operation-card>strong{color:#e5edf6;font-size:11px}
          .ep-operation-card-meta{display:flex;gap:5px;flex-wrap:wrap}
          .ep-operation-card-meta span{padding:4px 6px;border-radius:999px;color:#748397;background:rgba(148,163,184,.05);font-size:6px;font-weight:800}
          .ep-operation-card-issues{display:flex;gap:4px;flex-wrap:wrap;min-height:18px}
          .ep-operation-card-issues span{padding:4px 6px;border-radius:999px;color:#d2a061;background:rgba(244,173,84,.06);font-size:6px;font-weight:850}
          .ep-operation-card-issues span.blocked{color:#e58d87;background:rgba(255,126,118,.06)}
          .ep-operation-card-issues span.ready{color:#70d99d;background:rgba(85,217,143,.06)}
          .ep-operations-blockers{display:grid;gap:8px;padding-top:10px;border-top:1px solid rgba(148,163,184,.08)}
          .ep-operations-blockers-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
          .ep-operations-blockers-head b,.ep-operations-blockers-head span{display:block}
          .ep-operations-blockers-head b{font-size:10px}
          .ep-operations-blockers-head span{margin-top:2px;color:#718095;font-size:7px}
          .ep-operations-blocker-list{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
          .ep-operation-blocker{display:grid;gap:3px;padding:8px;border:1px solid rgba(244,173,84,.16);border-radius:9px;color:inherit;background:rgba(244,173,84,.035);font:inherit;text-align:left;cursor:pointer}
          .ep-operation-blocker.blocked{border-color:rgba(255,126,118,.18);background:rgba(255,126,118,.035)}
          .ep-operation-blocker span{color:#d7a660;font-size:6px;font-weight:900;text-transform:uppercase}
          .ep-operation-blocker.blocked span{color:#eb8e88}
          .ep-operation-blocker b{overflow:hidden;color:#dfe8f2;font-size:8px;text-overflow:ellipsis;white-space:nowrap}
          .ep-operation-blocker small{color:#69788b;font-size:6px}
          .ep-operations-all-ready{padding:10px;border:1px solid rgba(85,217,143,.12);border-radius:9px;color:#78dda4;background:rgba(85,217,143,.035);font-size:8px}
          .ep-progress-button{width:100%;border:0;color:inherit;background:transparent;font:inherit;cursor:pointer;text-align:left}
          .ep-pending-button{width:100%;border:1px solid transparent;color:inherit;background:transparent;font:inherit;text-align:left;cursor:pointer}
          .ep-pending-button.blocked{border-color:rgba(255,126,118,.11);background:rgba(255,126,118,.025)}
          @media(max-width:1100px){.ep-operations-grid,.ep-operations-blocker-list{grid-template-columns:1fr 1fr}}
          @media(max-width:700px){.ep-operations-board-head{align-items:stretch;flex-direction:column}.ep-operations-board-score{min-width:0;width:100%}.ep-operations-grid,.ep-operations-blocker-list{grid-template-columns:1fr}}
          .ep-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;padding:15px 2px 4px}
          .ep-kicker{color:#78b5ff;font-size:9px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
          .ep-hero h1{margin:5px 0 5px;font-size:clamp(30px,4vw,45px);line-height:1;letter-spacing:-.05em}
          .ep-hero p{margin:0;color:#8996a6;font-size:11px;line-height:1.5}
          .ep-hero-actions{display:flex;gap:7px;flex-wrap:wrap}
          .ep-button{display:inline-flex;min-height:39px;align-items:center;justify-content:center;padding:0 12px;border:1px solid #303844;border-radius:10px;color:#b9c4d1;background:#151b23;font:inherit;font-size:10px;font-weight:900;cursor:pointer;text-decoration:none}
          .ep-button.primary{border-color:#1478f2;color:#fff;background:#1478f2}
          .ep-stats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}
          .ep-stat{padding:13px;border:1px solid #282f39;border-radius:14px;background:#10151c}
          .ep-stat small,.ep-stat strong,.ep-stat span{display:block}
          .ep-stat small{color:#7f8c9c;font-size:8px;font-weight:850;letter-spacing:.04em;text-transform:uppercase}
          .ep-stat strong{margin:5px 0 2px;font-size:20px;letter-spacing:-.03em}
          .ep-stat span{color:#738091;font-size:8px}
          .ep-stat.attention strong{color:#ffb35a}
          .ep-stat.ready strong{color:#64d792}
          .ep-functions{display:flex;gap:7px;overflow:auto;padding:4px 0 2px}
          .ep-function{min-width:160px;padding:11px;border:1px solid #29313b;border-radius:12px;color:#9da8b5;background:#0f141b;text-align:left;cursor:pointer}
          .ep-function.active{border-color:rgba(74,156,255,.6);background:rgba(74,156,255,.08);box-shadow:inset 0 0 0 1px rgba(74,156,255,.08)}
          .ep-function b,.ep-function span,.ep-function small{display:block}
          .ep-function b{color:#e5ecf4;font-size:11px}
          .ep-function span{margin-top:3px;color:#7f8b9a;font-size:8px}
          .ep-function small{margin-top:7px;color:#72dd9e;font-size:8px;font-weight:900}
          .ep-layout{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:12px;align-items:start}
          .ep-panel{border:1px solid #282f39;border-radius:15px;background:#10151c}
          .ep-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:15px;border-bottom:1px solid #252c35}
          .ep-panel-head h2{margin:0;font-size:18px;letter-spacing:-.03em}
          .ep-panel-head p{margin:4px 0 0;color:#7f8b9a;font-size:9px}
          .ep-function-meta{display:flex;gap:6px;flex-wrap:wrap;padding:11px 15px;border-bottom:1px solid #252c35}
          .ep-chip{padding:5px 8px;border-radius:999px;color:#9eabba;background:#171e27;font-size:8px;font-weight:850}
          .ep-chip.ready{color:#72dd9e;background:rgba(61,220,132,.08)}
          .ep-tabs{display:flex;gap:4px;overflow:auto;padding:8px 10px;border-bottom:1px solid #252c35;background:#0e1319}
          .ep-tab{min-height:33px;padding:0 10px;border:0;border-radius:8px;color:#8290a0;background:transparent;font:inherit;font-size:9px;font-weight:850;white-space:nowrap;cursor:pointer}
          .ep-tab.active{color:#9bc8ff;background:rgba(74,156,255,.11)}
          .ep-grocery-supplier-panel{display:grid;gap:10px;padding:12px;border-bottom:1px solid #252c35;background:#0c1117}
          .ep-grocery-supplier-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
          .ep-grocery-supplier-head b,.ep-grocery-supplier-head span{display:block}
          .ep-grocery-supplier-head b{color:#e6edf5;font-size:11px}
          .ep-grocery-supplier-head span{margin-top:3px;color:#758397;font-size:8px}
          .ep-grocery-supplier-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
          .ep-grocery-supplier-card{padding:10px;border:1px solid #29333f;border-radius:11px;background:linear-gradient(180deg,#101720,#0d141b)}
          .ep-grocery-supplier-card.ready{border-color:rgba(85,217,143,.16);background:rgba(85,217,143,.035)}
          .ep-grocery-supplier-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
          .ep-grocery-supplier-card-top span,.ep-grocery-supplier-card-top b{display:block}
          .ep-grocery-supplier-card-top span{color:#8fc2ff;font-size:7px;font-weight:900;letter-spacing:.04em;text-transform:uppercase}
          .ep-grocery-supplier-card-top b{margin-top:4px;color:#e4edf6;font-size:10px;line-height:1.3}
          .ep-grocery-supplier-card-top strong{padding:4px 6px;border-radius:999px;color:#91a0b2;background:rgba(148,163,184,.08);font-size:7px}
          .ep-grocery-supplier-card.ready .ep-grocery-supplier-card-top strong{color:#7fe0a8;background:rgba(85,217,143,.08)}
          .ep-grocery-supplier-card p{min-height:28px;margin:8px 0;color:#6f7d8e;font-size:7px;line-height:1.45}
          .ep-grocery-supplier-card-meta{display:flex;gap:5px;flex-wrap:wrap}
          .ep-grocery-supplier-card-meta span{padding:4px 6px;border-radius:999px;color:#7f8ea1;background:rgba(148,163,184,.06);font-size:6px;font-weight:800}
          @media(max-width:900px){.ep-grocery-supplier-grid{grid-template-columns:1fr}.ep-grocery-supplier-head{align-items:stretch;flex-direction:column}}
          .ep-table-wrap{overflow:auto}
          .ep-table{width:100%;min-width:980px;border-collapse:collapse}
          .ep-table th{padding:8px 9px;border-bottom:1px solid #28313c;color:#718094;background:#0c1117;font-size:7px;font-weight:900;letter-spacing:.04em;text-align:left;text-transform:uppercase}
          .ep-table td{padding:7px 9px;border-bottom:1px solid rgba(148,163,184,.08);vertical-align:middle}
          .ep-table tr:last-child td{border-bottom:0}
          .ep-assignment-photo{width:54px;height:54px;overflow:hidden;border:1px solid #2d3743;border-radius:10px;background:#151d27}
          .ep-assignment-photo img{width:100%;height:100%;display:block;object-fit:cover}
          .ep-assignment-photo-fallback{display:grid;width:100%;height:100%;place-items:center;color:#728196;background:linear-gradient(145deg,#18212c,#111820)}
          .ep-assignment-photo-fallback b{font-size:13px;letter-spacing:.02em}
          .ep-field{width:100%;min-height:33px;padding:0 8px;border:1px solid #303945;border-radius:7px;outline:0;color:#dbe4ee;background:#151c25;font:inherit;font-size:9px}
          textarea.ep-field{min-height:52px;padding:7px;resize:vertical}
          .ep-field:focus{border-color:rgba(74,156,255,.6);box-shadow:0 0 0 3px rgba(74,156,255,.08)}
          .ep-num{width:75px}
          .ep-rate{width:90px}
          .ep-total{white-space:nowrap;color:#dfe7f0;font-size:9px;font-weight:850}
          .ep-delete{width:30px;height:30px;border:1px solid rgba(255,98,89,.18);border-radius:7px;color:#ff8c84;background:rgba(255,98,89,.05);cursor:pointer}
          .ep-table-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px;border-top:1px solid #252c35}
          .ep-hint{color:#748294;font-size:8px;line-height:1.5}
          .ep-side{display:grid;gap:10px}
          .ep-side-card{padding:13px;border:1px solid #282f39;border-radius:14px;background:#10151c}
          .ep-side-card h3{margin:0 0 11px;font-size:12px}
          .ep-progress{display:grid;gap:8px}
          .ep-progress-row{display:grid;grid-template-columns:100px 1fr 30px;gap:7px;align-items:center}
          .ep-progress-row span{overflow:hidden;color:#9aa6b4;font-size:8px;text-overflow:ellipsis;white-space:nowrap}
          .ep-progress-track{height:6px;overflow:hidden;border-radius:999px;background:#202833}
          .ep-progress-fill{height:100%;border-radius:999px;background:#38c979}
          .ep-progress-fill.warn{background:#f2a12b}
          .ep-progress-row b{font-size:8px;text-align:right}
          .ep-pending{display:grid;gap:7px}
          .ep-pending-row{padding:8px 9px;border:1px solid rgba(255,173,66,.13);border-radius:9px;background:rgba(255,173,66,.04)}
          .ep-pending-row b,.ep-pending-row span{display:block}
          .ep-pending-row b{color:#d8e1eb;font-size:9px}
          .ep-pending-row span{margin-top:3px;color:#f3b45d;font-size:8px}
          .ep-costs{display:grid;gap:7px}
          .ep-cost-row{display:flex;align-items:center;justify-content:space-between;gap:10px;color:#8f9cac;font-size:9px}
          .ep-cost-row b{color:#e3ebf4}
          .ep-equipment-picker{padding:12px;border-bottom:1px solid #252c35;background:#0c1117}
          .ep-equipment-picker-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}
          .ep-equipment-picker-head b{font-size:11px}
          .ep-equipment-picker-head span{color:#748294;font-size:8px}
          .ep-equipment-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
          .ep-equipment-card{overflow:hidden;border:1px solid #2b3440;border-radius:11px;background:#111820;color:#dce5ef;text-align:left;cursor:pointer}
          .ep-equipment-card:hover{border-color:rgba(74,156,255,.55)}
          .ep-equipment-card.selected{border-color:rgba(74,156,255,.7);box-shadow:inset 0 0 0 1px rgba(74,156,255,.18)}
          .ep-equipment-photo{aspect-ratio:4/3;overflow:hidden;background:#18202a}
          .ep-equipment-photo img{width:100%;height:100%;display:block;object-fit:cover}
          .ep-equipment-fallback{display:grid;width:100%;height:100%;place-items:center;align-content:center;gap:3px;color:#718197}
          .ep-equipment-fallback b{font-size:20px}
          .ep-equipment-fallback small{font-size:7px}
          .ep-equipment-card-body{padding:8px}
          .ep-equipment-card-body b,.ep-equipment-card-body span,.ep-equipment-card-body small{display:block}
          .ep-equipment-card-body b{font-size:9px}
          .ep-equipment-card-body span{margin-top:3px;color:#7f8c9b;font-size:7px}
          .ep-equipment-card-body small{margin-top:5px;color:#71d99d;font-size:7px;font-weight:900}
          .ep-equipment-card.over small{color:#ffb35a}
          .ep-equipment-master{display:grid;gap:10px;padding:12px;border-bottom:1px solid #252c35;background:#0c1117}
          .ep-equipment-master-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
          .ep-equipment-master-head b,.ep-equipment-master-head span{display:block}
          .ep-equipment-master-head b{color:#e6edf5;font-size:11px}
          .ep-equipment-master-head span{margin-top:3px;max-width:660px;color:#748294;font-size:8px;line-height:1.45}
          .ep-equipment-master-head-actions{display:flex;align-items:center;gap:9px;white-space:nowrap}
          .ep-equipment-master-head-actions>span{margin:0;color:#718095;font-size:7px;font-weight:850}
          .ep-equipment-category-list{display:grid;gap:10px}
          .ep-equipment-category{overflow:hidden;border:1px solid rgba(148,163,184,.09);border-radius:12px;background:#0f151c}
          .ep-equipment-category-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;border-bottom:1px solid rgba(148,163,184,.08);background:rgba(255,255,255,.018)}
          .ep-equipment-category-head b,.ep-equipment-category-head span{display:block}
          .ep-equipment-category-head b{color:#dfe8f2;font-size:10px}
          .ep-equipment-category-head span{margin-top:2px;color:#718095;font-size:7px}
          .ep-equipment-category-head strong{padding:4px 7px;border-radius:999px;color:#9dc9fa;background:rgba(74,156,255,.07);font-size:7px}
          .ep-equipment-master-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;padding:9px}
          .ep-equipment-master-card{overflow:hidden;border:1px solid #2b3440;border-radius:11px;background:#111820;transition:border-color .18s ease,transform .18s ease}
          .ep-equipment-master-card:hover{border-color:#3b4755;transform:translateY(-1px)}
          .ep-equipment-master-card.selected{border-color:rgba(74,156,255,.48);box-shadow:inset 0 0 0 1px rgba(74,156,255,.08)}
          .ep-equipment-master-card.over{border-color:rgba(244,173,84,.42)}
          .ep-equipment-master-card.inactive{opacity:.62}
          .ep-equipment-master-photo{position:relative;aspect-ratio:16/8;overflow:hidden;background:#18202a}
          .ep-equipment-master-photo img{width:100%;height:100%;display:block;object-fit:cover}
          .ep-equipment-master-status{position:absolute;top:7px;right:7px;padding:4px 6px;border-radius:999px;color:#c3d0df;background:rgba(8,13,19,.78);font-size:6px;font-weight:900;backdrop-filter:blur(8px)}
          .ep-equipment-master-body{padding:9px}
          .ep-equipment-master-title{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
          .ep-equipment-master-title b,.ep-equipment-master-title span{display:block}
          .ep-equipment-master-title b{color:#e7eef6;font-size:9px}
          .ep-equipment-master-title span{margin-top:2px;color:#758397;font-size:7px}
          .ep-equipment-master-title>strong{color:#d3deea;font-size:8px;white-space:nowrap}
          .ep-equipment-master-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:8px}
          .ep-equipment-master-meta>span{padding:5px 6px;border-radius:7px;color:#718095;background:rgba(148,163,184,.05);font-size:6px}
          .ep-equipment-master-meta>span b{display:block;margin-top:2px;color:#d7e1ec;font-size:8px}
          .ep-equipment-master-meta>span.warn{color:#e7a653;background:rgba(244,173,84,.06)}
          .ep-equipment-master-meta>span.warn b{color:#f1b361}
          .ep-equipment-qty-editor{display:grid;grid-template-columns:34px minmax(0,1fr) 34px;gap:6px;align-items:end;margin-top:9px}
          .ep-equipment-qty-editor>button{height:36px;border:1px solid #34404d;border-radius:8px;color:#c8d5e2;background:#161e28;font-size:18px;font-weight:800;cursor:pointer}
          .ep-equipment-qty-editor>button:hover:not(:disabled){border-color:rgba(74,156,255,.45);color:#9dc9fa;background:rgba(74,156,255,.06)}
          .ep-equipment-qty-editor>button:disabled{opacity:.35;cursor:not-allowed}
          .ep-equipment-qty-editor label{display:grid;gap:3px}
          .ep-equipment-qty-editor label span{color:#718095;font-size:6px;font-weight:900;text-transform:uppercase}
          .ep-equipment-qty-editor input{width:100%;height:36px;border:1px solid #34404d;border-radius:8px;outline:0;color:#e3edf7;background:#151c25;font:inherit;font-size:11px;font-weight:900;text-align:center}
          .ep-equipment-qty-editor input:focus{border-color:rgba(74,156,255,.55);box-shadow:0 0 0 3px rgba(74,156,255,.08)}
          .ep-equipment-inactive-note,.ep-equipment-vendor-note{display:block;margin-top:7px;color:#69788b;font-size:6px;line-height:1.4}
          .ep-equipment-inactive-note{color:#c28e53}
          @media(max-width:760px){.ep-equipment-master-head{align-items:stretch;flex-direction:column}.ep-equipment-master-head-actions{justify-content:space-between}.ep-equipment-master-grid{grid-template-columns:1fr 1fr}}
          @media(max-width:520px){.ep-equipment-master-grid{grid-template-columns:1fr}}
          .ep-crockery-master{display:grid;gap:10px;padding:12px;border-bottom:1px solid #252c35;background:#0c1117}
          .ep-crockery-master-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
          .ep-crockery-master-head b,.ep-crockery-master-head span{display:block}
          .ep-crockery-master-head b{color:#e6edf5;font-size:11px}
          .ep-crockery-master-head span{margin-top:3px;max-width:700px;color:#748294;font-size:8px;line-height:1.45}
          .ep-crockery-master-head-actions{display:flex;align-items:center;gap:9px;white-space:nowrap}
          .ep-crockery-master-head-actions>span{margin:0;color:#718095;font-size:7px;font-weight:850}
          .ep-crockery-category-list{display:grid;gap:10px}
          .ep-crockery-category{overflow:hidden;border:1px solid rgba(148,163,184,.09);border-radius:12px;background:#0f151c}
          .ep-crockery-category-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;border-bottom:1px solid rgba(148,163,184,.08);background:rgba(255,255,255,.018)}
          .ep-crockery-category-head b,.ep-crockery-category-head span{display:block}
          .ep-crockery-category-head>div:first-child>b{color:#dfe8f2;font-size:10px}
          .ep-crockery-category-head>div:first-child>span{margin-top:2px;color:#718095;font-size:7px}
          .ep-crockery-category-summary{display:flex;gap:6px;flex-wrap:wrap}
          .ep-crockery-category-summary>span{padding:5px 7px;border-radius:999px;color:#718095;background:rgba(148,163,184,.06);font-size:6px;font-weight:800}
          .ep-crockery-category-summary b{display:inline;color:#a8cffc;font-size:7px}
          .ep-crockery-master-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px;padding:9px}
          .ep-crockery-master-card{overflow:hidden;border:1px solid #2b3440;border-radius:11px;background:#111820;transition:border-color .18s ease,transform .18s ease}
          .ep-crockery-master-card:hover{border-color:#3b4755;transform:translateY(-1px)}
          .ep-crockery-master-card.selected{border-color:rgba(74,156,255,.48);box-shadow:inset 0 0 0 1px rgba(74,156,255,.08)}
          .ep-crockery-master-card.over{border-color:rgba(244,173,84,.42)}
          .ep-crockery-master-card.inactive{opacity:.62}
          .ep-crockery-master-photo{position:relative;aspect-ratio:16/8;overflow:hidden;background:#18202a}
          .ep-crockery-master-photo img{width:100%;height:100%;display:block;object-fit:cover}
          .ep-crockery-master-status{position:absolute;top:7px;right:7px;padding:4px 6px;border-radius:999px;color:#c3d0df;background:rgba(8,13,19,.78);font-size:6px;font-weight:900;backdrop-filter:blur(8px)}
          .ep-crockery-master-body{padding:9px}
          .ep-crockery-master-title{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
          .ep-crockery-master-title b,.ep-crockery-master-title span{display:block}
          .ep-crockery-master-title b{color:#e7eef6;font-size:9px}
          .ep-crockery-master-title span{margin-top:2px;color:#758397;font-size:7px}
          .ep-crockery-master-title>strong{color:#d3deea;font-size:8px;white-space:nowrap}
          .ep-crockery-master-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:8px}
          .ep-crockery-master-meta>span{padding:5px 6px;border-radius:7px;color:#718095;background:rgba(148,163,184,.05);font-size:6px}
          .ep-crockery-master-meta>span b{display:block;margin-top:2px;color:#d7e1ec;font-size:8px}
          .ep-crockery-master-meta>span.warn{color:#e7a653;background:rgba(244,173,84,.06)}
          .ep-crockery-master-meta>span.warn b{color:#f1b361}
          .ep-crockery-rule{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}
          .ep-crockery-rule span{padding:4px 6px;border-radius:999px;color:#72849a;background:rgba(74,156,255,.04);font-size:6px;font-weight:800}
          .ep-crockery-qty-editor{display:grid;grid-template-columns:34px minmax(0,1fr) 34px;gap:6px;align-items:end;margin-top:9px}
          .ep-crockery-qty-editor>button{height:36px;border:1px solid #34404d;border-radius:8px;color:#c8d5e2;background:#161e28;font-size:18px;font-weight:800;cursor:pointer}
          .ep-crockery-qty-editor>button:hover:not(:disabled){border-color:rgba(74,156,255,.45);color:#9dc9fa;background:rgba(74,156,255,.06)}
          .ep-crockery-qty-editor>button:disabled{opacity:.35;cursor:not-allowed}
          .ep-crockery-qty-editor label{display:grid;gap:3px}
          .ep-crockery-qty-editor label span{color:#718095;font-size:6px;font-weight:900;text-transform:uppercase}
          .ep-crockery-qty-editor input{width:100%;height:36px;border:1px solid #34404d;border-radius:8px;outline:0;color:#e3edf7;background:#151c25;font:inherit;font-size:11px;font-weight:900;text-align:center}
          .ep-crockery-qty-editor input:focus{border-color:rgba(74,156,255,.55);box-shadow:0 0 0 3px rgba(74,156,255,.08)}
          .ep-crockery-recommended{width:100%;min-height:30px;margin-top:6px;border:1px solid rgba(74,156,255,.16);border-radius:8px;color:#92c3fb;background:rgba(74,156,255,.045);font:inherit;font-size:7px;font-weight:900;cursor:pointer}
          .ep-crockery-recommended:hover:not(:disabled){border-color:rgba(74,156,255,.38);background:rgba(74,156,255,.08)}
          .ep-crockery-recommended:disabled{opacity:.35;cursor:not-allowed}
          .ep-crockery-inactive-note,.ep-crockery-vendor-note{display:block;margin-top:7px;color:#69788b;font-size:6px;line-height:1.4}
          .ep-crockery-inactive-note{color:#c28e53}
          @media(max-width:760px){.ep-crockery-master-head{align-items:stretch;flex-direction:column}.ep-crockery-master-head-actions{justify-content:space-between}.ep-crockery-master-grid{grid-template-columns:1fr 1fr}}
          @media(max-width:520px){.ep-crockery-master-grid{grid-template-columns:1fr}}
          .ep-uniform-master{display:grid;gap:10px;padding:12px;border-bottom:1px solid #252c35;background:#0c1117}
          .ep-uniform-master-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
          .ep-uniform-master-head b,.ep-uniform-master-head span{display:block}
          .ep-uniform-master-head b{color:#e6edf5;font-size:11px}
          .ep-uniform-master-head span{margin-top:3px;max-width:700px;color:#748294;font-size:8px;line-height:1.45}
          .ep-uniform-master-head-actions{display:flex;align-items:center;gap:9px;white-space:nowrap}
          .ep-uniform-master-head-actions>span{margin:0;color:#718095;font-size:7px;font-weight:850}
          .ep-uniform-role-list{display:grid;gap:10px}
          .ep-uniform-role{overflow:hidden;border:1px solid rgba(148,163,184,.09);border-radius:12px;background:#0f151c}
          .ep-uniform-role-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;border-bottom:1px solid rgba(148,163,184,.08);background:rgba(255,255,255,.018)}
          .ep-uniform-role-head>div:first-child b,.ep-uniform-role-head>div:first-child span{display:block}
          .ep-uniform-role-head>div:first-child b{color:#dfe8f2;font-size:10px}
          .ep-uniform-role-head>div:first-child span{margin-top:2px;color:#718095;font-size:7px}
          .ep-uniform-role-summary{display:flex;gap:6px;flex-wrap:wrap}
          .ep-uniform-role-summary span{padding:5px 7px;border-radius:999px;color:#718095;background:rgba(148,163,184,.06);font-size:6px;font-weight:800}
          .ep-uniform-role-summary b{color:#a8cffc;font-size:7px}
          .ep-uniform-master-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px;padding:9px}
          .ep-uniform-master-card{overflow:hidden;border:1px solid #2b3440;border-radius:11px;background:#111820;transition:border-color .18s ease,transform .18s ease}
          .ep-uniform-master-card:hover{border-color:#3b4755;transform:translateY(-1px)}
          .ep-uniform-master-card.selected{border-color:rgba(74,156,255,.48);box-shadow:inset 0 0 0 1px rgba(74,156,255,.08)}
          .ep-uniform-master-card.over{border-color:rgba(244,173,84,.42)}
          .ep-uniform-master-card.inactive{opacity:.62}
          .ep-uniform-master-photo{position:relative;aspect-ratio:16/8;overflow:hidden;background:#18202a}
          .ep-uniform-master-photo img{width:100%;height:100%;display:block;object-fit:cover}
          .ep-uniform-master-status{position:absolute;top:7px;right:7px;padding:4px 6px;border-radius:999px;color:#c3d0df;background:rgba(8,13,19,.78);font-size:6px;font-weight:900}
          .ep-uniform-master-body{padding:9px}
          .ep-uniform-master-title{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
          .ep-uniform-master-title b,.ep-uniform-master-title span{display:block}
          .ep-uniform-master-title b{color:#e7eef6;font-size:9px}
          .ep-uniform-master-title span{margin-top:2px;color:#758397;font-size:7px}
          .ep-uniform-master-title>strong{color:#d3deea;font-size:8px;white-space:nowrap}
          .ep-uniform-master-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:8px}
          .ep-uniform-master-meta>span{padding:5px 6px;border-radius:7px;color:#718095;background:rgba(148,163,184,.05);font-size:6px}
          .ep-uniform-master-meta>span b{display:block;margin-top:2px;color:#d7e1ec;font-size:8px}
          .ep-uniform-master-meta>span.warn{color:#e7a653;background:rgba(244,173,84,.06)}
          .ep-uniform-master-meta>span.warn b{color:#f1b361}
          .ep-uniform-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}
          .ep-uniform-tags span{padding:4px 6px;border-radius:999px;color:#72849a;background:rgba(74,156,255,.04);font-size:6px;font-weight:800}
          .ep-uniform-qty-editor{display:grid;grid-template-columns:34px minmax(0,1fr) 34px;gap:6px;align-items:end;margin-top:9px}
          .ep-uniform-qty-editor>button{height:36px;border:1px solid #34404d;border-radius:8px;color:#c8d5e2;background:#161e28;font-size:18px;font-weight:800;cursor:pointer}
          .ep-uniform-qty-editor>button:disabled{opacity:.35;cursor:not-allowed}
          .ep-uniform-qty-editor label{display:grid;gap:3px}
          .ep-uniform-qty-editor label span{color:#718095;font-size:6px;font-weight:900;text-transform:uppercase}
          .ep-uniform-qty-editor input{width:100%;height:36px;border:1px solid #34404d;border-radius:8px;outline:0;color:#e3edf7;background:#151c25;font:inherit;font-size:11px;font-weight:900;text-align:center}
          .ep-uniform-required{width:100%;min-height:30px;margin-top:6px;border:1px solid rgba(74,156,255,.16);border-radius:8px;color:#92c3fb;background:rgba(74,156,255,.045);font:inherit;font-size:7px;font-weight:900;cursor:pointer}
          .ep-uniform-required:disabled{opacity:.35;cursor:not-allowed}
          .ep-uniform-note{display:block;margin-top:7px;color:#69788b;font-size:6px;line-height:1.4}
          .ep-uniform-note.warn{color:#c28e53}
          @media(max-width:760px){.ep-uniform-master-head{align-items:stretch;flex-direction:column}.ep-uniform-master-head-actions{justify-content:space-between}.ep-uniform-master-grid{grid-template-columns:1fr 1fr}}
          @media(max-width:520px){.ep-uniform-master-grid{grid-template-columns:1fr}}
          .ep-disposable-master{display:grid;gap:10px;padding:12px;border-bottom:1px solid #252c35;background:#0c1117}
          .ep-disposable-master-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
          .ep-disposable-master-head b,.ep-disposable-master-head span{display:block}
          .ep-disposable-master-head b{color:#e6edf5;font-size:11px}
          .ep-disposable-master-head span{margin-top:3px;max-width:700px;color:#748294;font-size:8px;line-height:1.45}
          .ep-disposable-master-head-actions{display:flex;align-items:center;gap:9px;white-space:nowrap}
          .ep-disposable-master-head-actions>span{margin:0;color:#718095;font-size:7px;font-weight:850}
          .ep-disposable-category-list{display:grid;gap:10px}
          .ep-disposable-category{overflow:hidden;border:1px solid rgba(148,163,184,.09);border-radius:12px;background:#0f151c}
          .ep-disposable-category-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;border-bottom:1px solid rgba(148,163,184,.08);background:rgba(255,255,255,.018)}
          .ep-disposable-category-head b,.ep-disposable-category-head span{display:block}
          .ep-disposable-category-head b{color:#dfe8f2;font-size:10px}
          .ep-disposable-category-head span{margin-top:2px;color:#718095;font-size:7px}
          .ep-disposable-category-head strong{padding:4px 7px;border-radius:999px;color:#9dc9fa;background:rgba(74,156,255,.07);font-size:7px}
          .ep-disposable-master-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px;padding:9px}
          .ep-disposable-master-card{overflow:hidden;border:1px solid #2b3440;border-radius:11px;background:#111820;transition:border-color .18s ease,transform .18s ease}
          .ep-disposable-master-card:hover{border-color:#3b4755;transform:translateY(-1px)}
          .ep-disposable-master-card.selected{border-color:rgba(74,156,255,.48);box-shadow:inset 0 0 0 1px rgba(74,156,255,.08)}
          .ep-disposable-master-card.over{border-color:rgba(244,173,84,.42)}
          .ep-disposable-master-card.inactive{opacity:.62}
          .ep-disposable-master-photo{position:relative;aspect-ratio:16/8;overflow:hidden;background:#18202a}
          .ep-disposable-master-photo img{width:100%;height:100%;display:block;object-fit:cover}
          .ep-disposable-master-status{position:absolute;top:7px;right:7px;padding:4px 6px;border-radius:999px;color:#c3d0df;background:rgba(8,13,19,.78);font-size:6px;font-weight:900}
          .ep-disposable-master-body{padding:9px}
          .ep-disposable-master-title{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
          .ep-disposable-master-title b,.ep-disposable-master-title span{display:block}
          .ep-disposable-master-title b{color:#e7eef6;font-size:9px}
          .ep-disposable-master-title span{margin-top:2px;color:#758397;font-size:7px}
          .ep-disposable-master-title>strong{color:#d3deea;font-size:8px;white-space:nowrap}
          .ep-disposable-master-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:8px}
          .ep-disposable-master-meta>span{padding:5px 6px;border-radius:7px;color:#718095;background:rgba(148,163,184,.05);font-size:6px}
          .ep-disposable-master-meta>span b{display:block;margin-top:2px;color:#d7e1ec;font-size:8px}
          .ep-disposable-master-meta>span.warn{color:#e7a653;background:rgba(244,173,84,.06)}
          .ep-disposable-master-meta>span.warn b{color:#f1b361}
          .ep-disposable-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}
          .ep-disposable-tags span{padding:4px 6px;border-radius:999px;color:#72849a;background:rgba(74,156,255,.04);font-size:6px;font-weight:800}
          .ep-disposable-qty-editor{display:grid;grid-template-columns:34px minmax(0,1fr) 34px;gap:6px;align-items:end;margin-top:9px}
          .ep-disposable-qty-editor>button{height:36px;border:1px solid #34404d;border-radius:8px;color:#c8d5e2;background:#161e28;font-size:18px;font-weight:800;cursor:pointer}
          .ep-disposable-qty-editor>button:disabled{opacity:.35;cursor:not-allowed}
          .ep-disposable-qty-editor label{display:grid;gap:3px}
          .ep-disposable-qty-editor label span{color:#718095;font-size:6px;font-weight:900;text-transform:uppercase}
          .ep-disposable-qty-editor input{width:100%;height:36px;border:1px solid #34404d;border-radius:8px;outline:0;color:#e3edf7;background:#151c25;font:inherit;font-size:11px;font-weight:900;text-align:center}
          .ep-disposable-event-qty{width:100%;min-height:30px;margin-top:6px;border:1px solid rgba(74,156,255,.16);border-radius:8px;color:#92c3fb;background:rgba(74,156,255,.045);font:inherit;font-size:7px;font-weight:900;cursor:pointer}
          .ep-disposable-event-qty:disabled{opacity:.35;cursor:not-allowed}
          .ep-disposable-note{display:block;margin-top:7px;color:#69788b;font-size:6px;line-height:1.4}
          .ep-disposable-note.warn{color:#c28e53}
          @media(max-width:760px){.ep-disposable-master-head{align-items:stretch;flex-direction:column}.ep-disposable-master-head-actions{justify-content:space-between}.ep-disposable-master-grid{grid-template-columns:1fr 1fr}}
          @media(max-width:520px){.ep-disposable-master-grid{grid-template-columns:1fr}}
          .ep-transport-control{display:grid;gap:10px;padding:12px;border-bottom:1px solid #252c35;background:#0c1117}
          .ep-transport-control-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
          .ep-transport-control-head b,.ep-transport-control-head span{display:block}
          .ep-transport-control-head b{color:#e6edf5;font-size:11px}
          .ep-transport-control-head span{margin-top:3px;max-width:720px;color:#748294;font-size:8px;line-height:1.45}
          .ep-transport-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px}
          .ep-transport-summary article{padding:9px 10px;border:1px solid rgba(148,163,184,.09);border-radius:10px;background:rgba(255,255,255,.018)}
          .ep-transport-summary span,.ep-transport-summary b,.ep-transport-summary small{display:block}
          .ep-transport-summary span{color:#718094;font-size:6px;font-weight:900;text-transform:uppercase}
          .ep-transport-summary b{margin-top:4px;color:#e1eaf3;font-size:12px}
          .ep-transport-summary small{margin-top:2px;color:#657487;font-size:6px}
          .ep-transport-presets{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
          .ep-transport-preset{display:grid;gap:4px;min-height:78px;padding:10px;border:1px solid #2b3440;border-radius:10px;color:#8190a2;background:#101720;font:inherit;text-align:left;cursor:pointer}
          .ep-transport-preset:hover{border-color:#3c4856;background:#121b25}
          .ep-transport-preset.active{border-color:rgba(74,156,255,.38);background:rgba(74,156,255,.045)}
          .ep-transport-preset span{color:#dbe5ef;font-size:9px;font-weight:900}
          .ep-transport-preset small{color:#68778a;font-size:6px;line-height:1.4}
          .ep-transport-preset b{align-self:end;color:#8fc2ff;font-size:7px}
          .ep-transport-list{display:grid;gap:7px}
          .ep-transport-card{padding:10px;border:1px solid #2b3440;border-radius:11px;background:#101720}
          .ep-transport-card.ready{border-color:rgba(85,217,143,.18)}
          .ep-transport-card.attention{border-color:rgba(244,173,84,.24)}
          .ep-transport-card-main{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
          .ep-transport-card-main span,.ep-transport-card-main b,.ep-transport-card-main small{display:block}
          .ep-transport-card-main span{color:#78b5ff;font-size:6px;font-weight:900;text-transform:uppercase}
          .ep-transport-card-main b{margin-top:3px;color:#e4edf6;font-size:10px}
          .ep-transport-card-main small{margin-top:2px;color:#6e7c8e;font-size:7px}
          .ep-transport-card-main>strong{color:#dce7f1;font-size:11px;white-space:nowrap}
          .ep-transport-card-grid{display:grid;grid-template-columns:150px minmax(0,1fr);gap:9px;align-items:end;margin-top:9px}
          .ep-transport-qty-editor{display:grid;grid-template-columns:34px minmax(0,1fr) 34px;gap:6px;align-items:end}
          .ep-transport-qty-editor>button{height:36px;border:1px solid #34404d;border-radius:8px;color:#c8d5e2;background:#161e28;font-size:18px;font-weight:800;cursor:pointer}
          .ep-transport-qty-editor>button:disabled{opacity:.35;cursor:not-allowed}
          .ep-transport-qty-editor label{display:grid;gap:3px}
          .ep-transport-qty-editor label span{color:#718095;font-size:6px;font-weight:900;text-transform:uppercase}
          .ep-transport-qty-editor input{width:100%;height:36px;border:1px solid #34404d;border-radius:8px;outline:0;color:#e3edf7;background:#151c25;font:inherit;font-size:11px;font-weight:900;text-align:center}
          .ep-transport-card-meta{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}
          .ep-transport-card-meta>span{padding:6px;border-radius:8px;color:#718095;background:rgba(148,163,184,.05);font-size:6px}
          .ep-transport-card-meta b{display:block;overflow:hidden;margin-top:3px;color:#d7e1ec;font-size:7px;text-overflow:ellipsis;white-space:nowrap}
          .ep-transport-card-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;padding-top:7px;border-top:1px solid rgba(148,163,184,.07)}
          .ep-transport-card-footer>span{padding:4px 7px;border-radius:999px;color:#f0b15f;background:rgba(244,173,84,.07);font-size:6px;font-weight:900;text-transform:uppercase}
          .ep-transport-card-footer>span.confirmed,.ep-transport-card-footer>span.delivered,.ep-transport-card-footer>span.closed{color:#76dda2;background:rgba(85,217,143,.07)}
          .ep-transport-card-footer small{color:#637285;font-size:6px}
          @media(max-width:1100px){.ep-transport-summary{grid-template-columns:repeat(3,1fr)}.ep-transport-presets{grid-template-columns:1fr 1fr}.ep-transport-card-grid{grid-template-columns:1fr}.ep-transport-card-meta{grid-template-columns:1fr 1fr}}
          @media(max-width:640px){.ep-transport-control-head{align-items:stretch;flex-direction:column}.ep-transport-summary{grid-template-columns:1fr 1fr}.ep-transport-presets{grid-template-columns:1fr}.ep-transport-card-meta{grid-template-columns:1fr}}
          .ep-manpower-agency-control{display:grid;gap:10px;padding:12px;border-bottom:1px solid #252c35;background:#0c1117}
          .ep-manpower-agency-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
          .ep-manpower-agency-head b,.ep-manpower-agency-head span{display:block}
          .ep-manpower-agency-head b{color:#e6edf5;font-size:11px}
          .ep-manpower-agency-head span{margin-top:3px;max-width:760px;color:#748294;font-size:8px;line-height:1.45}
          .ep-manpower-agency-head-actions{display:flex;gap:6px;flex-wrap:wrap}
          .ep-manpower-agency-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px}
          .ep-manpower-agency-summary article{padding:9px 10px;border:1px solid rgba(148,163,184,.09);border-radius:10px;background:rgba(255,255,255,.018)}
          .ep-manpower-agency-summary span,.ep-manpower-agency-summary b,.ep-manpower-agency-summary small{display:block}
          .ep-manpower-agency-summary span{color:#718094;font-size:6px;font-weight:900;text-transform:uppercase}
          .ep-manpower-agency-summary b{margin-top:4px;color:#e1eaf3;font-size:12px}
          .ep-manpower-agency-summary small{margin-top:2px;color:#657487;font-size:6px}
          .ep-manpower-department-list{display:grid;gap:10px}
          .ep-manpower-department{overflow:hidden;border:1px solid rgba(148,163,184,.09);border-radius:12px;background:#0f151c}
          .ep-manpower-department-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;border-bottom:1px solid rgba(148,163,184,.08);background:rgba(255,255,255,.018)}
          .ep-manpower-department-head>div:first-child b,.ep-manpower-department-head>div:first-child span{display:block}
          .ep-manpower-department-head>div:first-child b{color:#dfe8f2;font-size:10px}
          .ep-manpower-department-head>div:first-child span{margin-top:2px;color:#718095;font-size:7px}
          .ep-manpower-department-summary{display:flex;gap:6px;flex-wrap:wrap}
          .ep-manpower-department-summary span{padding:5px 7px;border-radius:999px;color:#718095;background:rgba(148,163,184,.06);font-size:6px;font-weight:800}
          .ep-manpower-department-summary b{color:#a8cffc;font-size:7px}
          .ep-manpower-role-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(225px,1fr));gap:8px;padding:9px}
          .ep-manpower-role-card{padding:9px;border:1px solid #2b3440;border-radius:11px;background:#111820}
          .ep-manpower-role-card.assigned{border-color:rgba(74,156,255,.28)}
          .ep-manpower-role-card.ready{border-color:rgba(85,217,143,.20)}
          .ep-manpower-role-card.attention{border-color:rgba(244,173,84,.35)}
          .ep-manpower-role-title{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
          .ep-manpower-role-title span,.ep-manpower-role-title b,.ep-manpower-role-title small{display:block}
          .ep-manpower-role-title span{color:#78b5ff;font-size:6px;font-weight:900;text-transform:uppercase}
          .ep-manpower-role-title b{margin-top:3px;color:#e6edf5;font-size:9px}
          .ep-manpower-role-title small{margin-top:3px;color:#6e7c8e;font-size:6px}
          .ep-manpower-role-title>strong{color:#d9e4ef;font-size:9px;white-space:nowrap}
          .ep-manpower-role-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:8px}
          .ep-manpower-role-meta>span{padding:5px 6px;border-radius:7px;color:#718095;background:rgba(148,163,184,.05);font-size:6px}
          .ep-manpower-role-meta>span b{display:block;margin-top:2px;color:#d7e1ec;font-size:8px}
          .ep-manpower-role-meta>span.warn{color:#e7a653;background:rgba(244,173,84,.06)}
          .ep-manpower-role-meta>span.warn b{color:#f1b361}
          .ep-manpower-qty-editor{display:grid;grid-template-columns:34px minmax(0,1fr) 34px;gap:6px;align-items:end;margin-top:8px}
          .ep-manpower-qty-editor>button{height:36px;border:1px solid #34404d;border-radius:8px;color:#c8d5e2;background:#161e28;font-size:18px;font-weight:800;cursor:pointer}
          .ep-manpower-qty-editor>button:disabled{opacity:.35;cursor:not-allowed}
          .ep-manpower-qty-editor label{display:grid;gap:3px}
          .ep-manpower-qty-editor label span{color:#718095;font-size:6px;font-weight:900;text-transform:uppercase}
          .ep-manpower-qty-editor input{width:100%;height:36px;border:1px solid #34404d;border-radius:8px;outline:0;color:#e3edf7;background:#151c25;font:inherit;font-size:11px;font-weight:900;text-align:center}
          .ep-manpower-use-required{width:100%;min-height:30px;margin-top:6px;border:1px solid rgba(74,156,255,.16);border-radius:8px;color:#92c3fb;background:rgba(74,156,255,.045);font:inherit;font-size:7px;font-weight:900;cursor:pointer}
          .ep-manpower-role-footer{display:flex;align-items:center;justify-content:space-between;gap:7px;margin-top:7px;padding-top:7px;border-top:1px solid rgba(148,163,184,.07)}
          .ep-manpower-role-footer>span{padding:4px 7px;border-radius:999px;color:#f0b15f;background:rgba(244,173,84,.07);font-size:6px;font-weight:900;text-transform:uppercase}
          .ep-manpower-role-footer>span.confirmed,.ep-manpower-role-footer>span.delivered,.ep-manpower-role-footer>span.closed{color:#76dda2;background:rgba(85,217,143,.07)}
          .ep-manpower-role-footer small{color:#637285;font-size:6px}
          @media(max-width:1100px){.ep-manpower-agency-summary{grid-template-columns:repeat(3,1fr)}}
          @media(max-width:680px){.ep-manpower-agency-head{align-items:stretch;flex-direction:column}.ep-manpower-agency-summary{grid-template-columns:1fr 1fr}.ep-manpower-role-grid{grid-template-columns:1fr}}
          .ep-menu-vendor-control{display:grid;gap:10px;padding:12px;border-bottom:1px solid #252c35;background:#0c1117}
          .ep-menu-vendor-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
          .ep-menu-vendor-head b,.ep-menu-vendor-head span{display:block}
          .ep-menu-vendor-head b{color:#e6edf5;font-size:11px}
          .ep-menu-vendor-head span{margin-top:3px;max-width:760px;color:#748294;font-size:8px;line-height:1.45}
          .ep-menu-vendor-head-actions{display:flex;gap:6px;flex-wrap:wrap}
          .ep-menu-vendor-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px}
          .ep-menu-vendor-summary article{padding:9px 10px;border:1px solid rgba(148,163,184,.09);border-radius:10px;background:rgba(255,255,255,.018)}
          .ep-menu-vendor-summary span,.ep-menu-vendor-summary b,.ep-menu-vendor-summary small{display:block}
          .ep-menu-vendor-summary span{color:#718094;font-size:6px;font-weight:900;text-transform:uppercase}
          .ep-menu-vendor-summary b{margin-top:4px;color:#e1eaf3;font-size:12px}
          .ep-menu-vendor-summary small{margin-top:2px;color:#657487;font-size:6px}
          .ep-menu-vendor-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px}
          .ep-menu-vendor-card{padding:10px;border:1px solid #2b3440;border-radius:11px;background:#111820}
          .ep-menu-vendor-card.assigned{border-color:rgba(74,156,255,.28)}
          .ep-menu-vendor-card.ready{border-color:rgba(85,217,143,.20)}
          .ep-menu-vendor-card.attention{border-color:rgba(244,173,84,.35)}
          .ep-menu-vendor-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
          .ep-menu-vendor-card-top span,.ep-menu-vendor-card-top b,.ep-menu-vendor-card-top small{display:block}
          .ep-menu-vendor-card-top span{color:#78b5ff;font-size:6px;font-weight:900;text-transform:uppercase}
          .ep-menu-vendor-card-top b{margin-top:3px;color:#e6edf5;font-size:9px}
          .ep-menu-vendor-card-top small{margin-top:3px;color:#6e7c8e;font-size:6px}
          .ep-menu-vendor-card-top>strong{color:#d9e4ef;font-size:9px;white-space:nowrap}
          .ep-menu-dishes{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}
          .ep-menu-dishes span{padding:4px 6px;border-radius:999px;color:#8295aa;background:rgba(74,156,255,.045);font-size:6px;font-weight:750}
          .ep-menu-vendor-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:8px}
          .ep-menu-vendor-meta>span{padding:5px 6px;border-radius:7px;color:#718095;background:rgba(148,163,184,.05);font-size:6px}
          .ep-menu-vendor-meta>span b{display:block;margin-top:2px;color:#d7e1ec;font-size:8px}
          .ep-menu-vendor-meta>span.warn{color:#e7a653;background:rgba(244,173,84,.06)}
          .ep-menu-vendor-meta>span.warn b{color:#f1b361}
          .ep-menu-cover-editor{display:grid;grid-template-columns:34px minmax(0,1fr) 34px;gap:6px;align-items:end;margin-top:8px}
          .ep-menu-cover-editor>button{height:36px;border:1px solid #34404d;border-radius:8px;color:#c8d5e2;background:#161e28;font-size:18px;font-weight:800;cursor:pointer}
          .ep-menu-cover-editor>button:disabled{opacity:.35;cursor:not-allowed}
          .ep-menu-cover-editor label{display:grid;gap:3px}
          .ep-menu-cover-editor label span{color:#718095;font-size:6px;font-weight:900;text-transform:uppercase}
          .ep-menu-cover-editor input{width:100%;height:36px;border:1px solid #34404d;border-radius:8px;outline:0;color:#e3edf7;background:#151c25;font:inherit;font-size:11px;font-weight:900;text-align:center}
          .ep-menu-use-covers{width:100%;min-height:30px;margin-top:6px;border:1px solid rgba(74,156,255,.16);border-radius:8px;color:#92c3fb;background:rgba(74,156,255,.045);font:inherit;font-size:7px;font-weight:900;cursor:pointer}
          .ep-menu-vendor-card-footer{display:flex;align-items:center;justify-content:space-between;gap:7px;margin-top:7px;padding-top:7px;border-top:1px solid rgba(148,163,184,.07)}
          .ep-menu-vendor-card-footer>span{padding:4px 7px;border-radius:999px;color:#f0b15f;background:rgba(244,173,84,.07);font-size:6px;font-weight:900;text-transform:uppercase}
          .ep-menu-vendor-card-footer>span.confirmed,.ep-menu-vendor-card-footer>span.delivered,.ep-menu-vendor-card-footer>span.closed{color:#76dda2;background:rgba(85,217,143,.07)}
          .ep-menu-vendor-card-footer small{color:#637285;font-size:6px}
          @media(max-width:1100px){.ep-menu-vendor-summary{grid-template-columns:repeat(3,1fr)}}
          @media(max-width:680px){.ep-menu-vendor-head{align-items:stretch;flex-direction:column}.ep-menu-vendor-summary{grid-template-columns:1fr 1fr}.ep-menu-vendor-grid{grid-template-columns:1fr}}
          .ep-empty{padding:40px 15px;color:#748294;font-size:10px;text-align:center}
          @media(max-width:1180px){.ep-readiness-grid{grid-template-columns:repeat(4,1fr)}.ep-stats{grid-template-columns:repeat(3,1fr)}.ep-layout{grid-template-columns:1fr}.ep-side{grid-template-columns:repeat(3,1fr)}}
          @media(max-width:720px){.ep-event-selector{grid-template-columns:1fr}.ep-readiness-head{align-items:flex-start}.ep-readiness-grid{grid-template-columns:1fr 1fr}.ep-page{gap:10px}.ep-hero{align-items:stretch;flex-direction:column;padding-top:8px}.ep-hero h1{font-size:28px}.ep-stats{grid-template-columns:1fr 1fr}.ep-layout{display:block}.ep-side{display:grid;grid-template-columns:1fr;margin-top:10px}.ep-function{min-width:145px}.ep-panel-head{align-items:stretch;flex-direction:column}.ep-panel-head .ep-button{width:100%}}
        `}</style>

        <section
          className="ep-event-selector"
          aria-label="Select event to plan"
        >
          <div className="ep-event-selector-copy">
            <span>Select Event</span>
            <b>Which event are you planning?</b>
            <small>
              Choose a saved event first. Its menu, functions and planning assignments will load here.
            </small>

            <div className="ep-event-meta">
              <span>
                {work.event.clientName ||
                  'Client not set'}
              </span>
              <span>
                {work.event.eventDate ||
                  'Date not set'}
              </span>
              <span>
                {Math.max(
                  0,
                  Number(
                    work.event.pax,
                  ) || 0,
                ).toLocaleString('en-IN')}{' '}
                guests
              </span>
              <span className="status">
                {eventOptions.find(
                  (item) =>
                    item.costingId ===
                    selectedEventId,
                )?.source ||
                  'CURRENT'}
              </span>
            </div>
          </div>

          <div>
            <select
              className="ep-event-select"
              value={selectedEventId}
              disabled={
                eventLoading ||
                !eventOptions.length
              }
              onChange={(event) =>
                void switchPlanningEvent(
                  event.target.value,
                )
              }
              aria-label="Select event"
            >
              {!eventOptions.length ? (
                <option value="">
                  No saved events available
                </option>
              ) : null}

              {eventOptions.map(
                (item) => (
                  <option
                    key={
                      item.costingId
                    }
                    value={
                      item.costingId
                    }
                  >
                    {[
                      item.eventName ||
                        'Unnamed event',
                      item.clientName,
                      item.eventDate,
                      item.totalCovers > 0
                        ? `${item.totalCovers.toLocaleString('en-IN')} guests`
                        : '',
                      item.source === 'COMPLETED'
                        ? 'Completed'
                        : item.source === 'DRAFT'
                          ? 'Draft'
                          : 'Current',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </option>
                ),
              )}
            </select>

            {eventLoading ? (
              <div className="ep-event-meta">
                <span className="status">
                  Loading event…
                </span>
              </div>
            ) : null}
          </div>
        </section>

        {eventError ? (
          <p
            className="ep-event-error"
            role="alert"
          >
            {eventError}
          </p>
        ) : null}

        <header className="ep-hero">
          <div>
            <span className="ep-kicker">
              Event command center
            </span>
            <h1>{eventName}</h1>
            <p>
              {work.event.eventDate || 'Date not set'}
              {' · '}
              {work.event.venue || work.event.city || 'Venue not set'}
              {' · '}
              {functions.length} function{functions.length === 1 ? '' : 's'}
            </p>
          </div>

          <div className="ep-hero-actions">
            <Link className="ep-button" href="/app/vendors">
              Vendor Master
            </Link>
            <Link className="ep-button" href="/app/equipment">
              Equipment Master
            </Link>
            <Link className="ep-button" href="/app/crockery">
              Crockery Master
            </Link>
            <Link className="ep-button" href="/app/uniforms">
              Dress Master
            </Link>
            <Link className="ep-button" href="/app/disposable-master">
              Disposable Master
            </Link>
            <Link className="ep-button" href="/app/work-orders">
              Work Orders
            </Link>
            <Link className="ep-button" href="/app/event?resume=1">
              Edit Event & Menu
            </Link>
            <Link className="ep-button primary" href="/app/final-costing">
              Open Final Cost
            </Link>
          </div>
        </header>

        <section
          className="ep-readiness"
          aria-label="Event readiness"
        >
          <div className="ep-readiness-head">
            <div className="ep-readiness-title">
              <span>
                Event Readiness
              </span>
              <b>
                What still needs attention?
              </b>
              <small>
                Live readiness for the selected event across costing and execution.
              </small>
              {readinessLoading ? (
                <div className="ep-readiness-loading">
                  Refreshing readiness…
                </div>
              ) : null}
            </div>

            <div
              className="ep-readiness-score"
              style={{
                background:
                  `conic-gradient(#4a9cff ${eventReadinessScore * 3.6}deg, #202833 0deg)`,
              }}
              aria-label={`Overall event readiness ${eventReadinessScore}%`}
            >
              <div className="ep-readiness-score-inner">
                <b>
                  {eventReadinessScore}%
                </b>
                <small>
                  Overall
                </small>
              </div>
            </div>
          </div>

          <div className="ep-readiness-grid">
            {eventReadinessItems.map(
              (item) => {
                const state =
                  item.score >= 100
                    ? 'ready'
                    : item.score > 0
                      ? 'needs-work'
                      : 'blocked';

                return (
                  <article
                    key={item.key}
                    className={
                      `ep-readiness-item ${state}`
                    }
                  >
                    <div className="ep-readiness-item-top">
                      <div className="ep-readiness-item-heading">
                        <ReadinessIcon
                          kind={
                            item.key as
                              | 'menu'
                              | 'recipes'
                              | 'grocery'
                              | 'manpower'
                              | 'equipment'
                              | 'vendors'
                              | 'quotation'
                          }
                        />
                        <b>
                          {item.label}
                        </b>
                      </div>

                      <strong>
                        {item.score}%
                      </strong>
                    </div>

                    <small>
                      {item.detail}
                    </small>

                    <div
                      className="ep-readiness-track"
                      aria-hidden="true"
                    >
                      <div
                        className="ep-readiness-fill"
                        style={{
                          width:
                            `${Math.max(
                              0,
                              Math.min(
                                100,
                                item.score,
                              ),
                            )}%`,
                        }}
                      />
                    </div>
                  </article>
                );
              },
            )}
          </div>
        </section>

        <section
          className="ep-operations-board"
          aria-label="Event operations readiness"
        >
          <div className="ep-operations-board-head">
            <div>
              <span className="ep-kicker">
                Execution readiness
              </span>
              <h2>
                Event Operations Board
              </h2>
              <p>
                Live execution health across every Event Planning tab. Click any section to open it for the selected function.
              </p>
            </div>

            <div className="ep-operations-board-score">
              <div
                className="ep-operations-score-ring"
                style={{
                  background:
                    `conic-gradient(${eventExecutionReadiness >= 80 ? '#55d98f' : eventExecutionReadiness >= 50 ? '#f4ad54' : '#ff7e76'} ${eventExecutionReadiness * 3.6}deg, #25303d 0deg)`,
                }}
              >
                <span>
                  <b>{eventExecutionReadiness}%</b>
                  <small>Execution</small>
                </span>
              </div>

              <div>
                <span>Open issues</span>
                <b>{eventExecutionIssues}</b>
                <small>{executionBlockers.filter((item) => item.severity === 'BLOCKED').length} blockers across {functions.length} function{functions.length === 1 ? '' : 's'}</small>
              </div>
            </div>
          </div>

          <div className="ep-operations-grid">
            {executionTabSummaries.map((item) => {
              const state =
                item.score >= 80
                  ? 'ready'
                  : item.score >= 50
                    ? 'warning'
                    : 'blocked';

              return (
                <button
                  key={item.kind}
                  type="button"
                  className={`ep-operation-card ${state}`}
                  onClick={() =>
                    setTab(item.kind)
                  }
                >
                  <div className="ep-operation-card-top">
                    <span>{item.label}</span>
                    <b>{item.score}%</b>
                  </div>

                  <strong>
                    {item.rows.length} requirement{item.rows.length === 1 ? '' : 's'}
                  </strong>

                  <div className="ep-operation-card-meta">
                    <span>{item.assigned}/{item.rows.length} assigned</span>
                    <span>{item.confirmed} confirmed</span>
                    <span>{currency(item.cost)}</span>
                  </div>

                  <div className="ep-operation-card-issues">
                    {item.shortages > 0 ? (
                      <span className="blocked">
                        {item.shortages} shortage{item.shortages === 1 ? '' : 's'}
                      </span>
                    ) : null}
                    {item.unassigned > 0 ? (
                      <span className="blocked">
                        {item.unassigned} unassigned
                      </span>
                    ) : null}
                    {item.missingTiming > 0 ? (
                      <span>
                        {item.missingTiming} time missing
                      </span>
                    ) : null}
                    {item.missingRates > 0 ? (
                      <span>
                        {item.missingRates} rate missing
                      </span>
                    ) : null}
                    {!item.issueCount ? (
                      <span className="ready">
                        No open issues
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="ep-operations-blockers">
            <div className="ep-operations-blockers-head">
              <div>
                <b>Priority attention</b>
                <span>
                  Highest-impact execution issues across the full event.
                </span>
              </div>

              <Link
                className="ep-button"
                href="/app/work-orders"
              >
                Open Work Orders
              </Link>
            </div>

            {executionBlockers.length ? (
              <div className="ep-operations-blocker-list">
                {executionBlockers
                  .slice(0, 8)
                  .map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={
                        item.severity === 'BLOCKED'
                          ? 'ep-operation-blocker blocked'
                          : 'ep-operation-blocker'
                      }
                      onClick={() => {
                        setSelectedFunction(
                          item.functionKey,
                        );
                        setTab(
                          item.kind,
                        );
                      }}
                    >
                      <span>
                        {item.severity === 'BLOCKED'
                          ? 'Blocker'
                          : 'Action'}
                      </span>
                      <b>{item.label}</b>
                      <small>{item.detail}</small>
                    </button>
                  ))}
              </div>
            ) : (
              <div className="ep-operations-all-ready">
                No open execution issues. All planned requirements are assigned, timed and confirmed.
              </div>
            )}
          </div>
        </section>

        <section className="ep-stats">
          <article className="ep-stat">
            <small>Functions</small>
            <strong>{functions.length}</strong>
            <span>Detected event services</span>
          </article>

          <article className="ep-stat">
            <small>Total Covers</small>
            <strong>
              {functions.reduce(
                (sum, fn) => sum + Math.max(0, fn.pax),
                0,
              ).toLocaleString('en-IN')}
            </strong>
            <span>Across all functions</span>
          </article>

          <article className="ep-stat">
            <small>Assignments</small>
            <strong>
              {assignedCount}/{allRows.length}
            </strong>
            <span>Vendor / agency / in-house</span>
          </article>

          <article className="ep-stat ready">
            <small>Confirmed</small>
            <strong>{confirmedCount}</strong>
            <span>Ready requirements</span>
          </article>

          <article className="ep-stat attention">
            <small>Assigned Cost</small>
            <strong>{currency(totalAssignedCost)}</strong>
            <span>Based on assignment rates</span>
          </article>

          <article className={eventExecutionIssues ? 'ep-stat attention' : 'ep-stat ready'}>
            <small>Execution Readiness</small>
            <strong>{eventExecutionReadiness}%</strong>
            <span>{eventExecutionIssues} open operational issue{eventExecutionIssues === 1 ? '' : 's'}</span>
          </article>
        </section>

        <nav
          className="ep-functions"
          aria-label="Event functions"
        >
          {functions.map((fn) => {
            const rows =
              plan[fn.key] ||
              seedRows(fn, work);
            const score =
              operationalReadiness(
                rows,
              );

            return (
              <button
                key={fn.key}
                className={
                  selectedFunction === fn.key
                    ? 'ep-function active'
                    : 'ep-function'
                }
                onClick={() => setSelectedFunction(fn.key)}
                type="button"
              >
                <b>{fn.mealLabel}</b>
                <span>
                  {fn.dayLabel || 'Event'} · {fn.pax || 0} covers
                </span>
                <small>{score}% ready</small>
              </button>
            );
          })}
        </nav>

        <div className="ep-layout">
          <section className="ep-panel">
            <div className="ep-panel-head">
              <div>
                <h2>
                  {currentFunction.mealLabel} — Assignments
                </h2>
                <p>
                  Assign every requirement to in-house,
                  agency or vendor and track confirmation.
                </p>
              </div>

              <button
                className="ep-button"
                type="button"
                onClick={resetFunctionPlan}
              >
                Reset Suggestions
              </button>
            </div>

            <div className="ep-function-meta">
              <span className="ep-chip">
                {currentFunction.dayLabel || 'Event day'}
              </span>
              <span className="ep-chip">
                {currentFunction.pax || 0} covers
              </span>
              <span className="ep-chip">
                {currentFunction.menu.length} dishes
              </span>
              <span className={currentFunctionExecutionReadiness >= 80 ? 'ep-chip ready' : 'ep-chip'}>
                {currentFunctionExecutionReadiness}% execution ready
              </span>
              <span
                className={
                  saveState === 'ERROR'
                    ? 'ep-chip'
                    : 'ep-chip ready'
                }
              >
                {saveState === 'SAVING'
                  ? 'Saving…'
                  : saveState === 'ERROR'
                    ? 'Save error'
                    : 'Saved to server'}
              </span>
            </div>

            <nav className="ep-tabs">
              {TABS.map((item) => {
                const count =
                  item.kind === 'GROCERY'
                    ? grocerySupplierSummary.filter(
                        (group) =>
                          group.rows.length > 0,
                      ).length
                    : currentRows.filter(
                        (row) =>
                          row.kind === item.kind,
                      ).length;

                return (
                  <button
                    key={item.kind}
                    type="button"
                    className={
                      tab === item.kind
                        ? 'ep-tab active'
                        : 'ep-tab'
                    }
                    onClick={() => setTab(item.kind)}
                  >
                    {item.label} ({count})
                  </button>
                );
              })}
            </nav>

            {tab === 'GROCERY' ? (
              <section className="ep-grocery-supplier-panel">
                <div className="ep-grocery-supplier-head">
                  <div>
                    <b>Grocery supplier categories</b>
                    <span>
                      Assign separate suppliers for Grocery, Dairy, and Vegetables & Fruits.
                    </span>
                  </div>

                  <Link
                    className="ep-button"
                    href="/app/vendors"
                  >
                    Manage Suppliers
                  </Link>
                </div>

                <div className="ep-grocery-supplier-grid">
                  {grocerySupplierSummary.map(
                    (group) => (
                      <article
                        className={
                          group.readiness >= 80
                            ? 'ep-grocery-supplier-card ready'
                            : 'ep-grocery-supplier-card'
                        }
                        key={group.key}
                      >
                        <div className="ep-grocery-supplier-card-top">
                          <div>
                            <span>
                              {group.label}
                            </span>
                            <b>
                              {group.suppliers.length
                                ? group.suppliers.join(', ')
                                : 'Supplier not assigned'}
                            </b>
                          </div>

                          <strong>
                            {group.readiness}%
                          </strong>
                        </div>

                        <p>
                          {group.detail}
                        </p>

                        <div className="ep-grocery-supplier-card-meta">
                          <span>
                            {group.assignedCount}/{group.rows.length || 1} assigned
                          </span>
                          <span>
                            {group.confirmedCount} confirmed
                          </span>
                          <span>
                            {currency(group.cost)}
                          </span>
                        </div>
                      </article>
                    ),
                  )}
                </div>
              </section>
            ) : null}

            {tab === 'DISPOSABLE' ? (
              <section className="ep-disposable-master">
                <div className="ep-disposable-master-head">
                  <div>
                    <b>Saved Disposable Master</b>
                    <span>
                      All saved disposable items are shown by category. Edit required quantity directly for this function and keep supplier, stock and rate linked to the master.
                    </span>
                  </div>

                  <div className="ep-disposable-master-head-actions">
                    <span>
                      {disposableMaster.length} saved · {disposableMaster.filter((item) => item.active).length} active
                    </span>
                    <Link
                      className="ep-button"
                      href="/app/disposable-master"
                    >
                      Manage Disposables
                    </Link>
                  </div>
                </div>

                {disposableCategoryGroups.length ? (
                  <div className="ep-disposable-category-list">
                    {disposableCategoryGroups.map(
                      (group) => {
                        const categorySelected =
                          group.items.reduce(
                            (sum, item) =>
                              sum +
                              selectedDisposableQty(
                                item.id,
                              ),
                            0,
                          );

                        return (
                          <section
                            className="ep-disposable-category"
                            key={group.category}
                          >
                            <div className="ep-disposable-category-head">
                              <div>
                                <b>{group.category}</b>
                                <span>
                                  {group.items.length} item{group.items.length === 1 ? '' : 's'}
                                </span>
                              </div>

                              <strong>
                                {categorySelected} selected
                              </strong>
                            </div>

                            <div className="ep-disposable-master-grid">
                              {group.items.map(
                                (item) => {
                                  const selected =
                                    selectedDisposableQty(
                                      item.id,
                                    );

                                  const eventQty =
                                    eventDisposableQty(
                                      item,
                                    );

                                  const shortage =
                                    item.availableQty > 0
                                      ? Math.max(
                                          0,
                                          selected -
                                            item.availableQty,
                                        )
                                      : 0;

                                  const disabled =
                                    !item.active &&
                                    selected <= 0;

                                  return (
                                    <article
                                      key={item.id}
                                      className={
                                        [
                                          'ep-disposable-master-card',
                                          selected > 0
                                            ? 'selected'
                                            : '',
                                          shortage > 0
                                            ? 'over'
                                            : '',
                                          !item.active
                                            ? 'inactive'
                                            : '',
                                        ]
                                          .filter(Boolean)
                                          .join(' ')
                                      }
                                    >
                                      <div className="ep-disposable-master-photo">
                                        {item.photoUrl ? (
                                          <img
                                            src={item.photoUrl}
                                            alt={item.name}
                                          />
                                        ) : (
                                          <div className="ep-equipment-fallback">
                                            <b>
                                              {item.name
                                                .slice(0, 2)
                                                .toUpperCase() || 'DP'}
                                            </b>
                                            <small>No photo</small>
                                          </div>
                                        )}

                                        <span className="ep-disposable-master-status">
                                          {item.active
                                            ? 'Active'
                                            : 'Inactive'}
                                        </span>
                                      </div>

                                      <div className="ep-disposable-master-body">
                                        <div className="ep-disposable-master-title">
                                          <div>
                                            <b>{item.name}</b>
                                            <span>
                                              {item.unit || 'pcs'}
                                            </span>
                                          </div>

                                          <strong>
                                            {currency(item.defaultRate)}
                                          </strong>
                                        </div>

                                        <div className="ep-disposable-master-meta">
                                          <span>
                                            Event Qty <b>{eventQty}</b>
                                          </span>
                                          <span>
                                            Available <b>{item.availableQty}</b>
                                          </span>
                                          {shortage > 0 ? (
                                            <span className="warn">
                                              Shortage <b>{shortage}</b>
                                            </span>
                                          ) : (
                                            <span>
                                              Selected <b>{selected}</b>
                                            </span>
                                          )}
                                        </div>

                                        <div className="ep-disposable-tags">
                                          <span>
                                            {item.supplierName || 'No supplier'}
                                          </span>
                                          <span>
                                            {currency(item.defaultRate)} / {item.unit || 'pcs'}
                                          </span>
                                        </div>

                                        <div className="ep-disposable-qty-editor">
                                          <button
                                            type="button"
                                            disabled={selected <= 0}
                                            onClick={() =>
                                              setDisposableQuantity(
                                                item,
                                                selected - 1,
                                              )
                                            }
                                          >
                                            −
                                          </button>

                                          <label>
                                            <span>Qty</span>
                                            <input
                                              type="number"
                                              min="0"
                                              step="1"
                                              value={selected}
                                              disabled={disabled}
                                              onChange={(event) =>
                                                setDisposableQuantity(
                                                  item,
                                                  Number(event.target.value),
                                                )
                                              }
                                            />
                                          </label>

                                          <button
                                            type="button"
                                            disabled={disabled}
                                            onClick={() =>
                                              addDisposableFromMaster(
                                                item,
                                              )
                                            }
                                          >
                                            +
                                          </button>
                                        </div>

                                        {eventQty > 0 ? (
                                          <button
                                            className="ep-disposable-event-qty"
                                            type="button"
                                            disabled={disabled}
                                            onClick={() =>
                                              useEventDisposableQty(
                                                item,
                                              )
                                            }
                                          >
                                            Use Event Qty {eventQty}
                                          </button>
                                        ) : null}

                                        {!item.active ? (
                                          <small className="ep-disposable-note warn">
                                            Inactive in Disposable Master. Reactivate it there to add new quantity.
                                          </small>
                                        ) : item.supplierName ? (
                                          <small className="ep-disposable-note">
                                            Supplier: {item.supplierName}
                                          </small>
                                        ) : (
                                          <small className="ep-disposable-note warn">
                                            Supplier not assigned
                                          </small>
                                        )}
                                      </div>
                                    </article>
                                  );
                                },
                              )}
                            </div>
                          </section>
                        );
                      },
                    )}
                  </div>
                ) : (
                  <div className="ep-empty">
                    No disposable items saved yet. Open Disposable Master and add your items first.
                  </div>
                )}
              </section>
            ) : null}

            {tab === 'DRESS' ? (
              <section className="ep-uniform-master">
                <div className="ep-uniform-master-head">
                  <div>
                    <b>Saved Dress & Uniform Master</b>
                    <span>
                      All saved uniforms are grouped by staff role. Required quantity comes from manpower assigned to this function, and you can override it anytime.
                    </span>
                  </div>

                  <div className="ep-uniform-master-head-actions">
                    <span>
                      {uniforms.length} saved · {uniforms.filter((item) => item.active).length} active
                    </span>
                    <Link className="ep-button" href="/app/uniforms">
                      Manage Uniforms
                    </Link>
                  </div>
                </div>

                {uniformRoleGroups.length ? (
                  <div className="ep-uniform-role-list">
                    {uniformRoleGroups.map((group) => {
                      const roleRequired =
                        group.items.reduce(
                          (max, item) =>
                            Math.max(
                              max,
                              requiredUniformQty(item),
                            ),
                          0,
                        );

                      const roleSelected =
                        group.items.reduce(
                          (sum, item) =>
                            sum +
                            selectedUniformQty(item.id),
                          0,
                        );

                      return (
                        <section
                          className="ep-uniform-role"
                          key={group.role}
                        >
                          <div className="ep-uniform-role-head">
                            <div>
                              <b>{group.role}</b>
                              <span>
                                {group.items.length} uniform option{group.items.length === 1 ? '' : 's'}
                              </span>
                            </div>

                            <div className="ep-uniform-role-summary">
                              <span>Required <b>{roleRequired}</b></span>
                              <span>Selected <b>{roleSelected}</b></span>
                            </div>
                          </div>

                          <div className="ep-uniform-master-grid">
                            {group.items.map((item) => {
                              const required =
                                requiredUniformQty(item);
                              const selected =
                                selectedUniformQty(item.id);
                              const shortage =
                                item.availableQty > 0
                                  ? Math.max(
                                      0,
                                      selected -
                                        item.availableQty,
                                    )
                                  : 0;
                              const disabled =
                                !item.active &&
                                selected <= 0;

                              return (
                                <article
                                  key={item.id}
                                  className={
                                    [
                                      'ep-uniform-master-card',
                                      selected > 0
                                        ? 'selected'
                                        : '',
                                      shortage > 0
                                        ? 'over'
                                        : '',
                                      !item.active
                                        ? 'inactive'
                                        : '',
                                    ]
                                      .filter(Boolean)
                                      .join(' ')
                                  }
                                >
                                  <div className="ep-uniform-master-photo">
                                    {item.photoUrl ? (
                                      <img
                                        src={item.photoUrl}
                                        alt={item.name}
                                      />
                                    ) : (
                                      <div className="ep-equipment-fallback">
                                        <b>
                                          {item.name
                                            .slice(0, 2)
                                            .toUpperCase() || 'UF'}
                                        </b>
                                        <small>No photo</small>
                                      </div>
                                    )}

                                    <span className="ep-uniform-master-status">
                                      {item.active
                                        ? item.ownership === 'RENTAL'
                                          ? 'Rental'
                                          : 'In-house'
                                        : 'Inactive'}
                                    </span>
                                  </div>

                                  <div className="ep-uniform-master-body">
                                    <div className="ep-uniform-master-title">
                                      <div>
                                        <b>{item.name}</b>
                                        <span>
                                          {item.components || item.unit || 'Uniform set'}
                                        </span>
                                      </div>
                                      <strong>{currency(item.defaultRate)}</strong>
                                    </div>

                                    <div className="ep-uniform-master-meta">
                                      <span>Required <b>{required}</b></span>
                                      <span>Available <b>{item.availableQty}</b></span>
                                      {shortage > 0 ? (
                                        <span className="warn">
                                          Shortage <b>{shortage}</b>
                                        </span>
                                      ) : (
                                        <span>
                                          Selected <b>{selected}</b>
                                        </span>
                                      )}
                                    </div>

                                    <div className="ep-uniform-tags">
                                      {item.sizes ? <span>Sizes {item.sizes}</span> : null}
                                      {item.laundryStatus ? (
                                        <span>
                                          Laundry {item.laundryStatus.replace(/_/g, ' ')}
                                        </span>
                                      ) : null}
                                      <span>{item.unit || 'set'}</span>
                                    </div>

                                    <div className="ep-uniform-qty-editor">
                                      <button
                                        type="button"
                                        disabled={selected <= 0}
                                        onClick={() =>
                                          setUniformQuantity(
                                            item,
                                            selected - 1,
                                          )
                                        }
                                      >
                                        −
                                      </button>

                                      <label>
                                        <span>Qty</span>
                                        <input
                                          type="number"
                                          min="0"
                                          step="1"
                                          value={selected}
                                          disabled={disabled}
                                          onChange={(event) =>
                                            setUniformQuantity(
                                              item,
                                              Number(event.target.value),
                                            )
                                          }
                                        />
                                      </label>

                                      <button
                                        type="button"
                                        disabled={disabled}
                                        onClick={() =>
                                          addUniformFromMaster(item)
                                        }
                                      >
                                        +
                                      </button>
                                    </div>

                                    <button
                                      className="ep-uniform-required"
                                      type="button"
                                      disabled={disabled || required <= 0}
                                      onClick={() =>
                                        useRequiredUniformQty(item)
                                      }
                                    >
                                      Use Required {required}
                                    </button>

                                    {!item.active ? (
                                      <small className="ep-uniform-note warn">
                                        Inactive in Uniform Master. Reactivate it there to add new quantity.
                                      </small>
                                    ) : item.vendorName ? (
                                      <small className="ep-uniform-note">
                                        {item.vendorName}
                                      </small>
                                    ) : null}
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                ) : (
                  <div className="ep-empty">
                    No uniforms saved yet. Open Uniform Master and add staff dress first.
                  </div>
                )}
              </section>
            ) : null}

            {tab === 'EQUIPMENT' ? (
              <section className="ep-equipment-master">
                <div className="ep-equipment-master-head">
                  <div>
                    <b>Saved Equipment Master</b>
                    <span>
                      All equipment saved on the Equipment page is shown here by category. Edit quantity directly for this function.
                    </span>
                  </div>

                  <div className="ep-equipment-master-head-actions">
                    <span>
                      {equipment.length} saved · {equipment.filter((item) => item.active).length} active
                    </span>
                    <Link
                      className="ep-button"
                      href="/app/equipment"
                    >
                      Manage Equipment
                    </Link>
                  </div>
                </div>

                {equipmentCategoryGroups.length ? (
                  <div className="ep-equipment-category-list">
                    {equipmentCategoryGroups.map(
                      (group) => {
                        const categorySelected =
                          group.items.reduce(
                            (sum, item) =>
                              sum +
                              selectedEquipmentQty(
                                item.id,
                              ),
                            0,
                          );

                        return (
                          <section
                            className="ep-equipment-category"
                            key={group.category}
                          >
                            <div className="ep-equipment-category-head">
                              <div>
                                <b>{group.category}</b>
                                <span>
                                  {group.items.length} item{group.items.length === 1 ? '' : 's'}
                                </span>
                              </div>

                              <strong>
                                {categorySelected} selected
                              </strong>
                            </div>

                            <div className="ep-equipment-master-grid">
                              {group.items.map(
                                (item) => {
                                  const selected =
                                    selectedEquipmentQty(
                                      item.id,
                                    );

                                  const shortage =
                                    item.availableQty > 0
                                      ? Math.max(
                                          0,
                                          selected -
                                            item.availableQty,
                                        )
                                      : 0;

                                  const disabled =
                                    !item.active &&
                                    selected <= 0;

                                  return (
                                    <article
                                      key={item.id}
                                      className={
                                        [
                                          'ep-equipment-master-card',
                                          selected > 0
                                            ? 'selected'
                                            : '',
                                          shortage > 0
                                            ? 'over'
                                            : '',
                                          !item.active
                                            ? 'inactive'
                                            : '',
                                        ]
                                          .filter(Boolean)
                                          .join(' ')
                                      }
                                    >
                                      <div className="ep-equipment-master-photo">
                                        {item.photoUrl ? (
                                          <img
                                            src={item.photoUrl}
                                            alt={item.name}
                                          />
                                        ) : (
                                          <div className="ep-equipment-fallback">
                                            <b>
                                              {item.name
                                                .slice(0, 2)
                                                .toUpperCase() || 'EQ'}
                                            </b>
                                            <small>No photo</small>
                                          </div>
                                        )}

                                        <span className="ep-equipment-master-status">
                                          {item.active
                                            ? item.ownership === 'RENTAL'
                                              ? 'Rental'
                                              : 'In-house'
                                            : 'Inactive'}
                                        </span>
                                      </div>

                                      <div className="ep-equipment-master-body">
                                        <div className="ep-equipment-master-title">
                                          <div>
                                            <b>{item.name}</b>
                                            <span>
                                              {item.capacity || item.unit || 'Equipment'}
                                            </span>
                                          </div>

                                          <strong>
                                            {currency(item.defaultRate)}
                                          </strong>
                                        </div>

                                        <div className="ep-equipment-master-meta">
                                          <span>
                                            Available <b>{item.availableQty}</b>
                                          </span>
                                          <span>
                                            Unit <b>{item.unit || 'unit'}</b>
                                          </span>
                                          {shortage > 0 ? (
                                            <span className="warn">
                                              Shortage <b>{shortage}</b>
                                            </span>
                                          ) : (
                                            <span>
                                              Selected <b>{selected}</b>
                                            </span>
                                          )}
                                        </div>

                                        <div className="ep-equipment-qty-editor">
                                          <button
                                            type="button"
                                            aria-label={`Decrease ${item.name} quantity`}
                                            disabled={selected <= 0}
                                            onClick={() =>
                                              setEquipmentQuantity(
                                                item,
                                                selected - 1,
                                              )
                                            }
                                          >
                                            −
                                          </button>

                                          <label>
                                            <span>Qty</span>
                                            <input
                                              type="number"
                                              min="0"
                                              step="1"
                                              value={selected}
                                              disabled={disabled}
                                              onChange={(event) =>
                                                setEquipmentQuantity(
                                                  item,
                                                  Number(event.target.value),
                                                )
                                              }
                                            />
                                          </label>

                                          <button
                                            type="button"
                                            aria-label={`Increase ${item.name} quantity`}
                                            disabled={disabled}
                                            onClick={() =>
                                              addEquipmentFromMaster(
                                                item,
                                              )
                                            }
                                          >
                                            +
                                          </button>
                                        </div>

                                        {!item.active ? (
                                          <small className="ep-equipment-inactive-note">
                                            Inactive in Equipment Master. Reactivate it there to add quantity.
                                          </small>
                                        ) : item.vendorName ? (
                                          <small className="ep-equipment-vendor-note">
                                            {item.vendorName}
                                          </small>
                                        ) : null}
                                      </div>
                                    </article>
                                  );
                                },
                              )}
                            </div>
                          </section>
                        );
                      },
                    )}
                  </div>
                ) : (
                  <div className="ep-empty">
                    No equipment saved yet. Open Equipment Master and add your equipment first.
                  </div>
                )}
              </section>
            ) : null}

            {tab === 'CROCKERY' ? (
              <section className="ep-crockery-master">
                <div className="ep-crockery-master-head">
                  <div>
                    <b>Saved Crockery & Cutlery Master</b>
                    <span>
                      All saved master items are shown by category. Recommended quantity uses guests × units per guest + buffer, and you can override it anytime.
                    </span>
                  </div>

                  <div className="ep-crockery-master-head-actions">
                    <span>
                      {crockery.length} saved · {crockery.filter((item) => item.active).length} active
                    </span>
                    <Link
                      className="ep-button"
                      href="/app/crockery"
                    >
                      Manage Crockery
                    </Link>
                  </div>
                </div>

                {crockeryCategoryGroups.length ? (
                  <div className="ep-crockery-category-list">
                    {crockeryCategoryGroups.map(
                      (group) => {
                        const categorySelected =
                          group.items.reduce(
                            (sum, item) =>
                              sum +
                              selectedCrockeryQty(
                                item.id,
                              ),
                            0,
                          );

                        const categoryRecommended =
                          group.items.reduce(
                            (sum, item) =>
                              sum +
                              recommendedCrockeryQty(
                                item,
                              ),
                            0,
                          );

                        return (
                          <section
                            className="ep-crockery-category"
                            key={group.category}
                          >
                            <div className="ep-crockery-category-head">
                              <div>
                                <b>{group.category}</b>
                                <span>
                                  {group.items.length} item{group.items.length === 1 ? '' : 's'}
                                </span>
                              </div>

                              <div className="ep-crockery-category-summary">
                                <span>
                                  Recommended <b>{categoryRecommended}</b>
                                </span>
                                <span>
                                  Selected <b>{categorySelected}</b>
                                </span>
                              </div>
                            </div>

                            <div className="ep-crockery-master-grid">
                              {group.items.map(
                                (item) => {
                                  const selected =
                                    selectedCrockeryQty(
                                      item.id,
                                    );

                                  const recommended =
                                    recommendedCrockeryQty(
                                      item,
                                    );

                                  const shortage =
                                    item.availableQty > 0
                                      ? Math.max(
                                          0,
                                          selected -
                                            item.availableQty,
                                        )
                                      : 0;

                                  const disabled =
                                    !item.active &&
                                    selected <= 0;

                                  return (
                                    <article
                                      key={item.id}
                                      className={
                                        [
                                          'ep-crockery-master-card',
                                          selected > 0
                                            ? 'selected'
                                            : '',
                                          shortage > 0
                                            ? 'over'
                                            : '',
                                          !item.active
                                            ? 'inactive'
                                            : '',
                                        ]
                                          .filter(Boolean)
                                          .join(' ')
                                      }
                                    >
                                      <div className="ep-crockery-master-photo">
                                        {item.photoUrl ? (
                                          <img
                                            src={item.photoUrl}
                                            alt={item.name}
                                          />
                                        ) : (
                                          <div className="ep-equipment-fallback">
                                            <b>
                                              {item.name
                                                .slice(0, 2)
                                                .toUpperCase() || 'CK'}
                                            </b>
                                            <small>No photo</small>
                                          </div>
                                        )}

                                        <span className="ep-crockery-master-status">
                                          {item.active
                                            ? item.ownership === 'RENTAL'
                                              ? 'Rental'
                                              : 'In-house'
                                            : 'Inactive'}
                                        </span>
                                      </div>

                                      <div className="ep-crockery-master-body">
                                        <div className="ep-crockery-master-title">
                                          <div>
                                            <b>{item.name}</b>
                                            <span>
                                              {item.sizeType || item.unit || 'Crockery'}
                                            </span>
                                          </div>

                                          <strong>
                                            {currency(item.defaultRate)}
                                          </strong>
                                        </div>

                                        <div className="ep-crockery-master-meta">
                                          <span>
                                            Recommended <b>{recommended}</b>
                                          </span>
                                          <span>
                                            Available <b>{item.availableQty}</b>
                                          </span>
                                          {shortage > 0 ? (
                                            <span className="warn">
                                              Shortage <b>{shortage}</b>
                                            </span>
                                          ) : (
                                            <span>
                                              Selected <b>{selected}</b>
                                            </span>
                                          )}
                                        </div>

                                        <div className="ep-crockery-rule">
                                          <span>
                                            {item.unitsPerGuest || 0} / guest
                                          </span>
                                          <span>
                                            +{item.bufferPercent || 0}% buffer
                                          </span>
                                          <span>
                                            {item.unit || 'pcs'}
                                          </span>
                                        </div>

                                        <div className="ep-crockery-qty-editor">
                                          <button
                                            type="button"
                                            aria-label={`Decrease ${item.name} quantity`}
                                            disabled={selected <= 0}
                                            onClick={() =>
                                              setCrockeryQuantity(
                                                item,
                                                selected - 1,
                                              )
                                            }
                                          >
                                            −
                                          </button>

                                          <label>
                                            <span>Qty</span>
                                            <input
                                              type="number"
                                              min="0"
                                              step="1"
                                              value={selected}
                                              disabled={disabled}
                                              onChange={(event) =>
                                                setCrockeryQuantity(
                                                  item,
                                                  Number(event.target.value),
                                                )
                                              }
                                            />
                                          </label>

                                          <button
                                            type="button"
                                            aria-label={`Increase ${item.name} quantity`}
                                            disabled={disabled}
                                            onClick={() =>
                                              addCrockeryFromMaster(
                                                item,
                                              )
                                            }
                                          >
                                            +
                                          </button>
                                        </div>

                                        <button
                                          className="ep-crockery-recommended"
                                          type="button"
                                          disabled={disabled || recommended <= 0}
                                          onClick={() =>
                                            useRecommendedCrockeryQty(
                                              item,
                                            )
                                          }
                                        >
                                          Use Recommended {recommended}
                                        </button>

                                        {!item.active ? (
                                          <small className="ep-crockery-inactive-note">
                                            Inactive in Crockery Master. Reactivate it there to add new quantity.
                                          </small>
                                        ) : item.vendorName ? (
                                          <small className="ep-crockery-vendor-note">
                                            {item.vendorName}
                                          </small>
                                        ) : null}
                                      </div>
                                    </article>
                                  );
                                },
                              )}
                            </div>
                          </section>
                        );
                      },
                    )}
                  </div>
                ) : (
                  <div className="ep-empty">
                    No crockery or cutlery saved yet. Open Crockery Master and add your items first.
                  </div>
                )}
              </section>
            ) : null}

            {tab === 'MENU' ? (
              <section className="ep-menu-vendor-control">
                <div className="ep-menu-vendor-head">
                  <div>
                    <b>Menu Vendor Planning</b>
                    <span>
                      Categories and dishes come directly from the selected menu for this function. Assign an in-house team or external food vendor per category/station.
                    </span>
                  </div>

                  <div className="ep-menu-vendor-head-actions">
                    <Link
                      className="ep-button"
                      href="/app/event"
                    >
                      Edit Menu
                    </Link>

                    <Link
                      className="ep-button"
                      href="/app/vendors"
                    >
                      Food Vendors
                    </Link>
                  </div>
                </div>

                <div className="ep-menu-vendor-summary">
                  <article>
                    <span>Menu Categories</span>
                    <b>{menuVendorRows.length}</b>
                    <small>{currentFunction?.menu.length || 0} selected dishes</small>
                  </article>
                  <article>
                    <span>Assigned</span>
                    <b>{menuVendorSummary.assigned}/{menuVendorRows.length}</b>
                    <small>In-house or vendor assigned</small>
                  </article>
                  <article>
                    <span>Setup Ready</span>
                    <b>{menuVendorSummary.withSetupTime}/{menuVendorRows.length}</b>
                    <small>Reporting/setup time entered</small>
                  </article>
                  <article>
                    <span>Confirmed</span>
                    <b>{menuVendorSummary.confirmed}</b>
                    <small>{menuVendorSummary.readiness}% vendor readiness</small>
                  </article>
                  <article>
                    <span>Vendor Cost</span>
                    <b>{currency(menuVendorSummary.totalCost)}</b>
                    <small>Cover × vendor rate</small>
                  </article>
                </div>

                {menuVendorRows.length ? (
                  <div className="ep-menu-vendor-grid">
                    {menuVendorRows.map((row) => {
                      const category =
                        menuCategoryFromRow(
                          row,
                        );

                      const dishes =
                        currentFunction?.menu.filter(
                          (item) =>
                            normalized(
                              item.category ||
                                'Other',
                            ) ===
                            normalized(
                              category,
                            ),
                        ) || [];

                      const functionCovers =
                        Math.max(
                          0,
                          Number(
                            currentFunction?.pax,
                          ) || 0,
                        );

                      const variance =
                        row.quantity -
                        functionCovers;

                      return (
                        <article
                          className={
                            [
                              'ep-menu-vendor-card',
                              row.assignedTo.trim()
                                ? 'assigned'
                                : '',
                              row.status !== 'PENDING'
                                ? 'ready'
                                : '',
                              functionCovers > 0 &&
                              row.quantity < functionCovers
                                ? 'attention'
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' ')
                          }
                          key={row.id}
                        >
                          <div className="ep-menu-vendor-card-top">
                            <div>
                              <span>{category}</span>
                              <b>{row.requirement}</b>
                              <small>
                                {row.assignedTo ||
                                  'Vendor not assigned'}
                              </small>
                            </div>

                            <strong>
                              {currency(
                                row.quantity *
                                  row.rate,
                              )}
                            </strong>
                          </div>

                          <div className="ep-menu-dishes">
                            {dishes.length ? (
                              dishes.map((dish) => (
                                <span key={dish.id}>
                                  {dish.name}
                                </span>
                              ))
                            ) : (
                              <span>
                                {row.detail || 'No dish detail'}
                              </span>
                            )}
                          </div>

                          <div className="ep-menu-vendor-meta">
                            <span>
                              Function Covers
                              <b>{functionCovers}</b>
                            </span>
                            <span>
                              Vendor Covers
                              <b>{row.quantity}</b>
                            </span>
                            <span
                              className={
                                variance < 0
                                  ? 'warn'
                                  : ''
                              }
                            >
                              Variance
                              <b>
                                {variance > 0
                                  ? `+${variance}`
                                  : variance}
                              </b>
                            </span>
                          </div>

                          <div className="ep-menu-cover-editor">
                            <button
                              type="button"
                              disabled={row.quantity <= 1}
                              onClick={() =>
                                setMenuVendorCovers(
                                  row,
                                  row.quantity - 1,
                                )
                              }
                            >
                              −
                            </button>

                            <label>
                              <span>Covers</span>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={row.quantity}
                                onChange={(event) =>
                                  setMenuVendorCovers(
                                    row,
                                    Number(
                                      event.target.value,
                                    ),
                                  )
                                }
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() =>
                                setMenuVendorCovers(
                                  row,
                                  row.quantity + 1,
                                )
                              }
                            >
                              +
                            </button>
                          </div>

                          {functionCovers > 0 ? (
                            <button
                              className="ep-menu-use-covers"
                              type="button"
                              onClick={() =>
                                useFunctionCovers(
                                  row,
                                )
                              }
                            >
                              Use Function Covers {functionCovers}
                            </button>
                          ) : null}

                          <div className="ep-menu-vendor-card-footer">
                            <span className={row.status.toLowerCase()}>
                              {row.status}
                            </span>

                            <small>
                              {row.deliveryTime
                                ? `Setup ${row.deliveryTime.replace('T', ' ')}`
                                : 'Setup/reporting time not set'}
                            </small>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="ep-empty">
                    No menu categories found for this function. Select the function menu first.
                  </div>
                )}
              </section>
            ) : null}

            {tab === 'MANPOWER' ? (
              <section className="ep-manpower-agency-control">
                <div className="ep-manpower-agency-head">
                  <div>
                    <b>Manpower Agency Planning</b>
                    <span>
                      Staffing roles come from your saved Manpower plan. No automatic role selection is added here—only agency assignment and execution quantities for this function.
                    </span>
                  </div>

                  <div className="ep-manpower-agency-head-actions">
                    <Link
                      className="ep-button"
                      href="/app/team"
                    >
                      Open Manpower
                    </Link>

                    <Link
                      className="ep-button"
                      href="/app/vendors"
                    >
                      Agencies
                    </Link>
                  </div>
                </div>

                <div className="ep-manpower-agency-summary">
                  <article>
                    <span>Total People</span>
                    <b>{manpowerAgencySummary.totalPeople}</b>
                    <small>{manpowerAgencyRows.length} role{manpowerAgencyRows.length === 1 ? '' : 's'}</small>
                  </article>
                  <article>
                    <span>Assigned People</span>
                    <b>{manpowerAgencySummary.assignedPeople}</b>
                    <small>{manpowerAgencySummary.assignedRoles}/{manpowerAgencyRows.length} roles assigned</small>
                  </article>
                  <article>
                    <span>Reporting Ready</span>
                    <b>{manpowerAgencySummary.withReportingTime}/{manpowerAgencyRows.length}</b>
                    <small>Reporting time entered</small>
                  </article>
                  <article>
                    <span>Confirmed Roles</span>
                    <b>{manpowerAgencySummary.confirmedRoles}</b>
                    <small>{manpowerAgencySummary.readiness}% readiness</small>
                  </article>
                  <article>
                    <span>Agency Labor Cost</span>
                    <b>{currency(manpowerAgencySummary.totalCost)}</b>
                    <small>People × role rate</small>
                  </article>
                </div>

                {manpowerAgencyGroups.length ? (
                  <div className="ep-manpower-department-list">
                    {manpowerAgencyGroups.map((group) => {
                      const departmentPeople =
                        group.rows.reduce(
                          (sum, row) =>
                            sum +
                            Math.max(
                              0,
                              Number(
                                row.quantity,
                              ) || 0,
                            ),
                          0,
                        );

                      const departmentCost =
                        group.rows.reduce(
                          (sum, row) =>
                            sum +
                            Math.max(
                              0,
                              Number(
                                row.quantity,
                              ) || 0,
                            ) *
                              Math.max(
                                0,
                                Number(
                                  row.rate,
                                ) || 0,
                              ),
                          0,
                        );

                      return (
                        <section
                          className="ep-manpower-department"
                          key={group.department}
                        >
                          <div className="ep-manpower-department-head">
                            <div>
                              <b>{group.department}</b>
                              <span>
                                {group.rows.length} role{group.rows.length === 1 ? '' : 's'}
                              </span>
                            </div>

                            <div className="ep-manpower-department-summary">
                              <span>
                                People <b>{departmentPeople}</b>
                              </span>
                              <span>
                                Cost <b>{currency(departmentCost)}</b>
                              </span>
                            </div>
                          </div>

                          <div className="ep-manpower-role-grid">
                            {group.rows.map((row) => {
                              const required =
                                requiredManpowerQty(
                                  row,
                                );

                              const variance =
                                row.quantity -
                                required;

                              return (
                                <article
                                  className={
                                    [
                                      'ep-manpower-role-card',
                                      row.assignedTo.trim()
                                        ? 'assigned'
                                        : '',
                                      row.status !== 'PENDING'
                                        ? 'ready'
                                        : '',
                                      required > 0 &&
                                      row.quantity < required
                                        ? 'attention'
                                        : '',
                                    ]
                                      .filter(Boolean)
                                      .join(' ')
                                  }
                                  key={row.id}
                                >
                                  <div className="ep-manpower-role-title">
                                    <div>
                                      <span>
                                        {group.department}
                                      </span>
                                      <b>
                                        {row.requirement}
                                      </b>
                                      <small>
                                        {row.assignedTo ||
                                          'Agency not assigned'}
                                      </small>
                                    </div>

                                    <strong>
                                      {currency(
                                        row.quantity *
                                          row.rate,
                                      )}
                                    </strong>
                                  </div>

                                  <div className="ep-manpower-role-meta">
                                    <span>
                                      Required
                                      <b>{required}</b>
                                    </span>
                                    <span>
                                      Selected
                                      <b>{row.quantity}</b>
                                    </span>
                                    <span
                                      className={
                                        variance < 0
                                          ? 'warn'
                                          : ''
                                      }
                                    >
                                      Variance
                                      <b>
                                        {variance > 0
                                          ? `+${variance}`
                                          : variance}
                                      </b>
                                    </span>
                                  </div>

                                  <div className="ep-manpower-qty-editor">
                                    <button
                                      type="button"
                                      disabled={row.quantity <= 1}
                                      onClick={() =>
                                        setManpowerAgencyQuantity(
                                          row,
                                          row.quantity - 1,
                                        )
                                      }
                                    >
                                      −
                                    </button>

                                    <label>
                                      <span>People</span>
                                      <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={row.quantity}
                                        onChange={(event) =>
                                          setManpowerAgencyQuantity(
                                            row,
                                            Number(
                                              event.target.value,
                                            ),
                                          )
                                        }
                                      />
                                    </label>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setManpowerAgencyQuantity(
                                          row,
                                          row.quantity + 1,
                                        )
                                      }
                                    >
                                      +
                                    </button>
                                  </div>

                                  {required > 0 ? (
                                    <button
                                      className="ep-manpower-use-required"
                                      type="button"
                                      onClick={() =>
                                        useRequiredManpowerQty(
                                          row,
                                        )
                                      }
                                    >
                                      Use Required {required}
                                    </button>
                                  ) : null}

                                  <div className="ep-manpower-role-footer">
                                    <span className={row.status.toLowerCase()}>
                                      {row.status}
                                    </span>

                                    <small>
                                      {row.deliveryTime
                                        ? `Reports ${row.deliveryTime.replace('T', ' ')}`
                                        : 'Reporting time not set'}
                                    </small>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                ) : (
                  <div className="ep-empty">
                    No manpower roles planned for this function. Add them on the Manpower page first.
                  </div>
                )}
              </section>
            ) : null}

            {tab === 'TRANSPORT' ? (
              <section className="ep-transport-control">
                <div className="ep-transport-control-head">
                  <div>
                    <b>Transport Control</b>
                    <span>
                      Plan food, equipment, staff and extra trips separately for this function. Set vehicle/trip count, partner, rate, dispatch and return timing.
                    </span>
                  </div>

                  <Link
                    className="ep-button"
                    href="/app/vendors"
                  >
                    Transport Vendors
                  </Link>
                </div>

                <div className="ep-transport-summary">
                  <article>
                    <span>Trips / Vehicles</span>
                    <b>{transportSummary.totalTrips}</b>
                    <small>{transportRows.length} transport line{transportRows.length === 1 ? '' : 's'}</small>
                  </article>
                  <article>
                    <span>Assigned</span>
                    <b>{transportSummary.assigned}/{transportRows.length}</b>
                    <small>In-house or vendor assigned</small>
                  </article>
                  <article>
                    <span>Timing Ready</span>
                    <b>{transportSummary.withTiming}/{transportRows.length}</b>
                    <small>Dispatch/reporting time entered</small>
                  </article>
                  <article>
                    <span>Confirmed</span>
                    <b>{transportSummary.confirmed}</b>
                    <small>{transportSummary.readiness}% transport readiness</small>
                  </article>
                  <article>
                    <span>Transport Cost</span>
                    <b>{currency(transportSummary.totalCost)}</b>
                    <small>Quantity × rate</small>
                  </article>
                </div>

                <div className="ep-transport-presets">
                  {TRANSPORT_PRESETS.map((preset) => {
                    const rows =
                      transportRows.filter(
                        (row) =>
                          transportPresetKey(
                            row,
                          ) === preset.key,
                      );

                    const quantity =
                      rows.reduce(
                        (sum, row) =>
                          sum +
                          Math.max(
                            0,
                            Number(
                              row.quantity,
                            ) || 0,
                          ),
                        0,
                      );

                    return (
                      <button
                        key={preset.key}
                        type="button"
                        className={
                          quantity > 0
                            ? 'ep-transport-preset active'
                            : 'ep-transport-preset'
                        }
                        onClick={() =>
                          addTransportPreset(
                            preset,
                          )
                        }
                      >
                        <span>{preset.label}</span>
                        <small>{preset.detail}</small>
                        <b>
                          {quantity > 0
                            ? `${quantity} trip${quantity === 1 ? '' : 's'}`
                            : '+ Add'}
                        </b>
                      </button>
                    );
                  })}
                </div>

                {transportRows.length ? (
                  <div className="ep-transport-list">
                    {transportRows.map((row) => (
                      <article
                        className={
                          [
                            'ep-transport-card',
                            row.status !== 'PENDING'
                              ? 'ready'
                              : '',
                            !row.assignedTo.trim()
                              ? 'attention'
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' ')
                        }
                        key={row.id}
                      >
                        <div className="ep-transport-card-main">
                          <div>
                            <span>
                              {TRANSPORT_PRESETS.find(
                                (preset) =>
                                  preset.key ===
                                  transportPresetKey(row),
                              )?.label || 'Transport'}
                            </span>
                            <b>{row.requirement}</b>
                            <small>{row.detail || 'Event transport movement'}</small>
                          </div>

                          <strong>
                            {currency(
                              row.quantity *
                                row.rate,
                            )}
                          </strong>
                        </div>

                        <div className="ep-transport-card-grid">
                          <div className="ep-transport-qty-editor">
                            <button
                              type="button"
                              disabled={row.quantity <= 1}
                              onClick={() =>
                                setTransportQuantity(
                                  row,
                                  row.quantity - 1,
                                )
                              }
                            >
                              −
                            </button>

                            <label>
                              <span>Trips</span>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={row.quantity}
                                onChange={(event) =>
                                  setTransportQuantity(
                                    row,
                                    Number(
                                      event.target.value,
                                    ),
                                  )
                                }
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() =>
                                setTransportQuantity(
                                  row,
                                  row.quantity + 1,
                                )
                              }
                            >
                              +
                            </button>
                          </div>

                          <div className="ep-transport-card-meta">
                            <span>
                              Assigned
                              <b>
                                {row.assignedTo || 'Not assigned'}
                              </b>
                            </span>
                            <span>
                              Rate
                              <b>{currency(row.rate)} / {row.unit || 'trip'}</b>
                            </span>
                            <span>
                              Dispatch
                              <b>
                                {row.deliveryTime
                                  ? row.deliveryTime.replace('T', ' ')
                                  : 'Not set'}
                              </b>
                            </span>
                            <span>
                              Return
                              <b>
                                {row.pickupTime
                                  ? row.pickupTime.replace('T', ' ')
                                  : 'Not set'}
                              </b>
                            </span>
                          </div>
                        </div>

                        <div className="ep-transport-card-footer">
                          <span className={row.status.toLowerCase()}>
                            {row.status.replace(/_/g, ' ')}
                          </span>

                          <small>
                            Use the detailed row below to edit vendor, rate, timing and status.
                          </small>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="ep-empty">
                    No transport planned yet. Add a transport type above.
                  </div>
                )}
              </section>
            ) : null}

            {visibleRows.length ? (
              <div className="ep-table-wrap">
                <table className="ep-table">
                  <thead>
                    <tr>
                      <th>Photo</th>
                      <th>Requirement</th>
                      <th>Qty</th>
                      <th>Assign To</th>
                      <th>Type</th>
                      <th>Rate</th>
                      <th>Total</th>
                      <th>Delivery / Reporting</th>
                      <th>Pickup / Return</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {visibleRows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <div className="ep-assignment-photo">
                            {assignmentPhoto(row) ? (
                              <img
                                src={assignmentPhoto(row)}
                                alt={row.requirement}
                              />
                            ) : (
                              <div className="ep-assignment-photo-fallback">
                                <b>
                                  {row.requirement
                                    .slice(0, 2)
                                    .toUpperCase() || '—'}
                                </b>
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <input
                            className="ep-field"
                            value={row.requirement}
                            onChange={(event) =>
                              updateRow(row.id, {
                                requirement:
                                  event.target.value,
                              })
                            }
                            aria-label="Requirement"
                          />
                          <textarea
                            className="ep-field"
                            value={row.detail}
                            onChange={(event) =>
                              updateRow(row.id, {
                                detail:
                                  event.target.value,
                              })
                            }
                            aria-label="Requirement details"
                          />
                        </td>

                        <td>
                          <div style={{
                            display: 'flex',
                            gap: 4,
                          }}>
                            <input
                              className="ep-field ep-num"
                              type="number"
                              min="0"
                              value={row.quantity}
                              onChange={(event) =>
                                updateRow(row.id, {
                                  quantity:
                                    Math.max(
                                      0,
                                      Number(event.target.value) || 0,
                                    ),
                                })
                              }
                              aria-label="Quantity"
                            />
                            <input
                              className="ep-field ep-num"
                              value={row.unit}
                              onChange={(event) =>
                                updateRow(row.id, {
                                  unit:
                                    event.target.value,
                                })
                              }
                              aria-label="Unit"
                            />
                          </div>
                        </td>

                        <td>
                          <select
                            className="ep-field"
                            value={
                              row.partnerType === 'IN_HOUSE'
                                ? '__in_house'
                                : row.partnerId || ''
                            }
                            onChange={(event) =>
                              assignPartner(
                                row,
                                event.target.value,
                              )
                            }
                            aria-label="Choose saved partner"
                          >
                            <option value="">
                              Choose saved partner
                            </option>
                            <option value="__in_house">
                              In-house
                            </option>
                            {row.kind === 'GROCERY' &&
                            vendors.some(
                              (vendor) =>
                                vendor.active &&
                                vendorMatchesGroceryGroup(
                                  vendor,
                                  row,
                                ),
                            ) ? (
                              <>
                                <optgroup label="Matching supplier category">
                                  {vendors
                                    .filter(
                                      (vendor) =>
                                        vendor.active &&
                                        vendorMatchesGroceryGroup(
                                          vendor,
                                          row,
                                        ),
                                    )
                                    .map((vendor) => (
                                      <option
                                        key={vendor.id}
                                        value={vendor.id}
                                      >
                                        {vendor.name} · {vendor.category || vendor.type}
                                      </option>
                                    ))}
                                </optgroup>

                                <optgroup label="Other active partners">
                                  {vendors
                                    .filter(
                                      (vendor) =>
                                        vendor.active &&
                                        !vendorMatchesGroceryGroup(
                                          vendor,
                                          row,
                                        ),
                                    )
                                    .map((vendor) => (
                                      <option
                                        key={vendor.id}
                                        value={vendor.id}
                                      >
                                        {vendor.name} · {vendor.category || vendor.type}
                                      </option>
                                    ))}
                                </optgroup>
                              </>
                            ) : row.kind === 'MENU' &&
                              vendors.some(
                                (vendor) =>
                                  vendor.active &&
                                  vendorMatchesMenuRow(
                                    vendor,
                                    row,
                                  ),
                              ) ? (
                              <>
                                <optgroup label="Matching food vendors">
                                  {vendors
                                    .filter(
                                      (vendor) =>
                                        vendor.active &&
                                        vendorMatchesMenuRow(
                                          vendor,
                                          row,
                                        ),
                                    )
                                    .map((vendor) => (
                                      <option
                                        key={vendor.id}
                                        value={vendor.id}
                                      >
                                        {vendor.name} · {vendor.category || vendor.type}
                                      </option>
                                    ))}
                                </optgroup>

                                <optgroup label="Other active partners">
                                  {vendors
                                    .filter(
                                      (vendor) =>
                                        vendor.active &&
                                        !vendorMatchesMenuRow(
                                          vendor,
                                          row,
                                        ),
                                    )
                                    .map((vendor) => (
                                      <option
                                        key={vendor.id}
                                        value={vendor.id}
                                      >
                                        {vendor.name} · {vendor.category || vendor.type}
                                      </option>
                                    ))}
                                </optgroup>
                              </>
                            ) : row.kind === 'MANPOWER' &&
                              vendors.some(
                                (vendor) =>
                                  vendor.active &&
                                  vendorMatchesManpowerAgency(
                                    vendor,
                                  ),
                              ) ? (
                              <>
                                <optgroup label="Manpower agencies">
                                  {vendors
                                    .filter(
                                      (vendor) =>
                                        vendor.active &&
                                        vendorMatchesManpowerAgency(
                                          vendor,
                                        ),
                                    )
                                    .map((vendor) => (
                                      <option
                                        key={vendor.id}
                                        value={vendor.id}
                                      >
                                        {vendor.name} · {vendor.category || vendor.type}
                                      </option>
                                    ))}
                                </optgroup>

                                <optgroup label="Other active partners">
                                  {vendors
                                    .filter(
                                      (vendor) =>
                                        vendor.active &&
                                        !vendorMatchesManpowerAgency(
                                          vendor,
                                        ),
                                    )
                                    .map((vendor) => (
                                      <option
                                        key={vendor.id}
                                        value={vendor.id}
                                      >
                                        {vendor.name} · {vendor.category || vendor.type}
                                      </option>
                                    ))}
                                </optgroup>
                              </>
                            ) : row.kind === 'TRANSPORT' &&
                              vendors.some(
                                (vendor) =>
                                  vendor.active &&
                                  vendorMatchesTransport(
                                    vendor,
                                  ),
                              ) ? (
                              <>
                                <optgroup label="Transport vendors">
                                  {vendors
                                    .filter(
                                      (vendor) =>
                                        vendor.active &&
                                        vendorMatchesTransport(
                                          vendor,
                                        ),
                                    )
                                    .map((vendor) => (
                                      <option
                                        key={vendor.id}
                                        value={vendor.id}
                                      >
                                        {vendor.name} · {vendor.category || vendor.type}
                                      </option>
                                    ))}
                                </optgroup>

                                <optgroup label="Other active partners">
                                  {vendors
                                    .filter(
                                      (vendor) =>
                                        vendor.active &&
                                        !vendorMatchesTransport(
                                          vendor,
                                        ),
                                    )
                                    .map((vendor) => (
                                      <option
                                        key={vendor.id}
                                        value={vendor.id}
                                      >
                                        {vendor.name} · {vendor.category || vendor.type}
                                      </option>
                                    ))}
                                </optgroup>
                              </>
                            ) : (
                              vendors
                                .filter(
                                  (vendor) =>
                                    vendor.active,
                                )
                                .map((vendor) => (
                                  <option
                                    key={vendor.id}
                                    value={vendor.id}
                                  >
                                    {vendor.name} · {vendor.type}
                                  </option>
                                ))
                            )}
                          </select>
                          <input
                            className="ep-field"
                            value={row.assignedTo}
                            placeholder="Or type partner manually"
                            onChange={(event) =>
                              updateRow(row.id, {
                                partnerId: '',
                                assignedTo:
                                  event.target.value,
                              })
                            }
                            aria-label="Assigned partner name"
                          />
                        </td>

                        <td>
                          <select
                            className="ep-field"
                            value={row.partnerType}
                            onChange={(event) =>
                              updateRow(row.id, {
                                partnerType:
                                  event.target.value as PartnerType,
                              })
                            }
                          >
                            <option value="IN_HOUSE">
                              In-house
                            </option>
                            <option value="VENDOR">
                              Vendor
                            </option>
                            <option value="AGENCY">
                              Agency
                            </option>
                          </select>
                        </td>

                        <td>
                          <input
                            className="ep-field ep-rate"
                            type="number"
                            min="0"
                            value={row.rate}
                            onChange={(event) =>
                              updateRow(row.id, {
                                rate:
                                  Math.max(
                                    0,
                                    Number(event.target.value) || 0,
                                  ),
                              })
                            }
                            aria-label="Rate"
                          />
                        </td>

                        <td className="ep-total">
                          {currency(
                            row.quantity * row.rate,
                          )}
                        </td>

                        <td>
                          <input
                            className="ep-field"
                            type="datetime-local"
                            value={row.deliveryTime}
                            onChange={(event) =>
                              updateRow(row.id, {
                                deliveryTime:
                                  event.target.value,
                              })
                            }
                            aria-label="Delivery or reporting time"
                          />
                        </td>

                        <td>
                          <input
                            className="ep-field"
                            type="datetime-local"
                            value={row.pickupTime || ''}
                            onChange={(event) =>
                              updateRow(row.id, {
                                pickupTime:
                                  event.target.value,
                              })
                            }
                            aria-label="Pickup or return time"
                          />
                        </td>

                        <td>
                          <select
                            className="ep-field"
                            value={row.status}
                            onChange={(event) =>
                              updateRow(row.id, {
                                status:
                                  event.target.value as AssignmentStatus,
                              })
                            }
                          >
                            <option value="PENDING">
                              Pending
                            </option>
                            <option value="CONFIRMED">
                              Confirmed
                            </option>
                            <option value="DELIVERED">
                              Delivered
                            </option>
                            <option value="CLOSED">
                              Closed
                            </option>
                          </select>
                        </td>

                        <td>
                          <button
                            className="ep-delete"
                            type="button"
                            onClick={() =>
                              removeRow(row.id)
                            }
                            aria-label="Remove requirement"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="ep-empty">
                No requirements in this section yet.
              </div>
            )}

            <footer className="ep-table-actions">
              <span className="ep-hint">
                {tab === 'MENU'
                  ? 'Menu categories come from the selected function menu. Matching food vendors are shown first; covers and vendor rates remain editable.'
                  : tab === 'GROCERY'
                    ? 'Grocery suppliers are separated into Grocery, Dairy, and Vegetables & Fruits. Matching vendor categories are shown first.'
                    : tab === 'MANPOWER'
                      ? 'Roles come from the saved manpower plan. Agencies are shown first, and manual Event Planning quantity changes stay under your control.'
                      : tab === 'TRANSPORT'
                        ? 'Transport is separated into food/kitchen, equipment/material, staff and additional trips. Transport vendors are shown first.'
                        : 'Suggestions come from the current menu, manpower and disposable data. Saved partners can auto-fill rates, and edits sync to PostgreSQL.'}
              </span>

              <button
                className="ep-button primary"
                type="button"
                onClick={addRequirement}
              >
                + Add Requirement
              </button>
            </footer>
          </section>

          <aside className="ep-side">
            <EventFilePanel key={work.costingId} work={work} disabled={eventLoading} functions={functions.map(fn => ({ ...fn, rows: (plan[fn.key] || seedRows(fn, work)).map(row => { const vendor = vendors.find(v => v.id === row.partnerId); return { ...row, contactDetails: vendor ? [vendor.contactPerson, vendor.phone, vendor.city].filter(Boolean).join(' / ') : '' }; }) }))} />
            <section className="ep-side-card">
              <h3>Function Readiness</h3>
              <div className="ep-progress">
                {TABS.map((item) => {
                  const rows = currentRows.filter(
                    (row) => row.kind === item.kind,
                  );
                  const score =
                    operationalReadiness(
                      rows,
                    );

                  return (
                    <button
                      type="button"
                      className="ep-progress-row ep-progress-button"
                      key={item.kind}
                      onClick={() =>
                        setTab(
                          item.kind,
                        )
                      }
                    >
                      <span>{item.label}</span>
                      <div className="ep-progress-track">
                        <div
                          className={
                            score >= 80
                              ? 'ep-progress-fill'
                              : 'ep-progress-fill warn'
                          }
                          style={{
                            width: `${score}%`,
                          }}
                        />
                      </div>
                      <b>{score}%</b>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="ep-side-card">
              <h3>Pending Attention</h3>
              <div className="ep-pending">
                {currentFunctionBlockers
                  .slice(0, 9)
                  .map((item) => (
                    <button
                      type="button"
                      className={
                        item.severity === 'BLOCKED'
                          ? 'ep-pending-row ep-pending-button blocked'
                          : 'ep-pending-row ep-pending-button'
                      }
                      key={item.key}
                      onClick={() =>
                        setTab(
                          item.kind,
                        )
                      }
                    >
                      <b>{item.label}</b>
                      <span>{item.detail}</span>
                    </button>
                  ))}

                {!currentFunctionBlockers.length ? (
                  <div className="ep-hint">
                    No open execution issues for this function.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="ep-side-card">
              <h3>Assignment Cost</h3>
              <div className="ep-costs">
                {TABS.map((item) => {
                  const total = currentRows
                    .filter(
                      (row) =>
                        row.kind === item.kind,
                    )
                    .reduce(
                      (sum, row) =>
                        sum +
                        row.quantity *
                          row.rate,
                      0,
                    );

                  return (
                    <div
                      className="ep-cost-row"
                      key={item.kind}
                    >
                      <span>{item.label}</span>
                      <b>{currency(total)}</b>
                    </div>
                  );
                })}

                <div
                  className="ep-cost-row"
                  style={{
                    marginTop: 5,
                    paddingTop: 9,
                    borderTop:
                      '1px solid #29313b',
                  }}
                >
                  <span>Function total</span>
                  <b>
                    {currency(
                      currentRows.reduce(
                        (sum, row) =>
                          sum +
                          row.quantity *
                            row.rate,
                        0,
                      ),
                    )}
                  </b>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
