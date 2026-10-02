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
  uid,
} from '../../../lib/store';

type Vendor = {
  id: string;
  name: string;
  type: 'VENDOR' | 'AGENCY' | 'INDIVIDUAL';
  active: boolean;
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
            matchesQuery
          );
        },
      );
    }, [
      category,
      equipment,
      query,
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
          .eq-toolbar{display:grid;grid-template-columns:1fr 170px;gap:8px;padding:11px;border-bottom:1px solid #252c35}
          .eq-input,.eq-select,.eq-textarea{width:100%;min-height:38px;padding:0 10px;border:1px solid #303945;border-radius:8px;outline:0;color:#dfe7f0;background:#151c25;font:inherit;font-size:10px}
          .eq-textarea{min-height:78px;padding:9px;resize:vertical}
          .eq-input:focus,.eq-select:focus,.eq-textarea:focus{border-color:rgba(74,156,255,.6);box-shadow:0 0 0 3px rgba(74,156,255,.08)}
          .eq-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:10px;padding:11px}
          .eq-card{position:relative;overflow:hidden;border:1px solid #2a323d;border-radius:13px;background:#0f141b;cursor:pointer;text-align:left}
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
          .eq-empty{padding:45px 15px;color:#748192;font-size:10px;text-align:center}
          .eq-editor{padding:14px}
          .eq-editor-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:12px;border-bottom:1px solid #252c35}
          .eq-editor-head h2{margin:0;font-size:17px}
          .eq-editor-head p{margin:3px 0 0;color:#7c8999;font-size:9px}
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
          @media(max-width:1050px){.eq-layout{grid-template-columns:1fr}.eq-stats{grid-template-columns:1fr 1fr}}
          @media(max-width:700px){.eq-head{align-items:stretch;flex-direction:column}.eq-actions{display:grid;grid-template-columns:1fr 1fr}.eq-toolbar{grid-template-columns:1fr}.eq-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.eq-form-grid{grid-template-columns:1fr}.eq-field.full{grid-column:auto}}
        `}</style>

        <header className="eq-head">
          <div>
            <small>
              Visual equipment library
            </small>
            <h1>
              Equipment Master
            </h1>
            <p>
              Add a photo once, then select equipment visually while planning each function.
            </p>
          </div>

          <div className="eq-actions">
            <button
              className="eq-button"
              type="button"
              onClick={addItem}
            >
              + Add Equipment
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
                : 'Save Master'}
            </button>
          </div>
        </header>

        <section className="eq-stats">
          <article className="eq-stat">
            <small>Total equipment</small>
            <b>{equipment.length}</b>
            <span>Saved equipment items</span>
          </article>

          <article className="eq-stat">
            <small>With photos</small>
            <b>
              {
                equipment.filter(
                  (item) =>
                    Boolean(
                      item.photoUrl,
                    ),
                ).length
              }
            </b>
            <span>Ready for visual selection</span>
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
            <small>Rental items</small>
            <b>
              {
                equipment.filter(
                  (item) =>
                    item.ownership ===
                    'RENTAL',
                ).length
              }
            </b>
            <span>Vendor / rental catalog</span>
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
            </div>

            {loading ? (
              <div className="eq-empty">
                Loading equipment…
              </div>
            ) : filtered.length ? (
              <div className="eq-grid">
                {filtered.map(
                  (item) => (
                    <button
                      key={item.id}
                      className={
                        selectedId ===
                        item.id
                          ? 'eq-card active'
                          : 'eq-card'
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
                          Available {
                            item.availableQty
                          } {item.unit}
                        </small>
                      </div>
                    </button>
                  ),
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
