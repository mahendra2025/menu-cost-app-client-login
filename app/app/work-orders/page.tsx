'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';

import AppShell from '../../components/AppShell';
import {
  getSession,
  loadWork,
} from '../../../lib/store';

import type {
  WorkState,
} from '../../../lib/types';

type AssignmentRow = {
  id: string;
  kind: string;
  requirement: string;
  detail: string;
  quantity: number;
  unit: string;
  assignedTo: string;
  partnerId?: string;
  partnerType: string;
  rate: number;
  deliveryTime: string;
  pickupTime?: string;
  paymentTerms?: string;
  status: string;
};

type StoredPlan =
  Record<string, AssignmentRow[]>;

type Vendor = {
  id: string;
  name: string;
  type: string;
  contactPerson: string;
  phone: string;
  city: string;
  gst: string;
  paymentTerms: string;
  notes: string;
};

type WorkOrderGroup = {
  key: string;
  partnerId: string;
  partnerName: string;
  vendor?: Vendor;
  rows: Array<{
    functionKey: string;
    functionLabel: string;
    row: AssignmentRow;
  }>;
  total: number;
};

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

function formatDateTime(
  value: string | undefined,
) {
  if (!value) return '—';

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'en-IN',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(date);
}

function functionLabels(
  work: WorkState,
) {
  const labels =
    new Map<string, string>();

  const fallback =
    work.event.functionType ||
    'Event Menu';

  for (const item of work.menu) {
    const key =
      item.serviceId ||
      `${item.dayLabel || 'Event'}::${item.mealLabel || fallback}`;

    if (!labels.has(key)) {
      labels.set(
        key,
        [
          item.dayLabel,
          item.mealLabel || fallback,
        ]
          .filter(Boolean)
          .join(' · ') ||
          fallback,
      );
    }
  }

  labels.set(
    'event',
    fallback,
  );

  return labels;
}

