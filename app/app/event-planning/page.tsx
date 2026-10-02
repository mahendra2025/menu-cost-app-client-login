'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import Link from 'next/link';

import AppShell from '../../components/AppShell';

import {
  getSession,
  loadWork,
  uid,
} from '../../../lib/store';

import type {
  MenuItem,
  WorkState,
} from '../../../lib/types';

type RequirementKind =
  | 'MENU'
  | 'MANPOWER'
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
  photoUrl?: string;
  availableQty?: number;
  partnerType: PartnerType;
  rate: number;
  deliveryTime: string;
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

const TABS: Array<{
  kind: RequirementKind;
  label: string;
}> = [
  { kind: 'MENU', label: 'Menu Vendors' },
  { kind: 'MANPOWER', label: 'Manpower Agencies' },
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
  const [saveState, setSaveState] =
    useState<'SAVED' | 'SAVING' | 'ERROR'>('SAVED');
  const saveTimer =
    useRef<number | undefined>(undefined);

  useEffect(() => {
    const session = getSession();

    if (!session) {
      window.location.assign('/login');
      return;
    }

    const currentWork = loadWork(session.tenantId);
    const functions = buildFunctions(currentWork);
    const localPlan = safeReadPlan(currentWork.costingId);

    setWork(currentWork);
    setPlan(localPlan);
    setSelectedFunction(functions[0]?.key || 'event');

    void Promise.all([
      fetch('/api/client/vendors', {
        cache: 'no-store',
      }),
      fetch('/api/client/equipment', {
        cache: 'no-store',
      }),
      fetch(
        `/api/client/event-planning?costingId=${encodeURIComponent(
          currentWork.costingId,
        )}`,
        {
          cache: 'no-store',
        },
      ),
    ])
      .then(async ([vendorResponse, equipmentResponse, planningResponse]) => {
        if (vendorResponse.ok) {
          const vendorData = await vendorResponse.json();
          setVendors(
            Array.isArray(vendorData.vendors)
              ? vendorData.vendors as Vendor[]
              : [],
          );
        }

        if (equipmentResponse.ok) {
          const equipmentData = await equipmentResponse.json();
          setEquipment(
            Array.isArray(equipmentData.equipment)
              ? equipmentData.equipment as EquipmentItem[]
              : [],
          );
        }

        if (planningResponse.ok) {
          const planningData = await planningResponse.json();
          const serverPlan =
            planningData.plan &&
            typeof planningData.plan === 'object' &&
            !Array.isArray(planningData.plan)
              ? planningData.plan as StoredPlan
              : {};

          if (
            planningData.exists &&
            Object.keys(serverPlan).length
          ) {
            setPlan(serverPlan);
            writePlan(currentWork.costingId, serverPlan);
          }
        }
      })
      .catch(() => {
        // Local fallback remains usable if the server is temporarily unavailable.
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

  const equipmentShortages =
    currentRows.filter(
      (row) =>
        row.kind === 'EQUIPMENT' &&
        Boolean(row.equipmentId) &&
        Number(row.availableQty) > 0 &&
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
          @media(max-width:1180px){.ep-stats{grid-template-columns:repeat(3,1fr)}.ep-layout{grid-template-columns:1fr}.ep-side{grid-template-columns:repeat(3,1fr)}}
          @media(max-width:720px){.ep-page{gap:10px}.ep-hero{align-items:stretch;flex-direction:column;padding-top:8px}.ep-hero h1{font-size:28px}.ep-stats{grid-template-columns:1fr 1fr}.ep-layout{display:block}.ep-side{display:grid;grid-template-columns:1fr;margin-top:10px}.ep-function{min-width:145px}.ep-panel-head{align-items:stretch;flex-direction:column}.ep-panel-head .ep-button{width:100%}}
        `}</style>

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
            <Link className="ep-button" href="/app/event?resume=1">
              Edit Event & Menu
            </Link>
            <Link className="ep-button primary" href="/app/final-costing">
              Open Final Cost
            </Link>
          </div>
        </header>

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

            {visibleRows.length ? (
              <div className="ep-table-wrap">
                <table className="ep-table">
                  <thead>
                    <tr>
                      <th>Requirement</th>
                      <th>Qty</th>
                      <th>Assign To</th>
                      <th>Type</th>
                      <th>Rate</th>
                      <th>Total</th>
                      <th>Delivery / Reporting</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {visibleRows.map((row) => (
                      <tr key={row.id}>
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
