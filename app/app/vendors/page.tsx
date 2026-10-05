'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import AppShell from '../../components/AppShell';
import { getSession, loadWork, uid } from '../../../lib/store';

type RequirementKind =
  | 'MENU'
  | 'MANPOWER'
  | 'GROCERY'
  | 'DISPOSABLE'
  | 'EQUIPMENT'
  | 'CROCKERY'
  | 'TRANSPORT'
  | 'GENERAL';

type VendorRate = {
  id: string;
  kind: RequirementKind;
  item: string;
  unit: string;
  rate: number;
};

type AssignmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'DELIVERED'
  | 'CLOSED';

type PlanningAssignment = {
  id: string;
  assignedTo: string;
  partnerId?: string;
  partnerType: 'IN_HOUSE' | 'VENDOR' | 'AGENCY';
  status: AssignmentStatus;
};

type PlanningPlan =
  Record<string, PlanningAssignment[]>;

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
  preferred: boolean;
  reliability: 'NEW' | 'RELIABLE' | 'EXCELLENT';
  serviceArea: string;
  confirmationStatus: 'OPEN' | 'CONFIRMED' | 'ON_HOLD';
  paymentStatus: 'NOT_SET' | 'PENDING' | 'PARTIAL' | 'PAID';
  menuStations: string[];
  rates: VendorRate[];
};

const KIND_OPTIONS: Array<{
  value: RequirementKind;
  label: string;
}> = [
  { value: 'MENU', label: 'Menu / Food' },
  { value: 'MANPOWER', label: 'Manpower' },
  { value: 'GROCERY', label: 'Grocery' },
  { value: 'DISPOSABLE', label: 'Disposable' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'CROCKERY', label: 'Crockery & Cutlery' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'GENERAL', label: 'General' },
];

const MENU_STATION_OPTIONS = [
  'Welcome Drink',
  'Starter',
  'Soup',
  'Sweet',
  'Farsan',
  'Sabji',
  'Paneer',
  'Main Course',
  'Bread',
  'Tandoor',
  'Dal / Kadhi',
  'Rice',
  'Salad',
  'Raita',
  'Papad',
  'Pickle',
  'Chaat',
  'Chinese',
  'South Indian',
  'Punjabi',
  'North Indian',
  'Japanese',
  'Mexican',
  'Thai',
  'Asian',
  'Mongolian',
  'Dessert',
  'Bakery',
  'Waffles',
  'Ice Cream',
  'Fruit',
  'Beverage',
  'Mukhwas',
  'Paan',
] as const;

function blankVendor(): Vendor {
  return {
    id: uid('vendor'),
    name: '',
    type: 'VENDOR',
    category: 'General',
    contactPerson: '',
    phone: '',
    city: '',
    gst: '',
    paymentTerms: '',
    notes: '',
    active: true,
    preferred: false,
    reliability: 'NEW',
    serviceArea: '',
    confirmationStatus: 'OPEN',
    paymentStatus: 'NOT_SET',
    menuStations: [],
    rates: [],
  };
}

function blankRate(): VendorRate {
  return {
    id: uid('vendor_rate'),
    kind: 'GENERAL',
    item: '',
    unit: 'unit',
    rate: 0,
  };
}

