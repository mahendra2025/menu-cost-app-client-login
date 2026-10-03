'use client';

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import AppShell from '../../components/AppShell';
import { getSession, loadWork, uid } from '../../../lib/store';

type Vendor = {
  id: string;
  name: string;
  active: boolean;
};


type UniformPlanningRow = {
  id: string;
  kind: string;
  requirement: string;
  quantity: number;
  rate: number;
  uniformId?: string;
  availableQty?: number;
  status: 'PENDING' | 'CONFIRMED' | 'DELIVERED' | 'CLOSED';
};

type UniformPlanningPlan =
  Record<string, UniformPlanningRow[]>;

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

const LAUNDRY = ['READY', 'ISSUED', 'IN_USE', 'RETURNED', 'LAUNDRY'];

function money(value: number) {
  return new Intl.NumberFormat(
    'en-IN',
    {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    },
  ).format(
    Math.max(
      0,
      Number(value) || 0,
    ),
  );
}

function normalized(value: string) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function blankUniform(): UniformItem {
  return {
    id: uid('uniform'),
    name: '',
    photoUrl: '',
    staffRole: 'Waiter',
    components: 'Shirt + Pant',
    sizes: 'S, M, L, XL, XXL',
    ownership: 'IN_HOUSE',
    availableQty: 1,
    unit: 'set',
    defaultRate: 0,
    vendorId: '',
    vendorName: '',
    laundryStatus: 'READY',
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

export default function UniformMasterPage() {
  const [uniforms, setUniforms] = useState<UniformItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [ownershipFilter, setOwnershipFilter] =
    useState<'ALL' | 'IN_HOUSE' | 'RENTAL'>('ALL');
  const [statusFilter, setStatusFilter] =
    useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'SHORTAGE' | 'LAUNDRY'>('ALL');
  const [planningPlan, setPlanningPlan] =
    useState<UniformPlanningPlan>({});
  const [planningLoading, setPlanningLoading] = useState(false);
  const [currentEventName, setCurrentEventName] = useState('');

  useEffect(() => {
    const session = getSession();
    if (!session) {
      window.location.assign('/login');
      return;
    }

    void load();

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
                'Could not load event uniform plan.',
            );
          }

          setPlanningPlan(
            data.plan &&
            typeof data.plan === 'object' &&
            !Array.isArray(data.plan)
              ? data.plan as UniformPlanningPlan
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
      const [uniformResponse, vendorResponse] = await Promise.all([
        fetch('/api/client/uniforms', { cache: 'no-store' }),
        fetch('/api/client/vendors', { cache: 'no-store' }),
      ]);

      const data = await uniformResponse.json();
      if (!uniformResponse.ok) {
        throw new Error(data.error || 'Could not load uniforms');
      }

      const rows = Array.isArray(data.uniforms)
        ? data.uniforms as UniformItem[]
        : [];

      setUniforms(rows);
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
      setError(caught instanceof Error ? caught.message : 'Could not load uniforms');
    } finally {
      setLoading(false);
    }
  }

  async function save(next = uniforms) {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/client/uniforms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uniforms: next }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save uniforms');

      const saved = Array.isArray(data.uniforms)
        ? data.uniforms as UniformItem[]
        : next;

      setUniforms(saved);
      setMessage('Dress & uniform master saved.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save uniforms');
    } finally {
      setSaving(false);
    }
  }

  function addItem() {
    const item = blankUniform();
    setUniforms((current) => [item, ...current]);
    setSelectedId(item.id);
    setMessage('');
  }

  function updateItem(id: string, patch: Partial<UniformItem>) {
    setUniforms((current) =>
      current.map((item) => item.id === id ? { ...item, ...patch } : item),
    );
    setMessage('');
  }

  function removeItem(id: string) {
    const next = uniforms.filter((item) => item.id !== id);
    setUniforms(next);
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

  const selected = uniforms.find((item) => item.id === selectedId) || null;

  const planningRows =
    Object.values(planningPlan).flat();

  const dressRows =
    planningRows.filter(
      (row) => row.kind === 'DRESS',
    );

  const manpowerRows =
    planningRows.filter(
      (row) => row.kind === 'MANPOWER',
    );

  function rowsForUniform(item: UniformItem) {
    const itemName = normalized(item.name);

    return dressRows.filter(
      (row) =>
        row.uniformId === item.id ||
        (
          !row.uniformId &&
          normalized(row.requirement) === itemName
        ),
    );
  }

  function roleRequiredQty(item: UniformItem) {
    const role = normalized(item.staffRole);

    if (!role) return 0;

    return manpowerRows
      .filter((row) => {
        const requirement =
          normalized(row.requirement);

        return (
          requirement === role ||
          requirement.includes(role) ||
          role.includes(requirement)
        );
      })
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

  function selectedQty(item: UniformItem) {
    return rowsForUniform(item).reduce(
      (sum, row) =>
        sum +
        Math.max(
          0,
          Number(row.quantity) || 0,
        ),
      0,
    );
  }

  function confirmedQty(item: UniformItem) {
    return rowsForUniform(item)
      .filter((row) =>
        ['CONFIRMED', 'DELIVERED', 'CLOSED'].includes(row.status),
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

  function shortageQty(item: UniformItem) {
    const selectedForEvent =
      selectedQty(item);

    const available =
      Math.max(
        0,
        Number(item.availableQty) || 0,
      );

    return Math.max(
      0,
      selectedForEvent - available,
    );
  }

  function eventCost(item: UniformItem) {
    return rowsForUniform(item).reduce(
      (sum, row) =>
        sum +
        Math.max(
          0,
          Number(row.quantity) || 0,
        ) *
          Math.max(
            0,
            Number(row.rate) ||
              Number(item.defaultRate) ||
              0,
          ),
      0,
    );
  }

  const currentEventSelectedQty =
    uniforms.reduce(
      (sum, item) =>
        sum + selectedQty(item),
      0,
    );

  const currentEventConfirmedQty =
    uniforms.reduce(
      (sum, item) =>
        sum + confirmedQty(item),
      0,
    );

  const currentEventShortageQty =
    uniforms.reduce(
      (sum, item) =>
        sum + shortageQty(item),
      0,
    );

  const currentEventUniformCost =
    uniforms.reduce(
      (sum, item) =>
        sum + eventCost(item),
      0,
    );

  const currentEventUniformStyles =
    uniforms.filter(
      (item) => selectedQty(item) > 0,
    ).length;

  const roles = useMemo(
    () =>
      Array.from(
        new Set(
          uniforms
            .map((item) => item.staffRole.trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [uniforms],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return uniforms.filter((item) => {
      if (
        roleFilter !== 'ALL' &&
        item.staffRole !== roleFilter
      ) {
        return false;
      }

      if (
        ownershipFilter !== 'ALL' &&
        item.ownership !== ownershipFilter
      ) {
        return false;
      }

      if (
        statusFilter === 'ACTIVE' &&
        !item.active
      ) {
        return false;
      }

      if (
        statusFilter === 'INACTIVE' &&
        item.active
      ) {
        return false;
      }

      if (
        statusFilter === 'SHORTAGE' &&
        shortageQty(item) <= 0
      ) {
        return false;
      }

      if (
        statusFilter === 'LAUNDRY' &&
        item.laundryStatus !== 'LAUNDRY'
      ) {
        return false;
      }

      if (!q) return true;

      return [
        item.name,
        item.staffRole,
        item.components,
        item.sizes,
        item.vendorName,
        item.laundryStatus,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [
    ownershipFilter,
    planningPlan,
    query,
    roleFilter,
    statusFilter,
    uniforms,
  ]);

  return (
    <AppShell
      title="Dress & Uniform"
      subtitle="Photo uniform catalog for catering staff"
      hidePageTitle
    >
      <section className="uf-page">
        <style>{`
          .uf-page{display:grid;gap:14px;color:#edf2f8}
          .uf-command{display:grid;grid-template-columns:minmax(0,1fr) minmax(390px,.68fr);gap:18px;align-items:center;padding:18px 20px;border:1px solid #2a3542;border-radius:18px;background:radial-gradient(circle at 96% 10%,rgba(74,156,255,.13),transparent 22rem),linear-gradient(145deg,#111923,#0d141c);box-shadow:0 14px 34px rgba(0,0,0,.16)}
          .uf-command small{display:block;color:#78b5ff;font-size:8px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
          .uf-command h1{margin:7px 0 6px;font-size:clamp(28px,3.4vw,40px);line-height:1.04;letter-spacing:-.045em}
          .uf-command p{max-width:720px;margin:0;color:#8b98a9;font-size:10px;line-height:1.55}
          .uf-command-side{display:grid;grid-template-columns:1fr 1fr;gap:7px}
          .uf-command-side>div{min-width:0;padding:10px;border:1px solid rgba(148,163,184,.10);border-radius:11px;background:rgba(255,255,255,.022)}
          .uf-command-side>div.attention{border-color:rgba(244,173,84,.18);background:rgba(244,173,84,.045)}
          .uf-command-side span,.uf-command-side b,.uf-command-side small{display:block}
          .uf-command-side span{color:#718094;font-size:7px;font-weight:900;text-transform:uppercase}
          .uf-command-side b{margin-top:4px;color:#e7eef6;font-size:15px}
          .uf-command-side small{margin-top:3px;color:#68778a;font-size:7px;letter-spacing:0;text-transform:none}
          .uf-command-actions{grid-column:1/-1!important;display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:7px!important;padding:0!important;border:0!important;background:transparent!important}
          .uf-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding:16px 2px 3px}
          .uf-head small{display:block;color:#78b5ff;font-size:9px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
          .uf-head h1{margin:6px 0 5px;font-size:clamp(30px,4vw,44px);line-height:1;letter-spacing:-.05em}
          .uf-head p{margin:0;color:#8794a5;font-size:11px}
          .uf-actions{display:flex;gap:7px}
          .uf-button{min-height:40px;padding:0 13px;border:1px solid #303844;border-radius:10px;color:#bdc7d3;background:#151b23;font:inherit;font-size:10px;font-weight:900;cursor:pointer}
          .uf-button.primary{border-color:#1478f2;color:#fff;background:#1478f2}
          .uf-button:disabled{opacity:.55;cursor:wait}
          .uf-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
          .uf-stat{padding:13px;border:1px solid #282f39;border-radius:14px;background:#10151c}
          .uf-stat small,.uf-stat b,.uf-stat span{display:block}.uf-stat small{color:#7b8898;font-size:8px;font-weight:850;text-transform:uppercase}
          .uf-stat b{margin:5px 0 2px;font-size:20px}.uf-stat span{color:#748192;font-size:8px}
          .uf-msg{padding:10px 12px;border:1px solid rgba(61,220,132,.18);border-radius:10px;color:#75dfa2;background:rgba(61,220,132,.06);font-size:10px}
          .uf-msg.error{border-color:rgba(255,98,89,.2);color:#ff948e;background:rgba(255,98,89,.06)}
          .uf-layout{display:grid;grid-template-columns:minmax(0,1.45fr) 390px;gap:12px;align-items:start}
          .uf-panel{border:1px solid #282f39;border-radius:15px;background:#10151c}
          .uf-search{display:grid;grid-template-columns:minmax(0,1fr) repeat(3,150px);gap:8px;padding:11px;border-bottom:1px solid #252c35}
          .uf-input,.uf-select,.uf-textarea{width:100%;min-height:38px;padding:0 10px;border:1px solid #303945;border-radius:8px;outline:0;color:#dfe7f0;background:#151c25;font:inherit;font-size:10px}
          .uf-textarea{min-height:78px;padding:9px;resize:vertical}
          .uf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:10px;padding:11px}
          .uf-card{position:relative;overflow:hidden;border:1px solid #2a323d;border-radius:13px;background:#0f141b;cursor:pointer;text-align:left;transition:border-color .18s ease,transform .18s ease,box-shadow .18s ease}
          .uf-card:hover{border-color:#3a4654;transform:translateY(-1px);box-shadow:0 10px 24px rgba(0,0,0,.12)}
          .uf-card.shortage{border-color:rgba(244,173,84,.40);background:linear-gradient(180deg,#151713,#0f141b)}
          .uf-card.laundry{border-color:rgba(74,156,255,.22)}
          .uf-card.active{border-color:rgba(74,156,255,.75);box-shadow:0 0 0 2px rgba(74,156,255,.1)}
          .uf-photo{aspect-ratio:4/3;width:100%;overflow:hidden;background:#151c25}.uf-photo img{width:100%;height:100%;object-fit:cover;display:block}
          .uf-fallback{display:grid;width:100%;height:100%;place-items:center;align-content:center;gap:5px;color:#71839a;background:linear-gradient(145deg,#151c25,#0d1218)}
          .uf-fallback b{font-size:23px}.uf-fallback small{font-size:8px}
          .uf-card-body{padding:10px}.uf-card-body b,.uf-card-body span,.uf-card-body small{display:block}
          .uf-card-body b{font-size:11px;color:#ecf2f8}.uf-card-body span{margin-top:3px;color:#7e8b9a;font-size:8px}.uf-card-body small{margin-top:7px;color:#75dca0;font-size:8px;font-weight:850}
          .uf-badge{position:absolute;top:8px;right:8px;padding:4px 6px;border-radius:999px;background:rgba(10,15,22,.78);color:#b8c6d5;font-size:7px;font-weight:900}
          .uf-card-event{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(148,163,184,.08)}
          .uf-card-event>span{display:grid;gap:2px;margin:0!important;color:#6f7d8d!important;font-size:6px!important}
          .uf-card-event b{color:#d5e0eb!important;font-size:9px!important}
          .uf-shortage{color:#f4ad54!important}
          .uf-empty{padding:45px 15px;color:#748192;font-size:10px;text-align:center}
          .uf-editor{padding:14px}.uf-editor-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:12px;border-bottom:1px solid #252c35}
          .uf-editor-head h2{margin:0;font-size:17px}.uf-editor-head p{margin:3px 0 0;color:#7c8999;font-size:9px}
          .uf-event-status{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin-top:12px;padding:9px;border:1px solid rgba(148,163,184,.09);border-radius:12px;background:#0d141b}
          .uf-event-status>div{min-width:0;padding:8px;border-radius:9px;background:rgba(255,255,255,.02)}
          .uf-event-status>div.attention{background:rgba(244,173,84,.045)}
          .uf-event-status span,.uf-event-status b,.uf-event-status small{display:block}
          .uf-event-status span{color:#718094;font-size:7px;font-weight:900;text-transform:uppercase}
          .uf-event-status b{margin-top:4px;color:#e5edf6;font-size:12px}
          .uf-event-status small{margin-top:2px;color:#68778a;font-size:7px}
          .uf-event-actions{display:flex;gap:7px;margin-top:8px}
          .uf-event-actions .uf-button{flex:1}
          .uf-photo-large{margin-top:13px;overflow:hidden;aspect-ratio:16/10;border:1px solid #2c3541;border-radius:12px;background:#111820}
          .uf-photo-large img{width:100%;height:100%;object-fit:cover;display:block}
          .uf-photo-actions{display:flex;gap:7px;margin-top:8px}.uf-upload{display:inline-flex;min-height:38px;align-items:center;justify-content:center;padding:0 11px;border:1px solid #303945;border-radius:8px;color:#c0cad5;background:#171e27;font-size:9px;font-weight:900;cursor:pointer}.uf-upload input{display:none}
          .uf-form{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:13px}.uf-field{display:grid;gap:5px}.uf-field.full{grid-column:1/-1}.uf-field>span{font-size:8px;font-weight:850;color:#8290a1;text-transform:uppercase}
          .uf-foot{display:flex;justify-content:flex-end;gap:7px;margin-top:14px;padding-top:12px;border-top:1px solid #252c35}
          @media(max-width:1150px){.uf-command{grid-template-columns:1fr}.uf-command-side{grid-template-columns:repeat(4,minmax(0,1fr))}.uf-command-actions{grid-column:1/-1!important}.uf-search{grid-template-columns:1fr 1fr}}
          @media(max-width:1050px){.uf-layout{grid-template-columns:1fr}.uf-stats{grid-template-columns:1fr 1fr}.uf-event-status{grid-template-columns:repeat(3,1fr)}}
          @media(max-width:700px){.uf-command{padding:16px}.uf-command-side{grid-template-columns:1fr 1fr}.uf-command-actions{grid-template-columns:1fr!important}.uf-head{align-items:stretch;flex-direction:column}.uf-actions{display:grid;grid-template-columns:1fr 1fr}.uf-search{grid-template-columns:1fr}.uf-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.uf-form{grid-template-columns:1fr}.uf-field.full{grid-column:auto}.uf-event-status{grid-template-columns:1fr 1fr}.uf-event-actions{display:grid;grid-template-columns:1fr}}
        `}</style>

        <header className="uf-command">
          <div>
            <small>Staff presentation & uniform readiness</small>
            <h1>Dress & Uniform</h1>
            <p>
              Manage uniform styles, stock, sizes, laundry and rental vendors, then see what the current event has selected and where shortages remain.
            </p>
          </div>

          <div className="uf-command-side">
            <div>
              <span>Selected for event</span>
              <b>{planningLoading ? '—' : currentEventSelectedQty}</b>
              <small>{currentEventUniformStyles} uniform style{currentEventUniformStyles === 1 ? '' : 's'} · {currentEventName}</small>
            </div>
            <div>
              <span>Confirmed / ready</span>
              <b>{planningLoading ? '—' : currentEventConfirmedQty}</b>
              <small>Confirmed, delivered or closed</small>
            </div>
            <div className={currentEventShortageQty > 0 ? 'attention' : ''}>
              <span>Shortage</span>
              <b>{planningLoading ? '—' : currentEventShortageQty}</b>
              <small>{currentEventShortageQty > 0 ? 'Needs rental / extra sets' : 'No known shortage'}</small>
            </div>
            <div>
              <span>Event uniform cost</span>
              <b>{planningLoading ? '—' : money(currentEventUniformCost)}</b>
              <small>Based on event selection & rates</small>
            </div>

            <div className="uf-command-actions">
              <button className="uf-button" type="button" onClick={addItem}>
                + Add Uniform
              </button>
              <button
                className="uf-button"
                type="button"
                onClick={() => window.location.assign('/app/vendors')}
              >
                Vendors
              </button>
              <button
                className="uf-button primary"
                type="button"
                onClick={() => window.location.assign('/app/event-planning')}
              >
                Assign to Event
              </button>
            </div>
          </div>
        </header>

        <section className="uf-stats">
          <article className="uf-stat"><small>Total uniforms</small><b>{uniforms.length}</b><span>Saved dress styles</span></article>
          <article className="uf-stat"><small>Ready styles</small><b>{uniforms.filter((item) => item.active && item.laundryStatus === 'READY').length}</b><span>{uniforms.filter((item) => item.photoUrl).length} with photos</span></article>
          <article className="uf-stat"><small>Available sets</small><b>{uniforms.filter((item) => item.active).reduce((sum, item) => sum + item.availableQty, 0)}</b><span>Active in-house & rental stock</span></article>
          <article className="uf-stat"><small>Current event</small><b>{planningLoading ? '—' : currentEventUniformStyles}</b><span>{planningLoading ? 'Loading allocation…' : `${currentEventSelectedQty} selected · ${money(currentEventUniformCost)} planned`}</span></article>
        </section>

        {message ? <div className="uf-msg">{message}</div> : null}
        {error ? <div className="uf-msg error">{error}</div> : null}

        <div className="uf-layout">
          <section className="uf-panel">
            <div className="uf-search">
              <input
                className="uf-input"
                value={query}
                placeholder="Search waiter, chef, blazer…"
                onChange={(event) => setQuery(event.target.value)}
              />

              <select
                className="uf-select"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                <option value="ALL">All staff roles</option>
                {roles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>

              <select
                className="uf-select"
                value={ownershipFilter}
                onChange={(event) =>
                  setOwnershipFilter(
                    event.target.value as 'ALL' | 'IN_HOUSE' | 'RENTAL',
                  )
                }
              >
                <option value="ALL">All ownership</option>
                <option value="IN_HOUSE">In-house</option>
                <option value="RENTAL">Rental / Vendor</option>
              </select>

              <select
                className="uf-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as
                      | 'ALL'
                      | 'ACTIVE'
                      | 'INACTIVE'
                      | 'SHORTAGE'
                      | 'LAUNDRY',
                  )
                }
              >
                <option value="ALL">All status</option>
                <option value="ACTIVE">Active</option>
                <option value="SHORTAGE">Shortage</option>
                <option value="LAUNDRY">In Laundry</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            {loading ? (
              <div className="uf-empty">Loading uniforms…</div>
            ) : filtered.length ? (
              <div className="uf-grid">
                {filtered.map((item) => {
                  const roleNeed = roleRequiredQty(item);
                  const selectedForEvent = selectedQty(item);
                  const shortage = shortageQty(item);

                  return (
                  <button
                    key={item.id}
                    className={
                      [
                        'uf-card',
                        selectedId === item.id ? 'active' : '',
                        shortage > 0 ? 'shortage' : '',
                        item.laundryStatus === 'LAUNDRY' ? 'laundry' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')
                    }
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span className="uf-badge">{item.ownership === 'IN_HOUSE' ? 'OWN' : 'RENTAL'}</span>
                    <div className="uf-photo">
                      {item.photoUrl ? (
                        <img src={item.photoUrl} alt={item.name} />
                      ) : (
                        <div className="uf-fallback"><b>{item.name.slice(0,2).toUpperCase() || 'UF'}</b><small>Add photo</small></div>
                      )}
                    </div>
                    <div className="uf-card-body">
                      <b>{item.name || 'Unnamed uniform'}</b>
                      <span>{item.staffRole || 'No role'} · {item.components || 'No components'}</span>
                      <small>
                        Available {item.availableQty} {item.unit}
                        {item.vendorName ? ` · ${item.vendorName}` : ''}
                        {' · '}
                        {item.laundryStatus.replace(/_/g, ' ')}
                      </small>

                      <div className="uf-card-event">
                        <span>
                          Role need
                          <b>{roleNeed}</b>
                        </span>
                        <span>
                          Selected
                          <b>{selectedForEvent}</b>
                        </span>
                        <span>
                          Shortage
                          <b className={shortage > 0 ? 'uf-shortage' : ''}>{shortage}</b>
                        </span>
                      </div>
                    </div>
                  </button>
                  );
                })}
              </div>
            ) : (
              <div className="uf-empty">No uniform styles found.</div>
            )}
          </section>

          <aside className="uf-panel">
            {selected ? (
              <div className="uf-editor">
                <div className="uf-editor-head">
                  <div><h2>{selected.name || 'New uniform'}</h2><p>Photo, role, sizes, stock and rental details.</p></div>
                  <label style={{display:'flex',alignItems:'center',gap:6,color:'#9aa6b4',fontSize:9}}>
                    <input type="checkbox" checked={selected.active} onChange={(event) => updateItem(selected.id, { active: event.target.checked })} />
                    Active
                  </label>
                </div>

                <div className="uf-event-status">
                  <div>
                    <span>Role need</span>
                    <b>{roleRequiredQty(selected)}</b>
                    <small>{selected.staffRole || 'No role mapped'}</small>
                  </div>
                  <div>
                    <span>Selected</span>
                    <b>{selectedQty(selected)}</b>
                    <small>{currentEventName}</small>
                  </div>
                  <div>
                    <span>Confirmed</span>
                    <b>{confirmedQty(selected)}</b>
                    <small>Confirmed+</small>
                  </div>
                  <div className={shortageQty(selected) > 0 ? 'attention' : ''}>
                    <span>Shortage</span>
                    <b>{shortageQty(selected)}</b>
                    <small>{shortageQty(selected) > 0 ? 'Add stock / rental' : 'Covered'}</small>
                  </div>
                  <div>
                    <span>Event cost</span>
                    <b>{money(eventCost(selected))}</b>
                    <small>{rowsForUniform(selected).length} assignment{rowsForUniform(selected).length === 1 ? '' : 's'}</small>
                  </div>
                </div>

                <div className="uf-event-actions">
                  <button
                    className="uf-button primary"
                    type="button"
                    onClick={() => window.location.assign('/app/event-planning')}
                  >
                    Assign to Event
                  </button>
                  <button
                    className="uf-button"
                    type="button"
                    onClick={() => window.location.assign('/app/vendors')}
                  >
                    {selected.vendorId ? 'Open Vendors' : 'Add Vendor'}
                  </button>
                </div>

                <div className="uf-photo-large">
                  {selected.photoUrl ? (
                    <img src={selected.photoUrl} alt={selected.name || 'Uniform'} />
                  ) : (
                    <div className="uf-fallback"><b>{selected.name.slice(0,2).toUpperCase() || 'UF'}</b><small>Add photo</small></div>
                  )}
                </div>

                <div className="uf-photo-actions">
                  <label className="uf-upload">
                    Upload Photo
                    <input type="file" accept="image/*" onChange={uploadPhoto} />
                  </label>
                  {selected.photoUrl ? (
                    <button className="uf-button" type="button" onClick={() => updateItem(selected.id, { photoUrl: '' })}>Remove Photo</button>
                  ) : null}
                </div>

                <div className="uf-form">
                  <label className="uf-field full"><span>Uniform Name</span><input className="uf-input" value={selected.name} placeholder="Waiter Premium Uniform" onChange={(event) => updateItem(selected.id, { name: event.target.value })} /></label>
                  <label className="uf-field"><span>Staff Role</span><input className="uf-input" value={selected.staffRole} placeholder="Waiter" onChange={(event) => updateItem(selected.id, { staffRole: event.target.value })} /></label>
                  <label className="uf-field"><span>Components</span><input className="uf-input" value={selected.components} placeholder="White Shirt + Black Pant + Tie" onChange={(event) => updateItem(selected.id, { components: event.target.value })} /></label>
                  <label className="uf-field"><span>Sizes</span><input className="uf-input" value={selected.sizes} placeholder="S, M, L, XL, XXL" onChange={(event) => updateItem(selected.id, { sizes: event.target.value })} /></label>
                  <label className="uf-field"><span>Ownership</span><select className="uf-select" value={selected.ownership} onChange={(event) => updateItem(selected.id, { ownership: event.target.value as UniformItem['ownership'] })}><option value="IN_HOUSE">In-house</option><option value="RENTAL">Rental / Vendor</option></select></label>
                  <label className="uf-field"><span>Available Qty</span><input className="uf-input" type="number" min="0" value={selected.availableQty} onChange={(event) => updateItem(selected.id, { availableQty: Math.max(0, Math.round(Number(event.target.value) || 0)) })} /></label>
                  <label className="uf-field"><span>Rate / Set</span><input className="uf-input" type="number" min="0" value={selected.defaultRate} onChange={(event) => updateItem(selected.id, { defaultRate: Math.max(0, Number(event.target.value) || 0) })} /></label>
                  <label className="uf-field"><span>Laundry Status</span><select className="uf-select" value={selected.laundryStatus} onChange={(event) => updateItem(selected.id, { laundryStatus: event.target.value })}>{LAUNDRY.map((item) => <option key={item} value={item}>{item.replace(/_/g,' ')}</option>)}</select></label>

                  <label className="uf-field full">
                    <span>Rental Vendor</span>
                    <select
                      className="uf-select"
                      value={selected.vendorId}
                      onChange={(event) => {
                        const vendor = vendors.find((item) => item.id === event.target.value);
                        updateItem(selected.id, {
                          vendorId: vendor?.id || '',
                          vendorName: vendor?.name || '',
                        });
                      }}
                    >
                      <option value="">No linked vendor</option>
                      {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
                    </select>
                  </label>

                  <label className="uf-field full"><span>Photo URL</span><input className="uf-input" value={selected.photoUrl.startsWith('data:') ? '' : selected.photoUrl} placeholder="Optional https:// image URL" onChange={(event) => updateItem(selected.id, { photoUrl: event.target.value })} /></label>
                  <label className="uf-field full"><span>Notes</span><textarea className="uf-textarea" value={selected.notes} onChange={(event) => updateItem(selected.id, { notes: event.target.value })} /></label>
                </div>

                <div className="uf-foot">
                  <button className="uf-button" type="button" onClick={() => removeItem(selected.id)}>Remove</button>
                  <button className="uf-button primary" type="button" disabled={saving} onClick={() => void save()}>
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="uf-empty">Add a uniform style to start your photo catalog.</div>
            )}
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
