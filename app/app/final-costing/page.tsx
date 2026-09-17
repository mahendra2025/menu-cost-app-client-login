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
  getCostingAnalyticsKey,
  trackProductEvent,
} from '../../../lib/productAnalytics';

const PRICE_PRESETS = [10, 20, 30, 40];

function money(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function percent(value: number) {
  return `${value.toFixed(1).replace(/\.0$/, '')}%`;
}

function removeLegacyExtraCosts(work: WorkState): WorkState {
  if (
    !work.extras.transport &&
    !work.extras.gasFuel &&
    !work.extras.disposable &&
    !work.extras.other
  ) {
    return work;
  }

  return {
    ...work,
    extras: {
      ...work.extras,
      transport: 0,
      gasFuel: 0,
      disposable: 0,
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
  const [savedMessage, setSavedMessage] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    const current = getSession();
    setSession(current);

    if (!current) {
      router.replace('/login');
      return;
    }

    const savedWork = loadWork(current.tenantId);
    const cleanWork = removeLegacyExtraCosts(savedWork);
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

  const pricing = useMemo(() => {
    if (!costing) {
      return calculateSellingPrice({
        totalCost: 0,
        totalCovers: 0,
        mode,
        percent: pricingPercent,
        manualPricePerCover: manualPrice,
      });
    }

    return calculateSellingPrice({
      totalCost: costing.totalCost,
      totalCovers: costing.totalCovers,
      mode,
      percent: pricingPercent,
      manualPricePerCover: manualPrice,
    });
  }, [costing, mode, pricingPercent, manualPrice]);

  useEffect(() => {
    if (
      !work ||
      !session ||
      session.status === 'EXPIRED' ||
      work.menu.length === 0 ||
      !costing
    ) {
      return;
    }

    const costingKey = getCostingAnalyticsKey(work);

    void trackProductEvent(
      'final_costing_viewed',
      {
        costingKey,
        totalCovers: costing.totalCovers,
      },
      { onceKey: `final_viewed:${costingKey}` },
    );
  }, [work, session, costing]);

  if (!work || !session || !costing) {
    return (
      <AppShell title="Pricing">
        <div className="content-grid">
          <div className="glass-card">Loading pricing…</div>
        </div>
      </AppShell>
    );
  }

  if (session.status === 'EXPIRED') {
    return (
      <AppShell title="Pricing">
        <LockedCard />
      </AppShell>
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
    setMode(nextMode);
    setSavedMessage('');

    if (nextMode === 'MANUAL' && !(manualPrice > 0)) {
      setManualPrice(
        work.sellingPricePerPlate > 0
          ? work.sellingPricePerPlate
          : Math.ceil(pricing.costPerCover),
      );
    }
  }

  function workWithPrice(): WorkState {
    return {
      ...work,
      sellingPricePerPlate: pricing.sellingPricePerCover,
      updatedAt: new Date().toISOString(),
    };
  }

  function savePrice() {
    if (!priceReady) return null;

    const nextWork = workWithPrice();
    setWork(nextWork);
    saveWork(session.tenantId, nextWork);
    setSavedMessage(
      `${money(pricing.sellingPricePerCover)} per cover saved.`,
    );

    const costingKey = getCostingAnalyticsKey(nextWork);
    void trackProductEvent('final_costing_complete', {
      costingKey,
      totalCovers: pricing.totalCovers,
      totalCost: Math.round(pricing.totalCost),
      totalSelling: Math.round(pricing.totalSelling),
      totalProfit: Math.round(pricing.profit),
    });

    return nextWork;
  }

  function createQuotation() {
    const nextWork = savePrice();
    if (!nextWork) return;
    router.push('/app/quotation');
  }

  async function downloadPdf() {
    if (!priceReady || pdfBusy) return;

    const nextWork = savePrice();
    if (!nextWork) return;

    setPdfBusy(true);

    try {
      const { downloadFinalCostingPdf } = await import(
        '../../../lib/finalCostingPdf'
      );

      let recipes: unknown[] = [];

      try {
        const response = await fetch('/api/recipe-ingredients', {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dishNames: nextWork.menu.map((item) => item.name),
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as { recipes?: unknown[] };
          recipes = Array.isArray(data.recipes) ? data.recipes : [];
        }
      } catch (recipeError) {
        console.warn('Ingredient list could not be loaded:', recipeError);
      }

      downloadFinalCostingPdf(nextWork, recipes);

      void trackProductEvent('pdf_exported', {
        costingKey: getCostingAnalyticsKey(nextWork),
        dishCount: nextWork.menu.length,
      });
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <AppShell
      title="Pricing"
      subtitle="Set markup or target margin, then create the client quotation"
    >
      <section className="content-grid">
        <div className={`final-costing-overview ${priceReady ? 'is-ready' : ''}`}>
          <div>
            <span className="page-eyebrow">Selling price engine</span>
            <h2>
              {priceReady
                ? 'Your selling price is ready'
                : 'Finish cost details before pricing'}
            </h2>
            <p>
              Food/ingredient cost and manpower form the event cost. Choose how much to add before sending the quotation.
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
          <StatCard
            label="Cost / Cover"
            value={money(pricing.costPerCover)}
            note={`Total cost ${money(pricing.totalCost)}`}
          />
          <StatCard
            label="Selling / Cover"
            value={money(pricing.sellingPricePerCover)}
            note={`Quotation ${money(pricing.totalSelling)}`}
          />
          <StatCard
            label="Expected Profit"
            value={money(pricing.profit)}
            note={`${percent(pricing.markupPercent)} markup`}
          />
          <StatCard
            label="Gross Margin"
            value={percent(pricing.marginPercent)}
            note="Profit ÷ selling price"
          />
        </div>

        <div className="glass-card final-selling-card">
          <div className="final-costing-section-heading">
            <div>
              <span className="section-kicker">Pricing method</span>
              <h2>How do you want to set the price?</h2>
              <p>
                Markup adds a percentage to cost. Gross margin targets profit as a percentage of the final selling price.
              </p>
            </div>
          </div>

          <div className="action-row">
            <button
              type="button"
              className={mode === 'MARKUP' ? 'primary-button' : 'secondary-button'}
              aria-pressed={mode === 'MARKUP'}
              onClick={() => selectMode('MARKUP')}
            >
              Markup on Cost
            </button>
            <button
              type="button"
              className={mode === 'MARGIN' ? 'primary-button' : 'secondary-button'}
              aria-pressed={mode === 'MARGIN'}
              onClick={() => selectMode('MARGIN')}
            >
              Gross Margin
            </button>
            <button
              type="button"
              className={mode === 'MANUAL' ? 'primary-button' : 'secondary-button'}
              aria-pressed={mode === 'MANUAL'}
              onClick={() => selectMode('MANUAL')}
            >
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
                    className={
                      pricingPercent === value
                        ? 'primary-button'
                        : 'ghost-button'
                    }
                    onClick={() => {
                      setPricingPercent(value);
                      setSavedMessage('');
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
                    inputMode="decimal"
                    value={pricingPercent}
                    onChange={(event) => {
                      const value = Math.max(0, Number(event.target.value) || 0);
                      setPricingPercent(
                        mode === 'MARGIN' ? Math.min(95, value) : value,
                      );
                      setSavedMessage('');
                    }}
                  />
                </div>

                <div className="field">
                  <label>Suggested selling price / cover</label>
                  <input
                    className="input input-large"
                    readOnly
                    value={money(pricing.sellingPricePerCover)}
                  />
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
                  inputMode="decimal"
                  value={manualPrice || ''}
                  onChange={(event) => {
                    setManualPrice(Math.max(0, Number(event.target.value) || 0));
                    setSavedMessage('');
                  }}
                  placeholder="Example: 480"
                />
              </div>

              <div className="field">
                <label>Total quotation</label>
                <input
                  className="input input-large"
                  readOnly
                  value={money(pricing.totalSelling)}
                />
              </div>
            </div>
          )}

          <div
            className={`final-profit-strip ${pricing.profit >= 0 ? 'is-positive' : 'is-negative'}`}
            style={{ marginTop: 18 }}
          >
            <div>
              <span>Total cost</span>
              <b>{money(pricing.totalCost)}</b>
            </div>
            <div>
              <span>Total quotation</span>
              <b>{money(pricing.totalSelling)}</b>
            </div>
            <div>
              <span>Expected profit</span>
              <b>{money(pricing.profit)}</b>
            </div>
            <div>
              <span>Gross margin</span>
              <b>{percent(pricing.marginPercent)}</b>
            </div>
          </div>

          {mode === 'MARKUP' ? (
            <p className="muted" style={{ marginTop: 12 }}>
              Example: 20% markup means cost × 1.20. It is not the same as 20% gross margin.
            </p>
          ) : mode === 'MARGIN' ? (
            <p className="muted" style={{ marginTop: 12 }}>
              Example: 20% gross margin means profit is 20% of the final selling price.
            </p>
          ) : null}

          {savedMessage ? (
            <div className="admin-message" style={{ marginTop: 12 }}>
              {savedMessage}
            </div>
          ) : null}
        </div>

        <div className="glass-card">
          <div className="final-costing-section-heading">
            <div>
              <span className="section-kicker">Cost basis</span>
              <h2>What your selling price is built on</h2>
              <p>Only food/ingredient cost and manpower are included in the current event cost.</p>
            </div>
          </div>

          <div className="final-cost-breakdown">
            <div>
              <span>Food / ingredient cost</span>
              <b>{money(costing.menuFoodTotal)}</b>
              <button type="button" onClick={() => router.push('/app/grocery')}>
                Review Grocery
              </button>
            </div>
            <div>
              <span>Manpower cost</span>
              <b>{money(work.extras.staff)}</b>
              <button
                type="button"
                onClick={() => router.push('/app/manpower?afterGrocery=1')}
              >
                Edit
              </button>
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
            <div>
              <span className="section-kicker">Pricing checklist</span>
              <h3>Complete the missing cost details</h3>
            </div>
            <div className="readiness-list">
              <span className={work.menu.length > 0 ? 'is-complete' : ''}>
                Menu dishes
              </span>
              <span className={costing.totalCovers > 0 ? 'is-complete' : ''}>
                Guest counts
              </span>
              <span
                className={
                  missingRateCount === 0 && work.menu.length > 0
                    ? 'is-complete'
                    : ''
                }
              >
                Dish costs
              </span>
            </div>
          </div>
        ) : pricing.profit < 0 ? (
          <div className="readiness-card" role="status">
            <div>
              <span className="section-kicker">Price warning</span>
              <h3>Selling price is below event cost</h3>
            </div>
            <span className="badge">Loss {money(Math.abs(pricing.profit))}</span>
          </div>
        ) : (
          <div className="readiness-card is-ready" role="status">
            <div>
              <span className="section-kicker">Ready</span>
              <h3>Pricing is ready for quotation</h3>
            </div>
            <span className="badge green">
              {money(pricing.sellingPricePerCover)} / cover
            </span>
          </div>
        )}

        <div className="action-row page-actions">
          <button
            className="primary-button"
            type="button"
            disabled={!priceReady}
            onClick={createQuotation}
          >
            Use Price & Create Quotation
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={!priceReady}
            onClick={() => savePrice()}
          >
            Save Selling Price
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={!priceReady || pdfBusy}
            onClick={() => void downloadPdf()}
          >
            {pdfBusy ? 'Preparing PDF…' : 'Download Costing PDF'}
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={() => router.push('/app/manpower?afterGrocery=1')}
          >
            Back to Manpower
          </button>
        </div>

        <FinalCostingUsage tenantId={session.tenantId} work={work} />
      </section>
    </AppShell>
  );
}
