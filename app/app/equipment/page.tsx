'use client';

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import AppShell from '../../components/AppShell';

import {
  getSession,
  loadWork,
  uid,
} from '../../../lib/store';

type Vendor = {
  id: string;
  name: string;
  type: 'VENDOR' | 'AGENCY' | 'INDIVIDUAL';
  active: boolean;
};


type EquipmentAssignment = {
  id: string;
  kind: string;
  equipmentId?: string;
  requirement: string;
  quantity: number;
  rate: number;
  status:
    | 'PENDING'
    | 'CONFIRMED'
    | 'DELIVERED'
    | 'CLOSED';
};

type EquipmentPlanningPlan =
  Record<string, EquipmentAssignment[]>;

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

const CATEGORIES = [
  'Cooking',
  'Buffet',
  'Live Counter',
  'Service',
  'Beverage',
  'Cold Storage',
  'Utility',
  'Transport',
  'Other',
];

function blankEquipment(): EquipmentItem {
  return {
    id: uid('equipment'),
    name: '',
    category: 'Cooking',
    photoUrl: '',
    ownership: 'IN_HOUSE',
    availableQty: 1,
    unit: 'unit',
    defaultRate: 0,
    vendorId: '',
    vendorName: '',
    capacity: '',
    notes: '',
    active: true,
  };
}

function money(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Number(value) || 0));
}

function imageFallback(name: string) {
  const label =
    name.trim().slice(0, 2).toUpperCase() ||
    'EQ';

  return (
    <div className="eq-photo-fallback">
      <span>{label}</span>
      <small>Add photo</small>
    </div>
  );
}

async function compressImage(
  file: File,
): Promise<string> {
  const dataUrl =
    await new Promise<string>(
      (resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () =>
          resolve(
            String(reader.result || ''),
          );

        reader.onerror = () =>
          reject(
            new Error(
              'Could not read image',
            ),
          );

        reader.readAsDataURL(file);
      },
    );

  const image =
    await new Promise<HTMLImageElement>(
      (resolve, reject) => {
        const element =
          new Image();

        element.onload = () =>
          resolve(element);

        element.onerror = () =>
          reject(
            new Error(
              'Could not open image',
            ),
          );

        element.src = dataUrl;
      },
    );

  const maxWidth = 520;
  const maxHeight = 360;
  const scale = Math.min(
    1,
    maxWidth / image.width,
    maxHeight / image.height,
  );

  const width = Math.max(
    1,
    Math.round(
      image.width * scale,
    ),
  );

  const height = Math.max(
    1,
    Math.round(
      image.height * scale,
    ),
  );

  const canvas =
    document.createElement(
      'canvas',
    );

  canvas.width = width;
  canvas.height = height;

  const context =
    canvas.getContext('2d');

  if (!context) {
    throw new Error(
      'Image processing unavailable',
    );
  }

  context.drawImage(
    image,
    0,
    0,
    width,
    height,
  );

  let quality = 0.72;
  let output =
    canvas.toDataURL(
      'image/jpeg',
      quality,
    );

  while (
    output.length > 120_000 &&
    quality > 0.35
  ) {
    quality -= 0.08;
    output =
      canvas.toDataURL(
        'image/jpeg',
        quality,
      );
  }

  if (output.length > 140_000) {
    throw new Error(
      'Photo is still too large. Please choose a smaller image.',
    );
  }

  return output;
}

