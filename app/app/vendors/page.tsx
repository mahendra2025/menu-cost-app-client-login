'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import AppShell from '../../components/AppShell';
import { getSession, uid } from '../../../lib/store';

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

  useEffect(() => {
    const session = getSession();
    if (!session) {
      window.location.assign('/login');
      return;
    }

    void loadVendors();
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vendors;

    return vendors.filter((vendor) =>
      [
        vendor.name,
        vendor.type,
        vendor.category,
        vendor.contactPerson,
        vendor.phone,
        vendor.city,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [query, vendors]);

  const selected =
    vendors.find((vendor) => vendor.id === selectedId) ||
    null;

  const totalRates = vendors.reduce(
    (sum, vendor) => sum + vendor.rates.length,
    0,
  );

  return (
    <AppShell
      title="Vendors & Agencies"
      subtitle="Reusable suppliers, agencies and rate masters"
      hidePageTitle
    >
      <section className="vm-page">
        <style>{`
          .vm-page{display:grid;gap:14px;color:#edf2f8}
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
          .vm-search{padding:10px;border-bottom:1px solid #252c35}
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
          .vm-badge{align-self:start;padding:4px 6px;border-radius:999px;color:#9bc8ff;background:rgba(74,156,255,.09);font-size:7px;font-weight:900}
          .vm-empty{padding:36px 14px;color:#748192;font-size:10px;text-align:center}
          .vm-editor{padding:15px}
          .vm-editor-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-bottom:13px;border-bottom:1px solid #252c35}
          .vm-editor-head h2{margin:0;font-size:18px}
          .vm-editor-head p{margin:4px 0 0;color:#7f8b9a;font-size:9px}
          .vm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:13px}
          .vm-field{display:grid;gap:5px}
          .vm-field.full{grid-column:1/-1}
          .vm-field>span{color:#8290a1;font-size:8px;font-weight:850;text-transform:uppercase}
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
          @media(max-width:980px){.vm-layout{grid-template-columns:1fr}.vm-list{max-height:300px}.vm-stats{grid-template-columns:1fr 1fr}}
          @media(max-width:680px){.vm-head{align-items:stretch;flex-direction:column}.vm-actions{display:grid;grid-template-columns:1fr 1fr}.vm-grid{grid-template-columns:1fr}.vm-field.full{grid-column:auto}}
        `}</style>

        <header className="vm-head">
          <div>
            <small>Supplier control</small>
            <h1>Vendors & Agencies</h1>
            <p>
              Save partners once, then reuse their rates in every event plan.
            </p>
          </div>

          <div className="vm-actions">
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
        </header>

        <section className="vm-stats">
          <article className="vm-stat">
            <small>Total partners</small>
            <b>{vendors.length}</b>
            <span>Vendors, agencies and individuals</span>
          </article>
          <article className="vm-stat">
            <small>Active</small>
            <b>
              {vendors.filter((vendor) => vendor.active).length}
            </b>
            <span>Available for assignment</span>
          </article>
          <article className="vm-stat">
            <small>Rate entries</small>
            <b>{totalRates}</b>
            <span>Reusable item and service rates</span>
          </article>
          <article className="vm-stat">
            <small>Agency partners</small>
            <b>
              {vendors.filter((vendor) => vendor.type === 'AGENCY').length}
            </b>
            <span>Manpower and service agencies</span>
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
                placeholder="Search partner, city, phone…"
                onChange={(event) => setQuery(event.target.value)}
              />
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
                        {vendor.rates.length} saved rate
                        {vendor.rates.length === 1 ? '' : 's'}
                      </small>
                    </span>

                    <span className="vm-badge">
                      {vendor.type}
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

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      color: '#9aa6b4',
                      fontSize: 9,
                    }}
                  >
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
