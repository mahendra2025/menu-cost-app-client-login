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
    ['Vegetables', 'Fresh vegetables and herbs'],
    ['Dairy', 'Paneer, milk, curd, butter and dairy'],
    ['Dry Grocery', 'Grains, pulses, spices, oil and grocery'],
    ['Fruits & Dry Fruits', 'Fruit, nuts and premium garnish'],
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
      'Kitchen to venue vehicle',
      'Food, equipment and service material dispatch',
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

  const overallReadiness = readiness(allRows);
  const functionReadiness = readiness(currentRows);

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

  const equipmentShortages =
    currentRows.filter(
      (row) =>
        row.kind === 'EQUIPMENT' &&
        Boolean(row.equipmentId) &&
        Number(row.availableQty) > 0 &&
        Number(row.quantity) > Number(row.availableQty),
    );

  const crockeryShortages =
    currentRows.filter(
      (row) =>
        row.kind === 'CROCKERY' &&
        Boolean(row.crockeryId) &&
        Number(row.availableQty) > 0 &&
        Number(row.quantity) > Number(row.availableQty),
    );

  const uniformShortages =
    currentRows.filter(
      (row) =>
        row.kind === 'DRESS' &&
        Boolean(row.uniformId) &&
        Number(row.availableQty) >= 0 &&
        Number(row.quantity) > Number(row.availableQty),
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

  function addEquipmentFromMaster(
    item: EquipmentItem,
  ) {
    if (!currentFunction) return;

    const baseRows =
      plan[currentFunction.key] || defaultRows;

    const existing =
      baseRows.find(
        (row) =>
          row.kind === 'EQUIPMENT' &&
          row.equipmentId === item.id,
      );

    if (existing) {
      persistRows(
        currentFunction.key,
        baseRows.map((row) =>
          row.id === existing.id
            ? {
                ...row,
                quantity:
                  Math.max(
                    0,
                    Number(row.quantity) || 0,
                  ) + 1,
              }
            : row,
        ),
      );
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
      1,
      item.unit || 'unit',
      item.defaultRate,
    );

    persistRows(
      currentFunction.key,
      [
        ...baseRows,
        {
          ...row,
          equipmentId: item.id,
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

  function selectedEquipmentQty(
    equipmentId: string,
  ) {
    return currentRows
      .filter(
        (row) =>
          row.kind === 'EQUIPMENT' &&
          row.equipmentId === equipmentId,
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

  function addCrockeryFromMaster(
    item: CrockeryItem,
  ) {
    if (!currentFunction) return;

    const baseRows =
      plan[currentFunction.key] || defaultRows;

    const suggestedQty =
      recommendedCrockeryQty(item);

    const existing =
      baseRows.find(
        (row) =>
          row.kind === 'CROCKERY' &&
          row.crockeryId === item.id,
      );

    if (existing) {
      persistRows(
        currentFunction.key,
        baseRows.map((row) =>
          row.id === existing.id
            ? {
                ...row,
                quantity:
                  suggestedQty ||
                  row.quantity,
              }
            : row,
        ),
      );
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
      ]
        .filter(Boolean)
        .join(' · '),
      suggestedQty,
      item.unit || 'pcs',
      item.defaultRate,
    );

    persistRows(
      currentFunction.key,
      [
        ...baseRows,
        {
          ...row,
          crockeryId: item.id,
          photoUrl: item.photoUrl,
          availableQty: item.availableQty,
          unitsPerGuest: item.unitsPerGuest,
          bufferPercent: item.bufferPercent,
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

  function selectedCrockeryQty(
    crockeryId: string,
  ) {
    return currentRows
      .filter(
        (row) =>
          row.kind === 'CROCKERY' &&
          row.crockeryId === crockeryId,
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
    return currentRows
      .filter(
        (row) =>
          row.kind === 'DRESS' &&
          row.uniformId === uniformId,
      )
      .reduce(
        (sum, row) =>
          sum +
          Math.max(0, Number(row.quantity) || 0),
        0,
      );
  }

  function addUniformFromMaster(
    item: UniformItem,
  ) {
    if (!currentFunction) return;

    const baseRows =
      plan[currentFunction.key] || defaultRows;
    const suggestedQty =
      requiredUniformQty(item);

    const existing =
      baseRows.find(
        (row) =>
          row.kind === 'DRESS' &&
          row.uniformId === item.id,
      );

    if (existing) {
      persistRows(
        currentFunction.key,
        baseRows.map((row) =>
          row.id === existing.id
            ? {
                ...row,
                quantity:
                  suggestedQty ||
                  row.quantity,
              }
            : row,
        ),
      );
      return;
    }

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
      ]
        .filter(Boolean)
        .join(' · '),
      suggestedQty,
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
    return currentRows
      .filter(
        (row) =>
          row.kind === 'DISPOSABLE' &&
          row.disposableMasterId === masterId,
      )
      .reduce(
        (sum, row) =>
          sum +
          Math.max(0, Number(row.quantity) || 0),
        0,
      );
  }

  function addDisposableFromMaster(
    item: DisposableMasterItem,
  ) {
    if (!currentFunction) return;

    const baseRows =
      plan[currentFunction.key] || defaultRows;

    const existing =
      baseRows.find(
        (row) =>
          row.kind === 'DISPOSABLE' &&
          (
            row.disposableMasterId === item.id ||
            normalized(row.requirement) === normalized(item.name)
          ),
      );

    if (existing) {
      persistRows(
        currentFunction.key,
        baseRows.map((row) =>
          row.id === existing.id
            ? {
                ...row,
                disposableMasterId: item.id,
                photoUrl: item.photoUrl || row.photoUrl,
                unit: item.unit || row.unit,
                rate:
                  Number(row.rate) > 0
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
                      : row.partnerType,
              }
            : row,
        ),
      );
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
      0,
      item.unit || 'pcs',
      item.defaultRate,
    );

    persistRows(
      currentFunction.key,
      [
        ...baseRows,
        {
          ...row,
          disposableMasterId: item.id,
          photoUrl: item.photoUrl,
          partnerId: item.supplierId,
          assignedTo: item.supplierName,
          partnerType:
            item.supplierName
              ? 'VENDOR'
              : 'IN_HOUSE',
        },
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

          <article className="ep-stat ready">
            <small>Overall Readiness</small>
            <strong>{overallReadiness}%</strong>
            <span>All event requirements</span>
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
            const score = readiness(rows);

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
              <span className="ep-chip ready">
                {functionReadiness}% ready
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
                const count = currentRows.filter(
                  (row) => row.kind === item.kind,
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

            {tab === 'DISPOSABLE' ? (
              <section className="ep-equipment-picker">
                <div className="ep-equipment-picker-head">
                  <div>
                    <b>Choose disposable by photo</b>
                    <span>
                      Tap a saved item to attach its photo, unit, supplier and default rate.
                    </span>
                  </div>

                  <Link className="ep-button" href="/app/disposable-master">
                    Manage Photos
                  </Link>
                </div>

                {disposableMaster.filter((item) => item.active).length ? (
                  <div className="ep-equipment-grid">
                    {disposableMaster
                      .filter((item) => item.active)
                      .map((item) => {
                        const selected =
                          selectedDisposableQty(item.id);

                        return (
                          <button
                            key={item.id}
                            className={
                              selected > 0
                                ? 'ep-equipment-card selected'
                                : 'ep-equipment-card'
                            }
                            type="button"
                            onClick={() =>
                              addDisposableFromMaster(item)
                            }
                          >
                            <div className="ep-equipment-photo">
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
                            </div>

                            <div className="ep-equipment-card-body">
                              <b>{item.name}</b>
                              <span>
                                {item.category} · {item.unit}
                              </span>
                              <small>
                                {selected > 0
                                  ? `Selected ${selected} ${item.unit}`
                                  : `${currency(item.defaultRate)} / ${item.unit}`}
                              </small>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                ) : (
                  <div className="ep-empty">
                    No disposable photos saved yet. Open Disposable Master and add items first.
                  </div>
                )}
              </section>
            ) : null}

            {tab === 'DRESS' ? (
              <section className="ep-equipment-picker">
                <div className="ep-equipment-picker-head">
                  <div>
                    <b>Choose staff dress by photo</b>
                    <span>
                      Required sets are calculated from the assigned manpower role.
                    </span>
                  </div>

                  <Link className="ep-button" href="/app/uniforms">
                    Manage Uniforms
                  </Link>
                </div>

                {uniforms.filter((item) => item.active).length ? (
                  <div className="ep-equipment-grid">
                    {uniforms
                      .filter((item) => item.active)
                      .map((item) => {
                        const required =
                          requiredUniformQty(item);
                        const selected =
                          selectedUniformQty(item.id);
                        const shortage =
                          Math.max(
                            0,
                            selected - item.availableQty,
                          );

                        return (
                          <button
                            key={item.id}
                            className={
                              shortage > 0
                                ? 'ep-equipment-card over'
                                : 'ep-equipment-card'
                            }
                            type="button"
                            onClick={() =>
                              addUniformFromMaster(item)
                            }
                          >
                            <div className="ep-equipment-photo">
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
                            </div>

                            <div className="ep-equipment-card-body">
                              <b>{item.name}</b>
                              <span>
                                {item.staffRole || 'No role'}
                                {item.components
                                  ? ` · ${item.components}`
                                  : ''}
                              </span>
                              <small>
                                Required {required} · Selected {selected} · Available {item.availableQty}
                              </small>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                ) : (
                  <div className="ep-empty">
                    No uniform photos saved yet. Open Dress Master and add staff uniforms first.
                  </div>
                )}
              </section>
            ) : null}

            {tab === 'EQUIPMENT' ? (
              <section className="ep-equipment-picker">
                <div className="ep-equipment-picker-head">
                  <div>
                    <b>Choose equipment by photo</b>
                    <span>
                      Tap a photo to add one unit to this function.
                    </span>
                  </div>

                  <Link className="ep-button" href="/app/equipment">
                    Manage Photos
                  </Link>
                </div>

                {equipment.filter((item) => item.active).length ? (
                  <div className="ep-equipment-grid">
                    {equipment
                      .filter((item) => item.active)
                      .map((item) => {
                        const selected =
                          selectedEquipmentQty(item.id);
                        const over =
                          item.availableQty > 0 &&
                          selected > item.availableQty;

                        return (
                          <button
                            key={item.id}
                            className={
                              over
                                ? 'ep-equipment-card over'
                                : 'ep-equipment-card'
                            }
                            type="button"
                            onClick={() =>
                              addEquipmentFromMaster(item)
                            }
                          >
                            <div className="ep-equipment-photo">
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
                            </div>

                            <div className="ep-equipment-card-body">
                              <b>{item.name}</b>
                              <span>
                                {item.category}
                                {item.capacity
                                  ? ` · ${item.capacity}`
                                  : ''}
                              </span>
                              <small>
                                Selected {selected} · Available {item.availableQty}
                              </small>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                ) : (
                  <div className="ep-empty">
                    No photo equipment saved yet. Open Equipment Master and add photos first.
                  </div>
                )}
              </section>
            ) : null}

            {tab === 'CROCKERY' ? (
              <section className="ep-equipment-picker">
                <div className="ep-equipment-picker-head">
                  <div>
                    <b>Choose crockery & cutlery by photo</b>
                    <span>
                      Quantity is suggested from guests × units per guest + buffer.
                    </span>
                  </div>

                  <Link className="ep-button" href="/app/crockery">
                    Manage Photos
                  </Link>
                </div>

                {crockery.filter((item) => item.active).length ? (
                  <div className="ep-equipment-grid">
                    {crockery
                      .filter((item) => item.active)
                      .map((item) => {
                        const selected =
                          selectedCrockeryQty(item.id);
                        const suggested =
                          recommendedCrockeryQty(item);
                        const over =
                          item.availableQty > 0 &&
                          selected > item.availableQty;

                        return (
                          <button
                            key={item.id}
                            className={
                              over
                                ? 'ep-equipment-card over'
                                : 'ep-equipment-card'
                            }
                            type="button"
                            onClick={() =>
                              addCrockeryFromMaster(item)
                            }
                          >
                            <div className="ep-equipment-photo">
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
                            </div>

                            <div className="ep-equipment-card-body">
                              <b>{item.name}</b>
                              <span>
                                {item.category}
                                {item.sizeType
                                  ? ` · ${item.sizeType}`
                                  : ''}
                              </span>
                              <small>
                                Suggested {suggested} · Selected {selected} · Available {item.availableQty}
                              </small>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                ) : (
                  <div className="ep-empty">
                    No crockery photos saved yet. Open Crockery Master and add items first.
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
                            {vendors
                              .filter((vendor) => vendor.active)
                              .map((vendor) => (
                                <option
                                  key={vendor.id}
                                  value={vendor.id}
                                >
                                  {vendor.name} · {vendor.type}
                                </option>
                              ))}
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
                Suggestions come from the current menu,
                manpower and disposable data. Saved partners
                can auto-fill rates, and edits sync to PostgreSQL.
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
            <section className="ep-side-card">
              <h3>Function Readiness</h3>
              <div className="ep-progress">
                {TABS.map((item) => {
                  const rows = currentRows.filter(
                    (row) => row.kind === item.kind,
                  );
                  const score = readiness(rows);

                  return (
                    <div
                      className="ep-progress-row"
                      key={item.kind}
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
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="ep-side-card">
              <h3>Pending Attention</h3>
              <div className="ep-pending">
                {equipmentShortages.map((row) => (
                  <div
                    className="ep-pending-row"
                    key={`shortage:${row.id}`}
                  >
                    <b>{row.requirement} shortage</b>
                    <span>
                      Selected {row.quantity} · Available {row.availableQty}
                    </span>
                  </div>
                ))}

                {crockeryShortages.map((row) => (
                  <div
                    className="ep-pending-row"
                    key={`shortage:${row.id}`}
                  >
                    <b>{row.requirement} shortage</b>
                    <span>
                      Selected {row.quantity} · Available {row.availableQty}
                    </span>
                  </div>
                ))}

                {uniformShortages.map((row) => (
                  <div
                    className="ep-pending-row"
                    key={`uniform-shortage:${row.id}`}
                  >
                    <b>{row.requirement} shortage</b>
                    <span>
                      Required {row.quantity} · Available {row.availableQty}
                    </span>
                  </div>
                ))}

                {currentRows
                  .filter(
                    (row) =>
                      row.status === 'PENDING' ||
                      !row.assignedTo.trim(),
                  )
                  .slice(0, 7)
                  .map((row) => (
                    <div
                      className="ep-pending-row"
                      key={row.id}
                    >
                      <b>{row.requirement}</b>
                      <span>
                        {!row.assignedTo.trim()
                          ? 'Not assigned'
                          : 'Assigned but not confirmed'}
                      </span>
                    </div>
                  ))}

                {!equipmentShortages.length &&
                !crockeryShortages.length &&
                !uniformShortages.length &&
                !currentRows.some(
                  (row) =>
                    row.status === 'PENDING' ||
                    !row.assignedTo.trim(),
                ) ? (
                  <div className="ep-hint">
                    No pending assignments for this function.
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
