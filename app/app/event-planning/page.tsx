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
      rows.push({
        ...newRow(
          'DISPOSABLE',
          item.name,
          'Event disposable requirement',
          Number(item.quantity) || 0,
          item.unit || 'pcs',
          Number(item.unitCost) || 0,
        ),
        photoUrl:
          item.photoUrl,
      });
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

  const [equipmentQuery, setEquipmentQuery] = useState('');
  const selectedEquipmentRows = useMemo(
    () => currentRows.filter((row) => row.kind === 'EQUIPMENT'),
    [currentRows],
  );

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

  const visibleEquipmentGroups = useMemo(() => {
    const query = normalized(equipmentQuery);
    return equipmentCategoryGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => !query || normalized(`${item.name} ${item.category} ${item.capacity} ${item.vendorName}`).includes(query)),
      }))
      .filter((group) => group.items.length > 0);
  }, [equipmentCategoryGroups, equipmentQuery]);

  const [crockeryQuery, setCrockeryQuery] = useState('');
  const selectedCrockeryRows = useMemo(
    () => currentRows.filter((row) => row.kind === 'CROCKERY'),
    [currentRows],
  );

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

  const dressRows = useMemo(
    () => currentRows.filter((row) => row.kind === 'DRESS'),
    [currentRows],
  );

  const visibleCrockeryGroups = useMemo(() => {
    const query = normalized(crockeryQuery);
    return crockeryCategoryGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => !query || normalized(`${item.name} ${item.category} ${item.sizeType} ${item.vendorName}`).includes(query)),
      }))
      .filter((group) => group.items.length > 0);
  }, [crockeryCategoryGroups, crockeryQuery]);

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

  const disposableRows = useMemo(
    () => currentRows.filter((row) => row.kind === 'DISPOSABLE'),
    [currentRows],
  );

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
          .ep-grocery-supplier-panel{display:grid;gap:18px;padding:18px;border-bottom:1px solid #252c35;background:#0c1117}
          .ep-grocery-supplier-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
          .ep-grocery-supplier-head b,.ep-grocery-supplier-head span{display:block}
          .ep-grocery-supplier-head b{color:#edf4fb;font-size:16px}
          .ep-grocery-supplier-head span{margin-top:6px;max-width:650px;color:#94a3b8;font-size:12px;line-height:1.6}
          .ep-grocery-category-list{display:grid;gap:18px}
          .ep-grocery-category{min-width:0;overflow:hidden;border:1px solid #293440;border-radius:16px;background:#0f151c}
          .ep-grocery-category-head{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:16px;border-bottom:1px solid #293440}
          .ep-grocery-category-head b,.ep-grocery-category-head small{display:block}
          .ep-grocery-category-head b{color:#edf4fb;font-size:15px}.ep-grocery-category-head small{margin-top:5px;max-width:600px;color:#94a3b8;font-size:11px;line-height:1.5;overflow-wrap:anywhere}
          .ep-grocery-category-meta{display:flex;gap:8px;flex-wrap:wrap}
          .ep-grocery-category-meta span{padding:7px 10px;border-radius:999px;color:#94a3b8;background:#18222e;font-size:11px}
          .ep-grocery-category-meta b{display:inline;color:#bfdbfe;font-size:11px}
          .ep-grocery-category-meta .warn,.ep-grocery-category-meta .warn b{color:#fbbf77}
          .ep-grocery-category-progress{display:flex;align-items:center;gap:12px;padding:12px 16px;color:#94a3b8;font-size:11px}
          .ep-grocery-category-progress>span{flex:1;height:5px;background:#1a232d;overflow:hidden;border-radius:999px}.ep-grocery-category-progress i{display:block;height:100%;background:#63d7a0;border-radius:inherit}
          .ep-grocery-supplier-panel .ep-menu-function-context b{font-size:16px}.ep-grocery-supplier-panel .ep-menu-function-context span,.ep-grocery-supplier-panel .ep-menu-function-context small,.ep-grocery-supplier-panel .ep-menu-function-chips span{font-size:11px}.ep-grocery-supplier-panel .ep-menu-function-chips b{font-size:16px}
          .ep-grocery-row-card .ep-menu-field-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}
          .ep-grocery-order-photo{width:100%;height:140px;object-fit:contain;padding:8px;border-radius:10px;background:#18202a}
          .ep-grocery-supplier-panel .ep-button{min-height:44px;font-size:12px}.ep-grocery-supplier-panel .ep-empty{font-size:12px;line-height:1.6}
          @media(max-width:720px){.ep-grocery-supplier-panel{padding:12px}.ep-grocery-supplier-head{flex-direction:column}.ep-grocery-supplier-head>.ep-button{width:100%;justify-content:center}.ep-grocery-category-progress{flex-wrap:wrap}.ep-grocery-row-card .ep-menu-field-grid.three{grid-template-columns:1fr}}

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
          .ep-equipment-master{display:grid;gap:18px;padding:18px;border-bottom:1px solid #252c35;background:#0c1117}
          .ep-equipment-master-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
          .ep-equipment-master-head b,.ep-equipment-master-head span{display:block}
          .ep-equipment-master-head b{color:#edf4fb;font-size:16px}
          .ep-equipment-master-head span{margin-top:6px;max-width:650px;color:#94a3b8;font-size:12px;line-height:1.6}
          .ep-equipment-master-head-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
          .ep-equipment-master-head-actions>span{margin:0;color:#94a3b8;font-size:11px}
          .ep-equipment-category-list{display:grid;gap:16px}
          .ep-equipment-category{overflow:hidden;border:1px solid #293440;border-radius:16px;background:#0f151c}
          .ep-equipment-category-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:16px;border-bottom:1px solid #293440}
          .ep-equipment-category-head>div:first-child b,.ep-equipment-category-head>div:first-child span{display:block}
          .ep-equipment-category-head>div:first-child b{color:#edf4fb;font-size:14px}
          .ep-equipment-category-head>div:first-child span{margin-top:4px;color:#94a3b8;font-size:11px}
          .ep-equipment-category-summary{display:flex;gap:8px;flex-wrap:wrap}
          .ep-equipment-category-summary span{padding:7px 10px;border-radius:999px;color:#94a3b8;background:#18222e;font-size:11px}
          .ep-equipment-category-summary b{color:#bfdbfe}.ep-equipment-category-summary .warn,.ep-equipment-category-summary .warn b{color:#fbbf77}
          .ep-equipment-master-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:14px;padding:14px}
          .ep-equipment-master-card{overflow:hidden;min-width:0;border:1px solid #2b3440;border-radius:14px;background:#111820}
          .ep-equipment-master-card.selected{border-color:#3b82b9;box-shadow:inset 0 0 0 1px #1c3b59}.ep-equipment-master-card.over{border-color:#a57a40}
          .ep-equipment-master-card.inactive{border-style:dashed}
          .ep-equipment-master-photo{position:relative;aspect-ratio:16/9;overflow:hidden;background:#18202a}
          .ep-equipment-master-photo img{width:100%;height:100%;display:block;object-fit:contain;padding:8px}
          .ep-equipment-master-status{position:absolute;top:10px;right:10px;padding:6px 9px;border-radius:999px;color:#e2e8f0;background:rgba(8,13,19,.9);font-size:11px;font-weight:800}
          .ep-equipment-master-body{display:grid;gap:12px;padding:16px}
          .ep-equipment-master-title{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
          .ep-equipment-master-title b,.ep-equipment-master-title span{display:block}
          .ep-equipment-master-title b{color:#edf4fb;font-size:15px;overflow-wrap:anywhere}.ep-equipment-master-title span{margin-top:5px;color:#94a3b8;font-size:11px;line-height:1.5}
          .ep-equipment-master-title>strong{color:#d3deea;font-size:14px;white-space:nowrap}
          .ep-equipment-master-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
          .ep-equipment-master-meta>span{padding:10px;border-radius:9px;color:#94a3b8;background:#19232f;font-size:10px}
          .ep-equipment-master-meta>span b{display:block;margin-top:4px;color:#edf4fb;font-size:16px}.ep-equipment-master-meta>span.warn,.ep-equipment-master-meta>span.warn b{color:#fbbf77}
          .ep-equipment-tags{display:flex;gap:6px;flex-wrap:wrap}.ep-equipment-tags span{padding:6px 8px;border-radius:8px;color:#aabdd2;background:#172436;font-size:11px;overflow-wrap:anywhere}
          .ep-equipment-qty-editor{display:grid;grid-template-columns:44px minmax(0,1fr) 44px;gap:8px;align-items:end}
          .ep-equipment-qty-editor>button{height:44px;border:1px solid #445366;border-radius:9px;color:#e2e8f0;background:#19232f;font-size:20px;cursor:pointer}.ep-equipment-qty-editor>button:disabled{opacity:.4;cursor:not-allowed}
          .ep-equipment-qty-editor label{display:grid;gap:6px}.ep-equipment-qty-editor label span{color:#94a3b8;font-size:11px;font-weight:800}
          .ep-equipment-qty-editor input{width:100%;height:44px;border:1px solid #445366;border-radius:9px;color:#edf4fb;background:#151c25;font:inherit;font-size:16px;text-align:center}
          .ep-equipment-event-qty{width:100%;min-height:44px;border:1px solid #315d8e;border-radius:9px;color:#bfdbfe;background:#152539;font:inherit;font-size:12px;cursor:pointer}.ep-equipment-event-qty:disabled{opacity:.4;cursor:not-allowed}
          .ep-equipment-note{display:block;color:#94a3b8;font-size:11px;line-height:1.5}.ep-equipment-note.warn{color:#fbbf77}
          .ep-equipment-master input:focus-visible,.ep-equipment-master button:focus-visible,.ep-equipment-master a:focus-visible{outline:2px solid #93c5fd;outline-offset:3px}
          .ep-equipment-master .ep-menu-function-context b{font-size:16px}.ep-equipment-master .ep-menu-function-context span,.ep-equipment-master .ep-menu-function-context small,.ep-equipment-master .ep-menu-function-chips span{font-size:11px}.ep-equipment-master .ep-menu-function-chips b{font-size:16px}
          .ep-equipment-selected-head h2{margin:0;color:#edf4fb;font-size:16px}.ep-equipment-selected-head p{margin:6px 0 0;color:#94a3b8;font-size:12px;line-height:1.6}
          .ep-equipment-assignment-grid{padding:0}.ep-equipment-assignment-photo{width:100%;height:160px;object-fit:contain;border-radius:10px;background:#18202a;padding:8px}
          @media(max-width:720px){.ep-equipment-master{padding:12px}.ep-equipment-master-head{flex-direction:column}.ep-equipment-master-head-actions{width:100%;justify-content:space-between}.ep-equipment-master-head-actions a{min-height:44px}.ep-equipment-master-grid{grid-template-columns:1fr;padding:10px}.ep-equipment-master-body{padding:12px}}
          .ep-equipment-category-head>strong{padding:7px 10px;border-radius:999px;color:#bfdbfe;background:#18222e;font-size:11px}
          .ep-equipment-master .ep-empty{font-size:12px;line-height:1.6}
          .ep-equipment-master-head-actions .ep-button{min-height:44px;font-size:12px}

          .ep-equipment-note,.ep-equipment-inactive-note,.ep-equipment-vendor-note{display:block;color:#94a3b8;font-size:11px;line-height:1.5}.ep-equipment-note.warn,.ep-equipment-inactive-note{color:#fbbf77}
          .ep-equipment-search{display:flex;align-items:end;gap:10px;flex-wrap:wrap;padding:14px;border:1px solid #293440;border-radius:12px;background:#10171f}
          .ep-equipment-search label{display:grid;gap:6px;flex:1;min-width:180px;color:#94a3b8;font-size:12px}
          .ep-equipment-search input{width:100%;height:44px;padding:10px;border:1px solid #445366;border-radius:9px;color:#edf4fb;background:#151c25;font:inherit;font-size:14px}
          .ep-equipment-search>span{color:#94a3b8;font-size:11px;padding-bottom:14px}
          @media(max-width:720px){.ep-equipment-search label{min-width:100%}.ep-equipment-search input{font-size:16px}}

          .ep-crockery-master{display:grid;gap:18px;padding:18px;border-bottom:1px solid #252c35;background:#0c1117}
          .ep-crockery-master-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
          .ep-crockery-master-head b,.ep-crockery-master-head span{display:block}
          .ep-crockery-master-head b{color:#edf4fb;font-size:16px}
          .ep-crockery-master-head span{margin-top:6px;max-width:650px;color:#94a3b8;font-size:12px;line-height:1.6}
          .ep-crockery-master-head-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
          .ep-crockery-master-head-actions>span{margin:0;color:#94a3b8;font-size:11px}
          .ep-crockery-category-list{display:grid;gap:16px}
          .ep-crockery-category{overflow:hidden;border:1px solid #293440;border-radius:16px;background:#0f151c}
          .ep-crockery-category-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:16px;border-bottom:1px solid #293440}
          .ep-crockery-category-head>div:first-child b,.ep-crockery-category-head>div:first-child span{display:block}
          .ep-crockery-category-head>div:first-child b{color:#edf4fb;font-size:14px}
          .ep-crockery-category-head>div:first-child span{margin-top:4px;color:#94a3b8;font-size:11px}
          .ep-crockery-category-summary{display:flex;gap:8px;flex-wrap:wrap}
          .ep-crockery-category-summary span{padding:7px 10px;border-radius:999px;color:#94a3b8;background:#18222e;font-size:11px}
          .ep-crockery-category-summary b{color:#bfdbfe}.ep-crockery-category-summary .warn,.ep-crockery-category-summary .warn b{color:#fbbf77}
          .ep-crockery-master-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:14px;padding:14px}
          .ep-crockery-master-card{overflow:hidden;min-width:0;border:1px solid #2b3440;border-radius:14px;background:#111820}
          .ep-crockery-master-card.selected{border-color:#3b82b9;box-shadow:inset 0 0 0 1px #1c3b59}.ep-crockery-master-card.over{border-color:#a57a40}
          .ep-crockery-master-card.inactive{border-style:dashed}
          .ep-crockery-master-photo{position:relative;aspect-ratio:16/9;overflow:hidden;background:#18202a}
          .ep-crockery-master-photo img{width:100%;height:100%;display:block;object-fit:contain;padding:8px}
          .ep-crockery-master-status{position:absolute;top:10px;right:10px;padding:6px 9px;border-radius:999px;color:#e2e8f0;background:rgba(8,13,19,.9);font-size:11px;font-weight:800}
          .ep-crockery-master-body{display:grid;gap:12px;padding:16px}
          .ep-crockery-master-title{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
          .ep-crockery-master-title b,.ep-crockery-master-title span{display:block}
          .ep-crockery-master-title b{color:#edf4fb;font-size:15px;overflow-wrap:anywhere}.ep-crockery-master-title span{margin-top:5px;color:#94a3b8;font-size:11px;line-height:1.5}
          .ep-crockery-master-title>strong{color:#d3deea;font-size:14px;white-space:nowrap}
          .ep-crockery-master-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
          .ep-crockery-master-meta>span{padding:10px;border-radius:9px;color:#94a3b8;background:#19232f;font-size:10px}
          .ep-crockery-master-meta>span b{display:block;margin-top:4px;color:#edf4fb;font-size:16px}.ep-crockery-master-meta>span.warn,.ep-crockery-master-meta>span.warn b{color:#fbbf77}
          .ep-crockery-tags{display:flex;gap:6px;flex-wrap:wrap}.ep-crockery-tags span{padding:6px 8px;border-radius:8px;color:#aabdd2;background:#172436;font-size:11px;overflow-wrap:anywhere}
          .ep-crockery-qty-editor{display:grid;grid-template-columns:44px minmax(0,1fr) 44px;gap:8px;align-items:end}
          .ep-crockery-qty-editor>button{height:44px;border:1px solid #445366;border-radius:9px;color:#e2e8f0;background:#19232f;font-size:20px;cursor:pointer}.ep-crockery-qty-editor>button:disabled{opacity:.4;cursor:not-allowed}
          .ep-crockery-qty-editor label{display:grid;gap:6px}.ep-crockery-qty-editor label span{color:#94a3b8;font-size:11px;font-weight:800}
          .ep-crockery-qty-editor input{width:100%;height:44px;border:1px solid #445366;border-radius:9px;color:#edf4fb;background:#151c25;font:inherit;font-size:16px;text-align:center}
          .ep-crockery-event-qty{width:100%;min-height:44px;border:1px solid #315d8e;border-radius:9px;color:#bfdbfe;background:#152539;font:inherit;font-size:12px;cursor:pointer}.ep-crockery-event-qty:disabled{opacity:.4;cursor:not-allowed}
          .ep-crockery-note{display:block;color:#94a3b8;font-size:11px;line-height:1.5}.ep-crockery-note.warn{color:#fbbf77}
          .ep-crockery-master input:focus-visible,.ep-crockery-master button:focus-visible,.ep-crockery-master a:focus-visible{outline:2px solid #93c5fd;outline-offset:3px}
          .ep-crockery-master .ep-menu-function-context b{font-size:16px}.ep-crockery-master .ep-menu-function-context span,.ep-crockery-master .ep-menu-function-context small,.ep-crockery-master .ep-menu-function-chips span{font-size:11px}.ep-crockery-master .ep-menu-function-chips b{font-size:16px}
          .ep-crockery-selected-head h2{margin:0;color:#edf4fb;font-size:16px}.ep-crockery-selected-head p{margin:6px 0 0;color:#94a3b8;font-size:12px;line-height:1.6}
          .ep-crockery-assignment-grid{padding:0}.ep-crockery-assignment-photo{width:100%;height:160px;object-fit:contain;border-radius:10px;background:#18202a;padding:8px}
          @media(max-width:720px){.ep-crockery-master{padding:12px}.ep-crockery-master-head{flex-direction:column}.ep-crockery-master-head-actions{width:100%;justify-content:space-between}.ep-crockery-master-head-actions a{min-height:44px}.ep-crockery-master-grid{grid-template-columns:1fr;padding:10px}.ep-crockery-master-body{padding:12px}}
          .ep-crockery-category-head>strong{padding:7px 10px;border-radius:999px;color:#bfdbfe;background:#18222e;font-size:11px}
          .ep-crockery-master .ep-empty{font-size:12px;line-height:1.6}
          .ep-crockery-master-head-actions .ep-button{min-height:44px;font-size:12px}

          .ep-crockery-note,.ep-crockery-inactive-note,.ep-crockery-vendor-note{display:block;color:#94a3b8;font-size:11px;line-height:1.5}.ep-crockery-note.warn,.ep-crockery-inactive-note{color:#fbbf77}
          .ep-crockery-search{display:flex;align-items:end;gap:10px;flex-wrap:wrap;padding:14px;border:1px solid #293440;border-radius:12px;background:#10171f}
          .ep-crockery-search label{display:grid;gap:6px;flex:1;min-width:180px;color:#94a3b8;font-size:12px}
          .ep-crockery-search input{width:100%;height:44px;padding:10px;border:1px solid #445366;border-radius:9px;color:#edf4fb;background:#151c25;font:inherit;font-size:14px}
          .ep-crockery-search>span{color:#94a3b8;font-size:11px;padding-bottom:14px}
          @media(max-width:720px){.ep-crockery-search label{min-width:100%}.ep-crockery-search input{font-size:16px}}

          .ep-crockery-category-summary{display:flex;gap:8px;flex-wrap:wrap}.ep-crockery-category-summary>span{padding:7px 10px;border-radius:999px;color:#94a3b8;background:#18222e;font-size:11px}.ep-crockery-category-summary b{display:inline;color:#bfdbfe;font-size:11px}
          .ep-crockery-rule{display:flex;gap:6px;flex-wrap:wrap}.ep-crockery-rule span{padding:6px 8px;border-radius:8px;color:#aabdd2;background:#172436;font-size:11px}
          .ep-crockery-recommended{width:100%;min-height:44px;border:1px solid #315d8e;border-radius:9px;color:#bfdbfe;background:#152539;font:inherit;font-size:12px;cursor:pointer}.ep-crockery-recommended:disabled{opacity:.4;cursor:not-allowed}

          .ep-uniform-master{display:grid;gap:18px;padding:18px;border-bottom:1px solid #252c35;background:#0c1117}
          .ep-uniform-master-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
          .ep-uniform-master-head b,.ep-uniform-master-head span{display:block}
          .ep-uniform-master-head b{color:#edf4fb;font-size:16px}
          .ep-uniform-master-head span{margin-top:6px;max-width:650px;color:#94a3b8;font-size:12px;line-height:1.6}
          .ep-uniform-master-head-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
          .ep-uniform-master-head-actions>span{margin:0;color:#94a3b8;font-size:11px}
          .ep-uniform-role-list{display:grid;gap:16px}
          .ep-uniform-role{overflow:hidden;border:1px solid #293440;border-radius:16px;background:#0f151c}
          .ep-uniform-role-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:16px;border-bottom:1px solid #293440}
          .ep-uniform-role-head>div:first-child b,.ep-uniform-role-head>div:first-child span{display:block}
          .ep-uniform-role-head>div:first-child b{color:#edf4fb;font-size:14px}
          .ep-uniform-role-head>div:first-child span{margin-top:4px;color:#94a3b8;font-size:11px}
          .ep-uniform-role-summary{display:flex;gap:8px;flex-wrap:wrap}
          .ep-uniform-role-summary span{padding:7px 10px;border-radius:999px;color:#94a3b8;background:#18222e;font-size:11px}
          .ep-uniform-role-summary b{color:#bfdbfe}.ep-uniform-role-summary .warn,.ep-uniform-role-summary .warn b{color:#fbbf77}
          .ep-uniform-master-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:14px;padding:14px}
          .ep-uniform-master-card{overflow:hidden;min-width:0;border:1px solid #2b3440;border-radius:14px;background:#111820}
          .ep-uniform-master-card.selected{border-color:#3b82b9;box-shadow:inset 0 0 0 1px #1c3b59}.ep-uniform-master-card.over{border-color:#a57a40}
          .ep-uniform-master-card.inactive{border-style:dashed}
          .ep-uniform-master-photo{position:relative;aspect-ratio:16/9;overflow:hidden;background:#18202a}
          .ep-uniform-master-photo img{width:100%;height:100%;display:block;object-fit:contain;padding:8px}
          .ep-uniform-master-status{position:absolute;top:10px;right:10px;padding:6px 9px;border-radius:999px;color:#e2e8f0;background:rgba(8,13,19,.9);font-size:11px;font-weight:800}
          .ep-uniform-master-body{display:grid;gap:12px;padding:16px}
          .ep-uniform-master-title{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
          .ep-uniform-master-title b,.ep-uniform-master-title span{display:block}
          .ep-uniform-master-title b{color:#edf4fb;font-size:15px;overflow-wrap:anywhere}.ep-uniform-master-title span{margin-top:5px;color:#94a3b8;font-size:11px;line-height:1.5}
          .ep-uniform-master-title>strong{color:#d3deea;font-size:14px;white-space:nowrap}
          .ep-uniform-master-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
          .ep-uniform-master-meta>span{padding:10px;border-radius:9px;color:#94a3b8;background:#19232f;font-size:10px}
          .ep-uniform-master-meta>span b{display:block;margin-top:4px;color:#edf4fb;font-size:16px}.ep-uniform-master-meta>span.warn,.ep-uniform-master-meta>span.warn b{color:#fbbf77}
          .ep-uniform-tags{display:flex;gap:6px;flex-wrap:wrap}.ep-uniform-tags span{padding:6px 8px;border-radius:8px;color:#aabdd2;background:#172436;font-size:11px;overflow-wrap:anywhere}
          .ep-uniform-qty-editor{display:grid;grid-template-columns:44px minmax(0,1fr) 44px;gap:8px;align-items:end}
          .ep-uniform-qty-editor>button{height:44px;border:1px solid #445366;border-radius:9px;color:#e2e8f0;background:#19232f;font-size:20px;cursor:pointer}.ep-uniform-qty-editor>button:disabled{opacity:.4;cursor:not-allowed}
          .ep-uniform-qty-editor label{display:grid;gap:6px}.ep-uniform-qty-editor label span{color:#94a3b8;font-size:11px;font-weight:800}
          .ep-uniform-qty-editor input{width:100%;height:44px;border:1px solid #445366;border-radius:9px;color:#edf4fb;background:#151c25;font:inherit;font-size:16px;text-align:center}
          .ep-uniform-required{width:100%;min-height:44px;border:1px solid #315d8e;border-radius:9px;color:#bfdbfe;background:#152539;font:inherit;font-size:12px;cursor:pointer}.ep-uniform-required:disabled{opacity:.4;cursor:not-allowed}
          .ep-uniform-note{display:block;color:#94a3b8;font-size:11px;line-height:1.5}.ep-uniform-note.warn{color:#fbbf77}
          .ep-uniform-master input:focus-visible,.ep-uniform-master button:focus-visible,.ep-uniform-master a:focus-visible{outline:2px solid #93c5fd;outline-offset:3px}
          .ep-uniform-master .ep-menu-function-context b{font-size:16px}.ep-uniform-master .ep-menu-function-context span,.ep-uniform-master .ep-menu-function-context small,.ep-uniform-master .ep-menu-function-chips span{font-size:11px}.ep-uniform-master .ep-menu-function-chips b{font-size:16px}
          .ep-uniform-selected-head h2{margin:0;color:#edf4fb;font-size:16px}.ep-uniform-selected-head p{margin:6px 0 0;color:#94a3b8;font-size:12px;line-height:1.6}
          .ep-uniform-assignment-grid{padding:0}.ep-uniform-assignment-photo{width:100%;height:160px;object-fit:contain;border-radius:10px;background:#18202a;padding:8px}
          @media(max-width:720px){.ep-uniform-master{padding:12px}.ep-uniform-master-head{flex-direction:column}.ep-uniform-master-head-actions{width:100%;justify-content:space-between}.ep-uniform-master-head-actions a{min-height:44px}.ep-uniform-master-grid{grid-template-columns:1fr;padding:10px}.ep-uniform-master-body{padding:12px}}

          .ep-disposable-master{display:grid;gap:18px;padding:18px;border-bottom:1px solid #252c35;background:#0c1117}
          .ep-disposable-master-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
          .ep-disposable-master-head b,.ep-disposable-master-head span{display:block}
          .ep-disposable-master-head b{color:#edf4fb;font-size:16px}
          .ep-disposable-master-head span{margin-top:6px;max-width:650px;color:#94a3b8;font-size:12px;line-height:1.6}
          .ep-disposable-master-head-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
          .ep-disposable-master-head-actions>span{margin:0;color:#94a3b8;font-size:11px}
          .ep-disposable-category-list{display:grid;gap:16px}
          .ep-disposable-category{overflow:hidden;border:1px solid #293440;border-radius:16px;background:#0f151c}
          .ep-disposable-category-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:16px;border-bottom:1px solid #293440}
          .ep-disposable-category-head>div:first-child b,.ep-disposable-category-head>div:first-child span{display:block}
          .ep-disposable-category-head>div:first-child b{color:#edf4fb;font-size:14px}
          .ep-disposable-category-head>div:first-child span{margin-top:4px;color:#94a3b8;font-size:11px}
          .ep-disposable-category-summary{display:flex;gap:8px;flex-wrap:wrap}
          .ep-disposable-category-summary span{padding:7px 10px;border-radius:999px;color:#94a3b8;background:#18222e;font-size:11px}
          .ep-disposable-category-summary b{color:#bfdbfe}.ep-disposable-category-summary .warn,.ep-disposable-category-summary .warn b{color:#fbbf77}
          .ep-disposable-master-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:14px;padding:14px}
          .ep-disposable-master-card{overflow:hidden;min-width:0;border:1px solid #2b3440;border-radius:14px;background:#111820}
          .ep-disposable-master-card.selected{border-color:#3b82b9;box-shadow:inset 0 0 0 1px #1c3b59}.ep-disposable-master-card.over{border-color:#a57a40}
          .ep-disposable-master-card.inactive{border-style:dashed}
          .ep-disposable-master-photo{position:relative;aspect-ratio:16/9;overflow:hidden;background:#18202a}
          .ep-disposable-master-photo img{width:100%;height:100%;display:block;object-fit:contain;padding:8px}
          .ep-disposable-master-status{position:absolute;top:10px;right:10px;padding:6px 9px;border-radius:999px;color:#e2e8f0;background:rgba(8,13,19,.9);font-size:11px;font-weight:800}
          .ep-disposable-master-body{display:grid;gap:12px;padding:16px}
          .ep-disposable-master-title{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
          .ep-disposable-master-title b,.ep-disposable-master-title span{display:block}
          .ep-disposable-master-title b{color:#edf4fb;font-size:15px;overflow-wrap:anywhere}.ep-disposable-master-title span{margin-top:5px;color:#94a3b8;font-size:11px;line-height:1.5}
          .ep-disposable-master-title>strong{color:#d3deea;font-size:14px;white-space:nowrap}
          .ep-disposable-master-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
          .ep-disposable-master-meta>span{padding:10px;border-radius:9px;color:#94a3b8;background:#19232f;font-size:10px}
          .ep-disposable-master-meta>span b{display:block;margin-top:4px;color:#edf4fb;font-size:16px}.ep-disposable-master-meta>span.warn,.ep-disposable-master-meta>span.warn b{color:#fbbf77}
          .ep-disposable-tags{display:flex;gap:6px;flex-wrap:wrap}.ep-disposable-tags span{padding:6px 8px;border-radius:8px;color:#aabdd2;background:#172436;font-size:11px;overflow-wrap:anywhere}
          .ep-disposable-qty-editor{display:grid;grid-template-columns:44px minmax(0,1fr) 44px;gap:8px;align-items:end}
          .ep-disposable-qty-editor>button{height:44px;border:1px solid #445366;border-radius:9px;color:#e2e8f0;background:#19232f;font-size:20px;cursor:pointer}.ep-disposable-qty-editor>button:disabled{opacity:.4;cursor:not-allowed}
          .ep-disposable-qty-editor label{display:grid;gap:6px}.ep-disposable-qty-editor label span{color:#94a3b8;font-size:11px;font-weight:800}
          .ep-disposable-qty-editor input{width:100%;height:44px;border:1px solid #445366;border-radius:9px;color:#edf4fb;background:#151c25;font:inherit;font-size:16px;text-align:center}
          .ep-disposable-event-qty{width:100%;min-height:44px;border:1px solid #315d8e;border-radius:9px;color:#bfdbfe;background:#152539;font:inherit;font-size:12px;cursor:pointer}.ep-disposable-event-qty:disabled{opacity:.4;cursor:not-allowed}
          .ep-disposable-note{display:block;color:#94a3b8;font-size:11px;line-height:1.5}.ep-disposable-note.warn{color:#fbbf77}
          .ep-disposable-master input:focus-visible,.ep-disposable-master button:focus-visible,.ep-disposable-master a:focus-visible{outline:2px solid #93c5fd;outline-offset:3px}
          .ep-disposable-master .ep-menu-function-context b{font-size:16px}.ep-disposable-master .ep-menu-function-context span,.ep-disposable-master .ep-menu-function-context small,.ep-disposable-master .ep-menu-function-chips span{font-size:11px}.ep-disposable-master .ep-menu-function-chips b{font-size:16px}
          .ep-disposable-selected-head h2{margin:0;color:#edf4fb;font-size:16px}.ep-disposable-selected-head p{margin:6px 0 0;color:#94a3b8;font-size:12px;line-height:1.6}
          .ep-disposable-assignment-grid{padding:0}.ep-disposable-assignment-photo{width:100%;height:160px;object-fit:contain;border-radius:10px;background:#18202a;padding:8px}
          @media(max-width:720px){.ep-disposable-master{padding:12px}.ep-disposable-master-head{flex-direction:column}.ep-disposable-master-head-actions{width:100%;justify-content:space-between}.ep-disposable-master-head-actions a{min-height:44px}.ep-disposable-master-grid{grid-template-columns:1fr;padding:10px}.ep-disposable-master-body{padding:12px}}
          .ep-disposable-category-head>strong{padding:7px 10px;border-radius:999px;color:#bfdbfe;background:#18222e;font-size:11px}
          .ep-disposable-master .ep-empty{font-size:12px;line-height:1.6}
          .ep-disposable-master-head-actions .ep-button{min-height:44px;font-size:12px}

          .ep-transport-control{display:grid;gap:18px;padding:18px;border-bottom:1px solid #252c35;background:#0c1117}
          .ep-transport-control-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
          .ep-transport-control-head b,.ep-transport-control-head span{display:block}
          .ep-transport-control-head b{color:#edf4fb;font-size:16px}
          .ep-transport-control-head span{margin-top:6px;max-width:680px;color:#94a3b8;font-size:12px;line-height:1.6}
          .ep-transport-control-head .ep-button{min-height:44px;font-size:12px;white-space:nowrap}
          .ep-transport-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
          .ep-transport-summary article{min-width:0;padding:14px;border:1px solid #293440;border-radius:12px;background:#10171f}
          .ep-transport-summary span,.ep-transport-summary b,.ep-transport-summary small{display:block}
          .ep-transport-summary span{color:#94a3b8;font-size:11px;font-weight:800}
          .ep-transport-summary b{margin-top:7px;color:#edf4fb;font-size:21px;overflow-wrap:anywhere}
          .ep-transport-summary small{margin-top:5px;color:#94a3b8;font-size:11px;line-height:1.5}
          .ep-transport-presets{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
          .ep-transport-preset{display:grid;gap:8px;min-height:142px;padding:16px;border:1px solid #354252;border-radius:14px;background:#101720;font:inherit;text-align:left;cursor:pointer}
          .ep-transport-preset:hover{border-color:#6684a8;background:#152131}.ep-transport-preset.active{border-color:#3b82b9;background:#102034}
          .ep-transport-preset span{color:#edf4fb;font-size:14px;font-weight:800}.ep-transport-preset small{color:#94a3b8;font-size:11px;line-height:1.6}.ep-transport-preset b{align-self:end;color:#bfdbfe;font-size:12px}
          .ep-transport-assignment-grid{padding:0}.ep-transport-assignment-photo{width:100%;height:160px;object-fit:contain;border-radius:10px;background:#18202a;padding:8px}
          .ep-transport-selected-head h2{margin:0;color:#edf4fb;font-size:16px}.ep-transport-selected-head p,.ep-transport-instructions{margin:6px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;overflow-wrap:anywhere}
          .ep-transport-qty-editor{display:grid;grid-template-columns:44px minmax(0,1fr) 44px;gap:8px;align-items:end}
          .ep-transport-qty-editor>button{height:44px;border:1px solid #445366;border-radius:9px;color:#e2e8f0;background:#19232f;font-size:20px;cursor:pointer}.ep-transport-qty-editor>button:disabled{opacity:.4;cursor:not-allowed}
          .ep-transport-qty-editor label{display:grid;gap:6px}.ep-transport-qty-editor label span{color:#94a3b8;font-size:11px;font-weight:800}
          .ep-transport-qty-editor input{width:100%;min-width:0;height:44px;border:1px solid #445366;border-radius:9px;color:#edf4fb;background:#151c25;font:inherit;font-size:16px;text-align:center}
          .ep-transport-control .ep-menu-function-context b{font-size:16px}.ep-transport-control .ep-menu-function-context span,.ep-transport-control .ep-menu-function-context small,.ep-transport-control .ep-menu-function-chips span{font-size:11px}.ep-transport-control .ep-menu-function-chips b{font-size:16px}
          .ep-transport-control .ep-empty{font-size:12px;line-height:1.6}.ep-transport-control input:focus-visible,.ep-transport-control select:focus-visible,.ep-transport-control textarea:focus-visible,.ep-transport-control button:focus-visible,.ep-transport-control a:focus-visible,.ep-transport-control summary:focus-visible{outline:2px solid #93c5fd;outline-offset:3px}
          @media(max-width:1100px){.ep-transport-summary{grid-template-columns:repeat(3,minmax(0,1fr))}.ep-transport-presets{grid-template-columns:repeat(2,minmax(0,1fr))}}
          @media(max-width:720px){.ep-transport-control{padding:12px}.ep-transport-control-head{flex-direction:column}.ep-transport-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.ep-transport-summary article{padding:12px}.ep-transport-presets{grid-template-columns:1fr}.ep-transport-preset{min-height:118px}.ep-transport-control-head .ep-button{width:100%}}

          .ep-manpower-agency-control{display:grid;gap:18px;padding:18px;border-bottom:1px solid #252c35;background:#0c1117}
          .ep-manpower-agency-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
          .ep-manpower-agency-head b,.ep-manpower-agency-head span{display:block}
          .ep-manpower-agency-head b{color:#edf4fb;font-size:16px}
          .ep-manpower-agency-head span{margin-top:6px;max-width:650px;color:#94a3b8;font-size:12px;line-height:1.6}
          .ep-manpower-agency-head-actions{display:flex;gap:8px;flex-wrap:wrap}
          .ep-manpower-agency-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
          .ep-manpower-agency-summary article{padding:14px;border:1px solid #293440;border-radius:12px;background:#10171f}
          .ep-manpower-agency-summary span,.ep-manpower-agency-summary b,.ep-manpower-agency-summary small{display:block}
          .ep-manpower-agency-summary span{color:#94a3b8;font-size:10px;font-weight:800}
          .ep-manpower-agency-summary b{margin-top:6px;color:#edf4fb;font-size:20px}
          .ep-manpower-agency-summary small{margin-top:5px;color:#94a3b8;font-size:10px;line-height:1.5}
          .ep-manpower-department-list{display:grid;gap:18px}
          .ep-manpower-department{overflow:hidden;border:1px solid #293440;border-radius:16px;background:#0f151c}
          .ep-manpower-department-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px;border-bottom:1px solid #293440}
          .ep-manpower-department-head>div:first-child b,.ep-manpower-department-head>div:first-child span{display:block}
          .ep-manpower-department-head>div:first-child b{color:#edf4fb;font-size:14px}
          .ep-manpower-department-head>div:first-child span{margin-top:4px;color:#94a3b8;font-size:11px}
          .ep-manpower-department-summary{display:flex;gap:8px;flex-wrap:wrap}
          .ep-manpower-department-summary span{padding:7px 10px;border-radius:999px;color:#94a3b8;background:#18222e;font-size:11px}
          .ep-manpower-department-summary b{color:#bfdbfe}
          .ep-manpower-role-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:14px;padding:14px}
          .ep-manpower-role-card{display:grid;align-content:start;gap:14px;min-width:0;padding:16px;border:1px solid #2b3440;border-radius:14px;background:#111820}
          .ep-manpower-role-card.assigned{border-color:#315d8e}.ep-manpower-role-card.ready{border-color:#367556}.ep-manpower-role-card.attention{border-color:#93673a}
          .ep-manpower-role-title{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
          .ep-manpower-role-title span,.ep-manpower-role-title b,.ep-manpower-role-title small{display:block}
          .ep-manpower-role-title span{color:#93c5fd;font-size:10px;font-weight:800}
          .ep-manpower-role-title b{margin-top:5px;color:#edf4fb;font-size:16px;overflow-wrap:anywhere}
          .ep-manpower-role-title small{margin-top:5px;color:#94a3b8;font-size:11px;line-height:1.5}
          .ep-manpower-role-title>strong{color:#edf4fb;font-size:16px;white-space:nowrap}
          .ep-manpower-role-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
          .ep-manpower-role-meta>span{padding:10px;border-radius:9px;color:#94a3b8;background:#19232f;font-size:10px}
          .ep-manpower-role-meta>span b{display:block;margin-top:4px;color:#edf4fb;font-size:15px}
          .ep-manpower-role-meta>span.warn,.ep-manpower-role-meta>span.warn b{color:#fbbf77}
          .ep-manpower-qty-editor{display:grid;grid-template-columns:44px minmax(0,1fr) 44px;gap:8px;align-items:end}
          .ep-manpower-qty-editor>button{height:44px;border:1px solid #445366;border-radius:9px;color:#e2e8f0;background:#19232f;font-size:20px;cursor:pointer}
          .ep-manpower-qty-editor>button:disabled{opacity:.4;cursor:not-allowed}
          .ep-manpower-qty-editor label{display:grid;gap:6px}.ep-manpower-qty-editor label span{color:#94a3b8;font-size:11px;font-weight:800}
          .ep-manpower-qty-editor input{width:100%;height:44px;border:1px solid #445366;border-radius:9px;color:#edf4fb;background:#151c25;font:inherit;font-size:16px;text-align:center}
          .ep-manpower-use-required{width:100%;min-height:44px;border:1px solid #315d8e;border-radius:9px;color:#bfdbfe;background:#152539;font:inherit;font-size:12px;cursor:pointer}
          .ep-manpower-role-footer{display:grid;gap:6px;padding-top:12px;border-top:1px solid #293440}
          .ep-manpower-role-footer b{color:#bfdbfe;font-size:12px}.ep-manpower-role-footer small{color:#94a3b8;font-size:11px;line-height:1.5}
          .ep-manpower-role-card .ep-menu-field>span,.ep-manpower-role-card .ep-menu-block-title>span,.ep-manpower-role-card .ep-menu-contact span{font-size:11px}
          .ep-manpower-role-card .ep-menu-field input,.ep-manpower-role-card .ep-menu-field select,.ep-manpower-role-card .ep-menu-field textarea{width:100%;min-width:0;min-height:44px;padding:10px;border:1px solid #445366;border-radius:9px;color:#edf4fb;background:#151c25;font:inherit;font-size:13px}
          .ep-manpower-role-card .ep-menu-contact b{font-size:13px}.ep-manpower-role-card .ep-menu-contact small{font-size:11px;overflow-wrap:anywhere}
          .ep-manpower-role-card .ep-menu-contact a,.ep-manpower-role-card .ep-menu-mini-action,.ep-manpower-role-card .ep-menu-status-actions button{min-height:44px;font-size:11px}
          .ep-manpower-role-card .ep-menu-field:focus-within{color:#bfdbfe}.ep-manpower-role-card input:focus-visible,.ep-manpower-role-card select:focus-visible,.ep-manpower-role-card textarea:focus-visible,.ep-manpower-agency-control button:focus-visible,.ep-manpower-agency-control a:focus-visible,.ep-manpower-role-card summary:focus-visible{outline:2px solid #93c5fd;outline-offset:3px}
          .ep-manpower-role-details{border-top:1px solid #293440;padding-top:12px}.ep-manpower-role-details summary{cursor:pointer;color:#94a3b8;font-size:12px;min-height:36px}.ep-manpower-role-details>div{display:grid;gap:12px;padding-top:10px}
          .ep-manpower-agency-control .ep-menu-function-context b{font-size:16px}.ep-manpower-agency-control .ep-menu-function-context span,.ep-manpower-agency-control .ep-menu-function-context small,.ep-manpower-agency-control .ep-menu-function-chips span{font-size:11px}.ep-manpower-agency-control .ep-menu-function-chips b{font-size:16px}
          .ep-manpower-agency-control .ep-menu-vendor-progress>div,.ep-manpower-agency-control .ep-menu-vendor-progress>div b{font-size:12px}
          @media(max-width:1100px){.ep-manpower-agency-summary{grid-template-columns:repeat(3,minmax(0,1fr))}}
          @media(max-width:720px){.ep-manpower-agency-control{padding:12px}.ep-manpower-agency-head{flex-direction:column}.ep-manpower-agency-head-actions{width:100%}.ep-manpower-agency-head-actions a{flex:1;min-height:44px;justify-content:center}.ep-manpower-agency-summary{grid-template-columns:1fr 1fr}.ep-manpower-role-grid{grid-template-columns:1fr;padding:10px}.ep-manpower-department-head{flex-wrap:wrap}.ep-manpower-role-card{padding:12px}.ep-manpower-role-card .ep-menu-field input,.ep-manpower-role-card .ep-menu-field select,.ep-manpower-role-card .ep-menu-field textarea{font-size:16px}.ep-manpower-role-card .ep-menu-quick-row>div{width:100%}.ep-manpower-role-card .ep-menu-mini-action{flex:1}}
          .ep-menu-vendor-control{display:grid;gap:14px;padding:14px;border-bottom:1px solid #252c35;background:#0c1117}
          .ep-menu-vendor-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
          .ep-menu-vendor-head b,.ep-menu-vendor-head span{display:block}
          .ep-menu-vendor-head b{color:#edf4fb;font-size:14px;letter-spacing:-.01em}
          .ep-menu-vendor-head span{margin-top:4px;max-width:760px;color:#8290a2;font-size:9px;line-height:1.55}
          .ep-menu-vendor-head-actions{display:flex;gap:7px;flex-wrap:wrap}
          .ep-menu-function-context{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 14px;border:1px solid rgba(74,156,255,.18);border-radius:13px;background:linear-gradient(135deg,rgba(74,156,255,.08),rgba(74,156,255,.025))}
          .ep-menu-function-context>div:first-child span,.ep-menu-function-context>div:first-child b,.ep-menu-function-context>div:first-child small{display:block}
          .ep-menu-function-context>div:first-child span{color:#78b5ff;font-size:7px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
          .ep-menu-function-context>div:first-child b{margin-top:4px;color:#f1f6fb;font-size:13px}
          .ep-menu-function-context>div:first-child small{margin-top:3px;color:#8290a2;font-size:8px;line-height:1.4}
          .ep-menu-function-chips{display:flex;justify-content:flex-end;gap:7px;flex-wrap:wrap}
          .ep-menu-function-chips span{min-width:86px;padding:7px 9px;border:1px solid rgba(148,163,184,.09);border-radius:9px;color:#78889b;background:rgba(9,14,20,.55);font-size:7px;font-weight:800;text-align:center}
          .ep-menu-function-chips b{display:block;margin-bottom:2px;color:#e5eef7;font-size:11px}
          .ep-menu-vendor-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
          .ep-menu-vendor-summary article{padding:10px 11px;border:1px solid rgba(148,163,184,.10);border-radius:11px;background:#10171f}
          .ep-menu-vendor-summary span,.ep-menu-vendor-summary b,.ep-menu-vendor-summary small{display:block}
          .ep-menu-vendor-summary span{color:#748397;font-size:7px;font-weight:900;letter-spacing:.05em;text-transform:uppercase}
          .ep-menu-vendor-summary b{margin-top:5px;color:#edf4fb;font-size:14px}
          .ep-menu-vendor-summary small{margin-top:3px;color:#69788b;font-size:7px;line-height:1.35}
          .ep-menu-vendor-progress{display:grid;gap:6px;padding:10px 11px;border:1px solid rgba(148,163,184,.08);border-radius:10px;background:rgba(255,255,255,.015)}
          .ep-menu-vendor-progress>div{display:flex;align-items:center;justify-content:space-between;gap:10px;color:#7c8b9e;font-size:8px;font-weight:800}
          .ep-menu-vendor-progress>div b{color:#a8cffc;font-size:9px}
          .ep-menu-vendor-progress>span{display:block;height:5px;overflow:hidden;border-radius:999px;background:#1a232d}
          .ep-menu-vendor-progress>span i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#4a9cff,#63d7a0)}
          .ep-menu-vendor-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:12px}
          .ep-menu-vendor-card{overflow:hidden;border:1px solid #2b3541;border-radius:14px;background:#10171f;box-shadow:0 10px 28px rgba(0,0,0,.12)}
          .ep-menu-vendor-card.assigned{border-color:rgba(74,156,255,.28)}
          .ep-menu-vendor-card.ready{border-color:rgba(85,217,143,.30)}
          .ep-menu-vendor-card.attention{border-color:rgba(244,173,84,.42)}
          .ep-menu-vendor-card-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 11px;border-bottom:1px solid rgba(148,163,184,.08);background:#0d131a}
          .ep-menu-vendor-station span,.ep-menu-vendor-station b{display:block}
          .ep-menu-vendor-station span{color:#627287;font-size:6px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
          .ep-menu-vendor-station b{margin-top:2px;color:#9fc9f8;font-size:8px}
          .ep-menu-status{padding:5px 8px;border-radius:999px;color:#f1b361;background:rgba(244,173,84,.09);font-size:6px;font-weight:900;letter-spacing:.04em;text-transform:uppercase}
          .ep-menu-status.confirmed{color:#8ec4ff;background:rgba(74,156,255,.10)}
          .ep-menu-status.delivered,.ep-menu-status.closed{color:#76dda2;background:rgba(85,217,143,.09)}
          .ep-menu-vendor-card-main{display:grid;gap:11px;padding:12px}
          .ep-menu-vendor-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
          .ep-menu-vendor-card-top span,.ep-menu-vendor-card-top b,.ep-menu-vendor-card-top small{display:block}
          .ep-menu-vendor-card-top span{color:#718095;font-size:7px;font-weight:900;text-transform:uppercase}
          .ep-menu-vendor-card-top b{margin-top:3px;color:#eef4fa;font-size:12px;line-height:1.3}
          .ep-menu-vendor-card-top small{margin-top:4px;color:#6f7f92;font-size:7px;line-height:1.4}
          .ep-menu-vendor-cost{text-align:right;white-space:nowrap}
          .ep-menu-vendor-cost strong,.ep-menu-vendor-cost small{display:block}
          .ep-menu-vendor-cost strong{color:#eef5fb;font-size:12px}
          .ep-menu-vendor-cost small{margin-top:2px;color:#667589;font-size:6px;font-weight:800;text-transform:uppercase}
          .ep-menu-dishes{display:flex;gap:5px;flex-wrap:wrap}
          .ep-menu-dishes span{padding:5px 7px;border-radius:999px;color:#8fa2b7;background:rgba(74,156,255,.055);font-size:7px;font-weight:750}
          .ep-menu-dishes span.more{color:#78b5ff;background:rgba(74,156,255,.10)}
          .ep-menu-assignment-block{display:grid;gap:8px;padding:10px;border:1px solid rgba(148,163,184,.09);border-radius:11px;background:#0d141b}
          .ep-menu-block-title{display:flex;align-items:center;justify-content:space-between;gap:8px}
          .ep-menu-block-title span{color:#7f8ea1;font-size:7px;font-weight:900;letter-spacing:.05em;text-transform:uppercase}
          .ep-menu-block-title small{color:#667589;font-size:7px}
          .ep-menu-field{display:grid;gap:4px}
          .ep-menu-field>span{color:#728196;font-size:6px;font-weight:900;letter-spacing:.04em;text-transform:uppercase}
          .ep-menu-field select,.ep-menu-field input{width:100%;min-height:40px;padding:0 10px;border:1px solid #33404d;border-radius:9px;outline:0;color:#e5edf6;background:#151d26;font:inherit;font-size:9px;color-scheme:dark}
          .ep-menu-field select:focus,.ep-menu-field input:focus{border-color:rgba(74,156,255,.65);box-shadow:0 0 0 3px rgba(74,156,255,.08)}
          .ep-menu-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
          .ep-menu-contact{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 9px;border:1px solid rgba(148,163,184,.07);border-radius:9px;background:rgba(255,255,255,.02)}
          .ep-menu-contact>div span,.ep-menu-contact>div b,.ep-menu-contact>div small{display:block}
          .ep-menu-contact>div span{color:#6f7f92;font-size:6px;font-weight:900;text-transform:uppercase}
          .ep-menu-contact>div b{margin-top:2px;color:#dce6ef;font-size:8px}
          .ep-menu-contact>div small{margin-top:2px;color:#6b7b8e;font-size:7px}
          .ep-menu-contact a{padding:6px 8px;border:1px solid rgba(74,156,255,.18);border-radius:8px;color:#8ec4ff;background:rgba(74,156,255,.05);font-size:7px;font-weight:900;text-decoration:none}
          .ep-menu-commercial{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:8px}
          .ep-menu-cover-box,.ep-menu-rate-box{padding:9px;border:1px solid rgba(148,163,184,.09);border-radius:10px;background:rgba(255,255,255,.018)}
          .ep-menu-cover-box>span,.ep-menu-rate-box>span{display:block;color:#728196;font-size:6px;font-weight:900;letter-spacing:.04em;text-transform:uppercase}
          .ep-menu-cover-editor{display:grid;grid-template-columns:38px minmax(0,1fr) 38px;gap:6px;align-items:center;margin-top:6px}
          .ep-menu-cover-editor>button{height:40px;border:1px solid #34404d;border-radius:9px;color:#d3deea;background:#161f29;font-size:18px;font-weight:800;cursor:pointer}
          .ep-menu-cover-editor>button:disabled{opacity:.35;cursor:not-allowed}
          .ep-menu-cover-editor input{width:100%;height:40px;border:1px solid #34404d;border-radius:9px;outline:0;color:#e6eef7;background:#151d26;font:inherit;font-size:11px;font-weight:900;text-align:center}
          .ep-menu-cover-note{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:6px;color:#6d7c8f;font-size:7px}
          .ep-menu-cover-note b{color:#d8e3ed;font-size:8px}
          .ep-menu-cover-note b.warn{color:#f1b361}
          .ep-menu-use-covers{width:100%;min-height:32px;margin-top:6px;border:1px solid rgba(74,156,255,.18);border-radius:8px;color:#92c3fb;background:rgba(74,156,255,.05);font:inherit;font-size:7px;font-weight:900;cursor:pointer}
          .ep-menu-rate-box input{width:100%;height:40px;margin-top:6px;padding:0 9px;border:1px solid #34404d;border-radius:9px;outline:0;color:#e6eef7;background:#151d26;font:inherit;font-size:11px;font-weight:900}
          .ep-menu-rate-box small{display:block;margin-top:6px;color:#6d7c8f;font-size:7px}
          .ep-menu-rate-box small b{color:#dce7f1}
          .ep-menu-time-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
          .ep-menu-status-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
          .ep-menu-status-actions button{min-height:34px;padding:5px 7px;border:1px solid #303b47;border-radius:8px;color:#77879a;background:#131b24;font:inherit;font-size:6px;font-weight:900;text-transform:uppercase;cursor:pointer}
          .ep-menu-status-actions button.active{border-color:rgba(74,156,255,.35);color:#a9d0ff;background:rgba(74,156,255,.08)}
          .ep-menu-status-actions button.done.active{border-color:rgba(85,217,143,.30);color:#82e0aa;background:rgba(85,217,143,.07)}
          .ep-menu-quick-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:2px}
          .ep-menu-quick-row>div{display:flex;gap:6px;flex-wrap:wrap}
          .ep-menu-mini-action{min-height:30px;padding:0 9px;border:1px solid #303b47;border-radius:8px;color:#8798aa;background:#131b24;font:inherit;font-size:7px;font-weight:850;cursor:pointer}
          .ep-menu-mini-action.primary{border-color:rgba(74,156,255,.20);color:#8ec4ff;background:rgba(74,156,255,.05)}
          .ep-menu-mini-action.danger{border-color:rgba(255,98,89,.16);color:#e28c87;background:rgba(255,98,89,.04)}
          .ep-menu-ready-copy{color:#667589;font-size:7px;text-align:right}
          .ep-menu-ready-copy b{display:block;margin-bottom:2px;color:#dce7f1;font-size:8px}
          @media(max-width:1100px){.ep-menu-vendor-summary{grid-template-columns:repeat(3,1fr)}.ep-menu-vendor-grid{grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}}
          @media(max-width:720px){.ep-menu-vendor-control{padding:10px}.ep-menu-vendor-head{align-items:stretch;flex-direction:column}.ep-menu-vendor-head-actions .ep-button{flex:1}.ep-menu-function-context{align-items:stretch;flex-direction:column}.ep-menu-function-chips{justify-content:flex-start}.ep-menu-function-chips span{flex:1;min-width:78px}.ep-menu-vendor-summary{grid-template-columns:1fr 1fr}.ep-menu-vendor-grid{grid-template-columns:1fr}.ep-menu-field-grid,.ep-menu-commercial,.ep-menu-time-grid{grid-template-columns:1fr}.ep-menu-status-actions{grid-template-columns:1fr 1fr}.ep-menu-contact{align-items:flex-start}.ep-menu-quick-row{align-items:stretch;flex-direction:column}.ep-menu-ready-copy{text-align:left}}
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
                    <b>Grocery Suppliers Workspace</b>
                    <span>Plan separate supplier orders for Grocery, Dairy, and Vegetables & Fruits. Set quantities, rates and delivery times for this function.</span>
                  </div>
                  <Link className="ep-button" href="/app/vendors">Manage Suppliers</Link>
                </div>
                <div className="ep-menu-function-context">
                  <div>
                    <span>Selected Function</span>
                    <b>{currentFunction.dayLabel} · {currentFunction.mealLabel}</b>
                    <small>{work.event.clientName || eventName} · {work.event.venue || work.event.city || 'Venue not set'}</small>
                  </div>
                  <div className="ep-menu-function-chips">
                    <span><b>{grocerySupplierSummary.reduce((sum, group) => sum + group.rows.length, 0)}</b>order lines</span>
                    <span><b>{grocerySupplierSummary.reduce((sum, group) => sum + group.assignedCount, 0)}</b>assigned</span>
                    <span><b>{currency(grocerySupplierSummary.reduce((sum, group) => sum + group.cost, 0))}</b>planned cost</span>
                  </div>
                </div>
                <div className="ep-grocery-category-list">
                  {grocerySupplierSummary.map((group) => (
                    <section className="ep-grocery-category" key={group.key} aria-label={group.label + ' supplier orders'}>
                      <div className="ep-grocery-category-head">
                        <div><b>{group.label}</b><small>{group.detail}</small><small>{group.suppliers.length ? group.suppliers.join(' · ') : group.rows.length ? 'Choose a supplier for this category' : 'No orders planned'}</small></div>
                        <div className="ep-grocery-category-meta">
                          <span className={group.assignedCount < group.rows.length ? 'warn' : ''}>Assigned <b>{group.assignedCount}/{group.rows.length}</b></span>
                          <span>Scheduled <b>{group.rows.filter((row) => row.deliveryTime).length}/{group.rows.length}</b></span>
                          <span>Cost <b>{currency(group.cost)}</b></span>
                        </div>
                      </div>
                      {group.rows.length ? <div className="ep-grocery-category-progress">
                        <b>{group.readiness}% confirmed</b>
                        <span role="progressbar" aria-label={group.label + ' confirmation progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={group.readiness}><i style={{ width: group.readiness + '%' }} /></span>
                      </div> : null}
                      {group.rows.length ? (
                        <div className="ep-manpower-role-grid">
                          {group.rows.map((row) => {
                            const vendor = vendors.find((item) => item.id === row.partnerId);
                            const hasAssignment = Boolean(row.assignedTo.trim());
                            const matchingSuppliers = vendors.filter((item) => item.active && vendorMatchesGroceryGroup(item, row));
                            const otherSuppliers = vendors.filter((item) => item.active && !vendorMatchesGroceryGroup(item, row));
                            const orderReady = hasAssignment && Boolean(row.deliveryTime) && row.status !== 'PENDING';
                            return (
                              <article key={row.id} className={['ep-manpower-role-card', 'ep-grocery-row-card', hasAssignment ? 'assigned' : '', orderReady ? 'ready' : ''].filter(Boolean).join(' ')}>
                                {assignmentPhoto(row) ? <img className="ep-grocery-order-photo" src={assignmentPhoto(row)} alt={row.requirement} loading="lazy" /> : null}
                                <div className="ep-manpower-role-title">
                                  <div><span>{group.label}</span><b>{row.requirement}</b><small>{row.assignedTo || 'Supplier needed'}</small></div>
                                  <strong>{currency(row.quantity * row.rate)}</strong>
                                </div>
                                <label className="ep-menu-field">
                                  <span>Supplier / Team</span>
                                  <select value={row.partnerType === 'IN_HOUSE' && hasAssignment ? '__in_house' : row.partnerId || ''} onChange={(event) => assignPartner(row, event.target.value)} aria-label={'Grocery supplier for ' + row.requirement}>
                                    <option value="">Choose saved supplier</option><option value="__in_house">In-house supply</option>
                                    {vendor && !vendor.active ? <option value={vendor.id}>{vendor.name} · Inactive</option> : null}
                                    {row.partnerId && !vendor ? <option value={row.partnerId}>{row.assignedTo} · Unavailable partner</option> : null}
                                    {matchingSuppliers.length ? <optgroup label={'Matching ' + group.label + ' suppliers'}>{matchingSuppliers.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.category || item.type}</option>)}</optgroup> : null}
                                    {otherSuppliers.length ? <optgroup label="Other active partners">{otherSuppliers.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.category || item.type}</option>)}</optgroup> : null}
                                  </select>
                                </label>
                                <div className="ep-menu-field-grid">
                                  <label className="ep-menu-field"><span>Manual Supplier / Team</span><input value={row.partnerId || row.partnerType === 'IN_HOUSE' ? '' : row.assignedTo} placeholder="Enter supplier or team name" onChange={(event) => updateRow(row.id, { partnerId: '', assignedTo: event.target.value, partnerType: row.partnerType === 'IN_HOUSE' ? 'VENDOR' : row.partnerType })} aria-label={'Manual grocery supplier for ' + row.requirement} /></label>
                                  <label className="ep-menu-field"><span>Partner Type</span><select value={row.partnerType} onChange={(event) => updateRow(row.id, { partnerType: event.target.value as PartnerType })} aria-label={'Grocery partner type for ' + row.requirement}><option value="VENDOR">Vendor</option><option value="AGENCY">Agency</option><option value="IN_HOUSE">In-house</option></select></label>
                                </div>
                                {vendor ? <div className="ep-menu-contact"><div><span>Supplier Contact</span><b>{vendor.contactPerson || vendor.name}</b><small>{[vendor.phone, vendor.city].filter(Boolean).join(' · ') || 'No contact details saved'}</small></div>{vendor.phone ? <a href={'tel:' + vendor.phone} aria-label={'Call grocery supplier ' + vendor.name}>Call</a> : null}</div> : null}
                                <div className="ep-menu-field-grid three">
                                  <label className="ep-menu-field"><span>Order Quantity</span><input type="number" min="0" step="any" value={row.quantity} onChange={(event) => { if (event.target.value !== '') updateRow(row.id, { quantity: Math.max(0, Number(event.target.value) || 0) }); }} aria-label={'Grocery order quantity for ' + row.requirement} /></label>
                                  <label className="ep-menu-field"><span>Unit</span><input value={row.unit} placeholder="kg / litre / lot" onChange={(event) => updateRow(row.id, { unit: event.target.value })} aria-label={'Grocery order unit for ' + row.requirement} /></label>
                                  <label className="ep-menu-field"><span>Rate / {row.unit || 'unit'}</span><input type="number" min="0" step="0.01" value={row.rate} onChange={(event) => updateRow(row.id, { rate: Math.max(0, Number(event.target.value) || 0) })} aria-label={'Grocery rate for ' + row.requirement} /></label>
                                </div>
                                <div className="ep-menu-time-grid">
                                  <label className="ep-menu-field"><span>Delivery Time</span><input type="datetime-local" value={row.deliveryTime} onChange={(event) => updateRow(row.id, { deliveryTime: event.target.value })} aria-label={'Grocery delivery time for ' + row.requirement} /></label>
                                  <label className="ep-menu-field"><span>Pickup / Return Time</span><input type="datetime-local" value={row.pickupTime || ''} onChange={(event) => updateRow(row.id, { pickupTime: event.target.value })} aria-label={'Grocery return time for ' + row.requirement} /></label>
                                </div>
                                <div className="ep-menu-status-actions" role="group" aria-label={'Grocery order status for ' + row.requirement}>
                                  {(['PENDING', 'CONFIRMED', 'DELIVERED', 'CLOSED'] as AssignmentStatus[]).map((status) => <button key={status} type="button" className={row.status === status ? 'active' : ''} aria-pressed={row.status === status} onClick={() => updateRow(row.id, { status })}>{status === 'DELIVERED' ? 'Received' : status.charAt(0) + status.slice(1).toLowerCase()}</button>)}
                                </div>
                                <details className="ep-manpower-role-details"><summary>Order details & payment terms</summary><div>
                                  <label className="ep-menu-field"><span>Requirement</span><input value={row.requirement} onChange={(event) => updateRow(row.id, { requirement: event.target.value })} aria-label={'Grocery requirement for ' + row.requirement} /></label>
                                  <label className="ep-menu-field"><span>Order Notes / Items</span><textarea value={row.detail} onChange={(event) => updateRow(row.id, { detail: event.target.value })} aria-label={'Grocery order notes for ' + row.requirement} /></label>
                                  <label className="ep-menu-field"><span>Payment Terms</span><input value={row.paymentTerms || ''} placeholder={vendor?.paymentTerms || 'Enter agreed terms'} onChange={(event) => updateRow(row.id, { paymentTerms: event.target.value })} aria-label={'Grocery payment terms for ' + row.requirement} /></label>
                                </div></details>
                                <div className="ep-menu-quick-row"><div>{hasAssignment ? <button type="button" className="ep-menu-mini-action" onClick={() => assignPartner(row, '')}>Clear supplier</button> : null}<button type="button" className="ep-menu-mini-action danger" onClick={() => removeRow(row.id)} aria-label={'Remove grocery order ' + row.requirement}>Remove order</button></div></div>
                                <div className="ep-manpower-role-footer"><b>{orderReady ? row.status === 'CLOSED' ? 'Order closed' : row.status === 'DELIVERED' ? 'Order received' : 'Order confirmed' : !hasAssignment ? 'Supplier needed' : !row.deliveryTime ? 'Set delivery time' : 'Confirm order'}</b><small>{row.deliveryTime ? 'Delivery ' + row.deliveryTime.replace('T', ' ') : 'Delivery time not set'}{row.paymentTerms ? ' · ' + row.paymentTerms : ''}</small></div>
                              </article>
                            );
                          })}
                        </div>
                      ) : <div className="ep-empty">No orders in {group.label}. Add a requirement below when needed.</div>}
                    </section>
                  ))}
                </div>
              </section>
            ) : null}

            {tab === 'DISPOSABLE' ? (
              <section className="ep-disposable-master">
                <div className="ep-disposable-master-head">
                  <div>
                    <b>Disposables Workspace</b>
                    <span>
                      Choose disposable items by photo, check stock and quantities, then manage supplier orders and deliveries below.
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

                <div className="ep-menu-function-context">
                  <div><span>Selected Function</span><b>{currentFunction.dayLabel} · {currentFunction.mealLabel}</b><small>{work.event.clientName || eventName} · {work.event.venue || work.event.city || 'Venue not set'}</small></div>
                  <div className="ep-menu-function-chips">
                    <span><b>{disposableRows.length}</b>selected items</span>
                    <span><b>{disposableRows.filter((row) => row.assignedTo.trim()).length}/{disposableRows.length}</b>assigned</span>
                    <span><b>{currency(disposableRows.reduce((sum, row) => sum + row.quantity * row.rate, 0))}</b>planned cost</span>
                  </div>
                </div>
                <small className="ep-disposable-note">Event plan quantities come from the event’s disposables list. Choose the quantity needed for this function.</small>

                {disposableCategoryGroups.length ? (
                  <div className="ep-disposable-category-list">
                    {disposableCategoryGroups.map(
                      (group) => {
                        const categorySelected = group.items.filter((item) => selectedDisposableQty(item.id) > 0).length;

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
                                {categorySelected} items selected
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
                                            <span>master / {item.unit || 'pcs'}</span>
                                          </strong>
                                        </div>

                                        <div className="ep-disposable-master-meta">
                                          <span>
                                            Event Plan <b>{eventQty}</b>
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
                                            aria-label={'Decrease disposable quantity for ' + item.name}
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
                                            <span>Selected Quantity</span>
                                            <input
                                              type="number"
                                              min="0"
                                              step="1"
                                              value={selected}
                                              disabled={disabled}
                                              aria-label={'Disposable quantity for ' + item.name}
                                              onChange={(event) => {
                                                if (event.target.value !== '') {
                                                  setDisposableQuantity(item, Number(event.target.value));
                                                }
                                              }}
                                            />
                                          </label>

                                          <button
                                            type="button"
                                            disabled={disabled}
                                            aria-label={'Increase disposable quantity for ' + item.name}
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
                                            Use event plan qty · {eventQty}
                                          </button>
                                        ) : null}

                                        {!item.active ? (
                                          <small className="ep-disposable-note warn">
                                            Inactive in Disposable Master. Existing selections remain editable; manage availability in Disposable Master.
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
                <div className="ep-disposable-selected-head">
                  <h2>Selected disposables · supplier & delivery plan</h2>
                  <p>Manage every selected or custom item for this function. Rates and quantities remain editable.</p>
                </div>
                {disposableRows.length ? (
                  <div className="ep-manpower-role-grid ep-disposable-assignment-grid">
                    {disposableRows.map((row) => {
                      const vendor = vendors.find((item) => item.id === row.partnerId);
                      const hasAssignment = Boolean(row.assignedTo.trim());
                      return (
                        <article key={row.id} className="ep-manpower-role-card ep-disposable-assignment-card">
                          {assignmentPhoto(row) ? <img className="ep-disposable-assignment-photo" src={assignmentPhoto(row)} alt={row.requirement} loading="lazy" /> : null}
                          <div className="ep-manpower-role-title"><div><span>{row.partnerType === 'IN_HOUSE' ? 'In-house' : 'Supplier'}</span><b>{row.requirement}</b><small>{row.assignedTo || 'Supplier needed'}</small></div><strong>{currency(row.quantity * row.rate)}</strong></div>
                          <label className="ep-menu-field"><span>Supplier / Team</span>
                            <select value={row.partnerType === 'IN_HOUSE' && hasAssignment ? '__in_house' : row.partnerId || ''} onChange={(event) => assignPartner(row, event.target.value)} aria-label={'Supplier for ' + row.requirement}>
                              <option value="">Choose saved supplier</option><option value="__in_house">In-house supply</option>
                              {vendor && !vendor.active ? <option value={vendor.id}>{vendor.name} · Inactive</option> : null}
                              {row.partnerId && !vendor ? <option value={row.partnerId}>{row.assignedTo} · Unavailable partner</option> : null}
                              {vendors.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.category || item.type}</option>)}
                            </select>
                          </label>
                          <div className="ep-menu-field-grid">
                            <label className="ep-menu-field"><span>Manual Supplier / Team</span><input value={row.partnerId || row.partnerType === 'IN_HOUSE' ? '' : row.assignedTo} placeholder="Enter supplier or team name" onChange={(event) => updateRow(row.id, { partnerId: '', assignedTo: event.target.value, partnerType: row.partnerType === 'IN_HOUSE' ? 'VENDOR' : row.partnerType })} aria-label={'Manual supplier for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Partner Type</span><select value={row.partnerType} onChange={(event) => updateRow(row.id, { partnerType: event.target.value as PartnerType })} aria-label={'Disposable partner type for ' + row.requirement}><option value="IN_HOUSE">In-house</option><option value="VENDOR">Vendor</option><option value="AGENCY">Agency</option></select></label>
                          </div>
                          {vendor ? <div className="ep-menu-contact"><div><span>Supplier Contact</span><b>{vendor.contactPerson || vendor.name}</b><small>{[vendor.phone, vendor.city].filter(Boolean).join(' · ') || 'No contact details saved'}</small></div>{vendor.phone ? <a href={'tel:' + vendor.phone} aria-label={'Call disposable supplier ' + vendor.name}>Call</a> : null}</div> : null}
                          <div className="ep-menu-field-grid">
                            <label className="ep-menu-field"><span>Quantity</span><input type="number" min="0" step="any" value={row.quantity} onChange={(event) => { if (event.target.value !== '') updateRow(row.id, { quantity: Math.max(0, Number(event.target.value) || 0) }); }} aria-label={'Selected quantity for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Rate / {row.unit || 'pcs'}</span><input type="number" min="0" step="0.01" value={row.rate} onChange={(event) => updateRow(row.id, { rate: Math.max(0, Number(event.target.value) || 0) })} aria-label={'Disposable rate for ' + row.requirement} /></label>
                          </div>
                          <div className="ep-menu-time-grid">
                            <label className="ep-menu-field"><span>Delivery Time</span><input type="datetime-local" value={row.deliveryTime} onChange={(event) => updateRow(row.id, { deliveryTime: event.target.value })} aria-label={'Disposable delivery time for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Pickup / Return Time</span><input type="datetime-local" value={row.pickupTime || ''} onChange={(event) => updateRow(row.id, { pickupTime: event.target.value })} aria-label={'Disposable return time for ' + row.requirement} /></label>
                          </div>
                          <div className="ep-menu-status-actions" role="group" aria-label={'Disposable status for ' + row.requirement}>
                            {(['PENDING', 'CONFIRMED', 'DELIVERED', 'CLOSED'] as AssignmentStatus[]).map((status) => <button key={status} type="button" className={row.status === status ? 'active' : ''} aria-pressed={row.status === status} onClick={() => updateRow(row.id, { status })}>{status === 'DELIVERED' ? 'Received' : status.charAt(0) + status.slice(1).toLowerCase()}</button>)}
                          </div>
                          <details className="ep-manpower-role-details"><summary>Item details & payment terms</summary><div>
                            <label className="ep-menu-field"><span>Item Name</span><input value={row.requirement} onChange={(event) => updateRow(row.id, { requirement: event.target.value })} aria-label={'Disposable item name for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Instructions / Packing</span><textarea value={row.detail} onChange={(event) => updateRow(row.id, { detail: event.target.value })} aria-label={'Disposable instructions for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Unit</span><input value={row.unit} onChange={(event) => updateRow(row.id, { unit: event.target.value })} aria-label={'Disposable unit for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Payment Terms</span><input value={row.paymentTerms || ''} placeholder={vendor?.paymentTerms || 'Enter agreed terms'} onChange={(event) => updateRow(row.id, { paymentTerms: event.target.value })} aria-label={'Disposable payment terms for ' + row.requirement} /></label>
                          </div></details>
                          <div className="ep-menu-quick-row"><div>{hasAssignment ? <button type="button" className="ep-menu-mini-action" onClick={() => assignPartner(row, '')}>Clear supplier</button> : null}<button type="button" className="ep-menu-mini-action danger" onClick={() => removeRow(row.id)} aria-label={'Remove disposable ' + row.requirement}>Remove item</button></div></div>
                          <div className="ep-manpower-role-footer"><b>{!hasAssignment ? 'Assign supplier or team' : !row.deliveryTime ? 'Set delivery time' : row.status === 'PENDING' ? 'Confirm order' : row.status === 'CLOSED' ? 'Order closed' : row.status === 'DELIVERED' ? 'Order received' : 'Order confirmed'}</b><small>{row.pickupTime ? 'Return ' + row.pickupTime.replace('T', ' ') : 'Return time not set'}</small></div>
                        </article>
                      );
                    })}
                  </div>
                ) : <div className="ep-empty">Choose disposable items above or add a custom requirement below to start this function’s disposables plan.</div>}
              </section>
            ) : null}

            {tab === 'DRESS' ? (
              <section className="ep-uniform-master">
                <div className="ep-uniform-master-head">
                  <div>
                    <b>Dress & Uniform Workspace</b>
                    <span>
                      Choose staff uniforms by photo, check role coverage and stock, then manage suppliers, issue times and returns below.
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

                <div className="ep-menu-function-context">
                  <div><span>Selected Function</span><b>{currentFunction.dayLabel} · {currentFunction.mealLabel}</b><small>{work.event.clientName || eventName} · {work.event.venue || work.event.city || 'Venue not set'}</small></div>
                  <div className="ep-menu-function-chips">
                    <span><b>{dressRows.length}</b>selected items</span>
                    <span><b>{dressRows.reduce((sum, row) => sum + row.quantity, 0)}</b>sets / pieces</span>
                    <span><b>{currency(dressRows.reduce((sum, row) => sum + row.quantity * row.rate, 0))}</b>planned cost</span>
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
                              <span>Chosen options <b>{group.items.filter((item) => selectedUniformQty(item.id) > 0).length}</b></span>
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
                                      <strong>{currency(item.defaultRate)}<span>master / {item.unit || 'set'}</span></strong>
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
                                        aria-label={'Decrease quantity for ' + item.name}
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
                                        <span>Selected Quantity</span>
                                        <input
                                          type="number"
                                          min="0"
                                          step="1"
                                          value={selected}
                                          disabled={disabled}
                                          aria-label={'Uniform quantity for ' + item.name}
                                          onChange={(event) => {
                                            if (event.target.value !== '') {
                                              setUniformQuantity(item, Number(event.target.value));
                                            }
                                          }}
                                        />
                                      </label>

                                      <button
                                        type="button"
                                        disabled={disabled}
                                        aria-label={'Increase quantity for ' + item.name}
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
                                      Set to role requirement · {required}
                                    </button>

                                    {!item.active ? (
                                      <small className="ep-uniform-note warn">
                                        Inactive in Uniform Master. Existing selections remain editable; manage availability in Uniform Master.
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
                <div className="ep-uniform-selected-head">
                  <h2>Selected uniforms · supplier & return plan</h2>
                  <p>Manage every selected or custom item for this function. Rates and quantities remain editable.</p>
                </div>
                {dressRows.length ? (
                  <div className="ep-manpower-role-grid ep-uniform-assignment-grid">
                    {dressRows.map((row) => {
                      const vendor = vendors.find((item) => item.id === row.partnerId);
                      const hasAssignment = Boolean(row.assignedTo.trim());
                      return (
                        <article key={row.id} className="ep-manpower-role-card ep-uniform-assignment-card">
                          {assignmentPhoto(row) ? <img className="ep-uniform-assignment-photo" src={assignmentPhoto(row)} alt={row.requirement} loading="lazy" /> : null}
                          <div className="ep-manpower-role-title"><div><span>{row.partnerType === 'IN_HOUSE' ? 'In-house' : 'Supplier'}</span><b>{row.requirement}</b><small>{row.assignedTo || 'Supplier needed'}</small></div><strong>{currency(row.quantity * row.rate)}</strong></div>
                          <label className="ep-menu-field"><span>Supplier / Team</span>
                            <select value={row.partnerType === 'IN_HOUSE' && hasAssignment ? '__in_house' : row.partnerId || ''} onChange={(event) => assignPartner(row, event.target.value)} aria-label={'Supplier for ' + row.requirement}>
                              <option value="">Choose saved supplier</option><option value="__in_house">In-house wardrobe</option>
                              {vendor && !vendor.active ? <option value={vendor.id}>{vendor.name} · Inactive</option> : null}
                              {row.partnerId && !vendor ? <option value={row.partnerId}>{row.assignedTo} · Unavailable partner</option> : null}
                              {vendors.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.category || item.type}</option>)}
                            </select>
                          </label>
                          <div className="ep-menu-field-grid">
                            <label className="ep-menu-field"><span>Manual Supplier / Team</span><input value={row.partnerId || row.partnerType === 'IN_HOUSE' ? '' : row.assignedTo} placeholder="Enter supplier or team name" onChange={(event) => updateRow(row.id, { partnerId: '', assignedTo: event.target.value, partnerType: row.partnerType === 'IN_HOUSE' ? 'VENDOR' : row.partnerType })} aria-label={'Manual supplier for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Partner Type</span><select value={row.partnerType} onChange={(event) => updateRow(row.id, { partnerType: event.target.value as PartnerType })} aria-label={'Uniform partner type for ' + row.requirement}><option value="IN_HOUSE">In-house</option><option value="VENDOR">Vendor</option><option value="AGENCY">Agency</option></select></label>
                          </div>
                          {vendor ? <div className="ep-menu-contact"><div><span>Supplier Contact</span><b>{vendor.contactPerson || vendor.name}</b><small>{[vendor.phone, vendor.city].filter(Boolean).join(' · ') || 'No contact details saved'}</small></div>{vendor.phone ? <a href={'tel:' + vendor.phone} aria-label={'Call uniform supplier ' + vendor.name}>Call</a> : null}</div> : null}
                          <div className="ep-menu-field-grid">
                            <label className="ep-menu-field"><span>Quantity</span><input type="number" min="1" step="1" value={row.quantity} onChange={(event) => { if (event.target.value && Number(event.target.value) >= 1) updateRow(row.id, { quantity: Math.round(Number(event.target.value)) }); }} aria-label={'Selected quantity for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Rate / {row.unit || 'set'}</span><input type="number" min="0" step="0.01" value={row.rate} onChange={(event) => updateRow(row.id, { rate: Math.max(0, Number(event.target.value) || 0) })} aria-label={'Uniform rate for ' + row.requirement} /></label>
                          </div>
                          <div className="ep-menu-time-grid">
                            <label className="ep-menu-field"><span>Issue / Reporting Time</span><input type="datetime-local" value={row.deliveryTime} onChange={(event) => updateRow(row.id, { deliveryTime: event.target.value })} aria-label={'Uniform issue time for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Pickup / Return Time</span><input type="datetime-local" value={row.pickupTime || ''} onChange={(event) => updateRow(row.id, { pickupTime: event.target.value })} aria-label={'Uniform return time for ' + row.requirement} /></label>
                          </div>
                          <div className="ep-menu-status-actions" role="group" aria-label={'Uniform status for ' + row.requirement}>
                            {(['PENDING', 'CONFIRMED', 'DELIVERED', 'CLOSED'] as AssignmentStatus[]).map((status) => <button key={status} type="button" className={row.status === status ? 'active' : ''} aria-pressed={row.status === status} onClick={() => updateRow(row.id, { status })}>{status === 'DELIVERED' ? 'Issued' : status.charAt(0) + status.slice(1).toLowerCase()}</button>)}
                          </div>
                          <details className="ep-manpower-role-details"><summary>Item details & payment terms</summary><div>
                            <label className="ep-menu-field"><span>Item Name</span><input value={row.requirement} onChange={(event) => updateRow(row.id, { requirement: event.target.value })} aria-label={'Uniform item name for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Instructions / Sizes</span><textarea value={row.detail} onChange={(event) => updateRow(row.id, { detail: event.target.value })} aria-label={'Uniform instructions for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Unit</span><input value={row.unit} onChange={(event) => updateRow(row.id, { unit: event.target.value })} aria-label={'Uniform unit for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Payment Terms</span><input value={row.paymentTerms || ''} placeholder={vendor?.paymentTerms || 'Enter agreed terms'} onChange={(event) => updateRow(row.id, { paymentTerms: event.target.value })} aria-label={'Uniform payment terms for ' + row.requirement} /></label>
                          </div></details>
                          <div className="ep-menu-quick-row"><div>{hasAssignment ? <button type="button" className="ep-menu-mini-action" onClick={() => assignPartner(row, '')}>Clear supplier</button> : null}<button type="button" className="ep-menu-mini-action danger" onClick={() => removeRow(row.id)} aria-label={'Remove uniform ' + row.requirement}>Remove item</button></div></div>
                          <div className="ep-manpower-role-footer"><b>{!hasAssignment ? 'Assign supplier or team' : !row.deliveryTime ? 'Set issue time' : row.status === 'PENDING' ? 'Confirm uniform plan' : 'Uniform plan confirmed'}</b><small>{row.pickupTime ? 'Return ' + row.pickupTime.replace('T', ' ') : 'Return time not set'}</small></div>
                        </article>
                      );
                    })}
                  </div>
                ) : <div className="ep-empty">Choose uniforms above or add a custom requirement below to start this function’s dress plan.</div>}
              </section>
            ) : null}

            {tab === 'EQUIPMENT' ? (
              <section className="ep-equipment-master">
                <div className="ep-equipment-master-head">
                  <div>
                    <b>Equipment Workspace</b>
                    <span>
                      Choose equipment by photo, check stock and capacity, then manage in-house or rental assignments, delivery and return times below.
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

                <div className="ep-menu-function-context">
                  <div><span>Selected Function</span><b>{currentFunction.dayLabel} · {currentFunction.mealLabel}</b><small>{work.event.clientName || eventName} · {work.event.venue || work.event.city || 'Venue not set'}</small></div>
                  <div className="ep-menu-function-chips">
                    <span><b>{selectedEquipmentRows.length}</b>selected items</span>
                    <span><b>{selectedEquipmentRows.filter((row) => row.assignedTo.trim()).length}/{selectedEquipmentRows.length}</b>assigned</span>
                    <span><b>{currency(selectedEquipmentRows.reduce((sum, row) => sum + row.quantity * row.rate, 0))}</b>planned cost</span>
                  </div>
                </div>
                <div className="ep-equipment-search">
                  <label>Search saved equipment<input value={equipmentQuery} onChange={(event) => setEquipmentQuery(event.target.value)} placeholder="Name, category, capacity or rental vendor" type="search" /></label>
                  {equipmentQuery ? <button className="ep-button" type="button" onClick={() => setEquipmentQuery('')}>Clear search</button> : null}
                  <span>{visibleEquipmentGroups.reduce((sum, group) => sum + group.items.length, 0)} shown / {equipment.length} saved</span>
                </div>

                {visibleEquipmentGroups.length ? (
                  <div className="ep-equipment-category-list">
                    {visibleEquipmentGroups.map(
                      (group) => {
                        const categorySelected = group.items.filter((item) => selectedEquipmentQty(item.id) > 0).length;

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
                                {categorySelected} items selected
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
                                            <span>master / {item.unit || 'unit'}</span>
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
                                            <span>Selected Quantity</span>
                                            <input
                                              type="number"
                                              min="0"
                                              step="1"
                                              value={selected}
                                              disabled={disabled}
                                              aria-label={'Equipment quantity for ' + item.name}
                                              onChange={(event) => {
                                                if (event.target.value !== '') {
                                                  setEquipmentQuantity(item, Number(event.target.value));
                                                }
                                              }}
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
                                            Inactive in Equipment Master. Existing selections remain editable; manage availability in Equipment Master.
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
                    {equipment.length ? 'No saved equipment matches this search. Clear search to see all items.' : 'No equipment saved yet. Open Equipment Master and add your equipment first.'}
                  </div>
                )}
                <div className="ep-equipment-selected-head">
                  <h2>Selected equipment · rental & return plan</h2>
                  <p>Manage every selected or custom item for this function. Rates and quantities remain editable.</p>
                </div>
                {selectedEquipmentRows.length ? (
                  <div className="ep-manpower-role-grid ep-equipment-assignment-grid">
                    {selectedEquipmentRows.map((row) => {
                      const vendor = vendors.find((item) => item.id === row.partnerId);
                      const hasAssignment = Boolean(row.assignedTo.trim());
                      return (
                        <article key={row.id} className="ep-manpower-role-card ep-equipment-assignment-card">
                          {assignmentPhoto(row) ? <img className="ep-equipment-assignment-photo" src={assignmentPhoto(row)} alt={row.requirement} loading="lazy" /> : null}
                          <div className="ep-manpower-role-title"><div><span>{row.partnerType === 'IN_HOUSE' ? 'In-house' : 'Supplier'}</span><b>{row.requirement}</b><small>{row.assignedTo || 'Supplier needed'}</small></div><strong>{currency(row.quantity * row.rate)}</strong></div>
                          <label className="ep-menu-field"><span>Supplier / Team</span>
                            <select value={row.partnerType === 'IN_HOUSE' && hasAssignment ? '__in_house' : row.partnerId || ''} onChange={(event) => assignPartner(row, event.target.value)} aria-label={'Supplier for ' + row.requirement}>
                              <option value="">Choose saved supplier</option><option value="__in_house">In-house equipment</option>
                              {vendor && !vendor.active ? <option value={vendor.id}>{vendor.name} · Inactive</option> : null}
                              {row.partnerId && !vendor ? <option value={row.partnerId}>{row.assignedTo} · Unavailable partner</option> : null}
                              {vendors.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.category || item.type}</option>)}
                            </select>
                          </label>
                          <div className="ep-menu-field-grid">
                            <label className="ep-menu-field"><span>Manual Supplier / Team</span><input value={row.partnerId || row.partnerType === 'IN_HOUSE' ? '' : row.assignedTo} placeholder="Enter supplier or team name" onChange={(event) => updateRow(row.id, { partnerId: '', assignedTo: event.target.value, partnerType: row.partnerType === 'IN_HOUSE' ? 'VENDOR' : row.partnerType })} aria-label={'Manual supplier for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Partner Type</span><select value={row.partnerType} onChange={(event) => updateRow(row.id, { partnerType: event.target.value as PartnerType })} aria-label={'Equipment partner type for ' + row.requirement}><option value="IN_HOUSE">In-house</option><option value="VENDOR">Vendor</option><option value="AGENCY">Agency</option></select></label>
                          </div>
                          {vendor ? <div className="ep-menu-contact"><div><span>Supplier Contact</span><b>{vendor.contactPerson || vendor.name}</b><small>{[vendor.phone, vendor.city].filter(Boolean).join(' · ') || 'No contact details saved'}</small></div>{vendor.phone ? <a href={'tel:' + vendor.phone} aria-label={'Call equipment supplier ' + vendor.name}>Call</a> : null}</div> : null}
                          <div className="ep-menu-field-grid">
                            <label className="ep-menu-field"><span>Quantity</span><input type="number" min="0" step="any" value={row.quantity} onChange={(event) => { if (event.target.value !== '') updateRow(row.id, { quantity: Math.max(0, Number(event.target.value) || 0) }); }} aria-label={'Selected quantity for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Rate / {row.unit || 'unit'}</span><input type="number" min="0" step="0.01" value={row.rate} onChange={(event) => updateRow(row.id, { rate: Math.max(0, Number(event.target.value) || 0) })} aria-label={'Equipment rate for ' + row.requirement} /></label>
                          </div>
                          <div className="ep-menu-time-grid">
                            <label className="ep-menu-field"><span>Delivery Time</span><input type="datetime-local" value={row.deliveryTime} onChange={(event) => updateRow(row.id, { deliveryTime: event.target.value })} aria-label={'Equipment delivery time for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Pickup / Return Time</span><input type="datetime-local" value={row.pickupTime || ''} onChange={(event) => updateRow(row.id, { pickupTime: event.target.value })} aria-label={'Equipment return time for ' + row.requirement} /></label>
                          </div>
                          <div className="ep-menu-status-actions" role="group" aria-label={'Equipment status for ' + row.requirement}>
                            {(['PENDING', 'CONFIRMED', 'DELIVERED', 'CLOSED'] as AssignmentStatus[]).map((status) => <button key={status} type="button" className={row.status === status ? 'active' : ''} aria-pressed={row.status === status} onClick={() => updateRow(row.id, { status })}>{status === 'DELIVERED' ? 'Received' : status.charAt(0) + status.slice(1).toLowerCase()}</button>)}
                          </div>
                          <details className="ep-manpower-role-details"><summary>Item details & payment terms</summary><div>
                            <label className="ep-menu-field"><span>Item Name</span><input value={row.requirement} onChange={(event) => updateRow(row.id, { requirement: event.target.value })} aria-label={'Equipment item name for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Setup / Handling Instructions</span><textarea value={row.detail} onChange={(event) => updateRow(row.id, { detail: event.target.value })} aria-label={'Equipment instructions for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Unit</span><input value={row.unit} onChange={(event) => updateRow(row.id, { unit: event.target.value })} aria-label={'Equipment unit for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Payment Terms</span><input value={row.paymentTerms || ''} placeholder={vendor?.paymentTerms || 'Enter agreed terms'} onChange={(event) => updateRow(row.id, { paymentTerms: event.target.value })} aria-label={'Equipment payment terms for ' + row.requirement} /></label>
                          </div></details>
                          <div className="ep-menu-quick-row"><div>{hasAssignment ? <button type="button" className="ep-menu-mini-action" onClick={() => assignPartner(row, '')}>Clear supplier</button> : null}<button type="button" className="ep-menu-mini-action danger" onClick={() => removeRow(row.id)} aria-label={'Remove equipment ' + row.requirement}>Remove item</button></div></div>
                          <div className="ep-manpower-role-footer"><b>{!hasAssignment ? 'Assign supplier or team' : !row.deliveryTime ? 'Set delivery time' : row.status === 'PENDING' ? 'Confirm assignment' : row.status === 'CLOSED' ? 'Assignment closed' : row.status === 'DELIVERED' ? 'Equipment delivered' : 'Assignment confirmed'}</b><small>{row.pickupTime ? 'Return ' + row.pickupTime.replace('T', ' ') : 'Return time not set'}</small></div>
                        </article>
                      );
                    })}
                  </div>
                ) : <div className="ep-empty">Choose equipment above or add a custom requirement below to start this function’s equipment plan.</div>}
              </section>
            ) : null}

            {tab === 'CROCKERY' ? (
              <section className="ep-crockery-master">
                <div className="ep-crockery-master-head">
                  <div>
                    <b>Crockery & Cutlery Workspace</b>
                    <span>
                      Choose items by photo, use saved units-per-guest and buffer rules, then manage rental assignments, delivery and returns. Quantities remain editable.
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

                <div className="ep-menu-function-context">
                  <div><span>Selected Function</span><b>{currentFunction.dayLabel} · {currentFunction.mealLabel}</b><small>{work.event.clientName || eventName} · {work.event.venue || work.event.city || 'Venue not set'}</small></div>
                  <div className="ep-menu-function-chips">
                    <span><b>{currentFunction.pax.toLocaleString('en-IN')}</b>guests</span>
                    <span><b>{selectedCrockeryRows.length}</b>selected items</span>
                    <span><b>{currency(selectedCrockeryRows.reduce((sum, row) => sum + row.quantity * row.rate, 0))}</b>planned cost</span>
                  </div>
                </div>
                <div className="ep-crockery-search">
                  <label>Search saved crockery<input value={crockeryQuery} onChange={(event) => setCrockeryQuery(event.target.value)} placeholder="Name, category, size or rental vendor" type="search" /></label>
                  {crockeryQuery ? <button className="ep-button" type="button" onClick={() => setCrockeryQuery('')}>Clear search</button> : null}
                  <span>{visibleCrockeryGroups.reduce((sum, group) => sum + group.items.length, 0)} shown / {crockery.length} saved</span>
                </div>

                {visibleCrockeryGroups.length ? (
                  <div className="ep-crockery-category-list">
                    {visibleCrockeryGroups.map(
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
                                            <span>master / {item.unit || 'pcs'}</span>
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
                                            <span>Selected Quantity</span>
                                            <input
                                              type="number"
                                              min="0"
                                              step="1"
                                              value={selected}
                                              disabled={disabled}
                                              aria-label={'Crockery quantity for ' + item.name}
                                              onChange={(event) => {
                                                if (event.target.value !== '') {
                                                  setCrockeryQuantity(item, Number(event.target.value));
                                                }
                                              }}
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
                                          Use guest-based quantity · {recommended}
                                        </button>

                                        {!item.active ? (
                                          <small className="ep-crockery-inactive-note">
                                            Inactive in Crockery Master. Existing selections remain editable; manage availability in Crockery Master.
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
                    {crockery.length ? 'No saved crockery matches this search. Clear search to see all items.' : 'No crockery or cutlery saved yet. Open Crockery Master and add your items first.'}
                  </div>
                )}
                <div className="ep-crockery-selected-head">
                  <h2>Selected crockery · rental & return plan</h2>
                  <p>Manage every selected or custom item for this function. Rates and quantities remain editable.</p>
                </div>
                {selectedCrockeryRows.length ? (
                  <div className="ep-manpower-role-grid ep-crockery-assignment-grid">
                    {selectedCrockeryRows.map((row) => {
                      const vendor = vendors.find((item) => item.id === row.partnerId);
                      const hasAssignment = Boolean(row.assignedTo.trim());
                      return (
                        <article key={row.id} className="ep-manpower-role-card ep-crockery-assignment-card">
                          {assignmentPhoto(row) ? <img className="ep-crockery-assignment-photo" src={assignmentPhoto(row)} alt={row.requirement} loading="lazy" /> : null}
                          <div className="ep-manpower-role-title"><div><span>{row.partnerType === 'IN_HOUSE' ? 'In-house' : 'Supplier'}</span><b>{row.requirement}</b><small>{row.assignedTo || 'Supplier needed'}</small></div><strong>{currency(row.quantity * row.rate)}</strong></div>
                          <label className="ep-menu-field"><span>Supplier / Team</span>
                            <select value={row.partnerType === 'IN_HOUSE' && hasAssignment ? '__in_house' : row.partnerId || ''} onChange={(event) => assignPartner(row, event.target.value)} aria-label={'Supplier for ' + row.requirement}>
                              <option value="">Choose saved supplier</option><option value="__in_house">In-house crockery</option>
                              {vendor && !vendor.active ? <option value={vendor.id}>{vendor.name} · Inactive</option> : null}
                              {row.partnerId && !vendor ? <option value={row.partnerId}>{row.assignedTo} · Unavailable partner</option> : null}
                              {vendors.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.category || item.type}</option>)}
                            </select>
                          </label>
                          <div className="ep-menu-field-grid">
                            <label className="ep-menu-field"><span>Manual Supplier / Team</span><input value={row.partnerId || row.partnerType === 'IN_HOUSE' ? '' : row.assignedTo} placeholder="Enter supplier or team name" onChange={(event) => updateRow(row.id, { partnerId: '', assignedTo: event.target.value, partnerType: row.partnerType === 'IN_HOUSE' ? 'VENDOR' : row.partnerType })} aria-label={'Manual supplier for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Partner Type</span><select value={row.partnerType} onChange={(event) => updateRow(row.id, { partnerType: event.target.value as PartnerType })} aria-label={'Crockery partner type for ' + row.requirement}><option value="IN_HOUSE">In-house</option><option value="VENDOR">Vendor</option><option value="AGENCY">Agency</option></select></label>
                          </div>
                          {vendor ? <div className="ep-menu-contact"><div><span>Supplier Contact</span><b>{vendor.contactPerson || vendor.name}</b><small>{[vendor.phone, vendor.city].filter(Boolean).join(' · ') || 'No contact details saved'}</small></div>{vendor.phone ? <a href={'tel:' + vendor.phone} aria-label={'Call crockery supplier ' + vendor.name}>Call</a> : null}</div> : null}
                          <div className="ep-menu-field-grid">
                            <label className="ep-menu-field"><span>Quantity</span><input type="number" min="0" step="any" value={row.quantity} onChange={(event) => { if (event.target.value !== '') updateRow(row.id, { quantity: Math.max(0, Number(event.target.value) || 0) }); }} aria-label={'Selected quantity for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Rate / {row.unit || 'pcs'}</span><input type="number" min="0" step="0.01" value={row.rate} onChange={(event) => updateRow(row.id, { rate: Math.max(0, Number(event.target.value) || 0) })} aria-label={'Crockery rate for ' + row.requirement} /></label>
                          </div>
                          <div className="ep-menu-time-grid">
                            <label className="ep-menu-field"><span>Delivery Time</span><input type="datetime-local" value={row.deliveryTime} onChange={(event) => updateRow(row.id, { deliveryTime: event.target.value })} aria-label={'Crockery delivery time for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Pickup / Return Time</span><input type="datetime-local" value={row.pickupTime || ''} onChange={(event) => updateRow(row.id, { pickupTime: event.target.value })} aria-label={'Crockery return time for ' + row.requirement} /></label>
                          </div>
                          <div className="ep-menu-status-actions" role="group" aria-label={'Crockery status for ' + row.requirement}>
                            {(['PENDING', 'CONFIRMED', 'DELIVERED', 'CLOSED'] as AssignmentStatus[]).map((status) => <button key={status} type="button" className={row.status === status ? 'active' : ''} aria-pressed={row.status === status} onClick={() => updateRow(row.id, { status })}>{status === 'DELIVERED' ? 'Received' : status.charAt(0) + status.slice(1).toLowerCase()}</button>)}
                          </div>
                          <details className="ep-manpower-role-details"><summary>Item details & payment terms</summary><div>
                            <label className="ep-menu-field"><span>Item Name</span><input value={row.requirement} onChange={(event) => updateRow(row.id, { requirement: event.target.value })} aria-label={'Crockery item name for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Packing / Handling Instructions</span><textarea value={row.detail} onChange={(event) => updateRow(row.id, { detail: event.target.value })} aria-label={'Crockery instructions for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Unit</span><input value={row.unit} onChange={(event) => updateRow(row.id, { unit: event.target.value })} aria-label={'Crockery unit for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Payment Terms</span><input value={row.paymentTerms || ''} placeholder={vendor?.paymentTerms || 'Enter agreed terms'} onChange={(event) => updateRow(row.id, { paymentTerms: event.target.value })} aria-label={'Crockery payment terms for ' + row.requirement} /></label>
                          </div></details>
                          <div className="ep-menu-quick-row"><div>{hasAssignment ? <button type="button" className="ep-menu-mini-action" onClick={() => assignPartner(row, '')}>Clear supplier</button> : null}<button type="button" className="ep-menu-mini-action danger" onClick={() => removeRow(row.id)} aria-label={'Remove crockery ' + row.requirement}>Remove item</button></div></div>
                          <div className="ep-manpower-role-footer"><b>{!hasAssignment ? 'Assign supplier or team' : !row.deliveryTime ? 'Set delivery time' : row.status === 'PENDING' ? 'Confirm assignment' : row.status === 'CLOSED' ? 'Assignment closed' : row.status === 'DELIVERED' ? 'Crockery delivered' : 'Assignment confirmed'}</b><small>{row.pickupTime ? 'Return ' + row.pickupTime.replace('T', ' ') : 'Return time not set'}</small></div>
                        </article>
                      );
                    })}
                  </div>
                ) : <div className="ep-empty">Choose crockery above or add a custom requirement below to start this function’s crockery plan.</div>}
              </section>
            ) : null}

            {tab === 'MENU' ? (
              <section className="ep-menu-vendor-control">
                <div className="ep-menu-vendor-head">
                  <div>
                    <b>Vendor Assignment Workspace</b>
                    <span>
                      Plan every menu category as an execution station. Assign a saved food vendor or in-house team, set covers and rate, confirm reporting time, and track status without leaving this function.
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
                      Vendor Master
                    </Link>
                  </div>
                </div>

                <div className="ep-menu-function-context">
                  <div>
                    <span>Selected Function</span>
                    <b>
                      {currentFunction.dayLabel} · {currentFunction.mealLabel}
                    </b>
                    <small>
                      {work.event.clientName || eventName}
                      {' · '}
                      {work.event.venue || work.event.city || 'Venue not set'}
                    </small>
                  </div>

                  <div className="ep-menu-function-chips">
                    <span>
                      <b>{Math.max(0, Number(currentFunction.pax) || 0).toLocaleString('en-IN')}</b>
                      covers
                    </span>
                    <span>
                      <b>{currentFunction.menu.length}</b>
                      dishes
                    </span>
                    <span>
                      <b>{menuVendorRows.length}</b>
                      stations
                    </span>
                    <span>
                      <b>{menuVendorSummary.assigned}</b>
                      assigned
                    </span>
                  </div>
                </div>

                <div className="ep-menu-vendor-summary">
                  <article>
                    <span>Stations</span>
                    <b>{menuVendorRows.length}</b>
                    <small>{currentFunction.menu.length} selected dishes</small>
                  </article>
                  <article>
                    <span>Assigned</span>
                    <b>{menuVendorSummary.assigned}/{menuVendorRows.length}</b>
                    <small>Vendor or in-house team selected</small>
                  </article>
                  <article>
                    <span>Reporting Ready</span>
                    <b>{menuVendorSummary.withSetupTime}/{menuVendorRows.length}</b>
                    <small>Setup/reporting time entered</small>
                  </article>
                  <article>
                    <span>Confirmed</span>
                    <b>{menuVendorSummary.confirmed}</b>
                    <small>Confirmed, delivered or closed</small>
                  </article>
                  <article>
                    <span>Vendor Cost</span>
                    <b>{currency(menuVendorSummary.totalCost)}</b>
                    <small>Assigned covers × station rate</small>
                  </article>
                </div>

                <div className="ep-menu-vendor-progress">
                  <div>
                    <span>Function vendor readiness</span>
                    <b>{menuVendorSummary.readiness}%</b>
                  </div>
                  <span>
                    <i style={{ width: menuVendorSummary.readiness + '%' }} />
                  </span>
                </div>

                {menuVendorRows.length ? (
                  <div className="ep-menu-vendor-grid">
                    {menuVendorRows.map((row, rowIndex) => {
                      const category =
                        menuCategoryFromRow(
                          row,
                        );

                      const dishes =
                        currentFunction.menu.filter(
                          (item) =>
                            normalized(
                              item.category ||
                                'Other',
                            ) ===
                            normalized(
                              category,
                            ),
                        );

                      const functionCovers =
                        Math.max(
                          0,
                          Number(
                            currentFunction.pax,
                          ) || 0,
                        );

                      const variance =
                        row.quantity -
                        functionCovers;

                      const assignedVendor =
                        row.partnerId
                          ? vendors.find(
                              (vendor) =>
                                vendor.id ===
                                row.partnerId,
                            ) || null
                          : null;

                      const matchingFoodVendors =
                        vendors.filter(
                          (vendor) =>
                            vendor.active &&
                            vendorMatchesMenuRow(
                              vendor,
                              row,
                            ),
                        );

                      const otherFoodVendors =
                        vendors.filter(
                          (vendor) =>
                            vendor.active &&
                            !vendorMatchesMenuRow(
                              vendor,
                              row,
                            ),
                        );

                      const hasAssignment =
                        Boolean(
                          row.assignedTo.trim(),
                        );

                      const hasReportingTime =
                        Boolean(
                          row.deliveryTime,
                        );

                      const coversReady =
                        functionCovers <= 0 ||
                        row.quantity >=
                          functionCovers;

                      const stationReady =
                        hasAssignment &&
                        hasReportingTime &&
                        coversReady &&
                        row.status !==
                          'PENDING';

                      return (
                        <article
                          className={
                            [
                              'ep-menu-vendor-card',
                              hasAssignment
                                ? 'assigned'
                                : '',
                              stationReady
                                ? 'ready'
                                : '',
                              !hasAssignment ||
                              !coversReady
                                ? 'attention'
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' ')
                          }
                          key={row.id}
                        >
                          <div className="ep-menu-vendor-card-bar">
                            <div className="ep-menu-vendor-station">
                              <span>
                                {'Station ' + String(rowIndex + 1).padStart(2, '0')}
                              </span>
                              <b>{category}</b>
                            </div>

                            <span
                              className={
                                'ep-menu-status ' +
                                row.status.toLowerCase()
                              }
                            >
                              {row.status.replace(/_/g, ' ')}
                            </span>
                          </div>

                          <div className="ep-menu-vendor-card-main">
                            <div className="ep-menu-vendor-card-top">
                              <div>
                                <span>Menu Station</span>
                                <b>{row.requirement}</b>
                                <small>
                                  {hasAssignment
                                    ? row.partnerType === 'IN_HOUSE'
                                      ? 'Managed by your in-house team'
                                      : 'Assigned to ' + row.assignedTo
                                    : 'Assignment required before execution'}
                                </small>
                              </div>

                              <div className="ep-menu-vendor-cost">
                                <strong>
                                  {currency(
                                    row.quantity *
                                      row.rate,
                                  )}
                                </strong>
                                <small>estimated total</small>
                              </div>
                            </div>

                            <div className="ep-menu-dishes">
                              {dishes.length ? (
                                <>
                                  {dishes
                                    .slice(0, 5)
                                    .map((dish) => (
                                      <span key={dish.id}>
                                        {dish.name}
                                      </span>
                                    ))}
                                  {dishes.length > 5 ? (
                                    <span className="more">
                                      {'+' + (dishes.length - 5) + ' more'}
                                    </span>
                                  ) : null}
                                </>
                              ) : (
                                <span>
                                  {row.detail || 'No dish detail'}
                                </span>
                              )}
                            </div>

                            <div className="ep-menu-assignment-block">
                              <div className="ep-menu-block-title">
                                <span>Assignment</span>
                                <small>
                                  {hasAssignment
                                    ? 'Assigned'
                                    : 'Choose vendor or team'}
                                </small>
                              </div>

                              <label className="ep-menu-field">
                                <span>Saved Vendor / Team</span>
                                <select
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
                                  aria-label={'Assign vendor for ' + row.requirement}
                                >
                                  <option value="">
                                    Choose saved vendor
                                  </option>
                                  <option value="__in_house">
                                    In-house team
                                  </option>

                                  {matchingFoodVendors.length ? (
                                    <optgroup label="Matching food vendors">
                                      {matchingFoodVendors.map(
                                        (vendor) => (
                                          <option
                                            key={vendor.id}
                                            value={vendor.id}
                                          >
                                            {vendor.name} · {vendor.category || vendor.type}
                                          </option>
                                        ),
                                      )}
                                    </optgroup>
                                  ) : null}

                                  {otherFoodVendors.length ? (
                                    <optgroup label="Other active partners">
                                      {otherFoodVendors.map(
                                        (vendor) => (
                                          <option
                                            key={vendor.id}
                                            value={vendor.id}
                                          >
                                            {vendor.name} · {vendor.category || vendor.type}
                                          </option>
                                        ),
                                      )}
                                    </optgroup>
                                  ) : null}
                                </select>
                              </label>

                              <div className="ep-menu-field-grid">
                                <label className="ep-menu-field">
                                  <span>Manual Assignment</span>
                                  <input
                                    value={
                                      row.partnerId ||
                                      row.partnerType === 'IN_HOUSE'
                                        ? ''
                                        : row.assignedTo
                                    }
                                    placeholder="Type vendor/team name"
                                    onChange={(event) =>
                                      updateRow(row.id, {
                                        partnerId: '',
                                        assignedTo:
                                          event.target.value,
                                      })
                                    }
                                    aria-label={'Manual vendor for ' + row.requirement}
                                  />
                                </label>

                                <label className="ep-menu-field">
                                  <span>Partner Type</span>
                                  <select
                                    value={row.partnerType}
                                    onChange={(event) =>
                                      updateRow(row.id, {
                                        partnerType:
                                          event.target.value as PartnerType,
                                      })
                                    }
                                    aria-label={'Partner type for ' + row.requirement}
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
                                </label>
                              </div>

                              {assignedVendor ? (
                                <div className="ep-menu-contact">
                                  <div>
                                    <span>Vendor Contact</span>
                                    <b>
                                      {assignedVendor.contactPerson ||
                                        assignedVendor.name}
                                    </b>
                                    <small>
                                      {[
                                        assignedVendor.phone,
                                        assignedVendor.city,
                                        assignedVendor.paymentTerms,
                                      ]
                                        .filter(Boolean)
                                        .join(' · ') || 'No contact details saved'}
                                    </small>
                                  </div>

                                  {assignedVendor.phone ? (
                                    <a
                                      href={'tel:' + assignedVendor.phone}
                                    >
                                      Call
                                    </a>
                                  ) : null}
                                </div>
                              ) : row.partnerType === 'IN_HOUSE' ? (
                                <div className="ep-menu-contact">
                                  <div>
                                    <span>Team Contact</span>
                                    <b>In-house execution</b>
                                    <small>
                                      Managed internally for this function
                                    </small>
                                  </div>
                                </div>
                              ) : null}
                            </div>

                            <div className="ep-menu-commercial">
                              <div className="ep-menu-cover-box">
                                <span>Vendor Covers</span>

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
                                    aria-label="Decrease vendor covers"
                                  >
                                    −
                                  </button>

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
                                    aria-label="Vendor covers"
                                  />

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setMenuVendorCovers(
                                        row,
                                        row.quantity + 1,
                                      )
                                    }
                                    aria-label="Increase vendor covers"
                                  >
                                    +
                                  </button>
                                </div>

                                <div className="ep-menu-cover-note">
                                  <span>
                                    Function {functionCovers.toLocaleString('en-IN')}
                                  </span>
                                  <b
                                    className={
                                      variance < 0
                                        ? 'warn'
                                        : ''
                                    }
                                  >
                                    {variance === 0
                                      ? 'Matched'
                                      : variance > 0
                                        ? '+' + variance + ' extra'
                                        : Math.abs(variance) + ' short'}
                                  </b>
                                </div>

                                {functionCovers > 0 &&
                                row.quantity !== functionCovers ? (
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
                              </div>

                              <div className="ep-menu-rate-box">
                                <span>Rate / {row.unit || 'cover'}</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={row.rate}
                                  onChange={(event) =>
                                    updateRow(row.id, {
                                      rate:
                                        Math.max(
                                          0,
                                          Number(
                                            event.target.value,
                                          ) || 0,
                                        ),
                                    })
                                  }
                                  aria-label={'Rate for ' + row.requirement}
                                />
                                <small>
                                  Total{' '}
                                  <b>
                                    {currency(
                                      row.quantity *
                                        row.rate,
                                    )}
                                  </b>
                                </small>
                              </div>
                            </div>

                            <div className="ep-menu-time-grid">
                              <label className="ep-menu-field">
                                <span>Reporting / Setup Time</span>
                                <input
                                  type="datetime-local"
                                  value={row.deliveryTime}
                                  onChange={(event) =>
                                    updateRow(row.id, {
                                      deliveryTime:
                                        event.target.value,
                                    })
                                  }
                                  aria-label={'Reporting time for ' + row.requirement}
                                />
                              </label>

                              <label className="ep-menu-field">
                                <span>Pickup / Return Time</span>
                                <input
                                  type="datetime-local"
                                  value={row.pickupTime || ''}
                                  onChange={(event) =>
                                    updateRow(row.id, {
                                      pickupTime:
                                        event.target.value,
                                    })
                                  }
                                  aria-label={'Return time for ' + row.requirement}
                                />
                              </label>
                            </div>

                            <div className="ep-menu-status-actions">
                              {(
                                [
                                  'PENDING',
                                  'CONFIRMED',
                                  'DELIVERED',
                                  'CLOSED',
                                ] as AssignmentStatus[]
                              ).map((status) => (
                                <button
                                  key={status}
                                  className={
                                    [
                                      row.status === status
                                        ? 'active'
                                        : '',
                                      status === 'DELIVERED' ||
                                      status === 'CLOSED'
                                        ? 'done'
                                        : '',
                                    ]
                                      .filter(Boolean)
                                      .join(' ')
                                  }
                                  type="button"
                                  onClick={() =>
                                    updateRow(row.id, {
                                      status,
                                    })
                                  }
                                >
                                  {status}
                                </button>
                              ))}
                            </div>

                            <div className="ep-menu-quick-row">
                              <div>
                                {functionCovers > 0 &&
                                row.quantity !== functionCovers ? (
                                  <button
                                    className="ep-menu-mini-action primary"
                                    type="button"
                                    onClick={() =>
                                      useFunctionCovers(
                                        row,
                                      )
                                    }
                                  >
                                    Match covers
                                  </button>
                                ) : null}

                                {hasAssignment ? (
                                  <button
                                    className="ep-menu-mini-action"
                                    type="button"
                                    onClick={() =>
                                      assignPartner(
                                        row,
                                        '',
                                      )
                                    }
                                  >
                                    Clear assignment
                                  </button>
                                ) : null}

                                <button
                                  className="ep-menu-mini-action danger"
                                  type="button"
                                  onClick={() =>
                                    removeRow(
                                      row.id,
                                    )
                                  }
                                >
                                  Remove station
                                </button>
                              </div>

                              <div className="ep-menu-ready-copy">
                                <b>
                                  {stationReady
                                    ? 'Station ready'
                                    : !hasAssignment
                                      ? 'Vendor needed'
                                      : !coversReady
                                        ? 'Covers short'
                                        : !hasReportingTime
                                          ? 'Set reporting time'
                                          : 'Confirm assignment'}
                                </b>
                                {hasReportingTime
                                  ? row.deliveryTime.replace('T', ' ')
                                  : 'No reporting time'}
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="ep-empty">
                    No menu stations found for this function. Select dishes in the menu first, then return here to assign vendors.
                  </div>
                )}
              </section>
            ) : null}

            {tab === 'MANPOWER' ? (
              <section className="ep-manpower-agency-control">
                <div className="ep-manpower-agency-head">
                  <div>
                    <b>Manpower Agencies Workspace</b>
                    <span>
                      Assign your planned team, confirm headcounts and set reporting times for this function.
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

                <div className="ep-menu-function-context">
                  <div>
                    <span>Selected Function</span>
                    <b>{currentFunction.dayLabel} · {currentFunction.mealLabel}</b>
                    <small>{work.event.clientName || eventName} · {work.event.venue || work.event.city || 'Venue not set'}</small>
                  </div>
                  <div className="ep-menu-function-chips">
                    <span><b>{currentFunction.pax.toLocaleString('en-IN')}</b>covers</span>
                    <span><b>{manpowerAgencyRows.length}</b>roles</span>
                    <span><b>{manpowerAgencySummary.totalPeople}</b>people</span>
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

                <div className="ep-menu-vendor-progress">
                  <div><span>Team confirmation progress</span><b>{manpowerAgencySummary.readiness}%</b></div>
                  <span role="progressbar" aria-label="Manpower assignment readiness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={manpowerAgencySummary.readiness}>
                    <i style={{ width: manpowerAgencySummary.readiness + '%' }} />
                  </span>
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
                              const required = requiredManpowerQty(row);
                              const variance = row.quantity - required;
                              const assignedVendor = vendors.find((vendor) => vendor.id === row.partnerId);
                              const hasAssignment = Boolean(row.assignedTo.trim());
                              const short = required > 0 && variance < 0;
                              const roleReady = hasAssignment && !short && Boolean(row.deliveryTime) && row.status !== 'PENDING';
                              const agencyOptions = vendors.filter((vendor) => vendor.active && vendorMatchesManpowerAgency(vendor));
                              const otherOptions = vendors.filter((vendor) => vendor.active && !vendorMatchesManpowerAgency(vendor));
                              return (
                                <article className={['ep-manpower-role-card', hasAssignment ? 'assigned' : '', roleReady ? 'ready' : '', short ? 'attention' : ''].filter(Boolean).join(' ')} key={row.id}>
                                  <div className="ep-manpower-role-title">
                                    <div><span>{group.department}</span><b>{row.requirement}</b><small>{row.assignedTo || 'Choose an agency or your in-house team'}</small></div>
                                    <strong>{currency(row.quantity * row.rate)}</strong>
                                  </div>
                                  <div className="ep-manpower-role-meta">
                                    <span>Required<b>{required}</b></span>
                                    <span>Selected<b>{row.quantity}</b></span>
                                    <span className={short ? 'warn' : ''}>Coverage<b>{required <= 0 ? 'Custom' : variance === 0 ? 'Matched' : variance > 0 ? `+${variance} extra` : `${Math.abs(variance)} short`}</b></span>
                                  </div>
                                  <label className="ep-menu-field">
                                    <span>Agency / Team</span>
                                    <select value={row.partnerType === 'IN_HOUSE' && hasAssignment ? '__in_house' : row.partnerId || ''} onChange={(event) => assignPartner(row, event.target.value)} aria-label={'Assign agency for ' + row.requirement}>
                                      <option value="">Choose saved agency</option>
                                      <option value="__in_house">In-house team</option>
                                      {assignedVendor && !assignedVendor.active ? <option value={assignedVendor.id}>{assignedVendor.name} · Inactive</option> : null}
                                      {row.partnerId && !assignedVendor ? <option value={row.partnerId}>{row.assignedTo} · Unavailable partner</option> : null}
                                      {agencyOptions.length ? <optgroup label="Manpower agencies">{agencyOptions.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name} · {vendor.category || vendor.type}</option>)}</optgroup> : null}
                                      {otherOptions.length ? <optgroup label="Other active partners">{otherOptions.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name} · {vendor.category || vendor.type}</option>)}</optgroup> : null}
                                    </select>
                                  </label>
                                  <div className="ep-menu-field-grid">
                                    <label className="ep-menu-field"><span>Manual Agency / Team</span><input value={row.partnerId || row.partnerType === 'IN_HOUSE' ? '' : row.assignedTo} placeholder="Enter agency or supervisor name" onChange={(event) => updateRow(row.id, { partnerId: '', assignedTo: event.target.value, partnerType: row.partnerType === 'IN_HOUSE' ? 'AGENCY' : row.partnerType })} aria-label={'Manual agency for ' + row.requirement} /></label>
                                    <label className="ep-menu-field"><span>Partner Type</span><select value={row.partnerType} onChange={(event) => updateRow(row.id, { partnerType: event.target.value as PartnerType })} aria-label={'Partner type for ' + row.requirement}><option value="AGENCY">Agency</option><option value="VENDOR">Vendor</option><option value="IN_HOUSE">In-house</option></select></label>
                                  </div>
                                  {assignedVendor ? <div className="ep-menu-contact"><div><span>Agency Contact</span><b>{assignedVendor.contactPerson || assignedVendor.name}</b><small>{[assignedVendor.phone, assignedVendor.city].filter(Boolean).join(' · ') || 'No contact details saved'}</small></div>{assignedVendor.phone ? <a href={'tel:' + assignedVendor.phone} aria-label={'Call ' + assignedVendor.name}>Call</a> : null}</div> : null}
                                  <div className="ep-menu-field-grid">
                                    <div className="ep-manpower-qty-editor">
                                      <button type="button" disabled={row.quantity <= 1} aria-label={'Decrease people for ' + row.requirement} onClick={() => setManpowerAgencyQuantity(row, row.quantity - 1)}>−</button>
                                      <label><span>People</span><input type="number" min="1" step="1" value={row.quantity} onChange={(event) => { if (event.target.value && Number(event.target.value) >= 1) setManpowerAgencyQuantity(row, Number(event.target.value)); }} aria-label={'People for ' + row.requirement} /></label>
                                      <button type="button" aria-label={'Increase people for ' + row.requirement} onClick={() => setManpowerAgencyQuantity(row, row.quantity + 1)}>+</button>
                                    </div>
                                    <label className="ep-menu-field"><span>Rate / {row.unit || 'person'}</span><input type="number" min="0" step="0.01" value={row.rate} onChange={(event) => updateRow(row.id, { rate: Math.max(0, Number(event.target.value) || 0) })} aria-label={'Rate for ' + row.requirement} /></label>
                                  </div>
                                  {required > 0 && variance !== 0 ? <button className="ep-manpower-use-required" type="button" onClick={() => useRequiredManpowerQty(row)}>Match required headcount · {required} people</button> : null}
                                  <div className="ep-menu-time-grid">
                                    <label className="ep-menu-field"><span>Reporting Time</span><input type="datetime-local" value={row.deliveryTime} onChange={(event) => updateRow(row.id, { deliveryTime: event.target.value })} aria-label={'Reporting time for ' + row.requirement} /></label>
                                    <label className="ep-menu-field"><span>Release / Return Time</span><input type="datetime-local" value={row.pickupTime || ''} onChange={(event) => updateRow(row.id, { pickupTime: event.target.value })} aria-label={'Release time for ' + row.requirement} /></label>
                                  </div>
                                  <div className="ep-menu-status-actions" role="group" aria-label={'Staff status for ' + row.requirement}>
                                    {(['PENDING', 'CONFIRMED', 'DELIVERED', 'CLOSED'] as AssignmentStatus[]).map((status) => <button key={status} type="button" className={row.status === status ? 'active' : ''} aria-pressed={row.status === status} onClick={() => updateRow(row.id, { status })}>{status === 'DELIVERED' ? 'Reported' : status.charAt(0) + status.slice(1).toLowerCase()}</button>)}
                                  </div>
                                  <details className="ep-manpower-role-details">
                                    <summary>Role details & payment terms</summary>
                                    <div>
                                      <label className="ep-menu-field"><span>Role</span><input value={row.requirement} onChange={(event) => updateRow(row.id, { requirement: event.target.value })} aria-label={'Role name for ' + row.requirement} /></label>
                                      <label className="ep-menu-field"><span>Instructions / Duty</span><textarea value={row.detail} onChange={(event) => updateRow(row.id, { detail: event.target.value })} aria-label={'Duty instructions for ' + row.requirement} /></label>
                                      <label className="ep-menu-field"><span>Rate Unit</span><input value={row.unit} onChange={(event) => updateRow(row.id, { unit: event.target.value })} aria-label={'Rate unit for ' + row.requirement} /></label>
                                      <label className="ep-menu-field"><span>Payment Terms</span><input value={row.paymentTerms || ''} placeholder={assignedVendor?.paymentTerms || 'Enter agreed terms'} onChange={(event) => updateRow(row.id, { paymentTerms: event.target.value })} aria-label={'Payment terms for ' + row.requirement} /></label>
                                    </div>
                                  </details>
                                  <div className="ep-menu-quick-row"><div>
                                    {hasAssignment ? <button className="ep-menu-mini-action" type="button" onClick={() => assignPartner(row, '')}>Clear assignment</button> : null}
                                    <button className="ep-menu-mini-action danger" type="button" onClick={() => removeRow(row.id)} aria-label={'Remove role ' + row.requirement}>Remove role</button>
                                  </div></div>
                                  <div className="ep-manpower-role-footer"><b>{roleReady ? 'Team ready' : !hasAssignment ? 'Agency needed' : short ? `${Math.abs(variance)} more people needed` : !row.deliveryTime ? 'Set reporting time' : 'Confirm team'}</b><small>{row.deliveryTime ? 'Reports ' + row.deliveryTime.replace('T', ' ') : 'Reporting time not set'}{row.paymentTerms ? ' · ' + row.paymentTerms : ''}</small></div>
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
                    <b>Transport Assignment Workspace</b>
                    <span>
                      Plan food, equipment, staff and extra trips for this function. Assign a vehicle partner, agree the rate and confirm dispatch and return times.
                    </span>
                  </div>

                  <Link
                    className="ep-button"
                    href="/app/vendors"
                  >
                    Transport Vendors
                  </Link>
                </div>

                <div className="ep-menu-function-context">
                  <div><span>Selected Function</span><b>{currentFunction.dayLabel} · {currentFunction.mealLabel}</b><small>{work.event.clientName || eventName} · {work.event.venue || work.event.city || 'Venue not set'}</small></div>
                  <div className="ep-menu-function-chips"><span><b>{Math.max(0, Number(currentFunction.pax) || 0).toLocaleString('en-IN')}</b> guests</span><span><b>{transportRows.length}</b> transport lines</span></div>
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
                    <span>Dispatch Time Set</span>
                    <b>{transportSummary.withTiming}/{transportRows.length}</b>
                    <small>Dispatch/reporting time entered</small>
                  </article>
                  <article>
                    <span>Confirmed</span>
                    <b>{transportSummary.confirmed}</b>
                    <small>{transportSummary.readiness}% confirmation progress</small>
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
                            ? `${quantity} planned · + Add trip`
                            : '+ Add trip'}
                        </b>
                      </button>
                    );
                  })}
                </div>

                <div className="ep-transport-selected-head">
                  <h2>Vehicle & trip assignments</h2>
                  <p>Manage saved and custom transport lines here. Use trip details for vehicle requirements, route instructions and payment terms.</p>
                </div>
                {transportRows.length ? (
                  <div className="ep-manpower-role-grid ep-transport-assignment-grid">
                    {transportRows.map((row) => {
                      const vendor = vendors.find((item) => item.id === row.partnerId);
                      const hasAssignment = Boolean(row.assignedTo.trim());
                      return (
                        <article key={row.id} className={['ep-manpower-role-card', 'ep-transport-assignment-card', !hasAssignment ? 'attention' : row.status !== 'PENDING' ? 'ready' : 'assigned'].join(' ')}>
                          {assignmentPhoto(row) ? <img className="ep-transport-assignment-photo" src={assignmentPhoto(row)} alt={row.requirement} loading="lazy" /> : null}
                          <div className="ep-manpower-role-title"><div><span>{TRANSPORT_PRESETS.find((preset) => preset.key === transportPresetKey(row))?.label || 'Transport'}</span><b>{row.requirement}</b><small>{row.assignedTo || 'Vehicle partner needed'}</small></div><strong>{currency(row.quantity * row.rate)}</strong></div>
                          {row.detail ? <p className="ep-transport-instructions">{row.detail}</p> : null}
                          <label className="ep-menu-field"><span>Vehicle Partner / Team</span>
                            <select value={row.partnerType === 'IN_HOUSE' && hasAssignment ? '__in_house' : row.partnerId || ''} onChange={(event) => assignPartner(row, event.target.value)} aria-label={'Transport partner for ' + row.requirement}>
                              <option value="">Choose saved partner</option><option value="__in_house">In-house transport</option>
                              {vendor && !vendor.active ? <option value={vendor.id}>{vendor.name} · Inactive</option> : null}
                              {row.partnerId && !vendor ? <option value={row.partnerId}>{row.assignedTo} · Unavailable partner</option> : null}
                              <optgroup label="Transport vendors">{vendors.filter((item) => item.active && vendorMatchesTransport(item)).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.category || item.type}</option>)}</optgroup>
                              <optgroup label="Other active partners">{vendors.filter((item) => item.active && !vendorMatchesTransport(item)).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.category || item.type}</option>)}</optgroup>
                            </select>
                          </label>
                          <div className="ep-menu-field-grid">
                            <label className="ep-menu-field"><span>Manual Partner / Team</span><input value={row.partnerId || row.partnerType === 'IN_HOUSE' ? '' : row.assignedTo} placeholder="Enter partner or team name" onChange={(event) => updateRow(row.id, { partnerId: '', assignedTo: event.target.value, partnerType: row.partnerType === 'IN_HOUSE' ? 'VENDOR' : row.partnerType })} aria-label={'Manual transport partner for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Partner Type</span><select value={row.partnerType} onChange={(event) => updateRow(row.id, { partnerType: event.target.value as PartnerType })} aria-label={'Transport partner type for ' + row.requirement}><option value="IN_HOUSE">In-house</option><option value="VENDOR">Vendor</option><option value="AGENCY">Agency</option></select></label>
                          </div>
                          {vendor ? <div className="ep-menu-contact"><div><span>Partner Contact</span><b>{vendor.contactPerson || vendor.name}</b><small>{[vendor.phone, vendor.city].filter(Boolean).join(' · ') || 'No contact details saved'}</small></div>{vendor.phone ? <a href={'tel:' + vendor.phone} aria-label={'Call transport partner ' + vendor.name}>Call</a> : null}</div> : null}
                          <div className="ep-menu-field-grid">
                            <div className="ep-transport-qty-editor">
                              <button type="button" disabled={row.quantity <= 1} onClick={() => setTransportQuantity(row, row.quantity - 1)} aria-label={'Decrease trips for ' + row.requirement}>−</button>
                              <label><span>Trips / Vehicles</span><input type="number" min="1" step="1" value={row.quantity} onChange={(event) => { if (event.target.value !== '') setTransportQuantity(row, Number(event.target.value)); }} aria-label={'Transport quantity for ' + row.requirement} /></label>
                              <button type="button" onClick={() => setTransportQuantity(row, row.quantity + 1)} aria-label={'Increase trips for ' + row.requirement}>+</button>
                            </div>
                            <label className="ep-menu-field"><span>Rate / {row.unit || 'trip'}</span><input type="number" min="0" step="0.01" value={row.rate} onChange={(event) => updateRow(row.id, { rate: Math.max(0, Number(event.target.value) || 0) })} aria-label={'Transport rate for ' + row.requirement} /></label>
                          </div>
                          <div className="ep-menu-time-grid">
                            <label className="ep-menu-field"><span>Dispatch / Reporting Time</span><input type="datetime-local" value={row.deliveryTime} onChange={(event) => updateRow(row.id, { deliveryTime: event.target.value })} aria-label={'Transport dispatch time for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Pickup / Return Time</span><input type="datetime-local" value={row.pickupTime || ''} onChange={(event) => updateRow(row.id, { pickupTime: event.target.value })} aria-label={'Transport return time for ' + row.requirement} /></label>
                          </div>
                          <div className="ep-menu-status-actions" role="group" aria-label={'Transport status for ' + row.requirement}>
                            {(['PENDING', 'CONFIRMED', 'DELIVERED', 'CLOSED'] as AssignmentStatus[]).map((status) => <button key={status} type="button" className={row.status === status ? 'active' : ''} aria-pressed={row.status === status} onClick={() => updateRow(row.id, { status })}>{status === 'DELIVERED' ? 'Delivered' : status.charAt(0) + status.slice(1).toLowerCase()}</button>)}
                          </div>
                          <details className="ep-manpower-role-details"><summary>Trip details & payment terms</summary><div>
                            <label className="ep-menu-field"><span>Vehicle / Trip Name</span><input value={row.requirement} onChange={(event) => updateRow(row.id, { requirement: event.target.value })} aria-label={'Transport requirement for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Route / Vehicle Instructions</span><textarea value={row.detail} placeholder="Pickup, destination and vehicle requirements" onChange={(event) => updateRow(row.id, { detail: event.target.value })} aria-label={'Transport instructions for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Unit</span><input value={row.unit} onChange={(event) => updateRow(row.id, { unit: event.target.value })} aria-label={'Transport unit for ' + row.requirement} /></label>
                            <label className="ep-menu-field"><span>Payment Terms</span><input value={row.paymentTerms || ''} placeholder={vendor?.paymentTerms || 'Enter agreed terms'} onChange={(event) => updateRow(row.id, { paymentTerms: event.target.value })} aria-label={'Transport payment terms for ' + row.requirement} /></label>
                          </div></details>
                          <div className="ep-menu-quick-row"><div>{hasAssignment ? <button type="button" className="ep-menu-mini-action" onClick={() => assignPartner(row, '')}>Clear assignment</button> : null}<button type="button" className="ep-menu-mini-action danger" onClick={() => removeRow(row.id)} aria-label={'Remove transport ' + row.requirement}>Remove transport</button></div></div>
                          <div className="ep-manpower-role-footer"><b>{!hasAssignment ? 'Assign vehicle partner or team' : !row.deliveryTime ? 'Set dispatch time' : row.status === 'PENDING' ? 'Confirm assignment' : row.status === 'CLOSED' ? 'Assignment closed' : row.status === 'DELIVERED' ? 'Delivery completed' : 'Assignment confirmed'}</b><small>{row.pickupTime ? 'Return ' + row.pickupTime.replace('T', ' ') : 'Return time not set'}</small></div>
                        </article>
                      );
                    })}
                  </div>
                ) : <div className="ep-empty">No transport planned yet. Add a transport type above or a custom requirement below.</div>}
              </section>
            ) : null}

            <footer className="ep-table-actions">
              <span className="ep-hint">
                {tab === 'MENU'
                  ? 'Menu categories come from the selected function menu. Matching food vendors are shown first; covers and vendor rates remain editable.'
                  : tab === 'CROCKERY'
                    ? 'Choose crockery by photo, use the saved guest and buffer rules, then confirm quantities, rentals and return times for this function.'
                  : tab === 'EQUIPMENT'
                    ? 'Find saved equipment by photo or search, set quantities for this function, then confirm rental or in-house assignments and return times.'
                  : tab === 'DISPOSABLE'
                    ? 'Choose items by photo, set quantities for this function, then confirm suppliers and delivery times.'
                  : tab === 'DRESS'
                    ? 'Choose dress by photo, set quantities for each staff role, then confirm suppliers, issue times and returns.'
                  : tab === 'GROCERY'
                    ? 'Grocery suppliers are separated into Grocery, Dairy, and Vegetables & Fruits. Matching vendor categories are shown first.'
                    : tab === 'MANPOWER'
                      ? 'Roles come from the saved manpower plan. Agencies are shown first, and manual Event Planning quantity changes stay under your control.'
                      : tab === 'TRANSPORT'
                        ? 'Add food, equipment, staff or extra trips, then manage partner, rate, dispatch, return and confirmation directly in each card.'
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






