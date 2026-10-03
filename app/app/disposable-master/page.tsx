'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/AppShell';
import { getSession, loadWork, uid } from '../../../lib/store';

type Vendor = { id: string; name: string; active: boolean };


type DisposablePlanningRow = {
  id: string;
  kind: string;
  requirement: string;
  quantity: number;
  unit: string;
  assignedTo: string;
  partnerId?: string;
  disposableMasterId?: string;
  rate: number;
  status: 'PENDING' | 'CONFIRMED' | 'DELIVERED' | 'CLOSED';
};

type DisposablePlanningPlan =
  Record<string, DisposablePlanningRow[]>;
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

const CATEGORIES = ['Serviceware','Beverage','Packing','Hygiene','Waste','Other'];


function money(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Number(value) || 0));
}

function normalized(value: string) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ');
}
const UNITS = ['pcs','pair','pack','box','roll','kg','g','litre','ml','set','dozen','bundle','event'];

function blankItem(): DisposableMasterItem {
  return {
    id: uid('disposable_master'),
    name: '',
    category: 'Other',
    photoUrl: '',
    unit: 'pcs',
    availableQty: 0,
    defaultRate: 0,
    supplierId: '',
    supplierName: '',
    notes: '',
    active: true,
  };
}

async function compressPhoto(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Could not open image'));
    element.src = dataUrl;
  });

  const scale = Math.min(1, 520 / image.width, 360 / image.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image processing unavailable');

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let quality = 0.72;
  let output = canvas.toDataURL('image/jpeg', quality);

  while (output.length > 120000 && quality > 0.35) {
    quality -= 0.08;
    output = canvas.toDataURL('image/jpeg', quality);
  }

  if (output.length > 140000) {
    throw new Error('Photo is too large. Please choose a smaller image.');
  }

  return output;
}

