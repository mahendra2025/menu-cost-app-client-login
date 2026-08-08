'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell, { LockedCard } from '../../components/AppShell';
import StatCard from '../../components/StatCard';
import { calculate, getSession, loadWork, saveWork } from '../../../lib/store';
import type { Session, WorkState } from '../../../lib/types';
import {
  getCostingAnalyticsKey,
  trackProductEvent,
} from '../../../lib/productAnalytics';

function money(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export default function FinalCostingPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [work, setWork] = useState<WorkState | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    const current = getSession();
    setSession(current);
    if (current) setWork(loadWork(current.tenantId));
  }, []);

  useEffect(() => {
    if (
      !work ||
      !session ||
      session.status === 'EXPIRED' ||
      work.menu.length === 0
    ) {
      return;
    }

    const result =
      calculate(work);

    const missingRateCount =
      work.menu.filter(
        (item) =>
          !(
            Number(
              item.costPerPlate,
            ) > 0
          ),
      ).length;

    const finalReady =
      work.menu.length > 0 &&
      result.totalCovers > 0 &&
      missingRateCount === 0 &&
      work.sellingPricePerPlate > 0;

    const costingKey =
      getCostingAnalyticsKey(
        work,
      );

    void trackProductEvent(
      'final_costing_viewed',
      {
        costingKey,
        totalCovers:
          result.totalCovers,
      },
      {
        onceKey:
          `final_viewed:${costingKey}`,
      },
    );

    if (finalReady) {
      void trackProductEvent(
        'final_costing_complete',
        {
          costingKey,
          dishCount:
            work.menu.length,
          totalCovers:
            result.totalCovers,
          totalCost:
            Math.round(
              result.totalCost,
            ),
          totalSelling:
            Math.round(
              result.totalSelling,
            ),
          totalProfit:
            Math.round(
              result.totalProfit,
            ),
        },
        {
          onceKey:
            `final_complete:${costingKey}`,
        },
      );
    }
  }, [work, session]);

  if (!work || !session) {
    return <AppShell title="Final Costing"><div className="content-grid"><div className="glass-card">Loading...</div></div></AppShell>;
  }

  if (session.status === 'EXPIRED') {
    return <AppShell title="Final Costing"><LockedCard /></AppShell>;
  }

  const result = calculate(work);
  const missingRateCount = work.menu.filter(
    (item) => !(Number(item.costPerPlate) > 0),
  ).length;
  const finalCostReady =
    work.menu.length > 0 &&
    result.totalCovers > 0 &&
    missingRateCount === 0 &&
    work.sellingPricePerPlate > 0;
  const profitMargin =
    result.totalSelling > 0
      ? (result.totalProfit / result.totalSelling) * 100
      : 0;

  function updateSellingPrice(value: number) {
    if (!work || !session) return;
    const nextWork: WorkState = {
      ...work,
      sellingPricePerPlate: Math.max(0, value),
    };
    setWork(nextWork);
    saveWork(session.tenantId, nextWork);
  }

  async function downloadPdf() {
    if (!work || pdfBusy) return;

    setPdfBusy(true);

    try {
      const { downloadFinalCostingPdf } =
        await import(
          '../../../lib/finalCostingPdf'
        );

      let recipes: unknown[] = [];

      try {
        const response = await fetch(
          '/api/recipe-ingredients',
          {
            method: 'POST',
            cache: 'no-store',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              dishNames: work.menu.map(
                (item) => item.name,
              ),
            }),
          },
        );

        if (response.ok) {
          const data =
            await response.json() as {
              recipes?: unknown[];
            };

          recipes = Array.isArray(
            data.recipes,
          )
            ? data.recipes
            : [];
        }
      } catch (recipeError) {
        console.warn(
          'Ingredient list could not be loaded:',
          recipeError,
        );
      }

      downloadFinalCostingPdf(
        work,
        recipes,
      );

      const costingKey =
        getCostingAnalyticsKey(
          work,
        );

      void trackProductEvent(
        'pdf_exported',
        {
          costingKey,
          dishCount:
            work.menu.length,
        },
      );
    } finally {
      setPdfBusy(false);
    }
  }

  const costRows = [
    { label: 'Food cost', value: result.menuFoodTotal, route: '/app/cost' },
    { label: 'Manpower cost', value: work.extras.staff, route: '/app/manpower' },
    { label: 'Transport cost', value: work.extras.transport, route: '/app/extra-cost' },
    { label: 'Gas / fuel cost', value: work.extras.gasFuel, route: '/app/extra-cost' },
    { label: 'Disposable items', value: work.extras.disposable, route: '/app/extra-cost' },
    { label: 'Other extra cost', value: work.extras.other, route: '/app/extra-cost' },
  ];

  return (
    <AppShell
      title="Final Costing"
      subtitle="Step 5 of 6: set the selling price and review final profit"
    >
      <section className="content-grid">
        <div className={`final-costing-overview ${finalCostReady ? 'is-ready' : ''}`}>
          <div>
            <span className="page-eyebrow">Final price</span>
            <h2>{finalCostReady ? 'Final costing is complete' : 'Complete your final selling price'}</h2>
            <p>Review every event cost, set the selling price per cover and confirm the expected profit.</p>
          </div>
          <div className="final-costing-overview-total">
            <span>Total event cost</span>
            <b>{money(result.totalCost)}</b>
            <small>{result.totalCovers.toLocaleString('en-IN')} total covers</small>
          </div>
        </div>

        <div className="stat-grid">
          <StatCard label="Cost / Cover" value={money(result.finalCostPerPlate)} note={`Total ${money(result.totalCost)}`} />
          <StatCard label="Selling / Cover" value={money(result.sellingPricePerPlate)} note={`Total ${money(result.totalSelling)}`} />
          <StatCard label="Total Profit" value={money(result.totalProfit)} note={`${Math.round(profitMargin)}% margin`} />
          <StatCard label="Meal Covers" value={result.totalCovers.toLocaleString('en-IN')} note={`${result.serviceSummaries.length} meal${result.serviceSummaries.length === 1 ? '' : 's'}`} />
        </div>

        <div className="glass-card final-selling-card">
          <div className="final-costing-section-heading">
            <div>
              <span className="section-kicker">Selling price</span>
              <h2>Set the final rate</h2>
              <p>Enter the average selling price for each meal cover.</p>
            </div>
          </div>
          <div className="two-grid">
            <div className="field">
              <label htmlFor="sellingPricePerPlate">Average selling price / cover</label>
              <input
                id="sellingPricePerPlate"
                className="input input-large"
                type="number"
                min="0"
                inputMode="decimal"
                value={work.sellingPricePerPlate || ''}
                onChange={(event) => updateSellingPrice(Number(event.target.value))}
                placeholder="Example: 350"
              />
            </div>
            <div className="field">
              <label>Total selling amount</label>
              <input className="input input-large" readOnly value={money(result.totalSelling)} />
            </div>
          </div>
          <div className={`final-profit-strip ${result.totalProfit >= 0 ? 'is-positive' : 'is-negative'}`}>
            <div><span>Total cost</span><b>{money(result.totalCost)}</b></div>
            <div><span>Total selling</span><b>{money(result.totalSelling)}</b></div>
            <div><span>Expected profit</span><b>{money(result.totalProfit)}</b></div>
            <div><span>Profit margin</span><b>{Math.round(profitMargin)}%</b></div>
          </div>
        </div>

        <div className="glass-card">
          <div className="final-costing-section-heading">
            <div>
              <span className="section-kicker">Cost breakdown</span>
              <h2>Where the event cost comes from</h2>
              <p>Select Edit to return to the relevant costing step.</p>
            </div>
          </div>
          <div className="final-cost-breakdown">
            {costRows.map((row) => (
              <div key={row.label}>
                <span>{row.label}</span>
                <b>{money(row.value)}</b>
                <button type="button" onClick={() => router.push(row.route)}>Edit</button>
              </div>
            ))}
            <div className="final-cost-breakdown-total">
              <span>Total event cost</span>
              <b>{money(result.totalCost)}</b>
              <small>{money(result.finalCostPerPlate)} per cover</small>
            </div>
          </div>
        </div>

        {!finalCostReady ? (
          <div className="readiness-card" role="status">
            <div>
              <span className="section-kicker">Final costing checklist</span>
              <h3>Complete the missing details</h3>
            </div>
            <div className="readiness-list">
              <span className={work.menu.length > 0 ? 'is-complete' : ''}>Menu dishes</span>
              <span className={result.totalCovers > 0 ? 'is-complete' : ''}>Member counts</span>
              <span className={missingRateCount === 0 && work.menu.length > 0 ? 'is-complete' : ''}>Dish rates</span>
              <span className={work.sellingPricePerPlate > 0 ? 'is-complete' : ''}>Selling price</span>
            </div>
          </div>
        ) : (
          <div className="readiness-card is-ready" role="status">
            <div>
              <span className="section-kicker">Complete</span>
              <h3>Final costing is ready</h3>
            </div>
            <span className="badge green">All details complete</span>
          </div>
        )}

        <div className="action-row page-actions">
          <button className="secondary-button" type="button" onClick={downloadPdf} disabled={pdfBusy}>
            {pdfBusy ? 'Preparing PDF…' : 'Download Menu & Costing PDF'}
          </button>
          <button className="primary-button" type="button" onClick={() => router.push('/app/profile')}>Next: Profile</button>
          <button className="ghost-button" type="button" onClick={() => router.push('/app/cost')}>Back to Cost</button>
        </div>
      </section>
    </AppShell>
  );
}
