'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import AppShell, { LockedCard } from '../../components/AppShell';
import { getSession, loadWork, saveWork } from '../../../lib/store';
import type { Session, WorkState } from '../../../lib/types';
import {
  calculateGasCost,
  calculateOperationsTotals,
  calculateTransportCost,
  normalizeOperationsState,
  type FunctionOperationsRow,
  type GasCostInput,
  type OperationsCostState,
  type TransportCostInput,
  type WorkWithOperations,
} from '../../../lib/operationsCost';

function money(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function numberValue(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function TransportFields({
  value,
  onChange,
}: {
  value: TransportCostInput;
  onChange: (patch: Partial<TransportCostInput>) => void;
}) {
  const total = calculateTransportCost(value);

  return (
    <div className="operations-block">
      <div className="operations-grid">
        <div className="field">
          <label>Vehicle</label>
          <input
            className="input"
            value={value.vehicleLabel}
            placeholder="Tempo"
            onChange={(event) => onChange({ vehicleLabel: event.target.value })}
          />
        </div>

        <div className="field">
          <label>Rate / trip</label>
          <input
            className="input"
            type="number"
            min="0"
            step="1"
            value={value.ratePerTrip || ''}
            placeholder="1200"
            onChange={(event) => onChange({ ratePerTrip: numberValue(event.target.value) })}
          />
        </div>

        <div className="field">
          <label>Vehicles</label>
          <input
            className="input"
            type="number"
            min="0"
            step="1"
            value={value.vehicles || ''}
            onChange={(event) => onChange({ vehicles: numberValue(event.target.value) })}
          />
        </div>

        <div className="field">
          <label>Trips / vehicle</label>
          <input
            className="input"
            type="number"
            min="0"
            step="0.5"
            value={value.tripsPerVehicle || ''}
            onChange={(event) => onChange({ tripsPerVehicle: numberValue(event.target.value) })}
          />
        </div>

        <div className="field">
          <label>Toll + parking</label>
          <input
            className="input"
            type="number"
            min="0"
            step="1"
            value={value.tollParking || ''}
            onChange={(event) => onChange({ tollParking: numberValue(event.target.value) })}
          />
        </div>

        <div className="field">
          <label>Loading / unloading</label>
          <input
            className="input"
            type="number"
            min="0"
            step="1"
            value={value.loadingUnloading || ''}
            onChange={(event) => onChange({ loadingUnloading: numberValue(event.target.value) })}
          />
        </div>

        <div className="field">
          <label>Other transport</label>
          <input
            className="input"
            type="number"
            min="0"
            step="1"
            value={value.other || ''}
            onChange={(event) => onChange({ other: numberValue(event.target.value) })}
          />
        </div>

        <div className="operations-total-box">
          <span>Transport total</span>
          <strong>{money(total)}</strong>
          <small>
            Rate × vehicles × trips + toll + loading + other
          </small>
        </div>
      </div>
    </div>
  );
}

function GasFields({
  value,
  pax,
  onChange,
}: {
  value: GasCostInput;
  pax: number;
  onChange: (patch: Partial<GasCostInput>) => void;
}) {
  const total = calculateGasCost(value);
  const ratePerKg =
    value.cylinderSizeKg > 0
      ? value.cylinderPrice / value.cylinderSizeKg
      : 0;

  return (
    <div className="operations-block">
      <div className="action-row operations-mode-row">
        <button
          type="button"
          className={value.mode === 'KG' ? 'primary-button' : 'ghost-button'}
          onClick={() => onChange({ mode: 'KG' })}
        >
          LPG by kg
        </button>
        <button
          type="button"
          className={value.mode === 'CYLINDER' ? 'primary-button' : 'ghost-button'}
          onClick={() => onChange({ mode: 'CYLINDER' })}
        >
          Cylinder fraction
        </button>
        <button
          type="button"
          className={value.mode === 'MANUAL' ? 'primary-button' : 'ghost-button'}
          onClick={() => onChange({ mode: 'MANUAL' })}
        >
          Manual cost
        </button>
      </div>

      {value.mode === 'MANUAL' ? (
        <div className="two-grid operations-fields">
          <div className="field">
            <label>Gas cost</label>
            <input
              className="input input-large"
              type="number"
              min="0"
              step="1"
              value={value.manualCost || ''}
              placeholder="800"
              onChange={(event) => onChange({ manualCost: numberValue(event.target.value) })}
            />
          </div>
          <div className="operations-total-box">
            <span>Gas total</span>
            <strong>{money(total)}</strong>
            <small>{pax > 0 ? `${money(total / pax)} / guest` : 'Enter guest count'}</small>
          </div>
        </div>
      ) : (
        <div className="operations-grid operations-fields">
          <div className="field">
            <label>Cylinder size (kg)</label>
            <input
              className="input"
              type="number"
              min="0.1"
              step="0.1"
              value={value.cylinderSizeKg || ''}
              onChange={(event) => onChange({ cylinderSizeKg: numberValue(event.target.value) })}
            />
          </div>
          <div className="field">
            <label>Cylinder price</label>
            <input
              className="input"
              type="number"
              min="0"
              step="1"
              value={value.cylinderPrice || ''}
              placeholder="1900"
              onChange={(event) => onChange({ cylinderPrice: numberValue(event.target.value) })}
            />
          </div>

          {value.mode === 'KG' ? (
            <div className="field">
              <label>LPG used (kg)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.1"
                value={value.usedKg || ''}
                placeholder="8"
                onChange={(event) => onChange({ usedKg: numberValue(event.target.value) })}
              />
            </div>
          ) : (
            <div className="field">
              <label>Cylinders used</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.05"
                value={value.cylindersUsed || ''}
                placeholder="0.42"
                onChange={(event) => onChange({ cylindersUsed: numberValue(event.target.value) })}
              />
            </div>
          )}

          <div className="operations-total-box">
            <span>Gas total</span>
            <strong>{money(total)}</strong>
            <small>
              {value.mode === 'KG'
                ? `${money(ratePerKg)} / kg${pax > 0 ? ` · ${money(total / pax)} / guest` : ''}`
                : `${value.cylindersUsed || 0} cylinder used${pax > 0 ? ` · ${money(total / pax)} / guest` : ''}`}
            </small>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OperationsCostPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [work, setWork] = useState<WorkWithOperations | null>(null);
  const [operations, setOperations] = useState<OperationsCostState | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const current = getSession();

    if (!current) {
      router.replace('/login');
      return;
    }

    setSession(current);

    const saved = loadWork(current.tenantId) as WorkWithOperations;
    const normalized = normalizeOperationsState(saved, saved.operations);

    setWork(saved);
    setOperations(normalized);
  }, [router]);

  const totals = useMemo(
    () => (operations ? calculateOperationsTotals(operations) : null),
    [operations],
  );

  function persist(nextOperations: OperationsCostState, nextMessage = '') {
    if (!work || !session) return;

    const nextTotals = calculateOperationsTotals(nextOperations);
    const nextWork: WorkWithOperations = {
      ...work,
      operations: nextOperations,
      extras: {
        ...work.extras,
        gasFuel: nextTotals.gasTotal,
        transport: nextTotals.transportTotal,
        disposable: 0,
        other: 0,
      },
      // A changed cost basis should not silently keep an old selling rate.
      sellingPricePerPlate: 0,
      updatedAt: new Date().toISOString(),
    };

    setOperations(nextOperations);
    setWork(nextWork);
    saveWork(session.tenantId, nextWork as WorkState);
    setMessage(nextMessage);
  }

  function updateFunction(
    index: number,
    key: 'gas' | 'transport',
    patch: Partial<GasCostInput> | Partial<TransportCostInput>,
  ) {
    if (!operations) return;

    const functions = operations.functions.map((row, rowIndex) => {
      if (rowIndex !== index) return row;

      if (key === 'gas') {
        return {
          ...row,
          gas: {
            ...row.gas,
            ...(patch as Partial<GasCostInput>),
          },
        } satisfies FunctionOperationsRow;
      }

      return {
        ...row,
        transport: {
          ...row.transport,
          ...(patch as Partial<TransportCostInput>),
        },
      } satisfies FunctionOperationsRow;
    });

    persist({ ...operations, functions });
  }

  function setTransportMode(mode: OperationsCostState['transportMode']) {
    if (!operations) return;
    persist({ ...operations, transportMode: mode });
  }

  function updateSharedTransport(patch: Partial<TransportCostInput>) {
    if (!operations) return;

    persist({
      ...operations,
      sharedTransport: {
        ...operations.sharedTransport,
        ...patch,
      },
    });
  }

  function continueToPricing() {
    if (!operations) return;
    persist(operations, 'Gas and transport costs saved.');
    router.push('/app/final-costing');
  }

  if (!work || !session || !operations || !totals) {
    return (
      <AppShell title="Gas & Transport">
        <div className="loader-card">Loading operations cost…</div>
      </AppShell>
    );
  }

  if (session.status === 'EXPIRED') {
    return (
      <AppShell title="Gas & Transport">
        <LockedCard />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Gas & Transport"
      subtitle="Calculate LPG and vehicle cost before setting your selling price"
    >
      <section className="content-grid operations-page">
        <div className="final-costing-overview is-ready">
          <div>
            <span className="page-eyebrow">Real event cost</span>
            <h2>Gas + transport by function</h2>
            <p>
              Gas is calculated for each function. Transport can be one shared event cost or separate for every function.
            </p>
          </div>
          <div className="final-costing-overview-total">
            <span>Operations cost</span>
            <b>{money(totals.total)}</b>
            <small>
              Gas {money(totals.gasTotal)} · Transport {money(totals.transportTotal)}
            </small>
            <button className="primary-button" type="button" onClick={continueToPricing}>
              Next: Pricing
            </button>
          </div>
        </div>

        <div className="glass-card">
          <div className="final-costing-section-heading">
            <div>
              <span className="section-kicker">Transport method</span>
              <h2>How should transport be counted?</h2>
              <p>
                Use shared transport when the same vehicle trip carries material for the full event. Use function-wise when meals need separate trips.
              </p>
            </div>
          </div>

          <div className="action-row">
            <button
              type="button"
              className={operations.transportMode === 'EVENT_SHARED' ? 'primary-button' : 'secondary-button'}
              onClick={() => setTransportMode('EVENT_SHARED')}
            >
              One Shared Event Transport
            </button>
            <button
              type="button"
              className={operations.transportMode === 'FUNCTION_WISE' ? 'primary-button' : 'secondary-button'}
              onClick={() => setTransportMode('FUNCTION_WISE')}
            >
              Function-wise Transport
            </button>
          </div>

          {operations.transportMode === 'EVENT_SHARED' ? (
            <div style={{ marginTop: 18 }}>
              <TransportFields
                value={operations.sharedTransport}
                onChange={updateSharedTransport}
              />
            </div>
          ) : null}
        </div>

        {operations.functions.map((row, index) => {
          const gasTotal = calculateGasCost(row.gas);
          const transportTotal =
            operations.transportMode === 'FUNCTION_WISE'
              ? calculateTransportCost(row.transport)
              : 0;
          const functionTotal = gasTotal + transportTotal;
          const title = [row.dayLabel, row.mealLabel].filter(Boolean).join(' · ');

          return (
            <article className="glass-card operations-function-card" key={row.id}>
              <div className="final-costing-section-heading">
                <div>
                  <span className="section-kicker">
                    Function {index + 1} · {row.pax.toLocaleString('en-IN')} guests
                  </span>
                  <h2>{title || `Function ${index + 1}`}</h2>
                  <p>
                    Function operations cost: {money(functionTotal)}
                    {row.pax > 0 ? ` · ${money(functionTotal / row.pax)} / guest` : ''}
                  </p>
                </div>
              </div>

              <div className="operations-section-title">
                <div>
                  <strong>LPG / Gas</strong>
                  <small>Use actual kg, cylinder fraction or a manual amount.</small>
                </div>
                <b>{money(gasTotal)}</b>
              </div>

              <GasFields
                value={row.gas}
                pax={row.pax}
                onChange={(patch) => updateFunction(index, 'gas', patch)}
              />

              {operations.transportMode === 'FUNCTION_WISE' ? (
                <>
                  <div className="operations-section-title operations-transport-heading">
                    <div>
                      <strong>Transport</strong>
                      <small>Count only trips required for this function.</small>
                    </div>
                    <b>{money(transportTotal)}</b>
                  </div>
                  <TransportFields
                    value={row.transport}
                    onChange={(patch) => updateFunction(index, 'transport', patch)}
                  />
                </>
              ) : null}
            </article>
          );
        })}

        <div className="glass-card operations-summary-card">
          <div className="final-costing-section-heading">
            <div>
              <span className="section-kicker">Operations summary</span>
              <h2>Cost added to final event costing</h2>
            </div>
          </div>

          <div className="final-profit-strip is-positive">
            <div>
              <span>Gas</span>
              <b>{money(totals.gasTotal)}</b>
            </div>
            <div>
              <span>Transport</span>
              <b>{money(totals.transportTotal)}</b>
            </div>
            <div>
              <span>Gas + Transport</span>
              <b>{money(totals.total)}</b>
            </div>
            <div>
              <span>Transport mode</span>
              <b>{operations.transportMode === 'EVENT_SHARED' ? 'Shared' : 'Function-wise'}</b>
            </div>
          </div>

          {message ? <div className="admin-message" style={{ marginTop: 14 }}>{message}</div> : null}
        </div>

        <div className="action-row page-actions">
          <button className="primary-button" type="button" onClick={continueToPricing}>
            Save & Continue to Pricing
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => router.push('/app/manpower?afterGrocery=1')}
          >
            Back to Manpower
          </button>
        </div>

        <style>{`
          .operations-page{padding-bottom:28px}.operations-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;align-items:end}.operations-fields{margin-top:16px}.operations-total-box{min-height:78px;padding:13px 15px;border:1px solid rgba(148,163,184,.2);border-radius:14px;background:rgba(148,163,184,.06);display:grid;gap:2px}.operations-total-box span,.operations-total-box small{color:var(--muted);font-size:11px}.operations-total-box strong{font-size:21px}.operations-section-title{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:20px 0 6px;padding-top:18px;border-top:1px solid rgba(148,163,184,.14)}.operations-section-title>div{display:grid;gap:3px}.operations-section-title small{color:var(--muted)}.operations-section-title>b{font-size:18px}.operations-transport-heading{margin-top:26px}.operations-mode-row{margin-top:10px}.operations-function-card{overflow:hidden}@media(max-width:900px){.operations-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){.operations-grid{grid-template-columns:1fr}.operations-mode-row{display:grid;grid-template-columns:1fr}.operations-mode-row button{width:100%}.operations-section-title{align-items:flex-start}.operations-summary-card .final-profit-strip{grid-template-columns:1fr 1fr}}
        `}</style>
      </section>
    </AppShell>
  );
}
