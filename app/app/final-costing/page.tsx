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

const PRICE_PRESETS = [10, 20, 30, 40];

function money(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
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
  }, [router]);

  const costing = useMemo(
    () => (work ? calculate(work) : null),
    [work],
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
    router.push('/app/quotation');
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
              Use Price → Quotation
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
              <h2>Food + gas + transport + disposable</h2>
              <p>These internal costs build the real event cost. The client quotation still uses the final selling rate.</p>
            </div>
          </div>

          <div className="final-cost-breakdown">
            <div>
              <span>Food cost</span>
              <b>{money(costing.menuFoodTotal)}</b>
              <button type="button" onClick={() => router.push('/app/cost')}>Review Food Cost</button>
            </div>
            <div>
              <span>LPG / gas</span>
              <b>{money(work.extras.gasFuel)}</b>
              <button type="button" onClick={() => router.push('/app/operations')}>Edit</button>
            </div>
            <div>
              <span>Transport</span>
              <b>{money(work.extras.transport)}</b>
              <button type="button" onClick={() => router.push('/app/operations')}>Edit</button>
            </div>
            <div>
              <span>Plastic / disposable</span>
              <b>{money(work.extras.disposable)}</b>
              <button type="button" onClick={() => router.push('/app/disposable')}>Edit</button>
            </div>
            <div className="final-cost-breakdown-total">
              <span>Total event cost</span>
              <b>{money(pricing.totalCost)}</b>
              <small>{money(pricing.costPerCover)} per cover</small>
            </div>
          </div>
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
            Use Price & Create Quotation
          </button>
          <button className="secondary-button" type="button" disabled={!priceReady} onClick={() => { savePrice(); }}>
            Save Selling Price
          </button>
          <button className="ghost-button" type="button" onClick={() => router.push('/app/disposable')}>
            Back to Plastic & Disposable
          </button>
        </div>

        <FinalCostingUsage tenantId={session.tenantId} work={work} />
      </section>
    </AppShell>
  );
}
