'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import AppShell, { LockedCard } from '../../components/AppShell';
import { getSession, loadWork, saveWork } from '../../../lib/store';
import type { Session, WorkState } from '../../../lib/types';
import {
  calculateOperationsTotals,
  calculateTransportCost,
  normalizeOperationsState,
  type FunctionOperationsRow,
  type OperationsCostState,
  type TransportCostInput,
  type WorkWithOperations,
} from '../../../lib/operationsCost';

import {
  calculateEventGas,
  defaultGasCostMaster,
  type GasCostMaster,
} from '../../../lib/gasCost';

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
    <div className="operations-grid operations-fields">
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
          value={value.other || ''}
          onChange={(event) => onChange({ other: numberValue(event.target.value) })}
        />
      </div>
      <div className="operations-total-box">
        <span>Transport total</span>
        <strong>{money(total)}</strong>
        <small>Rate × vehicles × trips + toll + loading + other</small>
      </div>
    </div>
  );
}

export default function OperationsCostPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [work, setWork] = useState<WorkWithOperations | null>(null);
  const [operations, setOperations] = useState<OperationsCostState | null>(null);
  const [message, setMessage] = useState('');
  const [
    gasMaster,
    setGasMaster,
  ] = useState<GasCostMaster>(
    () => defaultGasCostMaster(),
  );
  const [
    gasMasterWarning,
    setGasMasterWarning,
  ] = useState('');

  useEffect(() => {
    const current = getSession();

    if (!current) {
      router.replace('/login');
      return;
    }

    setSession(current);
    const saved = loadWork(current.tenantId) as WorkWithOperations;
    setWork(saved);
    setOperations(normalizeOperationsState(saved, saved.operations));

    void fetch(
      '/api/client/gas-cost',
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
              'Could not load gas master.',
            );
          }

          setGasMaster(
            data as GasCostMaster,
          );
          setGasMasterWarning('');
        },
      )
      .catch(
        () => {
          setGasMaster(
            defaultGasCostMaster(),
          );
          setGasMasterWarning(
            'Gas Master could not be loaded. Built-in category defaults are being used.',
          );
        },
      );
  }, [router]);

  const gasBreakdown =
    useMemo(
      () =>
        work
          ? calculateEventGas(
              work,
              gasMaster,
            )
          : null,
      [
        work,
        gasMaster,
      ],
    );

  const totals = useMemo(
    () =>
      operations &&
      gasBreakdown
        ? calculateOperationsTotals(
            operations,
            gasBreakdown.totalGasCost,
          )
        : null,
    [
      operations,
      gasBreakdown,
    ],
  );

  const realGasDishCount =
    gasBreakdown?.rows.filter(
      (row) =>
        row.source ===
        'REAL_DISH_PROFILE',
    ).length || 0;

  const measuredGasDishCount =
    gasBreakdown?.rows.filter(
      (row) =>
        row.source ===
        'DISH_OVERRIDE',
    ).length || 0;

  const fallbackGasDishCount =
    gasBreakdown?.rows.filter(
      (row) =>
        row.source ===
          'CATEGORY' ||
        row.source ===
          'SAFE_COOKING_FALLBACK',
    ).length || 0;

  const noGasDishCount =
    gasBreakdown?.rows.filter(
      (row) =>
        row.source ===
        'NO_GAS_CATEGORY',
    ).length || 0;

  function persist(nextOperations: OperationsCostState, nextMessage = '') {
    if (!work || !session) return;

    const nextTotals = calculateOperationsTotals(
      nextOperations,
      gasBreakdown?.totalGasCost ?? 0,
    );
    const nextWork: WorkWithOperations = {
      ...work,
      operations: nextOperations,
      extras: {
        ...work.extras,
        gasFuel: nextTotals.gasTotal,
        transport: nextTotals.transportTotal,
        // Disposable is a separate next step; never wipe an existing value here.
        disposable: Math.max(0, Number(work.extras.disposable) || 0),
        other: 0,
      },
      sellingPricePerPlate: 0,
      updatedAt: new Date().toISOString(),
    };

    setOperations(nextOperations);
    setWork(nextWork);
    saveWork(session.tenantId, nextWork as WorkState);
    setMessage(nextMessage);
  }

  function updateFunctionTransport(
    index: number,
    patch: Partial<TransportCostInput>,
  ) {
    if (!operations) return;

    const functions =
      operations.functions.map(
        (row, rowIndex) =>
          rowIndex === index
            ? {
                ...row,
                transport: {
                  ...row.transport,
                  ...patch,
                },
              } satisfies FunctionOperationsRow
            : row,
      );

    persist({
      ...operations,
      functions,
    });
  }

  function updateSharedTransport(patch: Partial<TransportCostInput>) {
    if (!operations) return;
    persist({
      ...operations,
      sharedTransport: { ...operations.sharedTransport, ...patch },
    });
  }

  function continueToDisposable() {
    if (!operations) return;
    persist(operations, 'Gas and transport costs saved.');
    router.push('/app/disposable');
  }

  const savedDisposableTotal =
    Math.max(
      0,
      Number(
        work?.extras
          .disposable,
      ) || 0,
    );

  const operationsGrandTotal =
    (totals?.total || 0) +
    savedDisposableTotal;

  const operationsCovers =
    operations?.functions.reduce(
      (sum, row) =>
        sum +
        Math.max(
          0,
          Number(row.pax) || 0,
        ),
      0,
    ) || 0;

  const operationsPerCover =
    operationsCovers > 0
      ? operationsGrandTotal /
        operationsCovers
      : 0;

  if (!work || !session || !operations || !totals) {
    return (
      <AppShell title="Operations" subtitle="Review gas, transport and event running costs">
        <div className="loader-card">Loading operations cost…</div>
      </AppShell>
    );
  }

  if (session.status === 'EXPIRED') {
    return (
      <AppShell title="Operations">
        <LockedCard />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Operations"
      subtitle="Review LPG, transport and plastic/disposable costs before final costing"
    >
      <section className="content-grid operations-page">
        <div className="final-costing-overview is-ready">
          <div>
            <span className="page-eyebrow">Operations cost control</span>
            <h2>Gas, transport and disposable readiness</h2>
            <p>Gas uses each dish's real burner/time/batch profile when available, then measured kg/100, then category rate. Missing cooking rates get a safe positive fallback; approved no-gas categories stay at zero.</p>
          </div>
          <div className="final-costing-overview-total">
            <span>Gas + transport</span>
            <b>{money(totals.total)}</b>
            <small>Gas {money(totals.gasTotal)} · Transport {money(totals.transportTotal)}</small>
            <button className="primary-button" type="button" onClick={continueToDisposable}>
              Continue to Plastic
            </button>
          </div>
        </div>

        <div className="operations-desktop-workspace">
          <div className="operations-desktop-main">
        <div className="glass-card">
          <div className="final-costing-section-heading">
            <div>
              <span className="section-kicker">Transport method</span>
              <h2>How should transport be counted?</h2>
              <p>Use shared transport for one common event trip, or function-wise for separate meal trips.</p>
            </div>
          </div>
          <div className="action-row operations-mode-row" role="group" aria-label="Transport method">
            <button
              type="button"
              className={operations.transportMode === 'EVENT_SHARED' ? 'primary-button' : 'secondary-button'}
              onClick={() => persist({ ...operations, transportMode: 'EVENT_SHARED' })}
            >
              One Shared Event Transport
            </button>
            <button
              type="button"
              className={operations.transportMode === 'FUNCTION_WISE' ? 'primary-button' : 'secondary-button'}
              onClick={() => persist({ ...operations, transportMode: 'FUNCTION_WISE' })}
            >
              Function-wise Transport
            </button>
          </div>
          {operations.transportMode === 'EVENT_SHARED' ? (
            <TransportFields value={operations.sharedTransport} onChange={updateSharedTransport} />
          ) : null}
        </div>

        {operations.functions.map((row, index) => {
          const gasFunction =
            gasBreakdown?.functionTotals.find(
              (item) =>
                item.serviceKey === row.id,
            );

          const gasRows =
            gasBreakdown?.rows.filter(
              (item) =>
                item.serviceKey === row.id,
            ) || [];

          const realGasDishCount =
            gasRows.filter(
              (dish) =>
                dish.source ===
                'REAL_DISH_PROFILE',
            ).length;

          const measuredGasDishCount =
            gasRows.filter(
              (dish) =>
                dish.source ===
                'DISH_OVERRIDE',
            ).length;

          const fallbackGasDishCount =
            gasRows.filter(
              (dish) =>
                dish.source ===
                  'CATEGORY' ||
                dish.source ===
                  'SAFE_COOKING_FALLBACK',
            ).length;

          const gasTotal =
            gasFunction?.gasCost || 0;

          const transportTotal =
            operations.transportMode === 'FUNCTION_WISE'
              ? calculateTransportCost(row.transport)
              : 0;
          const title = [row.dayLabel, row.mealLabel].filter(Boolean).join(' · ');

          return (
            <article className="glass-card operations-function-card" key={row.id}>
              <div className="final-costing-section-heading">
                <div>
                  <span className="section-kicker">Function {index + 1} · {row.pax.toLocaleString('en-IN')} guests</span>
                  <h2>{title || `Function ${index + 1}`}</h2>
                  <p>
                    Gas {money(gasTotal)}
                    {transportTotal > 0 ? ` · Transport ${money(transportTotal)}` : ''}
                  </p>
                </div>
              </div>

              <div className="operations-section-title">
                <div>
                  <strong>LPG / Gas</strong>
                  <small>Real profile first · measured kg/100 second · category rate third · safe cooking fallback last.</small>
                </div>
                <b>{money(gasTotal)}</b>
              </div>

              <div className="operations-total-box gas-auto-summary">
                <span>Calculated LPG used</span>
                <strong>
                  {(gasFunction?.gasKg || 0).toFixed(2)} kg
                </strong>
                <small>
                  ₹{(gasBreakdown?.lpgRatePerKg || 0).toFixed(2)} / kg · {row.pax.toLocaleString('en-IN')} guests
                </small>
                <small>
                  {realGasDishCount} real profile · {measuredGasDishCount} measured · {fallbackGasDishCount} fallback estimate
                </small>
              </div>

              {gasRows.length ? (
                <div className="gas-mini-table gas-real-table">
                  {gasRows.map(
                    (dish) => {
                      const sourceLabel =
                        dish.source === 'REAL_DISH_PROFILE'
                          ? 'REAL PROFILE'
                          : dish.source === 'DISH_OVERRIDE'
                            ? 'MEASURED'
                            : dish.source === 'CATEGORY'
                              ? 'CATEGORY'
                              : dish.source === 'SAFE_COOKING_FALLBACK'
                                ? 'SAFE DEFAULT'
                                : 'NO GAS';

                      return (
                        <div key={dish.key}>
                          <span>
                            <b>{dish.dish}</b>
                            <small>
                              {dish.category} · {sourceLabel}
                            </small>
                          </span>

                          <span>
                            {dish.source === 'REAL_DISH_PROFILE' ? (
                              <>
                                <b>
                                  {(dish.gasBurnerCount || 1)} burner{(dish.gasBurnerCount || 1) === 1 ? '' : 's'} × {(dish.gasBurnerKgPerHour || 0).toFixed(2)} kg/h
                                </b>
                                <small>
                                  {(dish.gasCookingMinutes || 0).toFixed(0)} min/batch · {dish.gasBatches || 0} batch{(dish.gasBatches || 0) === 1 ? '' : 'es'} · {dish.gasBatchPax || 0} pax/batch
                                </small>
                              </>
                            ) : (
                              <>
                                <b>
                                  {dish.gasKgPer100.toFixed(2)} kg / 100
                                </b>
                                <small>
                                  {dish.source === 'DISH_OVERRIDE'
                                    ? 'Dish-specific measured rate'
                                    : dish.source === 'CATEGORY'
                                      ? 'Category fallback rate'
                                      : dish.source === 'SAFE_COOKING_FALLBACK'
                                        ? 'Safe positive cooking fallback'
                                        : 'Approved no-gas category'}
                                </small>
                              </>
                            )}
                          </span>

                          <span>
                            <b>{dish.gasKg.toFixed(3)} kg</b>
                            <small>
                              actual for {dish.guests.toLocaleString('en-IN')} guests
                            </small>
                          </span>

                          <b>
                            {money(dish.gasCost)}
                          </b>
                        </div>
                      );
                    },
                  )}
                </div>
              ) : (
                <p className="muted">
                  No menu dishes are available for gas calculation.
                </p>
              )}

              {operations.transportMode === 'FUNCTION_WISE' ? (
                <>
                  <div className="operations-section-title">
                    <div>
                      <strong>Transport</strong>
                      <small>Count only trips required for this function.</small>
                    </div>
                    <b>{money(transportTotal)}</b>
                  </div>
                  <TransportFields
                    value={row.transport}
                    onChange={(patch) => updateFunctionTransport(index, patch)}
                  />
                </>
              ) : null}
            </article>
          );
        })}

        {gasMasterWarning ? (
          <div className="admin-message error">
            {gasMasterWarning}
          </div>
        ) : null}

        <div className="glass-card operations-summary-card">
          <div className="final-profit-strip is-positive">
            <div><span>Gas</span><b>{money(totals.gasTotal)}</b></div>
            <div><span>Transport</span><b>{money(totals.transportTotal)}</b></div>
            <div><span>Gas + Transport</span><b>{money(totals.total)}</b></div>
            <div><span>Transport mode</span><b>{operations.transportMode === 'EVENT_SHARED' ? 'Shared' : 'Function-wise'}</b></div>
          </div>
          {message ? <div className="admin-message" style={{ marginTop: 14 }}>{message}</div> : null}
        </div>

          </div>

          <aside className="operations-desktop-summary no-print" aria-label="Operations cost summary">
            <div className="operations-desktop-summary-head">
              <span>Operations total</span>
              <strong>{money(operationsGrandTotal)}</strong>
              <small>
                {money(operationsPerCover)} per function cover
              </small>
            </div>

            <div className="operations-desktop-summary-grid">
              <div>
                <span>Gas</span>
                <b>{money(totals.gasTotal)}</b>
              </div>
              <div>
                <span>Transport</span>
                <b>{money(totals.transportTotal)}</b>
              </div>
              <div>
                <span>Plastic</span>
                <b>{money(savedDisposableTotal)}</b>
              </div>
              <div>
                <span>Functions</span>
                <b>{operations.functions.length}</b>
              </div>
            </div>

            <div className="operations-desktop-summary-list">
              <div>
                <span>LPG used</span>
                <b>{(gasBreakdown?.totalGasKg || 0).toFixed(2)} kg</b>
              </div>
              <div>
                <span>Real gas profiles</span>
                <b>{realGasDishCount}/{gasBreakdown?.rows.length || 0}</b>
              </div>
              <div>
                <span>Measured kg / 100</span>
                <b>{measuredGasDishCount}</b>
              </div>
              <div>
                <span>Fallback estimates</span>
                <b>{fallbackGasDishCount}</b>
              </div>
              <div>
                <span>Approved no-gas dishes</span>
                <b>{noGasDishCount}</b>
              </div>
              <div>
                <span>Transport mode</span>
                <b>{operations.transportMode === 'EVENT_SHARED' ? 'Shared' : 'Function-wise'}</b>
              </div>
              <div>
                <span>Covers</span>
                <b>{operationsCovers.toLocaleString('en-IN')}</b>
              </div>
            </div>

            <div className="operations-substep-status">
              <span className={fallbackGasDishCount === 0 ? 'is-complete' : ''}>1</span>
              <div>
                <b>Gas & Transport</b>
                <small>
                  {fallbackGasDishCount > 0
                    ? `${fallbackGasDishCount} cooking dish${fallbackGasDishCount === 1 ? '' : 'es'} still use fallback gas estimates`
                    : 'All cooking dishes use dish-specific gas data'}}
                </small>
              </div>
            </div>

            <div className="operations-substep-status">
              <span className={savedDisposableTotal > 0 ? 'is-complete' : ''}>2</span>
              <div>
                <b>Plastic & Disposable</b>
                <small>{savedDisposableTotal > 0 ? 'Cost already saved' : 'Next sub-step'}</small>
              </div>
            </div>

            <button
              className="primary-button operations-desktop-next"
              type="button"
              onClick={continueToDisposable}
            >
              Continue to Plastic
              <span aria-hidden="true">→</span>
            </button>

            <button
              className="operations-desktop-back"
              type="button"
              onClick={() => router.push('/app/team')}
            >
              Back to Manpower
            </button>
          </aside>
        </div>

        <div className="action-row page-actions">
          <button className="primary-button" type="button" onClick={continueToDisposable}>
            Save & Continue to Plastic & Disposable
          </button>
          <button className="ghost-button" type="button" onClick={() => window.location.assign('/app/team')}>
            Back to Manpower
          </button>
        </div>

        <style>{`
          .operations-page{padding-bottom:28px}.operations-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;align-items:end}.operations-fields{margin-top:16px}.operations-total-box{min-height:78px;padding:13px 15px;border:1px solid rgba(148,163,184,.2);border-radius:14px;background:rgba(148,163,184,.06);display:grid;gap:2px}.operations-total-box span,.operations-total-box small{color:var(--muted);font-size:11px}.operations-total-box strong{font-size:21px}.operations-section-title{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:20px 0 6px;padding-top:18px;border-top:1px solid rgba(148,163,184,.14)}.operations-section-title>div{display:grid;gap:3px}.operations-section-title small{color:var(--muted)}.operations-section-title>b{font-size:18px}.operations-mode-row{margin-top:10px}.operations-function-card{overflow:hidden}.gas-auto-summary{margin-top:12px}.gas-mini-table{display:grid;margin-top:12px;border:1px solid rgba(148,163,184,.14);border-radius:12px;overflow:hidden}.gas-mini-table>div{display:grid;grid-template-columns:minmax(160px,1.25fr) minmax(190px,1.15fr) minmax(110px,.7fr) minmax(80px,.5fr);gap:10px;align-items:center;padding:10px 11px;border-top:1px solid rgba(148,163,184,.1);font-size:11px}.gas-mini-table>div:first-child{border-top:0}.gas-mini-table span{display:grid;gap:2px}.gas-mini-table span>b{font-size:10px}.gas-mini-table small{color:var(--muted);font-size:9px;line-height:1.35}@media(max-width:900px){.operations-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){.operations-grid{grid-template-columns:1fr}.gas-mini-table>div{grid-template-columns:1fr 1fr}.gas-mini-table>div>span:first-child{grid-column:1/-1}.operations-mode-row{display:grid;grid-template-columns:1fr}.operations-mode-row button{width:100%}}
        `}</style>
      </section>
    </AppShell>
  );
}