export default function WorkOrdersPage() {
  const [
    work,
    setWork,
  ] =
    useState<WorkState | null>(
      null,
    );

  const [
    plan,
    setPlan,
  ] =
    useState<StoredPlan>({});

  const [
    vendors,
    setVendors,
  ] =
    useState<Vendor[]>([]);

  const [
    selectedKey,
    setSelectedKey,
  ] =
    useState('');

  const [
    loading,
    setLoading,
  ] =
    useState(true);

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

    const current =
      loadWork(
        session.tenantId,
      );

    setWork(current);

    void Promise.all([
      fetch(
        `/api/client/event-planning?costingId=${encodeURIComponent(
          current.costingId,
        )}`,
        {
          cache: 'no-store',
        },
      ),
      fetch(
        '/api/client/vendors',
        {
          cache: 'no-store',
        },
      ),
    ])
      .then(
        async ([
          planningResponse,
          vendorResponse,
        ]) => {
          if (
            !planningResponse.ok
          ) {
            const data =
              await planningResponse
                .json()
                .catch(
                  () => ({}),
                );

            throw new Error(
              data.error ||
                'Could not load event assignments',
            );
          }

          const planningData =
            await planningResponse
              .json();

          const serverPlan =
            planningData.plan &&
            typeof planningData.plan ===
              'object' &&
            !Array.isArray(
              planningData.plan,
            )
              ? planningData.plan as StoredPlan
              : {};

          setPlan(
            serverPlan,
          );

          if (
            vendorResponse.ok
          ) {
            const vendorData =
              await vendorResponse
                .json();

            setVendors(
              Array.isArray(
                vendorData.vendors,
              )
                ? vendorData.vendors as Vendor[]
                : [],
            );
          }
        },
      )
      .catch(
        (caught) => {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Could not load work orders',
          );
        },
      )
      .finally(
        () => {
          setLoading(false);
        },
      );
  }, []);

  const groups =
    useMemo(
      () => {
        if (!work) {
          return [];
        }

        const labels =
          functionLabels(work);

        const vendorById =
          new Map(
            vendors.map(
              (vendor) => [
                vendor.id,
                vendor,
              ] as const,
            ),
          );

        const grouped =
          new Map<
            string,
            WorkOrderGroup
          >();

        for (
          const [
            functionKey,
            rows,
          ] of Object.entries(
            plan,
          )
        ) {
          for (
            const row of rows
          ) {
            if (
              row.partnerType ===
                'IN_HOUSE' ||
              !row.assignedTo
                .trim()
            ) {
              continue;
            }

            const key =
              row.partnerId ||
              row.assignedTo
                .trim()
                .toLowerCase();

            const current =
              grouped.get(key);

            const amount =
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
              );

            const line = {
              functionKey,
              functionLabel:
                labels.get(
                  functionKey,
                ) ||
                functionKey,
              row,
            };

            if (current) {
              current.rows.push(
                line,
              );
              current.total +=
                amount;
              continue;
            }

            grouped.set(
              key,
              {
                key,
                partnerId:
                  row.partnerId ||
                  '',
                partnerName:
                  row.assignedTo,
                vendor:
                  row.partnerId
                    ? vendorById.get(
                        row.partnerId,
                      )
                    : undefined,
                rows: [line],
                total: amount,
              },
            );
          }
        }

        return Array.from(
          grouped.values(),
        ).sort(
          (a, b) =>
            b.total -
            a.total,
        );
      },
      [
        plan,
        vendors,
        work,
      ],
    );

  useEffect(
    () => {
      if (
        !selectedKey &&
        groups.length
      ) {
        setSelectedKey(
          groups[0].key,
        );
      }
    },
    [
      groups,
      selectedKey,
    ],
  );

  const selected =
    groups.find(
      (group) =>
        group.key ===
        selectedKey,
    ) ||
    groups[0] ||
    null;

  if (loading) {
    return (
      <AppShell
        title="Work Orders"
        subtitle="Vendor work orders from event planning"
        hidePageTitle
      >
        <div className="wo-loading">
          Loading work orders…
        </div>
      </AppShell>
    );
  }

  const eventName =
    work?.event.eventName ||
    work?.event.clientName ||
    'Current Event';

  const terms =
    selected?.vendor
      ?.paymentTerms ||
    selected?.rows.find(
      (item) =>
        item.row
          .paymentTerms,
    )?.row
      .paymentTerms ||
    'As agreed with vendor';

  return (
    <AppShell
      title="Work Orders"
      subtitle="Vendor work orders from event planning"
      hidePageTitle
    >
      <section className="wo-page">
        <style>{`
          .wo-page{display:grid;gap:14px;color:#edf2f8}
          .wo-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding:16px 2px 3px}
          .wo-head small{display:block;color:#78b5ff;font-size:9px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
          .wo-head h1{margin:6px 0 5px;font-size:clamp(30px,4vw,44px);line-height:1;letter-spacing:-.05em}
          .wo-head p{margin:0;color:#8794a5;font-size:11px}
          .wo-actions{display:flex;gap:7px}
          .wo-button{display:inline-flex;min-height:40px;align-items:center;justify-content:center;padding:0 13px;border:1px solid #303844;border-radius:10px;color:#bdc7d3;background:#151b23;font:inherit;font-size:10px;font-weight:900;cursor:pointer;text-decoration:none}
          .wo-button.primary{border-color:#1478f2;color:#fff;background:#1478f2}
          .wo-layout{display:grid;grid-template-columns:300px minmax(0,1fr);gap:12px;align-items:start}
          .wo-panel{border:1px solid #282f39;border-radius:15px;background:#10151c}
          .wo-list{display:grid}
          .wo-vendor{padding:12px;border:0;border-bottom:1px solid rgba(148,163,184,.08);color:#a6b1be;background:transparent;text-align:left;cursor:pointer}
          .wo-vendor.active{background:rgba(74,156,255,.08)}
          .wo-vendor b,.wo-vendor span,.wo-vendor small{display:block}
          .wo-vendor b{color:#e8eef5;font-size:11px}.wo-vendor span{margin-top:3px;color:#7d8a9a;font-size:8px}.wo-vendor small{margin-top:5px;color:#76dda1;font-size:8px;font-weight:850}
          .wo-empty,.wo-loading{display:grid;min-height:280px;place-items:center;color:#748192;font-size:10px}
          .wo-doc{padding:22px}
          .wo-doc-head{display:flex;justify-content:space-between;gap:20px;padding-bottom:16px;border-bottom:2px solid #e9edf2}
          .wo-doc-head h2{margin:4px 0 0;color:#10151c;font-size:24px}.wo-doc-head span,.wo-doc-head small{display:block;color:#596575;font-size:10px}
          .wo-paper{background:#fff;color:#151a21}
          .wo-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:14px 0;border-bottom:1px solid #dde3ea}
          .wo-meta div small,.wo-meta div b{display:block}.wo-meta small{color:#778291;font-size:8px;text-transform:uppercase}.wo-meta b{margin-top:4px;font-size:10px}
          .wo-table-wrap{overflow:auto;margin-top:14px}
          .wo-table{width:100%;min-width:900px;border-collapse:collapse}
          .wo-table th{padding:8px;border-bottom:2px solid #cfd6de;color:#5f6b7a;font-size:8px;text-align:left;text-transform:uppercase}
          .wo-table td{padding:10px 8px;border-bottom:1px solid #e1e6eb;font-size:9px;vertical-align:top}
          .wo-total{display:flex;justify-content:flex-end;margin-top:14px}.wo-total div{min-width:240px;padding:12px;border:1px solid #d8dee6;border-radius:10px}.wo-total span,.wo-total b{display:block}.wo-total span{color:#6f7b89;font-size:9px}.wo-total b{margin-top:5px;font-size:20px}
          .wo-terms{margin-top:16px;padding-top:13px;border-top:1px solid #dde3ea}.wo-terms b{font-size:10px}.wo-terms p{margin:5px 0 0;color:#5e6977;font-size:9px;line-height:1.55}
          .wo-error{padding:10px 12px;border:1px solid rgba(255,98,89,.2);border-radius:10px;color:#ff948e;background:rgba(255,98,89,.06);font-size:10px}
          @media(max-width:900px){.wo-layout{grid-template-columns:1fr}.wo-meta{grid-template-columns:1fr 1fr}}
          @media print{.no-print,.app-sidebar,.topbar{display:none!important}.app-workspace{padding:0!important}.wo-page{display:block}.wo-layout{display:block}.wo-layout>.wo-panel:first-child{display:none}.wo-panel{border:0}.wo-doc{padding:0}.page-shell{background:#fff!important}}
        `}</style>

        <header className="wo-head no-print">
          <div>
            <small>Commercial control</small>
            <h1>Vendor Work Orders</h1>
            <p>{eventName} · grouped automatically from Event Planning assignments.</p>
          </div>

          <div className="wo-actions">
            <Link className="wo-button" href="/app/event-planning">
              Event Planning
            </Link>
            <button className="wo-button primary" type="button" onClick={() => window.print()} disabled={!selected}>
              Print Work Order
            </button>
          </div>
        </header>

        {error ? <div className="wo-error no-print">{error}</div> : null}

        <div className="wo-layout">
          <aside className="wo-panel no-print">
            {groups.length ? (
              <div className="wo-list">
                {groups.map((group) => (
                  <button
                    key={group.key}
                    className={selected?.key === group.key ? 'wo-vendor active' : 'wo-vendor'}
                    type="button"
                    onClick={() => setSelectedKey(group.key)}
                  >
                    <b>{group.partnerName}</b>
                    <span>{group.rows.length} assigned line{group.rows.length === 1 ? '' : 's'}</span>
                    <small>{money(group.total)}</small>
                  </button>
                ))}
              </div>
            ) : (
              <div className="wo-empty">
                Assign vendors in Event Planning to create work orders.
              </div>
            )}
          </aside>

          <section className="wo-panel">
            {selected && work ? (
              <div className="wo-doc wo-paper">
                <header className="wo-doc-head">
                  <div>
                    <small>{work.profile.businessName || 'Menu Costing'}</small>
                    <h2>WORK ORDER</h2>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <span>{eventName}</span>
                    <small>{work.event.eventDate || 'Event date not set'}</small>
                  </div>
                </header>

                <section className="wo-meta">
                  <div><small>Vendor / Agency</small><b>{selected.partnerName}</b></div>
                  <div><small>Contact</small><b>{selected.vendor?.contactPerson || '—'}{selected.vendor?.phone ? ` · ${selected.vendor.phone}` : ''}</b></div>
                  <div><small>Venue</small><b>{work.event.venue || work.event.city || '—'}</b></div>
                  <div><small>GST</small><b>{selected.vendor?.gst || '—'}</b></div>
                </section>

                <div className="wo-table-wrap">
                  <table className="wo-table">
                    <thead>
                      <tr>
                        <th>Function</th>
                        <th>Requirement</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>Amount</th>
                        <th>Delivery</th>
                        <th>Pickup / Return</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.rows.map(({ functionKey, functionLabel, row }) => (
                        <tr key={`${functionKey}:${row.id}`}>
                          <td>{functionLabel}</td>
                          <td><b>{row.requirement}</b>{row.detail ? <div style={{marginTop:3,color:'#687483'}}>{row.detail}</div> : null}</td>
                          <td>{row.quantity} {row.unit}</td>
                          <td>{money(row.rate)}</td>
                          <td><b>{money(row.quantity * row.rate)}</b></td>
                          <td>{formatDateTime(row.deliveryTime)}</td>
                          <td>{formatDateTime(row.pickupTime)}</td>
                          <td>{row.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="wo-total">
                  <div>
                    <span>Work order total</span>
                    <b>{money(selected.total)}</b>
                  </div>
                </div>

                <section className="wo-terms">
                  <b>Payment Terms</b>
                  <p>{terms}</p>
                </section>
              </div>
            ) : (
              <div className="wo-empty">
                Select a vendor work order.
              </div>
            )}
          </section>
        </div>
      </section>
    </AppShell>
  );
}