export default function EquipmentMasterPage() {
  const [
    equipment,
    setEquipment,
  ] =
    useState<EquipmentItem[]>([]);

  const [
    vendors,
    setVendors,
  ] =
    useState<Vendor[]>([]);

  const [
    selectedId,
    setSelectedId,
  ] =
    useState('');

  const [query, setQuery] =
    useState('');

  const [
    category,
    setCategory,
  ] =
    useState('ALL');


  const [
    ownershipFilter,
    setOwnershipFilter,
  ] =
    useState<
      'ALL' | 'IN_HOUSE' | 'RENTAL'
    >('ALL');

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      'ALL' | 'ACTIVE' | 'INACTIVE' | 'SHORTAGE'
    >('ALL');

  const [
    planningPlan,
    setPlanningPlan,
  ] =
    useState<EquipmentPlanningPlan>({});

  const [
    planningLoading,
    setPlanningLoading,
  ] =
    useState(false);

  const [
    currentEventName,
    setCurrentEventName,
  ] =
    useState('');

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState('');

  const [
    error,
    setError,
  ] =
    useState('');

  useEffect(() => {
    const session =
      getSession();

    if (!session) {
      window.location.assign(
        '/login',
      );
      return;
    }

    void load();

    const currentWork =
      loadWork(
        session.tenantId,
      );

    setCurrentEventName(
      currentWork.event.eventName ||
        currentWork.event.clientName ||
        'Current event',
    );

    if (
      currentWork.costingId
    ) {
      setPlanningLoading(true);

      void fetch(
        `/api/client/event-planning?costingId=${encodeURIComponent(
          currentWork.costingId,
        )}`,
        {
          cache: 'no-store',
        },
      )
        .then(
          async (response) => {
            const data =
              await response.json();

            if (!response.ok) {
              throw new Error(
                data.error ||
                  'Could not load event equipment plan.',
              );
            }

            setPlanningPlan(
              data.plan &&
              typeof data.plan ===
                'object' &&
              !Array.isArray(
                data.plan,
              )
                ? data.plan as
                    EquipmentPlanningPlan
                : {},
            );
          },
        )
        .catch(() => {
          setPlanningPlan({});
        })
        .finally(() => {
          setPlanningLoading(
            false,
          );
        });
    }
  }, []);

  async function load() {
    setLoading(true);
    setError('');

    try {
      const [
        equipmentResponse,
        vendorResponse,
      ] =
        await Promise.all([
          fetch(
            '/api/client/equipment',
            {
              cache:
                'no-store',
            },
          ),
          fetch(
            '/api/client/vendors',
            {
              cache:
                'no-store',
            },
          ),
        ]);

      const equipmentData =
        await equipmentResponse
          .json();

      if (!equipmentResponse.ok) {
        throw new Error(
          equipmentData.error ||
            'Could not load equipment',
        );
      }

      const rows =
        Array.isArray(
          equipmentData.equipment,
        )
          ? equipmentData.equipment as EquipmentItem[]
          : [];

      setEquipment(rows);

      setSelectedId(
        rows[0]?.id || '',
      );

      if (vendorResponse.ok) {
        const vendorData =
          await vendorResponse
            .json();

        setVendors(
          Array.isArray(
            vendorData.vendors,
          )
            ? (
                vendorData.vendors as Vendor[]
              ).filter(
                (vendor) =>
                  vendor.active !== false,
              )
            : [],
        );
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not load equipment',
      );
    } finally {
      setLoading(false);
    }
  }

  async function save(
    next = equipment,
  ) {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response =
        await fetch(
          '/api/client/equipment',
          {
            method: 'PUT',
            headers: {
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify({
                equipment: next,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not save equipment',
        );
      }

      const saved =
        Array.isArray(
          data.equipment,
        )
          ? data.equipment as EquipmentItem[]
          : next;

      setEquipment(saved);
      setMessage(
        'Equipment master saved.',
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not save equipment',
      );
    } finally {
      setSaving(false);
    }
  }

  function addItem() {
    const item =
      blankEquipment();

    setEquipment(
      (current) => [
        item,
        ...current,
      ],
    );

    setSelectedId(
      item.id,
    );

    setMessage('');
  }

  function updateItem(
    id: string,
    patch:
      Partial<EquipmentItem>,
  ) {
    setEquipment(
      (current) =>
        current.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  ...patch,
                }
              : item,
        ),
    );

    setMessage('');
  }

  function removeItem(
    id: string,
  ) {
    const next =
      equipment.filter(
        (item) =>
          item.id !== id,
      );

    setEquipment(next);

    setSelectedId(
      next[0]?.id || '',
    );

    setMessage('');
  }

  async function uploadPhoto(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    if (!file || !selectedId) {
      return;
    }

    setError('');

    try {
      const photoUrl =
        await compressImage(file);

      updateItem(
        selectedId,
        {
          photoUrl,
        },
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not process photo',
      );
    } finally {
      event.target.value = '';
    }
  }

  const selected =
    equipment.find(
      (item) =>
        item.id === selectedId,
    ) || null;

  const planningRows =
    Object.values(
      planningPlan,
    ).flat();

  const equipmentPlanningRows =
    planningRows.filter(
      (row) =>
        row.kind ===
        'EQUIPMENT',
    );

  function rowsForItem(
    item: EquipmentItem,
  ) {
    const normalizedName =
      item.name
        .trim()
        .toLowerCase();

    return equipmentPlanningRows.filter(
      (row) =>
        row.equipmentId ===
          item.id ||
        (
          !row.equipmentId &&
          row.requirement
            .trim()
            .toLowerCase() ===
            normalizedName
        ),
    );
  }

  function requiredQty(
    item: EquipmentItem,
  ) {
    return rowsForItem(
      item,
    ).reduce(
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

  function reservedQty(
    item: EquipmentItem,
  ) {
    return rowsForItem(
      item,
    )
      .filter(
        (row) =>
          [
            'CONFIRMED',
            'DELIVERED',
            'CLOSED',
          ].includes(
            row.status,
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

  function shortageQty(
    item: EquipmentItem,
  ) {
    const required =
      requiredQty(item);
    const available =
      Math.max(
        0,
        Number(
          item.availableQty,
        ) || 0,
      );

    if (
      available <= 0 ||
      required <= available
    ) {
      return 0;
    }

    return required -
      available;
  }

  function eventCost(
    item: EquipmentItem,
  ) {
    return rowsForItem(
      item,
    ).reduce(
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
            ) ||
              Number(
                item.defaultRate,
              ) ||
              0,
          ),
      0,
    );
  }

  const currentEventRequiredQty =
    equipment.reduce(
      (sum, item) =>
        sum +
        requiredQty(
          item,
        ),
      0,
    );

  const currentEventReservedQty =
    equipment.reduce(
      (sum, item) =>
        sum +
        reservedQty(
          item,
        ),
      0,
    );

  const currentEventShortageQty =
    equipment.reduce(
      (sum, item) =>
        sum +
        shortageQty(
          item,
        ),
      0,
    );

  const currentEventEquipmentCost =
    equipment.reduce(
      (sum, item) =>
        sum +
        eventCost(
          item,
        ),
      0,
    );

  const currentEventAssignedItems =
    equipment.filter(
      (item) =>
        requiredQty(
          item,
        ) > 0,
    ).length;

  const filtered =
    useMemo(() => {
      const q =
        query
          .trim()
          .toLowerCase();

      return equipment.filter(
        (item) => {
          const matchesCategory =
            category === 'ALL' ||
            item.category ===
              category;

          const matchesOwnership =
            ownershipFilter ===
              'ALL' ||
            item.ownership ===
              ownershipFilter;

          const matchesStatus =
            statusFilter ===
              'ALL' ||
            (
              statusFilter ===
                'ACTIVE' &&
              item.active
            ) ||
            (
              statusFilter ===
                'INACTIVE' &&
              !item.active
            ) ||
            (
              statusFilter ===
                'SHORTAGE' &&
              shortageQty(
                item,
              ) > 0
            );

          const matchesQuery =
            !q ||
            [
              item.name,
              item.category,
              item.vendorName,
              item.capacity,
            ]
              .join(' ')
              .toLowerCase()
              .includes(q);

          return (
            matchesCategory &&
            matchesOwnership &&
            matchesStatus &&
            matchesQuery
          );
        },
      );
    }, [
      category,
      equipment,
      ownershipFilter,
      query,
      statusFilter,
      planningPlan,
    ]);

  return (
    <AppShell
      title="Equipment Master"
      subtitle="Photo-based equipment catalog and availability"
      hidePageTitle
    >
      <section className="eq-page">
        <style>{`
          .eq-page{display:grid;gap:14px;color:#edf2f8}
          .eq-command{display:grid;grid-template-columns:minmax(0,1fr) minmax(380px,.65fr);gap:18px;align-items:center;padding:18px 20px;border:1px solid #2a3542;border-radius:18px;background:radial-gradient(circle at 96% 10%,rgba(74,156,255,.13),transparent 22rem),linear-gradient(145deg,#111923,#0d141c);box-shadow:0 14px 34px rgba(0,0,0,.16)}
          .eq-command small{display:block;color:#78b5ff;font-size:8px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
          .eq-command h1{margin:7px 0 6px;font-size:clamp(28px,3.4vw,40px);line-height:1.04;letter-spacing:-.045em}
          .eq-command p{max-width:720px;margin:0;color:#8b98a9;font-size:10px;line-height:1.55}
          .eq-command-side{display:grid;grid-template-columns:1fr 1fr;gap:7px}
          .eq-command-side>div{min-width:0;padding:10px;border:1px solid rgba(148,163,184,.10);border-radius:11px;background:rgba(255,255,255,.022)}
          .eq-command-side>div.attention{border-color:rgba(244,173,84,.18);background:rgba(244,173,84,.045)}
          .eq-command-side span,.eq-command-side b,.eq-command-side small{display:block}
          .eq-command-side span{color:#718094;font-size:7px;font-weight:900;text-transform:uppercase}
          .eq-command-side b{margin-top:4px;color:#e7eef6;font-size:15px}
          .eq-command-side small{margin-top:3px;color:#68778a;font-size:7px;letter-spacing:0;text-transform:none}
          .eq-command-actions{grid-column:1/-1!important;display:grid!important;grid-template-columns:1fr 1fr 1fr!important;gap:7px!important;padding:0!important;border:0!important;background:transparent!important}
          .eq-command-actions .eq-button{width:100%}
          .eq-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding:16px 2px 3px}
          .eq-head small{display:block;color:#78b5ff;font-size:9px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
          .eq-head h1{margin:6px 0 5px;font-size:clamp(30px,4vw,44px);line-height:1;letter-spacing:-.05em}
          .eq-head p{margin:0;color:#8794a5;font-size:11px}
          .eq-actions{display:flex;gap:7px}
          .eq-button{min-height:40px;padding:0 13px;border:1px solid #303844;border-radius:10px;color:#bdc7d3;background:#151b23;font:inherit;font-size:10px;font-weight:900;cursor:pointer}
          .eq-button.primary{border-color:#1478f2;color:#fff;background:#1478f2}
          .eq-button:disabled{opacity:.55;cursor:wait}
          .eq-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
          .eq-stat{padding:13px;border:1px solid #282f39;border-radius:14px;background:#10151c}
          .eq-stat small,.eq-stat b,.eq-stat span{display:block}
          .eq-stat small{color:#7b8898;font-size:8px;font-weight:850;text-transform:uppercase}
          .eq-stat b{margin:5px 0 2px;font-size:20px}
          .eq-stat span{color:#748192;font-size:8px}
          .eq-msg{padding:10px 12px;border:1px solid rgba(61,220,132,.18);border-radius:10px;color:#75dfa2;background:rgba(61,220,132,.06);font-size:10px}
          .eq-msg.error{border-color:rgba(255,98,89,.2);color:#ff948e;background:rgba(255,98,89,.06)}
          .eq-layout{display:grid;grid-template-columns:minmax(0,1.45fr) 390px;gap:12px;align-items:start}
          .eq-panel{border:1px solid #282f39;border-radius:15px;background:#10151c}
          .eq-toolbar{display:grid;grid-template-columns:minmax(0,1fr) repeat(3,150px);gap:8px;padding:11px;border-bottom:1px solid #252c35}
          .eq-input,.eq-select,.eq-textarea{width:100%;min-height:38px;padding:0 10px;border:1px solid #303945;border-radius:8px;outline:0;color:#dfe7f0;background:#151c25;font:inherit;font-size:10px}
          .eq-textarea{min-height:78px;padding:9px;resize:vertical}
          .eq-input:focus,.eq-select:focus,.eq-textarea:focus{border-color:rgba(74,156,255,.6);box-shadow:0 0 0 3px rgba(74,156,255,.08)}
          .eq-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:10px;padding:11px}
          .eq-card{position:relative;overflow:hidden;border:1px solid #2a323d;border-radius:13px;background:#0f141b;cursor:pointer;text-align:left;transition:border-color .18s ease,transform .18s ease,box-shadow .18s ease}
          .eq-card:hover{border-color:#3a4654;transform:translateY(-1px);box-shadow:0 10px 24px rgba(0,0,0,.12)}
          .eq-card.shortage{border-color:rgba(244,173,84,.40);background:linear-gradient(180deg,#151713,#0f141b)}
          .eq-card.active{border-color:rgba(74,156,255,.75);box-shadow:0 0 0 2px rgba(74,156,255,.10)}
          .eq-photo{aspect-ratio:4/3;width:100%;overflow:hidden;background:#151c25}
          .eq-photo img{width:100%;height:100%;object-fit:cover;display:block}
          .eq-photo-fallback{display:grid;width:100%;height:100%;place-items:center;align-content:center;gap:5px;background:linear-gradient(145deg,#151c25,#0d1218)}
          .eq-photo-fallback span{font-size:24px;font-weight:900;color:#71839a}
          .eq-photo-fallback small{font-size:8px;color:#586677}
          .eq-card-body{padding:10px}
          .eq-card-body b,.eq-card-body span,.eq-card-body small{display:block}
          .eq-card-body b{font-size:11px;color:#ecf2f8}
          .eq-card-body span{margin-top:3px;color:#7e8b9a;font-size:8px}
          .eq-card-body small{margin-top:7px;color:#75dca0;font-size:8px;font-weight:850}
          .eq-card-badge{position:absolute;top:8px;right:8px;padding:4px 6px;border-radius:999px;background:rgba(10,15,22,.78);color:#b8c6d5;font-size:7px;font-weight:900;backdrop-filter:blur(8px)}
          .eq-card-event{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(148,163,184,.08)}
          .eq-card-event>span{display:grid;gap:2px;margin:0!important;color:#6f7d8d!important;font-size:6px!important}
          .eq-card-event b{color:#d5e0eb!important;font-size:9px!important}
          .eq-shortage{color:#f4ad54!important}
          .eq-empty{padding:45px 15px;color:#748192;font-size:10px;text-align:center}
          .eq-editor{padding:14px}
          .eq-editor-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:12px;border-bottom:1px solid #252c35}
          .eq-editor-head h2{margin:0;font-size:17px}
          .eq-editor-head p{margin:3px 0 0;color:#7c8999;font-size:9px}
          .eq-event-status{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:12px;padding:9px;border:1px solid rgba(148,163,184,.09);border-radius:12px;background:#0d141b}
          .eq-event-status>div{min-width:0;padding:8px;border-radius:9px;background:rgba(255,255,255,.02)}
          .eq-event-status>div.attention{background:rgba(244,173,84,.045)}
          .eq-event-status span,.eq-event-status b,.eq-event-status small{display:block}
          .eq-event-status span{color:#718094;font-size:7px;font-weight:900;text-transform:uppercase}
          .eq-event-status b{margin-top:4px;color:#e5edf6;font-size:12px}
          .eq-event-status small{margin-top:2px;color:#68778a;font-size:7px}
          .eq-event-actions{display:flex;gap:7px;margin-top:8px}
          .eq-event-actions .eq-button{flex:1;text-align:center;text-decoration:none}
          .eq-photo-editor{margin-top:13px}
          .eq-photo-large{position:relative;overflow:hidden;aspect-ratio:16/10;border:1px solid #2c3541;border-radius:12px;background:#111820}
          .eq-photo-large img{width:100%;height:100%;object-fit:cover;display:block}
          .eq-photo-actions{display:flex;gap:7px;margin-top:8px}
          .eq-upload{display:inline-flex;min-height:38px;align-items:center;justify-content:center;padding:0 11px;border:1px solid #303945;border-radius:8px;color:#c0cad5;background:#171e27;font-size:9px;font-weight:900;cursor:pointer}
          .eq-upload input{display:none}
          .eq-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:13px}
          .eq-field{display:grid;gap:5px}
          .eq-field.full{grid-column:1/-1}
          .eq-field>span{font-size:8px;font-weight:850;color:#8290a1;text-transform:uppercase}
          .eq-footer{display:flex;justify-content:flex-end;gap:7px;margin-top:14px;padding-top:12px;border-top:1px solid #252c35}
          @media(max-width:1150px){.eq-command{grid-template-columns:1fr}.eq-command-side{grid-template-columns:repeat(4,minmax(0,1fr))}.eq-command-actions{grid-column:1/-1!important}}
          @media(max-width:1050px){.eq-layout{grid-template-columns:1fr}.eq-stats{grid-template-columns:1fr 1fr}.eq-toolbar{grid-template-columns:1fr 1fr}}
          @media(max-width:700px){.eq-command{padding:16px}.eq-command-side{grid-template-columns:1fr 1fr}.eq-command-actions{grid-template-columns:1fr!important}.eq-head{align-items:stretch;flex-direction:column}.eq-actions{display:grid;grid-template-columns:1fr 1fr}.eq-toolbar{grid-template-columns:1fr}.eq-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.eq-form-grid{grid-template-columns:1fr}.eq-field.full{grid-column:auto}.eq-event-status{grid-template-columns:1fr 1fr}.eq-event-actions{display:grid;grid-template-columns:1fr}}
        `}</style>

        <header className="eq-command">
          <div>
            <small>Equipment inventory & event allocation</small>
            <h1>Equipment</h1>
            <p>
              Manage owned and rental equipment, then see exactly what the current event requires, what is reserved and where shortages remain.
            </p>
          </div>

          <div className="eq-command-side">
            <div>
              <span>Current event required</span>
              <b>{planningLoading ? '—' : currentEventRequiredQty}</b>
              <small>{currentEventAssignedItems} equipment item{currentEventAssignedItems === 1 ? '' : 's'} · {currentEventName}</small>
            </div>
            <div>
              <span>Reserved / confirmed</span>
              <b>{planningLoading ? '—' : currentEventReservedQty}</b>
              <small>Confirmed, delivered or closed</small>
            </div>
            <div className={currentEventShortageQty > 0 ? 'attention' : ''}>
              <span>Shortage</span>
              <b>{planningLoading ? '—' : currentEventShortageQty}</b>
              <small>{currentEventShortageQty > 0 ? 'Needs rental / extra stock' : 'No known shortage'}</small>
            </div>
            <div>
              <span>Event equipment cost</span>
              <b>{planningLoading ? '—' : money(currentEventEquipmentCost)}</b>
              <small>Based on planned quantities & rates</small>
            </div>

            <div className="eq-command-actions">
              <button
                className="eq-button"
                type="button"
                onClick={addItem}
              >
                + Add Equipment
              </button>
              <button
                className="eq-button"
                type="button"
                onClick={() => window.location.assign('/app/vendors')}
              >
                Vendors
              </button>
              <button
                className="eq-button primary"
                type="button"
                onClick={() => window.location.assign('/app/event-planning')}
              >
                Assign to Event
              </button>
            </div>
          </div>
        </header>

        <section className="eq-stats">
          <article className="eq-stat">
            <small>Total equipment</small>
            <b>{equipment.length}</b>
            <span>Saved equipment items</span>
          </article>

          <article className="eq-stat">
            <small>Active catalog</small>
            <b>
              {equipment.filter((item) => item.active).length}
            </b>
            <span>{equipment.filter((item) => Boolean(item.photoUrl)).length} with photos</span>
          </article>

          <article className="eq-stat">
            <small>In-house units</small>
            <b>
              {
                equipment
                  .filter(
                    (item) =>
                      item.ownership ===
                      'IN_HOUSE',
                  )
                  .reduce(
                    (sum, item) =>
                      sum +
                      item.availableQty,
                    0,
                  )
              }
            </b>
            <span>Owned availability</span>
          </article>

          <article className="eq-stat">
            <small>Current event</small>
            <b>
              {planningLoading ? '—' : currentEventAssignedItems}
            </b>
            <span>{planningLoading ? 'Loading allocation…' : `${currentEventRequiredQty} required · ${money(currentEventEquipmentCost)} planned`}</span>
          </article>
        </section>

        {message ? (
          <div className="eq-msg">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="eq-msg error">
            {error}
          </div>
        ) : null}

        <div className="eq-layout">
          <section className="eq-panel">
            <div className="eq-toolbar">
              <input
                className="eq-input"
                value={query}
                placeholder="Search equipment…"
                onChange={(event) =>
                  setQuery(
                    event.target.value,
                  )
                }
              />

              <select
                className="eq-select"
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value,
                  )
                }
              >
                <option value="ALL">
                  All categories
                </option>

                {CATEGORIES.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ),
                )}
              </select>

              <select
                className="eq-select"
                value={ownershipFilter}
                onChange={(event) =>
                  setOwnershipFilter(
                    event.target.value as
                      | 'ALL'
                      | 'IN_HOUSE'
                      | 'RENTAL',
                  )
                }
              >
                <option value="ALL">All ownership</option>
                <option value="IN_HOUSE">In-house</option>
                <option value="RENTAL">Rental / Vendor</option>
              </select>

              <select
                className="eq-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as
                      | 'ALL'
                      | 'ACTIVE'
                      | 'INACTIVE'
                      | 'SHORTAGE',
                  )
                }
              >
                <option value="ALL">All status</option>
                <option value="ACTIVE">Active</option>
                <option value="SHORTAGE">Shortage</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            {loading ? (
              <div className="eq-empty">
                Loading equipment…
              </div>
            ) : filtered.length ? (
              <div className="eq-grid">
                {filtered.map(
                  (item) => {
                    const required = requiredQty(item);
                    const reserved = reservedQty(item);
                    const shortage = shortageQty(item);

                    return (
                    <button
                      key={item.id}
                      className={
                        [
                          'eq-card',
                          selectedId === item.id ? 'active' : '',
                          shortage > 0 ? 'shortage' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')
                      }
                      type="button"
                      onClick={() =>
                        setSelectedId(
                          item.id,
                        )
                      }
                    >
                      <span className="eq-card-badge">
                        {item.ownership ===
                        'IN_HOUSE'
                          ? 'OWN'
                          : 'RENTAL'}
                      </span>

                      <div className="eq-photo">
                        {item.photoUrl ? (
                          <img
                            src={
                              item.photoUrl
                            }
                            alt={
                              item.name
                            }
                          />
                        ) : (
                          imageFallback(
                            item.name,
                          )
                        )}
                      </div>

                      <div className="eq-card-body">
                        <b>
                          {item.name ||
                            'Unnamed equipment'}
                        </b>
                        <span>
                          {item.category}
                          {item.capacity
                            ? ` · ${item.capacity}`
                            : ''}
                        </span>
                        <small>
                          Available {item.availableQty} {item.unit}
                          {item.vendorName ? ` · ${item.vendorName}` : ''}
                        </small>

                        <div className="eq-card-event">
                          <span>
                            Required
                            <b>{required}</b>
                          </span>
                          <span>
                            Reserved
                            <b>{reserved}</b>
                          </span>
                          <span>
                            Shortage
                            <b className={shortage > 0 ? 'eq-shortage' : ''}>{shortage}</b>
                          </span>
                        </div>
                      </div>
                    </button>
                    );
                  },
                )}
              </div>
            ) : (
              <div className="eq-empty">
                No equipment found.
              </div>
            )}
          </section>

          <aside className="eq-panel">
            {selected ? (
              <div className="eq-editor">
                <div className="eq-editor-head">
                  <div>
                    <h2>
                      {selected.name ||
                        'New equipment'}
                    </h2>
                    <p>
                      Photo, availability, ownership and rate.
                    </p>
                  </div>

                  <label
                    style={{
                      display: 'flex',
                      alignItems:
                        'center',
                      gap: 6,
                      color: '#9aa6b4',
                      fontSize: 9,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        selected.active
                      }
                      onChange={(
                        event,
                      ) =>
                        updateItem(
                          selected.id,
                          {
                            active:
                              event
                                .target
                                .checked,
                          },
                        )
                      }
                    />
                    Active
                  </label>
                </div>

                <div className="eq-event-status">
                  <div>
                    <span>Required</span>
                    <b>{requiredQty(selected)}</b>
                    <small>{currentEventName}</small>
                  </div>
                  <div>
                    <span>Reserved</span>
                    <b>{reservedQty(selected)}</b>
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
                    <small>{rowsForItem(selected).length} assignment{rowsForItem(selected).length === 1 ? '' : 's'}</small>
                  </div>
                </div>

                <div className="eq-event-actions">
                  <button
                    className="eq-button primary"
                    type="button"
                    onClick={() => window.location.assign('/app/event-planning')}
                  >
                    Assign to Event
                  </button>
                  <button
                    className="eq-button"
                    type="button"
                    onClick={() => window.location.assign('/app/vendors')}
                  >
                    {selected.vendorId ? 'Open Vendors' : 'Add Vendor'}
                  </button>
                </div>

                <div className="eq-photo-editor">
                  <div className="eq-photo-large">
                    {selected.photoUrl ? (
                      <img
                        src={
                          selected.photoUrl
                        }
                        alt={
                          selected.name ||
                          'Equipment'
                        }
                      />
                    ) : (
                      imageFallback(
                        selected.name,
                      )
                    )}
                  </div>

                  <div className="eq-photo-actions">
                    <label className="eq-upload">
                      Upload Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={
                          uploadPhoto
                        }
                      />
                    </label>

                    {selected.photoUrl ? (
                      <button
                        className="eq-button"
                        type="button"
                        onClick={() =>
                          updateItem(
                            selected.id,
                            {
                              photoUrl:
                                '',
                            },
                          )
                        }
                      >
                        Remove Photo
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="eq-form-grid">
                  <label className="eq-field full">
                    <span>
                      Equipment Name
                    </span>
                    <input
                      className="eq-input"
                      value={
                        selected.name
                      }
                      onChange={(
                        event,
                      ) =>
                        updateItem(
                          selected.id,
                          {
                            name:
                              event
                                .target
                                .value,
                          },
                        )
                      }
                    />
                  </label>

                  <label className="eq-field">
                    <span>Category</span>
                    <select
                      className="eq-select"
                      value={
                        selected.category
                      }
                      onChange={(
                        event,
                      ) =>
                        updateItem(
                          selected.id,
                          {
                            category:
                              event
                                .target
                                .value,
                          },
                        )
                      }
                    >
                      {CATEGORIES.map(
                        (item) => (
                          <option
                            key={item}
                            value={item}
                          >
                            {item}
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <label className="eq-field">
                    <span>Ownership</span>
                    <select
                      className="eq-select"
                      value={
                        selected.ownership
                      }
                      onChange={(
                        event,
                      ) =>
                        updateItem(
                          selected.id,
                          {
                            ownership:
                              event
                                .target
                                .value as EquipmentItem['ownership'],
                          },
                        )
                      }
                    >
                      <option value="IN_HOUSE">
                        In-house
                      </option>
                      <option value="RENTAL">
                        Rental / Vendor
                      </option>
                    </select>
                  </label>

                  <label className="eq-field">
                    <span>
                      Available Qty
                    </span>
                    <input
                      className="eq-input"
                      type="number"
                      min="0"
                      value={
                        selected.availableQty
                      }
                      onChange={(
                        event,
                      ) =>
                        updateItem(
                          selected.id,
                          {
                            availableQty:
                              Math.max(
                                0,
                                Math.round(
                                  Number(
                                    event
                                      .target
                                      .value,
                                  ) ||
                                    0,
                                ),
                              ),
                          },
                        )
                      }
                    />
                  </label>

                  <label className="eq-field">
                    <span>Unit</span>
                    <input
                      className="eq-input"
                      value={
                        selected.unit
                      }
                      onChange={(
                        event,
                      ) =>
                        updateItem(
                          selected.id,
                          {
                            unit:
                              event
                                .target
                                .value,
                          },
                        )
                      }
                    />
                  </label>

                  <label className="eq-field">
                    <span>
                      Default Rate
                    </span>
                    <input
                      className="eq-input"
                      type="number"
                      min="0"
                      value={
                        selected.defaultRate
                      }
                      onChange={(
                        event,
                      ) =>
                        updateItem(
                          selected.id,
                          {
                            defaultRate:
                              Math.max(
                                0,
                                Number(
                                  event
                                    .target
                                    .value,
                                ) ||
                                  0,
                              ),
                          },
                        )
                      }
                    />
                  </label>

                  <label className="eq-field">
                    <span>Capacity</span>
                    <input
                      className="eq-input"
                      value={
                        selected.capacity
                      }
                      placeholder="Example: 100 plates / 20 litre"
                      onChange={(
                        event,
                      ) =>
                        updateItem(
                          selected.id,
                          {
                            capacity:
                              event
                                .target
                                .value,
                          },
                        )
                      }
                    />
                  </label>

                  <label className="eq-field full">
                    <span>
                      Rental Vendor
                    </span>
                    <select
                      className="eq-select"
                      value={
                        selected.vendorId
                      }
                      onChange={(
                        event,
                      ) => {
                        const vendor =
                          vendors.find(
                            (item) =>
                              item.id ===
                              event
                                .target
                                .value,
                          );

                        updateItem(
                          selected.id,
                          {
                            vendorId:
                              vendor?.id ||
                              '',
                            vendorName:
                              vendor?.name ||
                              '',
                          },
                        );
                      }}
                    >
                      <option value="">
                        No linked vendor
                      </option>

                      {vendors.map(
                        (vendor) => (
                          <option
                            key={
                              vendor.id
                            }
                            value={
                              vendor.id
                            }
                          >
                            {vendor.name}
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <label className="eq-field full">
                    <span>
                      Photo URL
                    </span>
                    <input
                      className="eq-input"
                      value={
                        selected.photoUrl.startsWith(
                          'data:',
                        )
                          ? ''
                          : selected.photoUrl
                      }
                      placeholder="Optional https:// image URL"
                      onChange={(
                        event,
                      ) =>
                        updateItem(
                          selected.id,
                          {
                            photoUrl:
                              event
                                .target
                                .value,
                          },
                        )
                      }
                    />
                  </label>

                  <label className="eq-field full">
                    <span>Notes</span>
                    <textarea
                      className="eq-textarea"
                      value={
                        selected.notes
                      }
                      onChange={(
                        event,
                      ) =>
                        updateItem(
                          selected.id,
                          {
                            notes:
                              event
                                .target
                                .value,
                          },
                        )
                      }
                    />
                  </label>
                </div>

                <div className="eq-footer">
                  <button
                    className="eq-button"
                    type="button"
                    onClick={() =>
                      removeItem(
                        selected.id,
                      )
                    }
                  >
                    Remove
                  </button>

                  <button
                    className="eq-button primary"
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      void save()
                    }
                  >
                    {saving
                      ? 'Saving…'
                      : `Save · ${money(
                          selected.defaultRate,
                        )}`}
                  </button>
                </div>
              </div>
            ) : (
              <div className="eq-empty">
                Add equipment to start your visual catalog.
              </div>
            )}
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
