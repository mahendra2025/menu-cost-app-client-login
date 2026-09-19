'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import AppShell, { LockedCard } from '../../components/AppShell';
import FinalCostingUsage from '../../components/FinalCostingUsage';
import StatCard from '../../components/StatCard';
import {
  calculate,
  getSession,
  loadWork,
  saveWork,
} from '../../../lib/store';
import {
  calculateSellingPrice,
  type SellingPriceMode,
} from '../../../lib/sellingPrice';
import type { Session, WorkState } from '../../../lib/types';

import {
  calculateEventGas,
  defaultGasCostMaster,
  type GasCostMaster,
} from '../../../lib/gasCost';

const PRICE_PRESETS = [10, 20, 30, 40];

function money(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function money2(value: number) {
  return `₹${Math.max(0, Number(value) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function displayPercent(value: number) {
  return `${value.toFixed(1).replace(/\.0$/, '')}%`;
}

function removeUnusedOtherCost(work: WorkState): WorkState {
  if (!work.extras.other) return work;

  return {
    ...work,
    extras: {
      ...work.extras,
      other: 0,
    },
    updatedAt: new Date().toISOString(),
  };
}

export default function FinalCostingPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [work, setWork] = useState<WorkState | null>(null);
  const [mode, setMode] = useState<SellingPriceMode>('MARKUP');
  const [pricingPercent, setPricingPercent] = useState(20);
  const [manualPrice, setManualPrice] = useState(0);
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
  const [
    showGasDetails,
    setShowGasDetails,
  ] = useState(false);

  useEffect(() => {
    const current = getSession();

    if (!current) {
      router.replace('/login');
      return;
    }

    setSession(current);
    const savedWork = loadWork(current.tenantId);
    const cleanWork = removeUnusedOtherCost(savedWork);
    setWork(cleanWork);

    if (cleanWork !== savedWork) {
      saveWork(current.tenantId, cleanWork);
    }

    if (cleanWork.sellingPricePerPlate > 0) {
      setMode('MANUAL');
      setManualPrice(cleanWork.sellingPricePerPlate);
    }

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

  const costingWork =
    useMemo(
      () =>
        work
          ? {
              ...work,
              extras: {
                ...work.extras,
                gasFuel:
                  gasBreakdown?.totalGasCost ??
                  0,
              },
            }
          : null,
      [
        work,
        gasBreakdown,
      ],
    );

  const costing = useMemo(
    () =>
      costingWork
        ? calculate(
            costingWork,
          )
        : null,
    [costingWork],
  );

  const pricing = useMemo(
    () =>
      calculateSellingPrice({
        totalCost: costing?.totalCost ?? 0,
        totalCovers: costing?.totalCovers ?? 0,
        mode,
        percent: pricingPercent,
        manualPricePerCover: manualPrice,
      }),
    [costing, mode, pricingPercent, manualPrice],
  );

  if (!work || !session || !costing) {
    return (
      <AppShell title="Pricing">
        <div className="content-grid"><div className="glass-card">Loading pricing…</div></div>
      </AppShell>
    );
  }

  if (session.status === 'EXPIRED') {
    return (
      <AppShell title="Pricing"><LockedCard /></AppShell>
    );
  }

  const missingRateCount = work.menu.filter(
    (item) => !(Number(item.costPerPlate) > 0),
  ).length;
  const costReady =
    work.menu.length > 0 &&
    costing.totalCovers > 0 &&
    missingRateCount === 0;
  const priceReady = costReady && pricing.sellingPricePerCover > 0;

  function selectMode(nextMode: SellingPriceMode) {
    if (!work) return;

    setMode(nextMode);
    setMessage('');

    if (nextMode === 'MANUAL' && !(manualPrice > 0)) {
      setManualPrice(
        work.sellingPricePerPlate > 0
          ? work.sellingPricePerPlate
          : Math.ceil(pricing.costPerCover),
      );
    }
  }

  function savePrice(): WorkState | null {
    if (!work || !session || !priceReady) return null;

    const nextWork: WorkState = {
      ...work,
      extras: {
        ...work.extras,
        gasFuel:
          gasBreakdown?.totalGasCost ??
          0,
      },
      sellingPricePerPlate: pricing.sellingPricePerCover,
      updatedAt: new Date().toISOString(),
    };

    setWork(nextWork);
    saveWork(session.tenantId, nextWork);
    setMessage(`${money(pricing.sellingPricePerCover)} per cover saved.`);
    return nextWork;
  }

  function createQuotation() {
    const saved = savePrice();
    if (!saved) return;
    window.location.assign('/app/quotation?full=1');
  }

  return (
    <AppShell
      title="Pricing"
      subtitle="Set markup or target margin using the real event cost"
    >
      <section className="content-grid">
        <div className={`final-costing-overview ${priceReady ? 'is-ready' : ''}`}>
          <div>
            <span className="page-eyebrow">Selling price engine</span>
            <h2>{priceReady ? 'Your selling price is ready' : 'Finish cost details before pricing'}</h2>
            <p>
              Food, manpower, LPG, transport and plastic/disposable cost form the real event cost before markup or gross margin.
            </p>
          </div>
          <div className="final-costing-overview-total">
            <span>Total event cost</span>
            <b>{money(pricing.totalCost)}</b>
            <small>
              {pricing.totalCovers.toLocaleString('en-IN')} meal covers · {money(pricing.costPerCover)} cost / cover
            </small>
            <button
              className="primary-button workflow-overview-button"
              type="button"
              onClick={createQuotation}
              disabled={!priceReady}
            >
              Use Price → Full Event Quotation
            </button>
          </div>
        </div>

        <div className="stat-grid">
          <StatCard label="Cost / Cover" value={money(pricing.costPerCover)} note={`Total cost ${money(pricing.totalCost)}`} />
          <StatCard label="Selling / Cover" value={money(pricing.sellingPricePerCover)} note={`Quotation ${money(pricing.totalSelling)}`} />
          <StatCard label="Expected Profit" value={money(pricing.profit)} note={`${displayPercent(pricing.markupPercent)} markup`} />
          <StatCard label="Gross Margin" value={displayPercent(pricing.marginPercent)} note="Profit ÷ selling price" />
        </div>

        <div className="glass-card final-selling-card">
          <div className="final-costing-section-heading">
            <div>
              <span className="section-kicker">Pricing method</span>
              <h2>Choose how to set your selling price</h2>
              <p>Markup adds a percentage to cost. Gross margin targets profit as a percentage of final selling price.</p>
            </div>
          </div>

          <div className="action-row">
            <button type="button" className={mode === 'MARKUP' ? 'primary-button' : 'secondary-button'} onClick={() => selectMode('MARKUP')}>
              Markup on Cost
            </button>
            <button type="button" className={mode === 'MARGIN' ? 'primary-button' : 'secondary-button'} onClick={() => selectMode('MARGIN')}>
              Gross Margin
            </button>
            <button type="button" className={mode === 'MANUAL' ? 'primary-button' : 'secondary-button'} onClick={() => selectMode('MANUAL')}>
              Manual Rate
            </button>
          </div>

          {mode !== 'MANUAL' ? (
            <>
              <div className="action-row" style={{ marginTop: 16 }}>
                {PRICE_PRESETS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={pricingPercent === value ? 'primary-button' : 'ghost-button'}
                    onClick={() => {
                      setPricingPercent(value);
                      setMessage('');
                    }}
                  >
                    {value}%
                  </button>
                ))}
              </div>
              <div className="two-grid" style={{ marginTop: 16 }}>
                <div className="field">
                  <label htmlFor="pricingPercent">
                    {mode === 'MARKUP' ? 'Markup on cost' : 'Target gross margin'}
                  </label>
                  <input
                    id="pricingPercent"
                    className="input input-large"
                    type="number"
                    min="0"
                    max={mode === 'MARGIN' ? 95 : 500}
                    step="0.1"
                    value={pricingPercent}
                    onChange={(event) => {
                      const value = Math.max(0, Number(event.target.value) || 0);
                      setPricingPercent(mode === 'MARGIN' ? Math.min(95, value) : value);
                      setMessage('');
                    }}
                  />
                </div>
                <div className="field">
                  <label>Suggested selling price / cover</label>
                  <input className="input input-large" readOnly value={money(pricing.sellingPricePerCover)} />
                </div>
              </div>
            </>
          ) : (
            <div className="two-grid" style={{ marginTop: 16 }}>
              <div className="field">
                <label htmlFor="manualSellingPrice">Selling price / cover</label>
                <input
                  id="manualSellingPrice"
                  className="input input-large"
                  type="number"
                  min="0"
                  step="1"
                  value={manualPrice || ''}
                  onChange={(event) => {
                    setManualPrice(Math.max(0, Number(event.target.value) || 0));
                    setMessage('');
                  }}
                  placeholder="Example: 480"
                />
              </div>
              <div className="field">
                <label>Total quotation</label>
                <input className="input input-large" readOnly value={money(pricing.totalSelling)} />
              </div>
            </div>
          )}

          <div className={`final-profit-strip ${pricing.profit >= 0 ? 'is-positive' : 'is-negative'}`} style={{ marginTop: 18 }}>
            <div><span>Total cost</span><b>{money(pricing.totalCost)}</b></div>
            <div><span>Total quotation</span><b>{money(pricing.totalSelling)}</b></div>
            <div><span>Expected profit</span><b>{money(pricing.profit)}</b></div>
            <div><span>Gross margin</span><b>{displayPercent(pricing.marginPercent)}</b></div>
          </div>

          <p className="muted" style={{ marginTop: 12 }}>
            {mode === 'MARKUP'
              ? '20% markup means cost × 1.20. It is not the same as 20% gross margin.'
              : mode === 'MARGIN'
                ? '20% gross margin means profit is 20% of the final selling price.'
                : 'Manual rate lets you enter the final selling amount per cover directly.'}
          </p>

          {message ? <div className="admin-message" style={{ marginTop: 12 }}>{message}</div> : null}
        </div>

        <div className="glass-card">
          <div className="final-costing-section-heading">
            <div>
              <span className="section-kicker">Cost basis</span>
              <h2>Food + manpower + gas + transport + disposable</h2>
              <p>These internal costs build the real event cost. The client quotation still uses the final selling rate.</p>
            </div>
          </div>

          <div className="final-cost-breakdown">
            <div>
              <span>Food Cost</span>
              <b>{money(costing.menuFoodTotal)}</b>
              <button type="button" onClick={() => router.push('/app/cost')}>Review Food Cost</button>
            </div>
            <div>
              <span>Manpower Cost</span>
              <b>{money(work.extras.staff)}</b>
              <button type="button" onClick={() => router.push('/app/team')}>Edit</button>
            </div>
            <div>
              <span>Plastic / Disposable Cost</span>
              <b>{money(work.extras.disposable)}</b>
              <button type="button" onClick={() => router.push('/app/disposable')}>Edit</button>
            </div>
            <div>
              <span>Gas Cost</span>
              <b>{money(gasBreakdown?.totalGasCost || 0)}</b>
              <button
                type="button"
                onClick={() =>
                  setShowGasDetails(
                    (current) => !current,
                  )
                }
              >
                {showGasDetails ? 'Hide Details' : 'View Details'}
              </button>
            </div>
            <div>
              <span>Transport Cost</span>
              <b>{money(work.extras.transport)}</b>
              <button type="button" onClick={() => router.push('/app/operations')}>Edit</button>
            </div>
            <div className="final-cost-breakdown-total">
              <span>TOTAL COST</span>
              <b>{money(pricing.totalCost)}</b>
              <small>{money(pricing.costPerCover)} per cover</small>
            </div>
          </div>

          {showGasDetails && gasBreakdown ? (
            <div className="gas-pricing-details">
              <div className="gas-pricing-summary">
                <span>
                  LPG rate <b>{money2(gasBreakdown.lpgRatePerKg)} / kg</b>
                </span>
                <span>
                  LPG used <b>{gasBreakdown.totalGasKg.toFixed(2)} kg</b>
                </span>
                <span>
                  Gas cost <b>{money2(gasBreakdown.totalGasCost)}</b>
                </span>
              </div>

              {gasBreakdown.functionTotals.map(
                (group) => {
                  const rows =
                    gasBreakdown.rows.filter(
                      (row) =>
                        row.serviceKey ===
                        group.serviceKey,
                    );

                  const label =
                    [
                      group.dayLabel,
                      group.mealLabel,
                    ]
                      .filter(Boolean)
                      .join(' · ') ||
                    'Event Menu';

                  return (
                    <div
                      className="gas-pricing-function"
                      key={group.serviceKey}
                    >
                      <div className="gas-pricing-function-heading">
                        <div>
                          <b>{label}</b>
                          <small>{group.guests.toLocaleString('en-IN')} guests</small>
                        </div>
                        <div>
                          <b>{group.gasKg.toFixed(2)} kg</b>
                          <strong>{money2(group.gasCost)}</strong>
                        </div>
                      </div>

                      <div className="gas-pricing-table">
                        <div className="is-head">
                          <span>Dish</span>
                          <span>Category</span>
                          <span>Guests</span>
                          <span>LPG kg / 100</span>
                          <span>LPG Used</span>
                          <span>LPG Rate/kg</span>
                          <span>Gas Cost</span>
                        </div>

                        {rows.map(
                          (row) => (
                            <div key={row.key}>
                              <span>{row.dish}</span>
                              <span>{row.category}</span>
                              <span>{row.guests}</span>
                              <span>{row.gasKgPer100.toFixed(2)}</span>
                              <span>{row.gasKg.toFixed(2)} kg</span>
                              <span>{money2(row.lpgRatePerKg)}</span>
                              <b>{money2(row.gasCost)}</b>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  );
                },
              )}

              <div className="gas-pricing-event-total">
                <span>Event Gas Total</span>
                <b>{gasBreakdown.totalGasKg.toFixed(2)} kg</b>
                <strong>{money2(gasBreakdown.totalGasCost)}</strong>
              </div>
            </div>
          ) : null}

          {gasMasterWarning ? (
            <div className="admin-message error" style={{ marginTop: 12 }}>
              {gasMasterWarning}
            </div>
          ) : null}
        </div>

        {!costReady ? (
          <div className="readiness-card" role="status">
            <div><span className="section-kicker">Pricing checklist</span><h3>Complete the missing cost details</h3></div>
            <div className="readiness-list">
              <span className={work.menu.length > 0 ? 'is-complete' : ''}>Menu dishes</span>
              <span className={costing.totalCovers > 0 ? 'is-complete' : ''}>Guest counts</span>
              <span className={missingRateCount === 0 && work.menu.length > 0 ? 'is-complete' : ''}>Dish costs</span>
            </div>
          </div>
        ) : pricing.profit < 0 ? (
          <div className="readiness-card" role="status">
            <div><span className="section-kicker">Price warning</span><h3>Selling price is below event cost</h3></div>
            <span className="badge">Loss {money(Math.abs(pricing.profit))}</span>
          </div>
        ) : (
          <div className="readiness-card is-ready" role="status">
            <div><span className="section-kicker">Ready</span><h3>Pricing is ready for quotation</h3></div>
            <span className="badge green">{money(pricing.sellingPricePerCover)} / cover</span>
          </div>
        )}

        <div className="action-row page-actions">
          <button className="primary-button" type="button" disabled={!priceReady} onClick={createQuotation}>
            Use Price & Create Full Event Quotation
          </button>
          <button className="secondary-button" type="button" disabled={!priceReady} onClick={() => { savePrice(); }}>
            Save Selling Price
          </button>
          <button className="ghost-button" type="button" onClick={() => router.push('/app/disposable')}>
            Back to Plastic & Disposable
          </button>
        </div>

        <FinalCostingUsage tenantId={session.tenantId} work={costingWork || work} />

        <style>{`
          .gas-pricing-details{display:grid;gap:16px;margin-top:18px;padding-top:18px;border-top:1px solid rgba(148,163,184,.16)}
          .gas-pricing-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
          .gas-pricing-summary>span,.gas-pricing-event-total{padding:10px 12px;border:1px solid rgba(148,163,184,.14);border-radius:12px;background:rgba(148,163,184,.05);font-size:11px}
          .gas-pricing-summary b{display:block;margin-top:3px;font-size:15px}
          .gas-pricing-function{display:grid;gap:9px}
          .gas-pricing-function-heading{display:flex;align-items:end;justify-content:space-between;gap:12px}
          .gas-pricing-function-heading>div{display:grid;gap:2px}.gas-pricing-function-heading small{color:var(--muted)}
          .gas-pricing-function-heading>div:last-child{text-align:right}.gas-pricing-function-heading strong{font-size:14px}
          .gas-pricing-table{overflow-x:auto;border:1px solid rgba(148,163,184,.14);border-radius:12px}
          .gas-pricing-table>div{display:grid;grid-template-columns:minmax(150px,1.4fr) minmax(100px,.9fr) 70px 90px 90px 95px 90px;gap:9px;align-items:center;min-width:780px;padding:8px 10px;border-top:1px solid rgba(148,163,184,.1);font-size:10px}
          .gas-pricing-table>div:first-child{border-top:0}.gas-pricing-table .is-head{background:rgba(148,163,184,.08);font-weight:800;color:var(--muted)}
          .gas-pricing-event-total{display:grid;grid-template-columns:1fr auto auto;gap:14px;align-items:center}.gas-pricing-event-total strong{font-size:17px}
          @media(max-width:650px){.gas-pricing-summary{grid-template-columns:1fr}.gas-pricing-function-heading{align-items:flex-start;flex-direction:column}.gas-pricing-function-heading>div:last-child{text-align:left}.gas-pricing-event-total{grid-template-columns:1fr auto}.gas-pricing-event-total strong{grid-column:1/-1}}
        `}</style>
      </section>
    </AppShell>
  );
}