function currency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Number(value) || 0));
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'PREFERRED'>('ALL');
  const [planningPlan, setPlanningPlan] = useState<PlanningPlan>({});
  const [currentEventName, setCurrentEventName] = useState('');
  const [planningLoading, setPlanningLoading] = useState(false);
  const [customStationName, setCustomStationName] = useState('');

  useEffect(() => {
    const session = getSession();
    if (!session) {
      window.location.assign('/login');
      return;
    }

    void loadVendors();

    const currentWork =
      loadWork(session.tenantId);

    setCurrentEventName(
      currentWork.event.eventName ||
      currentWork.event.clientName ||
      'Current event',
    );

    if (currentWork.costingId) {
      setPlanningLoading(true);
      void fetch(
        `/api/client/event-planning?costingId=${encodeURIComponent(
          currentWork.costingId,
        )}`,
        {
          cache: 'no-store',
        },
      )
        .then(async (response) => {
          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.error ||
                'Could not load event assignments.',
            );
          }

          setPlanningPlan(
            data.plan &&
            typeof data.plan === 'object' &&
            !Array.isArray(data.plan)
              ? data.plan as PlanningPlan
              : {},
          );
        })
        .catch(() => {
          setPlanningPlan({});
        })
        .finally(() => {
          setPlanningLoading(false);
        });
    }
  }, []);

  async function loadVendors() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/client/vendors', {
        cache: 'no-store',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not load vendors');
      }

      const rows = Array.isArray(data.vendors)
        ? data.vendors as Vendor[]
        : [];

      setVendors(rows);
      setSelectedId((current) =>
        current && rows.some((row) => row.id === current)
          ? current
          : rows[0]?.id || '',
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not load vendors',
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveVendors(nextVendors = vendors) {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/client/vendors', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vendors: nextVendors,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not save vendors');
      }

      const saved = Array.isArray(data.vendors)
        ? data.vendors as Vendor[]
        : nextVendors;

      setVendors(saved);
      setMessage('Vendor master saved.');
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not save vendors',
      );
    } finally {
      setSaving(false);
    }
  }

  function addVendor() {
    const vendor = blankVendor();
    setVendors((current) => [vendor, ...current]);
    setSelectedId(vendor.id);
    setMessage('');
  }

  function updateVendor(
    id: string,
    patch: Partial<Vendor>,
  ) {
    setVendors((current) =>
      current.map((vendor) =>
        vendor.id === id
          ? { ...vendor, ...patch }
          : vendor,
      ),
    );
    setMessage('');
  }

  function toggleMenuStation(
    vendorId: string,
    station: string,
  ) {
    setVendors((current) =>
      current.map((vendor) => {
        if (vendor.id !== vendorId) return vendor;

        const currentStations =
          Array.isArray(vendor.menuStations)
            ? vendor.menuStations
            : [];

        const exists =
          currentStations.includes(station);

        return {
          ...vendor,
          menuStations: exists
            ? currentStations.filter(
                (item) => item !== station,
              )
            : [...currentStations, station],
        };
      }),
    );

    setMessage('');
  }

  function addCustomMenuStation(
    vendorId: string,
  ) {
    const station =
      customStationName
        .trim()
        .replace(
          /\s+/g,
          ' ',
        );

    if (!station) {
      return;
    }

    setVendors((current) =>
      current.map((vendor) => {
        if (vendor.id !== vendorId) {
          return vendor;
        }

        const existing =
          Array.isArray(
            vendor.menuStations,
          )
            ? vendor.menuStations
            : [];

        const duplicate =
          existing.some(
            (item) =>
              item.toLocaleLowerCase('en-IN') ===
              station.toLocaleLowerCase('en-IN'),
          );

        return duplicate
          ? vendor
          : {
              ...vendor,
              menuStations: [
                ...existing,
                station,
              ],
            };
      }),
    );

    setCustomStationName('');
    setMessage(
      `${station} station added.`,
    );
  }

  function removeVendor(id: string) {
    const next = vendors.filter(
      (vendor) => vendor.id !== id,
    );

    setVendors(next);
    setSelectedId(next[0]?.id || '');
    setMessage('');
  }

  function addRate(vendorId: string) {
    setVendors((current) =>
      current.map((vendor) =>
        vendor.id === vendorId
          ? {
              ...vendor,
              rates: [
                ...vendor.rates,
                blankRate(),
              ],
            }
          : vendor,
      ),
    );
  }

  function updateRate(
    vendorId: string,
    rateId: string,
    patch: Partial<VendorRate>,
  ) {
    setVendors((current) =>
      current.map((vendor) =>
        vendor.id === vendorId
          ? {
              ...vendor,
              rates: vendor.rates.map((rate) =>
                rate.id === rateId
                  ? { ...rate, ...patch }
                  : rate,
              ),
            }
          : vendor,
      ),
    );
    setMessage('');
  }

  function removeRate(
    vendorId: string,
    rateId: string,
  ) {
    setVendors((current) =>
      current.map((vendor) =>
        vendor.id === vendorId
          ? {
              ...vendor,
              rates: vendor.rates.filter(
                (rate) => rate.id !== rateId,
              ),
            }
          : vendor,
      ),
    );
    setMessage('');
  }

  const categories =
    useMemo(
      () =>
        Array.from(
          new Set(
            vendors
              .map((vendor) => vendor.category.trim())
              .filter(Boolean),
          ),
        ).sort((a, b) => a.localeCompare(b)),
      [vendors],
    );

  const stationOptions =
    useMemo(
      () =>
        Array.from(
          new Set([
            ...MENU_STATION_OPTIONS,
            ...vendors.flatMap(
              (vendor) =>
                Array.isArray(
                  vendor.menuStations,
                )
                  ? vendor.menuStations
                  : [],
            ),
          ]),
        ).sort(
          (a, b) =>
            a.localeCompare(b),
        ),
      [vendors],
    );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return vendors.filter((vendor) => {
      if (
        categoryFilter !== 'ALL' &&
        vendor.category !== categoryFilter
      ) {
        return false;
      }

      if (
        statusFilter === 'ACTIVE' &&
        !vendor.active
      ) {
        return false;
      }

      if (
        statusFilter === 'INACTIVE' &&
        vendor.active
      ) {
        return false;
      }

      if (
        statusFilter === 'PREFERRED' &&
        !vendor.preferred
      ) {
        return false;
      }

      if (!q) return true;

      return [
        vendor.name,
        vendor.type,
        vendor.category,
        vendor.contactPerson,
        vendor.phone,
        vendor.city,
        vendor.serviceArea,
        ...(Array.isArray(vendor.menuStations) ? vendor.menuStations : []),
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [
    categoryFilter,
    query,
    statusFilter,
    vendors,
  ]);

  const selected =
    vendors.find((vendor) => vendor.id === selectedId) ||
    null;

  const totalRates = vendors.reduce(
    (sum, vendor) => sum + vendor.rates.length,
    0,
  );

  const planningAssignments =
    Object.values(planningPlan).flat();

  const vendorAssignmentCount =
    planningAssignments.filter(
      (row) =>
        row.partnerType === 'VENDOR' ||
        row.partnerType === 'AGENCY',
    ).length;

  const confirmedAssignmentCount =
    planningAssignments.filter(
      (row) =>
        ['CONFIRMED', 'DELIVERED', 'CLOSED'].includes(row.status),
    ).length;

  const assignmentCountForVendor = (
    vendor: Vendor,
  ) =>
    planningAssignments.filter(
      (row) =>
        row.partnerId === vendor.id ||
        (
          row.assignedTo.trim().toLowerCase() ===
          vendor.name.trim().toLowerCase()
        ),
    ).length;

  const confirmedCountForVendor = (
    vendor: Vendor,
  ) =>
    planningAssignments.filter(
      (row) =>
        (
          row.partnerId === vendor.id ||
          row.assignedTo.trim().toLowerCase() ===
            vendor.name.trim().toLowerCase()
        ) &&
        ['CONFIRMED', 'DELIVERED', 'CLOSED'].includes(row.status),
    ).length;

  const preferredCount =
    vendors.filter((vendor) => vendor.preferred).length;

  const missingPhoneCount =
    vendors.filter(
      (vendor) =>
        vendor.active &&
        !vendor.phone.trim(),
    ).length;

  function openWhatsApp(vendor: Vendor) {
    const phone =
      vendor.phone.replace(/\D/g, '');

    if (!phone) return;

    const text = encodeURIComponent(
      `Hello ${vendor.contactPerson || vendor.name}, regarding ${currentEventName || 'our upcoming event'}.`,
    );

    window.open(
      `https://wa.me/${phone}?text=${text}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  return (
    <AppShell
      title="Vendors & Agencies"
      subtitle="Reusable suppliers, agencies and rate masters"
      hidePageTitle
    >
      <section className="vm-page">
        <style>{`
          .vm-page{display:grid;gap:14px;color:#edf2f8}
          .vm-command{display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,.62fr);gap:18px;align-items:center;padding:18px 20px;border:1px solid #2a3542;border-radius:18px;background:radial-gradient(circle at 96% 10%,rgba(74,156,255,.13),transparent 22rem),linear-gradient(145deg,#111923,#0d141c);box-shadow:0 14px 34px rgba(0,0,0,.16)}
          .vm-command small{display:block;color:#78b5ff;font-size:8px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
          .vm-command h1{margin:7px 0 6px;font-size:clamp(28px,3.4vw,40px);line-height:1.04;letter-spacing:-.045em}
          .vm-command p{max-width:700px;margin:0;color:#8b98a9;font-size:10px;line-height:1.55}
          .vm-command-side{display:grid;grid-template-columns:1fr 1fr;gap:7px}
          .vm-command-side>div{min-width:0;padding:10px;border:1px solid rgba(148,163,184,.10);border-radius:11px;background:rgba(255,255,255,.022)}
          .vm-command-side span,.vm-command-side b,.vm-command-side small{display:block}
          .vm-command-side span{color:#718094;font-size:7px;font-weight:900;text-transform:uppercase}
          .vm-command-side b{margin-top:4px;color:#e7eef6;font-size:15px}
          .vm-command-side small{margin-top:3px;color:#68778a;font-size:7px;letter-spacing:0;text-transform:none}
          .vm-command-actions{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:0!important;border:0!important;background:transparent!important}
          .vm-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding:16px 2px 3px}
          .vm-head small{display:block;color:#78b5ff;font-size:9px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
          .vm-head h1{margin:6px 0 5px;font-size:clamp(30px,4vw,44px);line-height:1;letter-spacing:-.05em}
          .vm-head p{margin:0;color:#8794a5;font-size:11px}
          .vm-actions{display:flex;gap:7px}
          .vm-button{min-height:40px;padding:0 13px;border:1px solid #303844;border-radius:10px;color:#bdc7d3;background:#151b23;font:inherit;font-size:10px;font-weight:900;cursor:pointer}
          .vm-button.primary{border-color:#1478f2;color:#fff;background:#1478f2}
          .vm-button:disabled{opacity:.55;cursor:wait}
          .vm-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
          .vm-stat{padding:13px;border:1px solid #282f39;border-radius:14px;background:#10151c}
          .vm-stat small,.vm-stat b,.vm-stat span{display:block}
          .vm-stat small{color:#7b8898;font-size:8px;font-weight:850;text-transform:uppercase}
          .vm-stat b{margin:5px 0 2px;font-size:20px}
          .vm-stat span{color:#748192;font-size:8px}
          .vm-msg{padding:10px 12px;border:1px solid rgba(61,220,132,.18);border-radius:10px;color:#75dfa2;background:rgba(61,220,132,.06);font-size:10px}
          .vm-msg.error{border-color:rgba(255,98,89,.2);color:#ff948e;background:rgba(255,98,89,.06)}
          .vm-layout{display:grid;grid-template-columns:330px minmax(0,1fr);gap:12px;align-items:start}
          .vm-panel{border:1px solid #282f39;border-radius:15px;background:#10151c}
          .vm-search{display:grid;gap:7px;padding:10px;border-bottom:1px solid #252c35}
          .vm-filter-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
          .vm-input,.vm-select,.vm-textarea{width:100%;min-height:38px;padding:0 10px;border:1px solid #303945;border-radius:8px;outline:0;color:#dfe7f0;background:#151c25;font:inherit;font-size:10px}
          .vm-textarea{min-height:78px;padding:9px;resize:vertical}
          .vm-input:focus,.vm-select:focus,.vm-textarea:focus{border-color:rgba(74,156,255,.6);box-shadow:0 0 0 3px rgba(74,156,255,.08)}
          .vm-list{display:grid;max-height:690px;overflow:auto}
          .vm-card{display:grid;grid-template-columns:1fr auto;gap:8px;padding:11px;border:0;border-bottom:1px solid rgba(148,163,184,.08);color:#a5b0bd;background:transparent;text-align:left;cursor:pointer}
          .vm-card.active{background:rgba(74,156,255,.07)}
          .vm-card b,.vm-card span,.vm-card small{display:block}
          .vm-card b{color:#e6edf5;font-size:11px}
          .vm-card span{margin-top:3px;color:#7d8a9a;font-size:8px}
          .vm-card small{margin-top:5px;color:#6edb9a;font-size:8px;font-weight:850}
          .vm-card-side{display:grid;justify-items:end;gap:5px}
          .vm-badge{align-self:start;padding:4px 6px;border-radius:999px;color:#9bc8ff;background:rgba(74,156,255,.09);font-size:7px;font-weight:900}
          .vm-status{font-size:7px;color:#8491a1}
          .vm-status.active{color:#6fdc9e}
          .vm-empty{padding:36px 14px;color:#748192;font-size:10px;text-align:center}
          .vm-editor{padding:15px}
          .vm-editor-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-bottom:13px;border-bottom:1px solid #252c35}
          .vm-editor-head h2{margin:0;font-size:18px}
          .vm-editor-head p{margin:4px 0 0;color:#7f8b9a;font-size:9px}
          .vm-editor-status{display:flex;flex-wrap:wrap;gap:8px}
          .vm-editor-status label{display:flex;align-items:center;gap:6px;color:#9aa6b4;font-size:8px}
          .vm-partner-command{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:13px;padding:9px;border:1px solid rgba(148,163,184,.09);border-radius:12px;background:#0d141b}
          .vm-partner-command>div{min-width:0;padding:8px;border-radius:9px;background:rgba(255,255,255,.02)}
          .vm-partner-command span,.vm-partner-command b,.vm-partner-command small{display:block}
          .vm-partner-command span{color:#718094;font-size:7px;font-weight:900;text-transform:uppercase}
          .vm-partner-command b{margin-top:4px;color:#e5edf6;font-size:11px;text-transform:capitalize}
          .vm-partner-command small{margin-top:2px;color:#68778a;font-size:7px}
          .vm-partner-actions{grid-column:1/-1!important;display:flex!important;gap:7px!important;padding:0!important;background:transparent!important}
          .vm-link-button{text-decoration:none}
          .vm-link-button.disabled{pointer-events:none;opacity:.45}
          .vm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:13px}
          .vm-field{display:grid;gap:5px}
          .vm-field.full{grid-column:1/-1}
          .vm-field>span{color:#8290a1;font-size:8px;font-weight:850;text-transform:uppercase}
          .vm-station-field{padding:11px;border:1px solid rgba(74,156,255,.13);border-radius:11px;background:rgba(74,156,255,.025)}
          .vm-station-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
          .vm-station-head>span{color:#8290a1;font-size:8px;font-weight:850;text-transform:uppercase}
          .vm-station-head small{color:#6f8094;font-size:7px}
          .vm-station-grid{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}
          .vm-station-grid button{display:inline-flex;align-items:center;gap:5px;min-height:30px;padding:0 8px;border:1px solid #303945;border-radius:8px;color:#8fa0b3;background:#131b24;font:inherit;font-size:7px;font-weight:850;cursor:pointer}
          .vm-station-grid button>span{display:grid;width:15px;height:15px;place-items:center;border-radius:5px;color:#72859a;background:#1b2632;font-size:8px}
          .vm-station-grid button.active{border-color:rgba(85,217,143,.28);color:#a8e4c0;background:rgba(85,217,143,.06)}
          .vm-station-grid button.active>span{color:#07170e;background:#58d78e}
          .vm-station-add{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;margin-top:9px;padding-top:9px;border-top:1px solid rgba(148,163,184,.08)}
          .vm-station-add .vm-input{min-height:34px}
          .vm-station-add .vm-button{min-height:34px}
          .vm-rate-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:18px;padding-top:14px;border-top:1px solid #252c35}
          .vm-rate-head h3{margin:0;font-size:13px}
          .vm-rate-table-wrap{overflow:auto;margin-top:9px;border:1px solid #29313b;border-radius:11px}
          .vm-rate-table{width:100%;min-width:720px;border-collapse:collapse}
          .vm-rate-table th{padding:8px;border-bottom:1px solid #29313b;color:#718094;background:#0d1218;font-size:7px;text-align:left;text-transform:uppercase}
          .vm-rate-table td{padding:7px;border-bottom:1px solid rgba(148,163,184,.08)}
          .vm-rate-table tr:last-child td{border-bottom:0}
          .vm-mini{min-height:34px;padding:0 7px;font-size:9px}
          .vm-delete{width:30px;height:30px;border:1px solid rgba(255,98,89,.2);border-radius:7px;color:#ff928b;background:rgba(255,98,89,.05);cursor:pointer}
          .vm-foot{display:flex;justify-content:flex-end;gap:7px;margin-top:14px;padding-top:13px;border-top:1px solid #252c35}
          @media(max-width:1100px){.vm-command{grid-template-columns:1fr}.vm-command-side{grid-template-columns:repeat(4,minmax(0,1fr))}.vm-command-actions{grid-column:1/-1}}
          @media(max-width:980px){.vm-layout{grid-template-columns:1fr}.vm-list{max-height:300px}.vm-stats{grid-template-columns:1fr 1fr}.vm-partner-command{grid-template-columns:1fr 1fr}}
          @media(max-width:680px){.vm-command{padding:16px}.vm-command-side{grid-template-columns:1fr 1fr}.vm-command-actions{grid-template-columns:1fr}.vm-head{align-items:stretch;flex-direction:column}.vm-actions{display:grid;grid-template-columns:1fr 1fr}.vm-grid{grid-template-columns:1fr}.vm-field.full{grid-column:auto}.vm-filter-grid{grid-template-columns:1fr}.vm-partner-actions{display:grid!important;grid-template-columns:1fr 1fr}.vm-partner-actions .primary{grid-column:1/-1}}
        `}</style>

        <header className="vm-command">
          <div>
            <small>Supplier & agency control center</small>
            <h1>Vendors & Agencies</h1>
            <p>
              Keep reliable partners, reusable rates and current-event assignment context in one place.
            </p>
          </div>

          <div className="vm-command-side">
            <div>
              <span>Active partners</span>
              <b>{vendors.filter((vendor) => vendor.active).length}</b>
              <small>{vendors.length} total in master</small>
            </div>
            <div>
              <span>Preferred</span>
              <b>{preferredCount}</b>
              <small>Trusted first-choice partners</small>
            </div>
            <div>
              <span>Current assignments</span>
              <b>{planningLoading ? '—' : vendorAssignmentCount}</b>
              <small>{currentEventName || 'Current event'}</small>
            </div>
            <div>
              <span>Confirmed</span>
              <b>{planningLoading ? '—' : confirmedAssignmentCount}</b>
              <small>Confirmed / delivered / closed</small>
            </div>
            <div className="vm-command-actions">
              <button
                className="vm-button"
                type="button"
                onClick={addVendor}
              >
                + Add Partner
              </button>
              <button
                className="vm-button primary"
                type="button"
                disabled={saving}
                onClick={() => void saveVendors()}
              >
                {saving ? 'Saving…' : 'Save Master'}
              </button>
            </div>
          </div>
        </header>

        <section className="vm-stats">
          <article className="vm-stat">
            <small>Total partners</small>
            <b>{vendors.length}</b>
            <span>{vendors.filter((vendor) => vendor.active).length} active · {vendors.filter((vendor) => !vendor.active).length} inactive</span>
          </article>
          <article className="vm-stat">
            <small>Preferred partners</small>
            <b>{preferredCount}</b>
            <span>First-choice suppliers & agencies</span>
          </article>
          <article className="vm-stat">
            <small>Rate entries</small>
            <b>{totalRates}</b>
            <span>Reusable item and service rates</span>
          </article>
          <article className="vm-stat">
            <small>Needs attention</small>
            <b>{missingPhoneCount}</b>
            <span>Active partners missing phone</span>
          </article>
        </section>

        {message ? (
          <div className="vm-msg">{message}</div>
        ) : null}

        {error ? (
          <div className="vm-msg error">{error}</div>
        ) : null}

        <div className="vm-layout">
          <aside className="vm-panel">
            <div className="vm-search">
              <input
                className="vm-input"
                value={query}
                placeholder="Search partner, city, service area…"
                onChange={(event) => setQuery(event.target.value)}
              />

              <div className="vm-filter-grid">
                <select
                  className="vm-select"
                  value={categoryFilter}
                  onChange={(event) =>
                    setCategoryFilter(event.target.value)
                  }
                >
                  <option value="ALL">All categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <select
                  className="vm-select"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as
                        | 'ALL'
                        | 'ACTIVE'
                        | 'INACTIVE'
                        | 'PREFERRED',
                    )
                  }
                >
                  <option value="ALL">All partners</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PREFERRED">Preferred</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div className="vm-list">
              {loading ? (
                <div className="vm-empty">Loading partners…</div>
              ) : filtered.length ? (
                filtered.map((vendor) => (
                  <button
                    key={vendor.id}
                    className={
                      vendor.id === selectedId
                        ? 'vm-card active'
                        : 'vm-card'
                    }
                    type="button"
                    onClick={() => setSelectedId(vendor.id)}
                  >
                    <span>
                      <b>{vendor.name || 'Unnamed partner'}</b>
                      <span>
                        {vendor.category || 'General'}
                        {vendor.city ? ` · ${vendor.city}` : ''}
                      </span>
                      <small>
                        {vendor.rates.length} rate{vendor.rates.length === 1 ? '' : 's'}
                        {' · '}
                        {(vendor.menuStations || []).length} station{(vendor.menuStations || []).length === 1 ? '' : 's'}
                        {' · '}
                        {assignmentCountForVendor(vendor)} current assignment{assignmentCountForVendor(vendor) === 1 ? '' : 's'}
                        {vendor.preferred ? ' · Preferred' : ''}
                      </small>
                    </span>

                    <span className="vm-card-side">
                      <span className="vm-badge">
                        {vendor.type}
                      </span>
                      <span className={vendor.active ? 'vm-status active' : 'vm-status'}>
                        {vendor.active ? 'Active' : 'Inactive'}
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <div className="vm-empty">
                  No partners found.
                </div>
              )}
            </div>
          </aside>

          <section className="vm-panel">
            {selected ? (
              <div className="vm-editor">
                <div className="vm-editor-head">
                  <div>
                    <h2>
                      {selected.name || 'New partner'}
                    </h2>
                    <p>
                      Contact details, partner type and reusable rates.
                    </p>
                  </div>

                  <div className="vm-editor-status">
                    <label>
                      <input
                        type="checkbox"
                        checked={selected.active}
                        onChange={(event) =>
                          updateVendor(selected.id, {
                            active: event.target.checked,
                          })
                        }
                      />
                      Active
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={selected.preferred}
                        onChange={(event) =>
                          updateVendor(selected.id, {
                            preferred: event.target.checked,
                          })
                        }
                      />
                      Preferred
                    </label>
                  </div>
                </div>

                <div className="vm-partner-command">
                  <div>
                    <span>Current assignments</span>
                    <b>{assignmentCountForVendor(selected)}</b>
                    <small>{confirmedCountForVendor(selected)} confirmed+</small>
                  </div>
                  <div>
                    <span>Reliability</span>
                    <b>{selected.reliability}</b>
                    <small>{selected.preferred ? 'Preferred partner' : 'Standard priority'}</small>
                  </div>
                  <div>
                    <span>Confirmation</span>
                    <b>{selected.confirmationStatus.replace('_', ' ')}</b>
                    <small>Partner master status</small>
                  </div>
                  <div>
                    <span>Payment</span>
                    <b>{selected.paymentStatus.replace('_', ' ')}</b>
                    <small>Partner payment status</small>
                  </div>
                  <div className="vm-partner-actions">
                    <button
                      className="vm-button"
                      type="button"
                      disabled={!selected.phone.trim()}
                      onClick={() => openWhatsApp(selected)}
                    >
                      WhatsApp
                    </button>
                    <a
                      className={selected.phone.trim() ? 'vm-button vm-link-button' : 'vm-button vm-link-button disabled'}
                      href={selected.phone.trim() ? `tel:${selected.phone}` : undefined}
                    >
                      Call
                    </a>
                    <button
                      className="vm-button primary"
                      type="button"
                      onClick={() => window.location.assign('/app/event-planning')}
                    >
                      Assign to Event
                    </button>
                  </div>
                </div>

                <div className="vm-grid">
                  <label className="vm-field">
                    <span>Name</span>
                    <input
                      className="vm-input"
                      value={selected.name}
                      onChange={(event) =>
                        updateVendor(selected.id, {
                          name: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label className="vm-field">
                    <span>Type</span>
                    <select
                      className="vm-select"
                      value={selected.type}
                      onChange={(event) =>
                        updateVendor(selected.id, {
                          type:
                            event.target.value as Vendor['type'],
                        })
                      }
                    >
                      <option value="VENDOR">Vendor</option>
                      <option value="AGENCY">Agency</option>
                      <option value="INDIVIDUAL">Individual</option>
                    </select>
                  </label>

                  <label className="vm-field">
                    <span>Main Category</span>
                    <input
                      className="vm-input"
                      value={selected.category}
                      placeholder="Grocery, Manpower, Equipment…"
                      onChange={(event) =>
                        updateVendor(selected.id, {
                          category: event.target.value,
                        })
                      }
                    />
                  </label>

                  <section className="vm-field full vm-station-field">
                    <div className="vm-station-head">
                      <span>Food Stations / Specialties</span>
                      <small>
                        {(selected.menuStations || []).length
                          ? `${(selected.menuStations || []).length} selected · Event Planning will match this partner station-wise.`
                          : 'Optional · choose every station this vendor or agency can handle.'}
                      </small>
                    </div>

                    <div className="vm-station-grid">
                      {stationOptions.map((station) => {
                        const active =
                          (selected.menuStations || []).includes(
                            station,
                          );

                        return (
                          <button
                            key={station}
                            type="button"
                            className={active ? 'active' : ''}
                            aria-pressed={active}
                            onClick={() =>
                              toggleMenuStation(
                                selected.id,
                                station,
                              )
                            }
                          >
                            <span aria-hidden="true">
                              {active ? '✓' : '+'}
                            </span>
                            {station}
                          </button>
                        );
                      })}
                    </div>

                    <div className="vm-station-add">
                      <input
                        className="vm-input"
                        value={customStationName}
                        placeholder="New station name e.g. Gujarati Live"
                        onChange={(event) =>
                          setCustomStationName(
                            event.target.value,
                          )
                        }
                        onKeyDown={(event) => {
                          if (
                            event.key ===
                            'Enter'
                          ) {
                            event.preventDefault();
                            addCustomMenuStation(
                              selected.id,
                            );
                          }
                        }}
                      />

                      <button
                        className="vm-button"
                        type="button"
                        disabled={
                          !customStationName.trim()
                        }
                        onClick={() =>
                          addCustomMenuStation(
                            selected.id,
                          )
                        }
                      >
                        + Add Station
                      </button>
                    </div>
                  </section>

                  <label className="vm-field">
                    <span>Contact Person</span>
                    <input
                      className="vm-input"
                      value={selected.contactPerson}
                      onChange={(event) =>
                        updateVendor(selected.id, {
                          contactPerson: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label className="vm-field">
                    <span>Phone</span>
                    <input
                      className="vm-input"
                      value={selected.phone}
                      onChange={(event) =>
                        updateVendor(selected.id, {
                          phone: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label className="vm-field">
                    <span>City</span>
                    <input
                      className="vm-input"
                      value={selected.city}
                      onChange={(event) =>
                        updateVendor(selected.id, {
                          city: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label className="vm-field">
                    <span>GST</span>
                    <input
                      className="vm-input"
                      value={selected.gst}
                      onChange={(event) =>
                        updateVendor(selected.id, {
                          gst: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label className="vm-field">
                    <span>Payment Terms</span>
                    <input
                      className="vm-input"
                      value={selected.paymentTerms}
                      placeholder="50% advance, balance after event"
                      onChange={(event) =>
                        updateVendor(selected.id, {
                          paymentTerms: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label className="vm-field">
                    <span>Service Area</span>
                    <input
                      className="vm-input"
                      value={selected.serviceArea}
                      placeholder="Silvassa, Vapi, Daman…"
                      onChange={(event) =>
                        updateVendor(selected.id, {
                          serviceArea: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label className="vm-field">
                    <span>Reliability</span>
                    <select
                      className="vm-select"
                      value={selected.reliability}
                      onChange={(event) =>
                        updateVendor(selected.id, {
                          reliability:
                            event.target.value as Vendor['reliability'],
                        })
                      }
                    >
                      <option value="NEW">New</option>
                      <option value="RELIABLE">Reliable</option>
                      <option value="EXCELLENT">Excellent</option>
                    </select>
                  </label>

                  <label className="vm-field">
                    <span>Confirmation Status</span>
                    <select
                      className="vm-select"
                      value={selected.confirmationStatus}
                      onChange={(event) =>
                        updateVendor(selected.id, {
                          confirmationStatus:
                            event.target.value as Vendor['confirmationStatus'],
                        })
                      }
                    >
                      <option value="OPEN">Open</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="ON_HOLD">On Hold</option>
                    </select>
                  </label>

                  <label className="vm-field">
                    <span>Payment Status</span>
                    <select
                      className="vm-select"
                      value={selected.paymentStatus}
                      onChange={(event) =>
                        updateVendor(selected.id, {
                          paymentStatus:
                            event.target.value as Vendor['paymentStatus'],
                        })
                      }
                    >
                      <option value="NOT_SET">Not Set</option>
                      <option value="PENDING">Pending</option>
                      <option value="PARTIAL">Partial</option>
                      <option value="PAID">Paid</option>
                    </select>
                  </label>

                  <label className="vm-field full">
                    <span>Notes</span>
                    <textarea
                      className="vm-textarea"
                      value={selected.notes}
                      onChange={(event) =>
                        updateVendor(selected.id, {
                          notes: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>

                <div className="vm-rate-head">
                  <div>
                    <h3>Rate Master</h3>
                    <div
                      style={{
                        marginTop: 3,
                        color: '#758294',
                        fontSize: 8,
                      }}
                    >
                      Event Planning uses these rates when this partner is selected.
                    </div>
                  </div>

                  <button
                    className="vm-button"
                    type="button"
                    onClick={() => addRate(selected.id)}
                  >
                    + Add Rate
                  </button>
                </div>

                <div className="vm-rate-table-wrap">
                  <table className="vm-rate-table">
                    <thead>
                      <tr>
                        <th>Area</th>
                        <th>Item / Service</th>
                        <th>Unit</th>
                        <th>Rate</th>
                        <th>Preview</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {selected.rates.length ? (
                        selected.rates.map((rate) => (
                          <tr key={rate.id}>
                            <td>
                              <select
                                className="vm-select vm-mini"
                                value={rate.kind}
                                onChange={(event) =>
                                  updateRate(
                                    selected.id,
                                    rate.id,
                                    {
                                      kind:
                                        event.target.value as RequirementKind,
                                    },
                                  )
                                }
                              >
                                {KIND_OPTIONS.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                className="vm-input vm-mini"
                                value={rate.item}
                                placeholder="Waiter, paneer, tandoor…"
                                onChange={(event) =>
                                  updateRate(
                                    selected.id,
                                    rate.id,
                                    { item: event.target.value },
                                  )
                                }
                              />
                            </td>
                            <td>
                              <input
                                className="vm-input vm-mini"
                                value={rate.unit}
                                onChange={(event) =>
                                  updateRate(
                                    selected.id,
                                    rate.id,
                                    { unit: event.target.value },
                                  )
                                }
                              />
                            </td>
                            <td>
                              <input
                                className="vm-input vm-mini"
                                type="number"
                                min="0"
                                value={rate.rate}
                                onChange={(event) =>
                                  updateRate(
                                    selected.id,
                                    rate.id,
                                    {
                                      rate:
                                        Math.max(
                                          0,
                                          Number(event.target.value) || 0,
                                        ),
                                    },
                                  )
                                }
                              />
                            </td>
                            <td
                              style={{
                                color: '#dce5ef',
                                fontSize: 9,
                                fontWeight: 850,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {currency(rate.rate)} / {rate.unit || 'unit'}
                            </td>
                            <td>
                              <button
                                className="vm-delete"
                                type="button"
                                onClick={() =>
                                  removeRate(
                                    selected.id,
                                    rate.id,
                                  )
                                }
                                aria-label="Remove rate"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6}>
                            <div className="vm-empty">
                              No rates yet. Add reusable rates for this partner.
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <footer className="vm-foot">
                  <button
                    className="vm-button"
                    type="button"
                    onClick={() => removeVendor(selected.id)}
                  >
                    Remove Partner
                  </button>
                  <button
                    className="vm-button primary"
                    type="button"
                    disabled={saving}
                    onClick={() => void saveVendors()}
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </footer>
              </div>
            ) : (
              <div className="vm-empty">
                Add a vendor or agency to start the master.
              </div>
            )}
          </section>
        </div>
      </section>
    </AppShell>
  );
}