export default function DisposableMasterPage() {
  const [items, setItems] = useState<DisposableMasterItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ALL');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] =
    useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'SHORTAGE' | 'MISSING_RATE' | 'MISSING_SUPPLIER'>('ALL');
  const [planningPlan, setPlanningPlan] =
    useState<DisposablePlanningPlan>({});
  const [planningLoading, setPlanningLoading] = useState(false);
  const [currentEventName, setCurrentEventName] = useState('');

  useEffect(() => {
    const session = getSession();
    if (!session) {
      window.location.assign('/login');
      return;
    }

    void load();

    const currentWork = loadWork(session.tenantId);

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
        { cache: 'no-store' },
      )
        .then(async (response) => {
          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.error ||
                'Could not load event disposable plan.',
            );
          }

          setPlanningPlan(
            data.plan &&
            typeof data.plan === 'object' &&
            !Array.isArray(data.plan)
              ? data.plan as DisposablePlanningPlan
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

  async function load() {
    setLoading(true);
    setError('');

    try {
      const [masterResponse, vendorResponse] = await Promise.all([
        fetch('/api/client/disposable-master', { cache: 'no-store' }),
        fetch('/api/client/vendors', { cache: 'no-store' }),
      ]);

      const data = await masterResponse.json();
      if (!masterResponse.ok) throw new Error(data.error || 'Could not load disposable master');

      const rows = Array.isArray(data.items) ? data.items as DisposableMasterItem[] : [];
      setItems(rows);
      setSelectedId(rows[0]?.id || '');

      if (vendorResponse.ok) {
        const vendorData = await vendorResponse.json();
        setVendors(
          Array.isArray(vendorData.vendors)
            ? (vendorData.vendors as Vendor[]).filter((vendor) => vendor.active !== false)
            : [],
        );
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load disposable master');
    } finally {
      setLoading(false);
    }
  }

  async function save(next = items) {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/client/disposable-master', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: next }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save disposable master');

      setItems(Array.isArray(data.items) ? data.items as DisposableMasterItem[] : next);
      setMessage('Disposable master saved.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save disposable master');
    } finally {
      setSaving(false);
    }
  }

  function addItem() {
    const item = blankItem();
    setItems((current) => [item, ...current]);
    setSelectedId(item.id);
    setMessage('');
  }

  function updateItem(id: string, patch: Partial<DisposableMasterItem>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
    setMessage('');
  }

  function removeItem(id: string) {
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    setSelectedId(next[0]?.id || '');
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedId) return;

    setError('');
    try {
      updateItem(selectedId, { photoUrl: await compressPhoto(file) });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not process photo');
    } finally {
      event.target.value = '';
    }
  }

  const selected = items.find((item) => item.id === selectedId) || null;

  const planningEntries = Object.entries(planningPlan);

  const disposableRows = planningEntries.flatMap(
    ([functionKey, rows]) =>
      rows
        .filter((row) => row.kind === 'DISPOSABLE')
        .map((row) => ({
          functionKey,
          row,
        })),
  );

  function rowsForItem(item: DisposableMasterItem) {
    const itemName = normalized(item.name);

    return disposableRows.filter(
      ({ row }) =>
        row.disposableMasterId === item.id ||
        (
          !row.disposableMasterId &&
          normalized(row.requirement) === itemName
        ),
    );
  }

  function requiredQty(item: DisposableMasterItem) {
    return rowsForItem(item).reduce(
      (sum, entry) =>
        sum + Math.max(0, Number(entry.row.quantity) || 0),
      0,
    );
  }

  function confirmedQty(item: DisposableMasterItem) {
    return rowsForItem(item)
      .filter(({ row }) =>
        ['CONFIRMED', 'DELIVERED', 'CLOSED'].includes(row.status),
      )
      .reduce(
        (sum, entry) =>
          sum + Math.max(0, Number(entry.row.quantity) || 0),
        0,
      );
  }

  function shortageQty(item: DisposableMasterItem) {
    return Math.max(
      0,
      requiredQty(item) -
        Math.max(0, Number(item.availableQty) || 0),
    );
  }

  function functionCount(item: DisposableMasterItem) {
    return new Set(
      rowsForItem(item).map((entry) => entry.functionKey),
    ).size;
  }

  function eventCost(item: DisposableMasterItem) {
    return rowsForItem(item).reduce(
      (sum, entry) =>
        sum +
        Math.max(0, Number(entry.row.quantity) || 0) *
          Math.max(
            0,
            Number(entry.row.rate) ||
              Number(item.defaultRate) ||
              0,
          ),
      0,
    );
  }

  function hasMissingRate(item: DisposableMasterItem) {
    return (
      requiredQty(item) > 0 &&
      Math.max(0, Number(item.defaultRate) || 0) <= 0 &&
      rowsForItem(item).some(
        ({ row }) => Math.max(0, Number(row.rate) || 0) <= 0,
      )
    );
  }

  function hasMissingSupplier(item: DisposableMasterItem) {
    return (
      requiredQty(item) > 0 &&
      !item.supplierId &&
      !item.supplierName.trim() &&
      rowsForItem(item).some(
        ({ row }) =>
          !row.partnerId &&
          !String(row.assignedTo || '').trim(),
      )
    );
  }

  const currentEventRequiredQty =
    items.reduce((sum, item) => sum + requiredQty(item), 0);

  const currentEventConfirmedQty =
    items.reduce((sum, item) => sum + confirmedQty(item), 0);

  const currentEventShortageQty =
    items.reduce((sum, item) => sum + shortageQty(item), 0);

  const currentEventDisposableCost =
    items.reduce((sum, item) => sum + eventCost(item), 0);

  const currentEventItemCount =
    items.filter((item) => requiredQty(item) > 0).length;

  const missingRateCount =
    items.filter((item) => hasMissingRate(item)).length;

  const missingSupplierCount =
    items.filter((item) => hasMissingSupplier(item)).length;

  const suppliers = useMemo(
    () =>
      Array.from(
        new Map(
          items
            .filter((item) => item.supplierName.trim())
            .map((item) => [
              item.supplierId || item.supplierName,
              item.supplierName,
            ] as const),
        ).entries(),
      ),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return items.filter((item) => {
      if (category !== 'ALL' && item.category !== category) {
        return false;
      }

      if (
        supplierFilter !== 'ALL' &&
        (item.supplierId || item.supplierName) !== supplierFilter
      ) {
        return false;
      }

      if (statusFilter === 'ACTIVE' && !item.active) return false;
      if (statusFilter === 'INACTIVE' && item.active) return false;
      if (statusFilter === 'SHORTAGE' && shortageQty(item) <= 0) return false;
      if (statusFilter === 'MISSING_RATE' && !hasMissingRate(item)) return false;
      if (statusFilter === 'MISSING_SUPPLIER' && !hasMissingSupplier(item)) return false;

      if (!q) return true;

      return [
        item.name,
        item.category,
        item.supplierName,
        item.unit,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [
    category,
    items,
    planningPlan,
    query,
    statusFilter,
    supplierFilter,
  ]);

  return (
    <AppShell title="Disposable Master" subtitle="Reusable photo catalog for event disposables" hidePageTitle>
      <section className="dm-page">
        <style>{`
          .dm-page{display:grid;gap:14px;color:#edf2f8}
          .dm-command{display:grid;grid-template-columns:minmax(0,1fr) minmax(410px,.7fr);gap:18px;align-items:center;padding:18px 20px;border:1px solid #2a3542;border-radius:18px;background:radial-gradient(circle at 96% 10%,rgba(74,156,255,.13),transparent 22rem),linear-gradient(145deg,#111923,#0d141c);box-shadow:0 14px 34px rgba(0,0,0,.16)}
          .dm-command small{display:block;color:#78b5ff;font-size:8px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
          .dm-command h1{margin:7px 0 6px;font-size:clamp(28px,3.4vw,40px);line-height:1.04;letter-spacing:-.045em}
          .dm-command p{max-width:720px;margin:0;color:#8b98a9;font-size:10px;line-height:1.55}
          .dm-command-side{display:grid;grid-template-columns:1fr 1fr;gap:7px}
          .dm-command-side>div{min-width:0;padding:10px;border:1px solid rgba(148,163,184,.10);border-radius:11px;background:rgba(255,255,255,.022)}
          .dm-command-side>div.attention{border-color:rgba(244,173,84,.18);background:rgba(244,173,84,.045)}
          .dm-command-side span,.dm-command-side b,.dm-command-side small{display:block}
          .dm-command-side span{color:#718094;font-size:7px;font-weight:900;text-transform:uppercase}
          .dm-command-side b{margin-top:4px;color:#e7eef6;font-size:15px}
          .dm-command-side small{margin-top:3px;color:#68778a;font-size:7px;letter-spacing:0;text-transform:none}
          .dm-command-actions{grid-column:1/-1!important;display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:7px!important;padding:0!important;border:0!important;background:transparent!important}
          .dm-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
          .dm-stat{padding:13px;border:1px solid #282f39;border-radius:14px;background:#10151c}
          .dm-stat small,.dm-stat b,.dm-stat span{display:block}.dm-stat small{color:#7b8898;font-size:8px;font-weight:850;text-transform:uppercase}.dm-stat b{margin:5px 0 2px;font-size:20px}.dm-stat span{color:#748192;font-size:8px}
          .dm-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding:16px 2px 3px}
          .dm-head small{display:block;color:#78b5ff;font-size:9px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.dm-head h1{margin:6px 0 5px;font-size:clamp(30px,4vw,44px);line-height:1;letter-spacing:-.05em}.dm-head p{margin:0;color:#8794a5;font-size:11px}
          .dm-actions{display:flex;gap:7px}.dm-button{min-height:40px;padding:0 13px;border:1px solid #303844;border-radius:10px;color:#bdc7d3;background:#151b23;font:inherit;font-size:10px;font-weight:900;cursor:pointer}.dm-button.primary{border-color:#1478f2;color:#fff;background:#1478f2}
          .dm-layout{display:grid;grid-template-columns:minmax(0,1.45fr) 390px;gap:12px;align-items:start}.dm-panel{border:1px solid #282f39;border-radius:15px;background:#10151c}
          .dm-toolbar{display:grid;grid-template-columns:minmax(0,1fr) repeat(3,155px);gap:8px;padding:11px;border-bottom:1px solid #252c35}.dm-input,.dm-select,.dm-textarea{width:100%;min-height:38px;padding:0 10px;border:1px solid #303945;border-radius:8px;outline:0;color:#dfe7f0;background:#151c25;font:inherit;font-size:10px}.dm-textarea{min-height:78px;padding:9px;resize:vertical}
          .dm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:10px;padding:11px}.dm-card{position:relative;overflow:hidden;border:1px solid #2a323d;border-radius:13px;background:#0f141b;cursor:pointer;text-align:left;transition:border-color .18s ease,transform .18s ease,box-shadow .18s ease}.dm-card:hover{border-color:#3a4654;transform:translateY(-1px);box-shadow:0 10px 24px rgba(0,0,0,.12)}.dm-card.shortage{border-color:rgba(244,173,84,.4);background:linear-gradient(180deg,#151713,#0f141b)}.dm-card.missing{border-color:rgba(255,126,118,.28)}.dm-card.active{border-color:rgba(74,156,255,.75);box-shadow:0 0 0 2px rgba(74,156,255,.1)}
          .dm-photo{aspect-ratio:4/3;width:100%;overflow:hidden;background:#151c25}.dm-photo img{width:100%;height:100%;object-fit:cover;display:block}.dm-fallback{display:grid;width:100%;height:100%;place-items:center;align-content:center;gap:5px;color:#71839a;background:linear-gradient(145deg,#151c25,#0d1218)}.dm-fallback b{font-size:23px}.dm-fallback small{font-size:8px}
          .dm-card-body{padding:10px}.dm-card-body b,.dm-card-body span,.dm-card-body small{display:block}.dm-card-event{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(148,163,184,.08)}.dm-card-event>span{display:grid;gap:2px;margin:0!important;color:#6f7d8d!important;font-size:6px!important}.dm-card-event b{color:#d5e0eb!important;font-size:9px!important}.dm-shortage{color:#f4ad54!important}.dm-missing{color:#ff9d97!important}.dm-card-body b{font-size:11px;color:#ecf2f8}.dm-card-body span{margin-top:3px;color:#7e8b9a;font-size:8px}.dm-card-body small{margin-top:7px;color:#75dca0;font-size:8px;font-weight:850}
          .dm-editor{padding:14px}.dm-event-status{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin-top:12px;padding:9px;border:1px solid rgba(148,163,184,.09);border-radius:12px;background:#0d141b}.dm-event-status>div{min-width:0;padding:8px;border-radius:9px;background:rgba(255,255,255,.02)}.dm-event-status>div.attention{background:rgba(244,173,84,.045)}.dm-event-status span,.dm-event-status b,.dm-event-status small{display:block}.dm-event-status span{color:#718094;font-size:7px;font-weight:900;text-transform:uppercase}.dm-event-status b{margin-top:4px;color:#e5edf6;font-size:12px}.dm-event-status small{margin-top:2px;color:#68778a;font-size:7px}.dm-event-actions{display:flex;gap:7px;margin-top:8px}.dm-event-actions .dm-button{flex:1}.dm-editor h2{margin:0;font-size:17px}.dm-editor p{margin:3px 0 0;color:#7c8999;font-size:9px}.dm-photo-large{margin-top:13px;overflow:hidden;aspect-ratio:16/10;border:1px solid #2c3541;border-radius:12px;background:#111820}.dm-photo-large img{width:100%;height:100%;object-fit:cover;display:block}
          .dm-photo-actions{display:flex;gap:7px;margin-top:8px}.dm-upload{display:inline-flex;min-height:38px;align-items:center;justify-content:center;padding:0 11px;border:1px solid #303945;border-radius:8px;color:#c0cad5;background:#171e27;font-size:9px;font-weight:900;cursor:pointer}.dm-upload input{display:none}
          .dm-form{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:13px}.dm-field{display:grid;gap:5px}.dm-field.full{grid-column:1/-1}.dm-field>span{font-size:8px;font-weight:850;color:#8290a1;text-transform:uppercase}.dm-foot{display:flex;justify-content:flex-end;gap:7px;margin-top:14px;padding-top:12px;border-top:1px solid #252c35}
          .dm-msg{padding:10px 12px;border:1px solid rgba(61,220,132,.18);border-radius:10px;color:#75dfa2;background:rgba(61,220,132,.06);font-size:10px}.dm-msg.error{border-color:rgba(255,98,89,.2);color:#ff948e;background:rgba(255,98,89,.06)}.dm-empty{padding:45px 15px;color:#748192;font-size:10px;text-align:center}
          @media(max-width:1150px){.dm-command{grid-template-columns:1fr}.dm-command-side{grid-template-columns:repeat(4,minmax(0,1fr))}.dm-command-actions{grid-column:1/-1!important}.dm-toolbar{grid-template-columns:1fr 1fr}}
          @media(max-width:1050px){.dm-layout{grid-template-columns:1fr}.dm-stats{grid-template-columns:1fr 1fr}.dm-event-status{grid-template-columns:repeat(3,1fr)}}@media(max-width:700px){.dm-command{padding:16px}.dm-command-side{grid-template-columns:1fr 1fr}.dm-command-actions{grid-template-columns:1fr!important}.dm-head{align-items:stretch;flex-direction:column}.dm-toolbar{grid-template-columns:1fr}.dm-event-status{grid-template-columns:1fr 1fr}.dm-event-actions{display:grid;grid-template-columns:1fr}.dm-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dm-form{grid-template-columns:1fr}.dm-field.full{grid-column:auto}}
        `}</style>

        <header className="dm-command">
          <div>
            <small>Disposable inventory & event cost control</small>
            <h1>Disposable Master</h1>
            <p>
              Save photos, units, stock, rates and suppliers once, then see exactly what the current event requires, what is confirmed and where cost or stock gaps remain.
            </p>
          </div>

          <div className="dm-command-side">
            <div>
              <span>Event required</span>
              <b>{planningLoading ? '—' : currentEventRequiredQty}</b>
              <small>{currentEventItemCount} item{currentEventItemCount === 1 ? '' : 's'} · {currentEventName}</small>
            </div>
            <div>
              <span>Confirmed</span>
              <b>{planningLoading ? '—' : currentEventConfirmedQty}</b>
              <small>Confirmed, delivered or closed</small>
            </div>
            <div className={currentEventShortageQty > 0 ? 'attention' : ''}>
              <span>Stock shortage</span>
              <b>{planningLoading ? '—' : currentEventShortageQty}</b>
              <small>{currentEventShortageQty > 0 ? 'Purchase / supplier action required' : 'No known shortage'}</small>
            </div>
            <div>
              <span>Event disposable cost</span>
              <b>{planningLoading ? '—' : money(currentEventDisposableCost)}</b>
              <small>{missingRateCount} missing rate · {missingSupplierCount} missing supplier</small>
            </div>

            <div className="dm-command-actions">
              <button className="dm-button" type="button" onClick={addItem}>
                + Add Item
              </button>
              <button className="dm-button" type="button" onClick={() => window.location.assign('/app/vendors')}>
                Suppliers
              </button>
              <button className="dm-button primary" type="button" onClick={() => window.location.assign('/app/event-planning')}>
                Assign to Event
              </button>
            </div>
          </div>
        </header>

        <section className="dm-stats">
          <article className="dm-stat">
            <small>Active catalog</small>
            <b>{items.filter((item) => item.active).length}</b>
            <span>{items.filter((item) => item.photoUrl).length} with photos</span>
          </article>
          <article className="dm-stat">
            <small>Available stock</small>
            <b>{items.filter((item) => item.active).reduce((sum, item) => sum + item.availableQty, 0)}</b>
            <span>Across active disposable items</span>
          </article>
          <article className="dm-stat">
            <small>Needs pricing</small>
            <b>{items.filter((item) => item.active && item.defaultRate <= 0).length}</b>
            <span>{missingRateCount} used in current event</span>
          </article>
          <article className="dm-stat">
            <small>Current event</small>
            <b>{planningLoading ? '—' : currentEventItemCount}</b>
            <span>{planningLoading ? 'Loading usage…' : `${currentEventRequiredQty} qty · ${money(currentEventDisposableCost)} planned`}</span>
          </article>
        </section>

        {message ? <div className="dm-msg">{message}</div> : null}
        {error ? <div className="dm-msg error">{error}</div> : null}

        <div className="dm-layout">
          <section className="dm-panel">
            <div className="dm-toolbar">
              <input
                className="dm-input"
                value={query}
                placeholder="Search cup, plate, tissue…"
                onChange={(event) => setQuery(event.target.value)}
              />

              <select className="dm-select" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="ALL">All categories</option>
                {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>

              <select className="dm-select" value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)}>
                <option value="ALL">All suppliers</option>
                {suppliers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>

              <select
                className="dm-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as
                      | 'ALL'
                      | 'ACTIVE'
                      | 'INACTIVE'
                      | 'SHORTAGE'
                      | 'MISSING_RATE'
                      | 'MISSING_SUPPLIER',
                  )
                }
              >
                <option value="ALL">All status</option>
                <option value="ACTIVE">Active</option>
                <option value="SHORTAGE">Shortage</option>
                <option value="MISSING_RATE">Missing rate</option>
                <option value="MISSING_SUPPLIER">Missing supplier</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            {loading ? <div className="dm-empty">Loading items…</div> : filtered.length ? (
              <div className="dm-grid">
                {filtered.map((item) => {
                  const required = requiredQty(item);
                  const confirmed = confirmedQty(item);
                  const shortage = shortageQty(item);
                  const missing = hasMissingRate(item) || hasMissingSupplier(item);

                  return (
                    <button
                      key={item.id}
                      className={
                        [
                          'dm-card',
                          selectedId === item.id ? 'active' : '',
                          shortage > 0 ? 'shortage' : '',
                          missing ? 'missing' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')
                      }
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                    >
                      <div className="dm-photo">
                        {item.photoUrl
                          ? <img src={item.photoUrl} alt={item.name} />
                          : <div className="dm-fallback"><b>{item.name.slice(0,2).toUpperCase() || 'DP'}</b><small>Add photo</small></div>}
                      </div>

                      <div className="dm-card-body">
                        <b>{item.name || 'Unnamed item'}</b>
                        <span>{item.category} · {item.unit}</span>
                        <small className={item.defaultRate <= 0 ? 'dm-missing' : ''}>
                          {money(item.defaultRate)} / {item.unit}
                          {item.supplierName ? ` · ${item.supplierName}` : ' · No supplier'}
                        </small>

                        <div className="dm-card-event">
                          <span>Required<b>{required}</b></span>
                          <span>Confirmed<b>{confirmed}</b></span>
                          <span>Shortage<b className={shortage > 0 ? 'dm-shortage' : ''}>{shortage}</b></span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : <div className="dm-empty">No disposable master items found.</div>}
          </section>

          <aside className="dm-panel">
            {selected ? (
              <div className="dm-editor">
                <div style={{display:'flex',justifyContent:'space-between',gap:10}}>
                  <div><h2>{selected.name || 'New item'}</h2><p>Photo, purchase unit, rate and supplier.</p></div>
                  <label style={{display:'flex',alignItems:'center',gap:6,color:'#9aa6b4',fontSize:9}}><input type="checkbox" checked={selected.active} onChange={(event) => updateItem(selected.id, { active: event.target.checked })} />Active</label>
                </div>

                <div className="dm-event-status">
                  <div>
                    <span>Required</span>
                    <b>{requiredQty(selected)}</b>
                    <small>{functionCount(selected)} function{functionCount(selected) === 1 ? '' : 's'}</small>
                  </div>
                  <div>
                    <span>Confirmed</span>
                    <b>{confirmedQty(selected)}</b>
                    <small>Confirmed+</small>
                  </div>
                  <div className={shortageQty(selected) > 0 ? 'attention' : ''}>
                    <span>Stock shortage</span>
                    <b>{shortageQty(selected)}</b>
                    <small>{shortageQty(selected) > 0 ? 'Purchase / supplier' : 'Covered'}</small>
                  </div>
                  <div>
                    <span>Event cost</span>
                    <b>{money(eventCost(selected))}</b>
                    <small>{rowsForItem(selected).length} assignment{rowsForItem(selected).length === 1 ? '' : 's'}</small>
                  </div>
                  <div className={hasMissingRate(selected) || hasMissingSupplier(selected) ? 'attention' : ''}>
                    <span>Readiness</span>
                    <b>{hasMissingRate(selected) || hasMissingSupplier(selected) ? 'Needs action' : 'Ready'}</b>
                    <small>
                      {hasMissingRate(selected) ? 'Missing rate' : hasMissingSupplier(selected) ? 'Missing supplier' : 'Rate & supplier set'}
                    </small>
                  </div>
                </div>

                <div className="dm-event-actions">
                  <button className="dm-button primary" type="button" onClick={() => window.location.assign('/app/event-planning')}>
                    Assign to Event
                  </button>
                  <button className="dm-button" type="button" onClick={() => window.location.assign('/app/vendors')}>
                    {selected.supplierId ? 'Open Suppliers' : 'Add Supplier'}
                  </button>
                </div>

                <div className="dm-photo-large">{selected.photoUrl ? <img src={selected.photoUrl} alt={selected.name || 'Disposable'} /> : <div className="dm-fallback"><b>{selected.name.slice(0,2).toUpperCase() || 'DP'}</b><small>Add photo</small></div>}</div>
                <div className="dm-photo-actions">
                  <label className="dm-upload">Upload Photo<input type="file" accept="image/*" onChange={uploadPhoto} /></label>
                  {selected.photoUrl ? <button className="dm-button" type="button" onClick={() => updateItem(selected.id, { photoUrl: '' })}>Remove Photo</button> : null}
                </div>

                <div className="dm-form">
                  <label className="dm-field full"><span>Item Name</span><input className="dm-input" value={selected.name} onChange={(event) => updateItem(selected.id, { name: event.target.value })} /></label>
                  <label className="dm-field"><span>Category</span><select className="dm-select" value={selected.category} onChange={(event) => updateItem(selected.id, { category: event.target.value })}>{CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                  <label className="dm-field"><span>Unit</span><select className="dm-select" value={selected.unit} onChange={(event) => updateItem(selected.id, { unit: event.target.value })}>{UNITS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                  <label className="dm-field"><span>Available Stock</span><input className="dm-input" type="number" min="0" value={selected.availableQty} onChange={(event) => updateItem(selected.id, { availableQty: Math.max(0, Math.round(Number(event.target.value) || 0)) })} /></label>
                  <label className="dm-field"><span>Default Rate</span><input className="dm-input" type="number" min="0" value={selected.defaultRate} onChange={(event) => updateItem(selected.id, { defaultRate: Math.max(0, Number(event.target.value) || 0) })} /></label>
                  <label className="dm-field"><span>Supplier</span><select className="dm-select" value={selected.supplierId} onChange={(event) => { const vendor = vendors.find((item) => item.id === event.target.value); updateItem(selected.id, { supplierId: vendor?.id || '', supplierName: vendor?.name || '' }); }}><option value="">No linked supplier</option>{vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>
                  <label className="dm-field full"><span>Photo URL</span><input className="dm-input" value={selected.photoUrl.startsWith('data:') ? '' : selected.photoUrl} placeholder="Optional https:// image URL" onChange={(event) => updateItem(selected.id, { photoUrl: event.target.value })} /></label>
                  <label className="dm-field full"><span>Notes</span><textarea className="dm-textarea" value={selected.notes} onChange={(event) => updateItem(selected.id, { notes: event.target.value })} /></label>
                </div>

                <div className="dm-foot">
                  <button className="dm-button" type="button" onClick={() => removeItem(selected.id)}>Remove</button>
                  <button className="dm-button primary" type="button" disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save Changes'}</button>
                </div>
              </div>
            ) : <div className="dm-empty">Add an item to start your disposable photo catalog.</div>}
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
