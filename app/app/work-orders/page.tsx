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

type WorkOrderMeta = {
  key: string;
  workOrderNumber: string;
  partnerId: string;
  partnerName: string;
  confirmationStatus:
    | 'OPEN'
    | 'CONFIRMED'
    | 'ON_HOLD'
    | 'CLOSED';
  paymentStatus:
    | 'NOT_SET'
    | 'PENDING'
    | 'PARTIAL'
    | 'PAID';
  advancePaid: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
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


  const [
    workOrders,
    setWorkOrders,
  ] =
    useState<WorkOrderMeta[]>([]);

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
    query,
    setQuery,
  ] =
    useState('');

  const [
    confirmationFilter,
    setConfirmationFilter,
  ] =
    useState<
      'ALL' | WorkOrderMeta['confirmationStatus'] | 'NOT_CREATED'
    >('ALL');

  const [
    paymentFilter,
    setPaymentFilter,
  ] =
    useState<
      'ALL' | WorkOrderMeta['paymentStatus']
    >('ALL');

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
      fetch(
        `/api/client/work-orders?costingId=${encodeURIComponent(
          current.costingId,
        )}`,
        {
          cache: 'no-store',
        },
      ),
    ])
      .then(
        async ([
          planningResponse,
          vendorResponse,
          workOrderResponse,
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

          if (
            workOrderResponse.ok
          ) {
            const workOrderData =
              await workOrderResponse
                .json();

            setWorkOrders(
              Array.isArray(
                workOrderData.workOrders,
              )
                ? workOrderData.workOrders as WorkOrderMeta[]
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

  const eventName =
    work?.event.eventName ||
    work?.event.clientName ||
    'Current Event';

  const selected =
    groups.find(
      (group) =>
        group.key ===
        selectedKey,
    ) ||
    groups[0] ||
    null;


  const workOrderByKey =
    useMemo(
      () =>
        new Map(
          workOrders.map(
            (item) => [
              item.key,
              item,
            ] as const,
          ),
        ),
      [workOrders],
    );

  const visibleGroups =
    useMemo(
      () => {
        const q =
          query
            .trim()
            .toLowerCase();

        return groups.filter(
          (group) => {
            const meta =
              workOrderByKey.get(
                group.key,
              );

            if (
              confirmationFilter ===
                'NOT_CREATED' &&
              meta
            ) {
              return false;
            }

            if (
              confirmationFilter !==
                'ALL' &&
              confirmationFilter !==
                'NOT_CREATED' &&
              meta?.confirmationStatus !==
                confirmationFilter
            ) {
              return false;
            }

            if (
              paymentFilter !==
                'ALL' &&
              meta?.paymentStatus !==
                paymentFilter
            ) {
              return false;
            }

            if (!q) {
              return true;
            }

            return [
              group.partnerName,
              group.vendor?.contactPerson,
              group.vendor?.phone,
              meta?.workOrderNumber,
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes(q);
          },
        );
      },
      [
        confirmationFilter,
        groups,
        paymentFilter,
        query,
        workOrderByKey,
      ],
    );

  const selectedMeta =
    selected
      ? workOrderByKey.get(
          selected.key,
        ) || null
      : null;

  const selectedAdvance =
    Math.min(
      selected?.total || 0,
      Math.max(
        0,
        Number(
          selectedMeta?.advancePaid,
        ) || 0,
      ),
    );

  const selectedBalance =
    Math.max(
      0,
      (selected?.total || 0) -
        selectedAdvance,
    );

  const totalVendorValue =
    groups.reduce(
      (sum, group) =>
        sum +
        group.total,
      0,
    );

  const totalAdvancePaid =
    workOrders.reduce(
      (sum, item) =>
        sum +
        Math.max(
          0,
          Number(
            item.advancePaid,
          ) || 0,
        ),
      0,
    );

  const totalBalanceDue =
    Math.max(
      0,
      totalVendorValue -
        totalAdvancePaid,
    );

  const confirmedWorkOrders =
    workOrders.filter(
      (item) =>
        [
          'CONFIRMED',
          'CLOSED',
        ].includes(
          item.confirmationStatus,
        ),
    ).length;

  const pendingPaymentCount =
    workOrders.filter(
      (item) =>
        item.paymentStatus !==
        'PAID',
    ).length;

  function workOrderNumber(
    group: WorkOrderGroup,
  ) {
    const index =
      Math.max(
        0,
        groups.findIndex(
          (item) =>
            item.key ===
            group.key,
        ),
      ) + 1;

    const stamp =
      new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, '');

    return `WO-${stamp}-${String(index).padStart(2, '0')}`;
  }

  async function persistWorkOrders(
    next: WorkOrderMeta[],
    successMessage:
      string = 'Work order saved.',
  ) {
    if (!work) return false;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response =
        await fetch(
          '/api/client/work-orders',
          {
            method: 'PUT',
            headers: {
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify({
                costingId:
                  work.costingId,
                workOrders: next,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Could not save work order.',
        );
      }

      const saved =
        Array.isArray(
          data.workOrders,
        )
          ? data.workOrders as WorkOrderMeta[]
          : next;

      setWorkOrders(saved);
      setMessage(
        successMessage,
      );
      return true;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not save work order.',
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function createSelectedWorkOrder() {
    if (
      !selected ||
      selectedMeta
    ) {
      return;
    }

    const now =
      new Date()
        .toISOString();

    const next: WorkOrderMeta = {
      key: selected.key,
      workOrderNumber:
        workOrderNumber(
          selected,
        ),
      partnerId:
        selected.partnerId,
      partnerName:
        selected.partnerName,
      confirmationStatus:
        'OPEN',
      paymentStatus:
        'PENDING',
      advancePaid: 0,
      notes: '',
      createdAt: now,
      updatedAt: now,
    };

    await persistWorkOrders(
      [
        ...workOrders,
        next,
      ],
      'Work order created.',
    );
  }

  function patchSelectedMeta(
    patch:
      Partial<WorkOrderMeta>,
  ) {
    if (
      !selected ||
      !selectedMeta
    ) {
      return;
    }

    setWorkOrders(
      (current) =>
        current.map(
          (item) =>
            item.key ===
              selected.key
              ? {
                  ...item,
                  ...patch,
                  updatedAt:
                    new Date()
                      .toISOString(),
                }
              : item,
        ),
    );
    setMessage('');
  }

  async function saveSelectedMeta() {
    if (!selectedMeta) return;
    await persistWorkOrders(
      workOrders,
    );
  }

  function shareWhatsApp() {
    if (
      !selected ||
      !selectedMeta
    ) {
      return;
    }

    const rawPhone =
      String(
        selected.vendor?.phone ||
          '',
      ).replace(/\D/g, '');

    const phone =
      rawPhone.length === 10
        ? `91${rawPhone}`
        : rawPhone;

    if (!phone) {
      setError(
        'Add the vendor phone number before sharing on WhatsApp.',
      );
      return;
    }

    const text =
      encodeURIComponent(
        [
          `${work?.profile.businessName || 'Catering'} - Work Order ${selectedMeta.workOrderNumber}`,
          `Event: ${eventName}`,
          `Vendor: ${selected.partnerName}`,
          `Order value: ${money(selected.total)}`,
          `Advance paid: ${money(selectedAdvance)}`,
          `Balance due: ${money(selectedBalance)}`,
          `Confirmation: ${selectedMeta.confirmationStatus}`,
          '',
          'Please confirm the work order and reporting / delivery schedule.',
        ].join('\n'),
      );

    window.open(
      `https://wa.me/${phone}?text=${text}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  async function downloadPdf() {
    if (
      !work ||
      !selected ||
      !selectedMeta
    ) {
      return;
    }

    const {
      downloadWorkOrderPdf,
    } =
      await import(
        '../../../lib/workOrderPdf'
      );

    downloadWorkOrderPdf({
      work,
      vendor: {
        name:
          selected.partnerName,
        contactPerson:
          selected.vendor
            ?.contactPerson,
        phone:
          selected.vendor
            ?.phone,
        city:
          selected.vendor
            ?.city,
        gst:
          selected.vendor
            ?.gst,
        paymentTerms:
          selected.vendor
            ?.paymentTerms ||
          selected.rows.find(
            (item) =>
              item.row
                .paymentTerms,
          )?.row
            .paymentTerms,
      },
      lines:
        selected.rows.map(
          ({
            functionLabel,
            row,
          }) => ({
            functionLabel,
            requirement:
              row.requirement,
            detail:
              row.detail,
            quantity:
              row.quantity,
            unit:
              row.unit,
            rate:
              row.rate,
            deliveryTime:
              row.deliveryTime,
            pickupTime:
              row.pickupTime,
            status:
              row.status,
          }),
        ),
      total:
        selected.total,
      meta:
        selectedMeta,
    });
  }

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
          .wo-command{display:grid;grid-template-columns:minmax(0,1fr) minmax(420px,.7fr);gap:18px;align-items:center;padding:18px 20px;border:1px solid #2a3542;border-radius:18px;background:radial-gradient(circle at 96% 10%,rgba(74,156,255,.13),transparent 22rem),linear-gradient(145deg,#111923,#0d141c);box-shadow:0 14px 34px rgba(0,0,0,.16)}
          .wo-command small{display:block;color:#78b5ff;font-size:8px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
          .wo-command h1{margin:7px 0 6px;font-size:clamp(28px,3.4vw,40px);line-height:1.04;letter-spacing:-.045em}
          .wo-command p{max-width:720px;margin:0;color:#8b98a9;font-size:10px;line-height:1.55}
          .wo-command-side{display:grid;grid-template-columns:1fr 1fr;gap:7px}
          .wo-command-side>div{min-width:0;padding:10px;border:1px solid rgba(148,163,184,.10);border-radius:11px;background:rgba(255,255,255,.022)}
          .wo-command-side>div.attention{border-color:rgba(244,173,84,.18);background:rgba(244,173,84,.045)}
          .wo-command-side span,.wo-command-side b,.wo-command-side small{display:block}
          .wo-command-side span{color:#718094;font-size:7px;font-weight:900;text-transform:uppercase}
          .wo-command-side b{margin-top:4px;color:#e7eef6;font-size:15px}
          .wo-command-side small{margin-top:3px;color:#68778a;font-size:7px;letter-spacing:0;text-transform:none}
          .wo-command-actions{grid-column:1/-1!important;display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:7px!important;padding:0!important;border:0!important;background:transparent!important}
          .wo-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding:16px 2px 3px}
          .wo-head small{display:block;color:#78b5ff;font-size:9px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
          .wo-head h1{margin:6px 0 5px;font-size:clamp(30px,4vw,44px);line-height:1;letter-spacing:-.05em}
          .wo-head p{margin:0;color:#8794a5;font-size:11px}
          .wo-actions{display:flex;gap:7px}
          .wo-button{display:inline-flex;min-height:40px;align-items:center;justify-content:center;padding:0 13px;border:1px solid #303844;border-radius:10px;color:#bdc7d3;background:#151b23;font:inherit;font-size:10px;font-weight:900;cursor:pointer;text-decoration:none}
          .wo-button.primary{border-color:#1478f2;color:#fff;background:#1478f2}
          .wo-layout{display:grid;grid-template-columns:330px minmax(0,1fr);gap:12px;align-items:start}
          .wo-filter{display:grid;gap:7px;padding:10px;border-bottom:1px solid #252c35}
          .wo-filter-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
          .wo-input,.wo-select,.wo-textarea{width:100%;min-height:38px;padding:0 10px;border:1px solid #303945;border-radius:8px;outline:0;color:#dfe7f0;background:#151c25;font:inherit;font-size:10px}
          .wo-textarea{min-height:70px;padding:9px;resize:vertical}
          .wo-input:focus,.wo-select:focus,.wo-textarea:focus{border-color:rgba(74,156,255,.6);box-shadow:0 0 0 3px rgba(74,156,255,.08)}
          .wo-panel{border:1px solid #282f39;border-radius:15px;background:#10151c}
          .wo-list{display:grid}
          .wo-vendor{padding:12px;border:0;border-bottom:1px solid rgba(148,163,184,.08);color:#a6b1be;background:transparent;text-align:left;cursor:pointer}
          .wo-vendor.active{background:rgba(74,156,255,.08)}
          .wo-vendor b,.wo-vendor span,.wo-vendor small{display:block}
          .wo-vendor b{color:#e8eef5;font-size:11px}.wo-vendor span{margin-top:3px;color:#7d8a9a;font-size:8px}.wo-vendor small{margin-top:5px;color:#76dda1;font-size:8px;font-weight:850}
          .wo-vendor-tags{display:flex!important;flex-wrap:wrap;gap:5px;margin-top:7px!important}.wo-tag{padding:3px 5px;border-radius:999px;color:#8fa1b5!important;background:rgba(148,163,184,.08);font-size:6px!important;font-weight:900}.wo-tag.ready{color:#81e2aa!important;background:rgba(85,217,143,.07)}.wo-tag.warn{color:#efb970!important;background:rgba(244,173,84,.07)}
          .wo-empty,.wo-loading{display:grid;min-height:280px;place-items:center;color:#748192;font-size:10px}
          .wo-doc{padding:22px}
          .wo-doc-head{display:flex;justify-content:space-between;gap:20px;padding-bottom:16px;border-bottom:2px solid #e9edf2}
          .wo-doc-head h2{margin:4px 0 0;color:#10151c;font-size:24px}.wo-doc-head span,.wo-doc-head small{display:block;color:#596575;font-size:10px}
          .wo-paper{background:#fff;color:#151a21}
          .wo-control{padding:12px;border-bottom:1px solid #252c35;background:#0e151d;color:#edf2f8}
          .wo-control-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.wo-control-head h3{margin:0;font-size:14px}.wo-control-head p{margin:3px 0 0;color:#778598;font-size:8px}
          .wo-control-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:10px}.wo-control-field{display:grid;gap:5px}.wo-control-field.full{grid-column:1/-1}.wo-control-field>span{color:#718094;font-size:7px;font-weight:900;text-transform:uppercase}
          .wo-finance-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:10px}.wo-finance-strip>div{padding:9px;border:1px solid rgba(148,163,184,.09);border-radius:9px;background:rgba(255,255,255,.02)}.wo-finance-strip span,.wo-finance-strip b{display:block}.wo-finance-strip span{color:#718094;font-size:7px;font-weight:900;text-transform:uppercase}.wo-finance-strip b{margin-top:4px;color:#e4edf6;font-size:12px}.wo-finance-strip .balance b{color:#efb970}
          .wo-control-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.wo-control-actions .wo-button{min-width:110px}
          .wo-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:14px 0;border-bottom:1px solid #dde3ea}
          .wo-meta div small,.wo-meta div b{display:block}.wo-meta small{color:#778291;font-size:8px;text-transform:uppercase}.wo-meta b{margin-top:4px;font-size:10px}
          .wo-table-wrap{overflow:auto;margin-top:14px}
          .wo-table{width:100%;min-width:900px;border-collapse:collapse}
          .wo-table th{padding:8px;border-bottom:2px solid #cfd6de;color:#5f6b7a;font-size:8px;text-align:left;text-transform:uppercase}
          .wo-table td{padding:10px 8px;border-bottom:1px solid #e1e6eb;font-size:9px;vertical-align:top}
          .wo-total{display:flex;justify-content:flex-end;margin-top:14px}.wo-total div{min-width:240px;padding:12px;border:1px solid #d8dee6;border-radius:10px}.wo-total span,.wo-total b{display:block}.wo-total span{color:#6f7b89;font-size:9px}.wo-total b{margin-top:5px;font-size:20px}
          .wo-terms{margin-top:16px;padding-top:13px;border-top:1px solid #dde3ea}.wo-terms b{font-size:10px}.wo-terms p{margin:5px 0 0;color:#5e6977;font-size:9px;line-height:1.55}
          .wo-msg{padding:10px 12px;border:1px solid rgba(61,220,132,.18);border-radius:10px;color:#75dfa2;background:rgba(61,220,132,.06);font-size:10px}.wo-error{padding:10px 12px;border:1px solid rgba(255,98,89,.2);border-radius:10px;color:#ff948e;background:rgba(255,98,89,.06);font-size:10px}
          @media(max-width:1150px){.wo-command{grid-template-columns:1fr}.wo-command-side{grid-template-columns:repeat(4,minmax(0,1fr))}.wo-command-actions{grid-column:1/-1!important}}
          @media(max-width:900px){.wo-layout{grid-template-columns:1fr}.wo-meta{grid-template-columns:1fr 1fr}.wo-control-grid{grid-template-columns:1fr 1fr}}
          @media(max-width:650px){.wo-command{padding:16px}.wo-command-side{grid-template-columns:1fr 1fr}.wo-command-actions{grid-template-columns:1fr!important}.wo-filter-grid{grid-template-columns:1fr}.wo-control-grid,.wo-finance-strip{grid-template-columns:1fr}.wo-meta{grid-template-columns:1fr}.wo-actions{display:grid;grid-template-columns:1fr 1fr;width:100%}}
          @media print{.no-print,.app-sidebar,.topbar{display:none!important}.app-workspace{padding:0!important}.wo-page{display:block}.wo-layout{display:block}.wo-layout>.wo-panel:first-child{display:none}.wo-panel{border:0}.wo-doc{padding:0}.page-shell{background:#fff!important}}
        `}</style>

        <header className="wo-command no-print">
          <div>
            <small>Vendor execution & payment control</small>
            <h1>Work Orders</h1>
            <p>
              {eventName} · vendor orders are generated from Event Planning, then confirmation and payment progress are tracked here.
            </p>
          </div>

          <div className="wo-command-side">
            <div>
              <span>Vendor order value</span>
              <b>{money(totalVendorValue)}</b>
              <small>{groups.length} vendor / agency order{groups.length === 1 ? '' : 's'}</small>
            </div>
            <div>
              <span>Advance paid</span>
              <b>{money(totalAdvancePaid)}</b>
              <small>{money(totalBalanceDue)} balance due</small>
            </div>
            <div>
              <span>Confirmed</span>
              <b>{confirmedWorkOrders}/{workOrders.length}</b>
              <small>Created work orders</small>
            </div>
            <div className={pendingPaymentCount > 0 ? 'attention' : ''}>
              <span>Payment pending</span>
              <b>{pendingPaymentCount}</b>
              <small>{workOrders.length ? 'Created orders not fully paid' : 'Create work orders first'}</small>
            </div>

            <div className="wo-command-actions">
              <Link className="wo-button" href="/app/event-planning">
                Event Planning
              </Link>
              <Link className="wo-button" href="/app/vendors">
                Vendors
              </Link>
              <button
                className="wo-button primary"
                type="button"
                disabled={!selected || Boolean(selectedMeta) || saving}
                onClick={() => void createSelectedWorkOrder()}
              >
                {selectedMeta ? 'Work Order Created' : 'Create Work Order'}
              </button>
            </div>
          </div>
        </header>

        {message ? <div className="wo-msg no-print">{message}</div> : null}

        {error ? <div className="wo-error no-print">{error}</div> : null}

        <div className="wo-layout">
          <aside className="wo-panel no-print">
            <div className="wo-filter">
              <input
                className="wo-input"
                value={query}
                placeholder="Search vendor, phone, work order…"
                onChange={(event) => setQuery(event.target.value)}
              />

              <div className="wo-filter-grid">
                <select
                  className="wo-select"
                  value={confirmationFilter}
                  onChange={(event) =>
                    setConfirmationFilter(
                      event.target.value as
                        | 'ALL'
                        | WorkOrderMeta['confirmationStatus']
                        | 'NOT_CREATED',
                    )
                  }
                >
                  <option value="ALL">All confirmation</option>
                  <option value="NOT_CREATED">Not created</option>
                  <option value="OPEN">Open</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="ON_HOLD">On hold</option>
                  <option value="CLOSED">Closed</option>
                </select>

                <select
                  className="wo-select"
                  value={paymentFilter}
                  onChange={(event) =>
                    setPaymentFilter(
                      event.target.value as
                        | 'ALL'
                        | WorkOrderMeta['paymentStatus'],
                    )
                  }
                >
                  <option value="ALL">All payment</option>
                  <option value="NOT_SET">Not set</option>
                  <option value="PENDING">Pending</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="PAID">Paid</option>
                </select>
              </div>
            </div>

            {groups.length ? (
              visibleGroups.length ? (
              <div className="wo-list">
                {visibleGroups.map((group) => {
                  const meta = workOrderByKey.get(group.key);
                  const advance = Math.min(group.total, Math.max(0, Number(meta?.advancePaid) || 0));
                  const balance = Math.max(0, group.total - advance);

                  return (
                  <button
                    key={group.key}
                    className={selected?.key === group.key ? 'wo-vendor active' : 'wo-vendor'}
                    type="button"
                    onClick={() => setSelectedKey(group.key)}
                  >
                    <b>{group.partnerName}</b>
                    <span>{group.rows.length} assigned line{group.rows.length === 1 ? '' : 's'}</span>
                    <small>{money(group.total)}</small>
                    <span className="wo-vendor-tags">
                      <span className={meta ? 'wo-tag ready' : 'wo-tag warn'}>
                        {meta ? meta.confirmationStatus : 'NOT CREATED'}
                      </span>
                      <span className={meta?.paymentStatus === 'PAID' ? 'wo-tag ready' : 'wo-tag'}>
                        {meta?.paymentStatus || 'PAYMENT NOT SET'}
                      </span>
                      <span className="wo-tag">
                        Balance {money(balance)}
                      </span>
                    </span>
                  </button>
                  );
                })}
              </div>
              ) : (
                <div className="wo-empty">
                  No work orders match these filters.
                </div>
              )
            ) : (
              <div className="wo-empty">
                Assign vendors in Event Planning to create work orders.
              </div>
            )}
          </aside>

          <section className="wo-panel">
            {selected && work ? (
              <>
                <div className="wo-control no-print">
                  <div className="wo-control-head">
                    <div>
                      <h3>
                        {selectedMeta
                          ? selectedMeta.workOrderNumber
                          : 'Create this work order'}
                      </h3>
                      <p>
                        {selected.partnerName} · {selected.rows.length} line{selected.rows.length === 1 ? '' : 's'} · {money(selected.total)}
                      </p>
                    </div>

                    {!selectedMeta ? (
                      <button
                        className="wo-button primary"
                        type="button"
                        disabled={saving}
                        onClick={() => void createSelectedWorkOrder()}
                      >
                        Create Work Order
                      </button>
                    ) : null}
                  </div>

                  {selectedMeta ? (
                    <>
                      <div className="wo-control-grid">
                        <label className="wo-control-field">
                          <span>Work Order No.</span>
                          <input
                            className="wo-input"
                            value={selectedMeta.workOrderNumber}
                            onChange={(event) =>
                              patchSelectedMeta({
                                workOrderNumber: event.target.value,
                              })
                            }
                          />
                        </label>

                        <label className="wo-control-field">
                          <span>Confirmation</span>
                          <select
                            className="wo-select"
                            value={selectedMeta.confirmationStatus}
                            onChange={(event) =>
                              patchSelectedMeta({
                                confirmationStatus:
                                  event.target.value as WorkOrderMeta['confirmationStatus'],
                              })
                            }
                          >
                            <option value="OPEN">Open</option>
                            <option value="CONFIRMED">Confirmed</option>
                            <option value="ON_HOLD">On Hold</option>
                            <option value="CLOSED">Closed</option>
                          </select>
                        </label>

                        <label className="wo-control-field">
                          <span>Payment Status</span>
                          <select
                            className="wo-select"
                            value={selectedMeta.paymentStatus}
                            onChange={(event) =>
                              patchSelectedMeta({
                                paymentStatus:
                                  event.target.value as WorkOrderMeta['paymentStatus'],
                              })
                            }
                          >
                            <option value="NOT_SET">Not Set</option>
                            <option value="PENDING">Pending</option>
                            <option value="PARTIAL">Partial</option>
                            <option value="PAID">Paid</option>
                          </select>
                        </label>

                        <label className="wo-control-field">
                          <span>Advance Paid</span>
                          <input
                            className="wo-input"
                            type="number"
                            min="0"
                            max={selected.total}
                            value={selectedMeta.advancePaid}
                            onChange={(event) =>
                              patchSelectedMeta({
                                advancePaid:
                                  Math.min(
                                    selected.total,
                                    Math.max(
                                      0,
                                      Number(event.target.value) || 0,
                                    ),
                                  ),
                              })
                            }
                          />
                        </label>

                        <label className="wo-control-field full">
                          <span>Work Order Notes</span>
                          <textarea
                            className="wo-textarea"
                            value={selectedMeta.notes}
                            placeholder="Reporting instructions, material quality, payment note…"
                            onChange={(event) =>
                              patchSelectedMeta({
                                notes: event.target.value,
                              })
                            }
                          />
                        </label>
                      </div>

                      <div className="wo-finance-strip">
                        <div>
                          <span>Order value</span>
                          <b>{money(selected.total)}</b>
                        </div>
                        <div>
                          <span>Advance paid</span>
                          <b>{money(selectedAdvance)}</b>
                        </div>
                        <div className="balance">
                          <span>Balance due</span>
                          <b>{money(selectedBalance)}</b>
                        </div>
                      </div>

                      <div className="wo-control-actions">
                        <button
                          className="wo-button primary"
                          type="button"
                          disabled={saving}
                          onClick={() => void saveSelectedMeta()}
                        >
                          {saving ? 'Saving…' : 'Save Work Order'}
                        </button>
                        <button
                          className="wo-button"
                          type="button"
                          onClick={shareWhatsApp}
                        >
                          WhatsApp
                        </button>
                        <button
                          className="wo-button"
                          type="button"
                          onClick={() => void downloadPdf()}
                        >
                          Download PDF
                        </button>
                        <button
                          className="wo-button"
                          type="button"
                          onClick={() => window.print()}
                        >
                          Print
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>

              <div className="wo-doc wo-paper">
                <header className="wo-doc-head">
                  <div>
                    <small>{work.profile.businessName || 'Menu Costing'}</small>
                    <h2>WORK ORDER</h2>
                    <span>{selectedMeta?.workOrderNumber || 'DRAFT · NOT CREATED'}</span>
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
                    <span style={{marginTop:8}}>
                      Advance {money(selectedAdvance)} · Balance {money(selectedBalance)}
                    </span>
                    <span style={{marginTop:4}}>
                      {selectedMeta?.confirmationStatus || 'OPEN'} · {selectedMeta?.paymentStatus || 'NOT SET'}
                    </span>
                  </div>
                </div>

                <section className="wo-terms">
                  <b>Payment Terms</b>
                  <p>{terms}</p>
                  {selectedMeta?.notes ? (
                    <>
                      <b style={{display:'block',marginTop:10}}>Work Order Notes</b>
                      <p>{selectedMeta.notes}</p>
                    </>
                  ) : null}
                </section>
              </div>
              </>
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
