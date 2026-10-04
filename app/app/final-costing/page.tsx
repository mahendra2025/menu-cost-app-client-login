'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import AppShell, { LockedCard } from '../../components/AppShell';
import FinalCostingUsage from '../../components/FinalCostingUsage';
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
import { assessCostingHealth } from '../../../lib/costingHealth';
import {
  buildFunctionGroceryPlan,
  type FunctionGroceryPlan,
  type GroceryIngredientRate,
  type GroceryRecipe,
} from '../../../lib/functionGrocery';

type FinalPlanningRow = {
  kind:
    | 'MENU'
    | 'MANPOWER'
    | 'DRESS'
    | 'GROCERY'
    | 'DISPOSABLE'
    | 'EQUIPMENT'
    | 'CROCKERY'
    | 'TRANSPORT';
  quantity: number;
  rate: number;
};

type FinalPlanningPlan =
  Record<string, FinalPlanningRow[]>;

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
    groceryPlan,
    setGroceryPlan,
  ] = useState<FunctionGroceryPlan | null>(null);
  const [
    groceryAuditLoading,
    setGroceryAuditLoading,
  ] = useState(false);
  const [
    groceryAuditWarning,
    setGroceryAuditWarning,
  ] = useState('');
  const [
    planningPlan,
    setPlanningPlan,
  ] = useState<FinalPlanningPlan>({});
  const [
    planningAuditLoading,
    setPlanningAuditLoading,
  ] = useState(false);
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

    const dishNames =
      Array.from(
        new Set(
          cleanWork.menu
            .filter(
              (item) =>
                item.coverageStatus !==
                'REJECTED',
            )
            .map(
              (item) =>
                item.name,
            )
            .filter(Boolean),
        ),
      );

    setGroceryAuditLoading(true);
    void Promise.all([
      fetch(
        '/api/recipe-ingredients',
        {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'Content-Type':
              'application/json',
          },
          body:
            JSON.stringify({
              dishNames,
            }),
        },
      ),
      fetch(
        `/api/client/ingredients?city=${encodeURIComponent(
          cleanWork.event.city ||
            cleanWork.profile.city ||
            '',
        )}`,
        {
          cache: 'no-store',
        },
      ),
    ])
      .then(
        async ([
          recipeResponse,
          rateResponse,
        ]) => {
          const [
            recipeData,
            rateData,
          ] =
            await Promise.all([
              recipeResponse.json(),
              rateResponse.json(),
            ]);

          if (
            !recipeResponse.ok ||
            !rateResponse.ok
          ) {
            throw new Error(
              'Could not load Grocery audit.',
            );
          }

          setGroceryPlan(
            buildFunctionGroceryPlan(
              cleanWork,
              Array.isArray(
                recipeData.recipes,
              )
                ? recipeData.recipes as
                    GroceryRecipe[]
                : [],
              Array.isArray(
                rateData.rates,
              )
                ? rateData.rates as
                    GroceryIngredientRate[]
                : [],
            ),
          );
          setGroceryAuditWarning('');
        },
      )
      .catch(() => {
        setGroceryPlan(null);
        setGroceryAuditWarning(
          'Grocery audit could not be loaded.',
        );
      })
      .finally(() => {
        setGroceryAuditLoading(false);
      });

    if (cleanWork.costingId) {
      setPlanningAuditLoading(true);
      void fetch(
        `/api/client/event-planning?costingId=${encodeURIComponent(
          cleanWork.costingId,
        )}`,
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
                  'Could not load Event Planning.',
              );
            }

            setPlanningPlan(
              data.plan &&
              typeof data.plan ===
                'object' &&
              !Array.isArray(
                data.plan,
              )
                ? data.plan as
                    FinalPlanningPlan
                : {},
            );
          },
        )
        .catch(() => {
          setPlanningPlan({});
        })
        .finally(() => {
          setPlanningAuditLoading(false);
        });
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

  const costingHealth = useMemo(
    () =>
      work
        ? assessCostingHealth(work, {
            totalCovers: costing?.totalCovers ?? 0,
            sellingPricePerCover: pricing.sellingPricePerCover,
          })
        : null,
    [work, costing?.totalCovers, pricing.sellingPricePerCover],
  );

  if (!work || !session || !costing) {
    return (
      <AppShell title="Final Cost" subtitle="Review the real event cost and set the selling price">
        <div className="content-grid"><div className="glass-card">Loading pricing…</div></div>
      </AppShell>
    );
  }

  if (session.status === 'EXPIRED') {
    return (
      <AppShell title="Final Cost"><LockedCard /></AppShell>
    );
  }

  const costReady =
    work.menu.length > 0 &&
    costing.totalCovers > 0 &&
    Boolean(costingHealth?.canPrice);
  const priceReady = costReady && pricing.sellingPricePerCover > 0;

  const profitPerCover =
    pricing.totalCovers > 0
      ? pricing.profit /
        pricing.totalCovers
      : 0;

  const activeCostItems = [
    costing.menuFoodTotal,
    work.extras.staff,
    gasBreakdown?.totalGasCost || 0,
    work.extras.transport,
    work.extras.disposable,
  ].filter(
    (value) =>
      Number(value) > 0,
  ).length;


  const breakEvenPricePerCover =
    Math.ceil(
      Math.max(
        0,
        pricing.costPerCover,
      ),
    );

  const groceryIngredientCost =
    groceryPlan
      ?.combinedIngredientCost ||
    0;

  const groceryIngredientCount =
    (
      groceryPlan?.pricedIngredientCount ||
      0
    ) +
    (
      groceryPlan?.unpricedIngredientCount ||
      0
    );

  const groceryRateCoveragePercent =
    groceryIngredientCount > 0
      ? Math.round(
          (
            (
              groceryPlan?.pricedIngredientCount ||
              0
            ) /
            groceryIngredientCount
          ) *
            100,
        )
      : 0;

  const planningRows =
    Object.values(
      planningPlan,
    ).flat();

  const equipmentRows =
    planningRows.filter(
      (row) =>
        row.kind ===
        'EQUIPMENT',
    );

  const crockeryRows =
    planningRows.filter(
      (row) =>
        row.kind ===
        'CROCKERY',
    );

  const equipmentPlannedCost =
    equipmentRows.reduce(
      (sum, row) =>
        sum +
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
          ),
      0,
    );

  const crockeryPlannedCost =
    crockeryRows.reduce(
      (sum, row) =>
        sum +
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
          ),
      0,
    );

  const costingIssueCodes =
    new Set(
      costingHealth?.issues.map(
        (issue) =>
          issue.code,
      ) || [],
    );

  const activeManpowerPeople =
    work.manpower.reduce(
      (sum, row) =>
        sum +
        Math.max(
          0,
          Number(
            row.quantity,
          ) || 0,
        ),
      0,
    );

  const gasRows =
    gasBreakdown?.rows || [];

  const gasResolved =
    gasRows.length === 0 ||
    (gasBreakdown?.totalGasCost || 0) > 0 ||
    gasRows.every(
      (row) =>
        [
          'NO_GAS_CATEGORY',
          'DISH_NO_GAS',
        ].includes(
          row.source,
        ),
    );

  const finalReadinessChecks = [
    work.menu.length > 0 &&
      costing.totalCovers > 0,
    Boolean(
      costingHealth?.canPrice,
    ),
    !groceryAuditLoading &&
      Boolean(groceryPlan) &&
      (groceryPlan?.unmatchedDishes.length || 0) === 0 &&
      (groceryPlan?.unpricedIngredientCount || 0) === 0,
    activeManpowerPeople === 0 ||
      work.extras.staff > 0,
    gasResolved,
    !costingIssueCodes.has(
      'TRANSPORT_RATE_MISSING',
    ),
    !costingIssueCodes.has(
      'ZERO_DISPOSABLE_RATE',
    ),
  ];

  const finalCostReadinessPercent =
    Math.round(
      (
        finalReadinessChecks.filter(
          Boolean,
        ).length /
        finalReadinessChecks.length
      ) *
        100,
    );

  const functionCostRows =
    costing.serviceSummaries.map(
      (service) => {
        const coverShare =
          costing.totalCovers > 0
            ? service.pax /
              costing.totalCovers
            : 0;

        const allocatedExtras =
          costing.extrasTotal *
          coverShare;

        const allocatedTotal =
          service.totalCost +
          allocatedExtras;

        return {
          ...service,
          allocatedExtras,
          allocatedTotal,
          allocatedCostPerCover:
            service.pax > 0
              ? allocatedTotal /
                service.pax
              : 0,
        };
      },
    );

  async function downloadInternalCostingPdf() {
    const currentWork = work;

    if (!currentWork) {
      return;
    }

    const [
      pdfModule,
      groceryModule,
    ] =
      await Promise.all([
        import(
          '../../../lib/internalEventCostingPdf'
        ),
        import(
          '../../../lib/functionGrocery'
        ),
      ]);

    let groceryPlan = null;

    try {
      const dishNames =
        Array.from(
          new Set(
            currentWork.menu
              .filter(
                (item) =>
                  item.coverageStatus !==
                  'REJECTED',
              )
              .map(
                (item) =>
                  item.name,
              )
              .filter(Boolean),
          ),
        );

      const [
        recipeResponse,
        rateResponse,
      ] =
        await Promise.all([
          fetch(
            '/api/recipe-ingredients',
            {
              method:
                'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body:
                JSON.stringify({
                  dishNames,
                }),
            },
          ),
          fetch(
            `/api/client/ingredients?city=${encodeURIComponent(
              currentWork.event.city ||
                currentWork.profile.city ||
                '',
            )}`,
            {
              cache:
                'no-store',
            },
          ),
        ]);

      const [
        recipeData,
        rateData,
      ] =
        await Promise.all([
          recipeResponse.json(),
          rateResponse.json(),
        ]);

      if (
        recipeResponse.ok &&
        rateResponse.ok
      ) {
        groceryPlan =
          groceryModule.buildFunctionGroceryPlan(
            currentWork,
            Array.isArray(
              recipeData.recipes,
            )
              ? recipeData.recipes
              : [],
            Array.isArray(
              rateData.rates,
            )
              ? rateData.rates
              : [],
          );
      }
    } catch {
      // PDF still downloads with the saved costing data if grocery APIs are unavailable.
    }

    pdfModule.downloadInternalEventCostingPdf(
      currentWork,
      groceryPlan,
      gasBreakdown,
    );
  }

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
      title="Final Cost"
      subtitle="See the real cost per cover, set selling price and move to quotation"
      hidePageTitle
    >
      <section className="content-grid final-cost-page-modern">
        <div className="final-cost-command-overview">
          <div className="final-cost-command-copy">
            <span className="page-eyebrow">
              Pricing & profit command center
            </span>
            <h2>
              What does this event really cost, what should you charge, and what will you earn?
            </h2>
            <p>
              Official event cost combines food, manpower, LPG, transport and disposable. Grocery, equipment and crockery are shown as audit/planning signals so they are not double-counted.
            </p>

            <div className="final-cost-command-kpis">
              <article>
                <span>Real event cost</span>
                <b>{money(pricing.totalCost)}</b>
                <small>{activeCostItems} active cost groups</small>
              </article>

              <article>
                <span>Cost / cover</span>
                <b>{money(pricing.costPerCover)}</b>
                <small>{pricing.totalCovers.toLocaleString('en-IN')} covers</small>
              </article>

              <article>
                <span>Break-even / cover</span>
                <b>{money(breakEvenPricePerCover)}</b>
                <small>Rounded minimum rate</small>
              </article>

              <article className={pricing.profit >= 0 ? 'ready' : 'attention'}>
                <span>Expected profit</span>
                <b>{money(pricing.profit)}</b>
                <small>{money(profitPerCover)} / cover</small>
              </article>

              <article className={pricing.marginPercent >= 0 ? 'ready' : 'attention'}>
                <span>Gross margin</span>
                <b>{displayPercent(pricing.marginPercent)}</b>
                <small>{displayPercent(pricing.markupPercent)} markup</small>
              </article>
            </div>
          </div>

          <aside className="final-cost-command-side">
            <div
              className="final-cost-readiness-ring"
              style={{
                background:
                  `conic-gradient(${finalCostReadinessPercent === 100 ? '#55d98f' : '#4a9cff'} ${finalCostReadinessPercent * 3.6}deg, #25303d 0deg)`,
              }}
              aria-label={`Final cost readiness ${finalCostReadinessPercent}%`}
            >
              <span>
                <b>{finalCostReadinessPercent}%</b>
                <small>Ready</small>
              </span>
            </div>

            <div className="final-cost-command-price">
              <span>Selling price / cover</span>
              <b>{money(pricing.sellingPricePerCover)}</b>
              <small>
                {priceReady
                  ? `${money(pricing.totalSelling)} quotation · ${displayPercent(pricing.marginPercent)} margin`
                  : 'Complete blockers, then set the selling rate.'}
              </small>
              <button
                className="primary-button"
                type="button"
                onClick={createQuotation}
                disabled={!priceReady}
              >
                Create Quotation
              </button>
            </div>
          </aside>
        </div>

        <section className="final-cost-readiness-strip no-print">
          <article className={work.menu.length > 0 && costing.totalCovers > 0 ? 'ready' : 'attention'}>
            <span>Menu & covers</span>
            <b>{work.menu.length > 0 && costing.totalCovers > 0 ? 'Ready' : 'Missing'}</b>
            <small>{work.menu.length} dishes · {costing.totalCovers.toLocaleString('en-IN')} covers</small>
          </article>

          <article className={costingHealth?.canPrice ? 'ready' : 'attention'}>
            <span>Cost blockers</span>
            <b>{costingHealth?.blockerCount || 0}</b>
            <small>{costingHealth?.warningCount || 0} warnings</small>
          </article>

          <article className={groceryPlan && groceryRateCoveragePercent === 100 && groceryPlan.unmatchedDishes.length === 0 ? 'ready' : 'attention'}>
            <span>Grocery audit</span>
            <b>
              {groceryAuditLoading
                ? 'Loading'
                : groceryPlan
                  ? `${groceryRateCoveragePercent}%`
                  : 'Unavailable'}
            </b>
            <small>
              {groceryPlan
                ? `${groceryPlan.unmatchedDishes.length} missing recipe · ${groceryPlan.unpricedIngredientCount} missing rate`
                : groceryAuditWarning || 'No grocery audit'}
            </small>
          </article>

          <article className={activeManpowerPeople === 0 || work.extras.staff > 0 ? 'ready' : 'attention'}>
            <span>Manpower</span>
            <b>{money(work.extras.staff)}</b>
            <small>{activeManpowerPeople} people planned</small>
          </article>

          <article className={gasResolved ? 'ready' : 'attention'}>
            <span>LPG</span>
            <b>{money(gasBreakdown?.totalGasCost || 0)}</b>
            <small>{(gasBreakdown?.totalGasKg || 0).toFixed(2)} kg LPG</small>
          </article>

          <article className={!costingIssueCodes.has('TRANSPORT_RATE_MISSING') ? 'ready' : 'attention'}>
            <span>Transport</span>
            <b>{money(work.extras.transport)}</b>
            <small>{costingIssueCodes.has('TRANSPORT_NOT_SET') ? 'Confirm ₹0 transport' : 'Cost checked'}</small>
          </article>

          <article className={!costingIssueCodes.has('ZERO_DISPOSABLE_RATE') ? 'ready' : 'attention'}>
            <span>Disposable</span>
            <b>{money(work.extras.disposable)}</b>
            <small>{costingIssueCodes.has('ZERO_DISPOSABLE_RATE') ? 'Missing item rates' : 'Cost checked'}</small>
          </article>
        </section>

        <section
          className={
            `final-cost-profit-signal ${!costReady ? 'is-blocked' : pricing.profit < 0 ? 'is-loss' : 'is-profit'}`
          }
          role="status"
        >
          <div>
            <span>
              {!costReady
                ? 'Pricing blocked'
                : pricing.profit < 0
                  ? 'Current price is below cost'
                  : 'Current pricing result'}
            </span>
            <b>
              {!costReady
                ? `${costingHealth?.blockerCount || 0} blocker${(costingHealth?.blockerCount || 0) === 1 ? '' : 's'} must be fixed`
                : pricing.profit < 0
                  ? `Loss ${money(Math.abs(pricing.profit))}`
                  : `Profit ${money(pricing.profit)}`}
            </b>
            <small>
              {!costReady
                ? 'Complete missing cost inputs before setting the final client rate.'
                : `${money(profitPerCover)} profit / cover · ${displayPercent(pricing.marginPercent)} gross margin`}
            </small>
          </div>

          <div className="final-cost-profit-signal-rate">
            <span>Sell / cover</span>
            <b>{money(pricing.sellingPricePerCover)}</b>
            <small>Break-even {money(breakEvenPricePerCover)}</small>
          </div>
        </section>

        <nav
          className="final-cost-workflow-bar no-print"
          aria-label="Final costing workflow"
        >
          <button
            type="button"
            onClick={() =>
              router.push(
                '/app/operations',
              )
            }
          >
            <span>01</span>
            <b>Operations</b>
            <small>Gas & transport</small>
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                '/app/disposable',
              )
            }
          >
            <span>02</span>
            <b>Disposable</b>
            <small>Plastic & supplies</small>
          </button>

          <button
            type="button"
            className="is-active"
          >
            <span>03</span>
            <b>Final Cost</b>
            <small>Price & profit</small>
          </button>

          <button
            type="button"
            className={priceReady ? 'is-ready' : ''}
            disabled={!priceReady}
            onClick={createQuotation}
          >
            <span>04</span>
            <b>Quotation</b>
            <small>
              {priceReady
                ? 'Create client quote'
                : 'Complete blockers'}
            </small>
          </button>
        </nav>

        {costingHealth ? (
          <div className={`glass-card final-cost-health-card ${costingHealth.blockerCount > 0 ? 'has-blockers' : costingHealth.warningCount > 0 ? 'has-warnings' : 'is-ready'}`}>
            <div className="final-costing-section-heading">
              <div>
                <span className="section-kicker">Costing health check</span>
                <h2>
                  {costingHealth.status === 'INCOMPLETE'
                    ? 'Incomplete — fix missing costs before pricing'
                    : costingHealth.status === 'REVIEW_NEEDED'
                      ? 'Review needed — confirm warnings'
                      : costingHealth.status === 'READY_FOR_QUOTATION'
                        ? 'Ready for quotation'
                        : 'Cost verified'}
                </h2>
                <p>
                  Automatic checks for missing rates, duplicate dishes, category quality, LPG overrides,
                  manpower mapping and transport completeness.
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <b>
                  {costingHealth.blockerCount} blocker{costingHealth.blockerCount === 1 ? '' : 's'} ·{' '}
                  {costingHealth.warningCount} warning{costingHealth.warningCount === 1 ? '' : 's'}
                </b>
              </div>
            </div>

            {costingHealth.issues.length > 0 ? (
              <div className="final-cost-breakdown" style={{ marginTop: 14 }}>
                {costingHealth.issues.map((issue) => (
                  <div key={issue.code}>
                    <span>{issue.severity === 'BLOCKER' ? 'Must fix' : 'Review'}</span>
                    <b>{issue.title}</b>
                    <small>{issue.detail}</small>
                    {issue.actionPath ? (
                      <button type="button" onClick={() => router.push(issue.actionPath!)}>
                        Fix / Review
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="admin-message" style={{ marginTop: 12 }}>
                All tracked costing inputs are complete. You can set the selling price with confidence.
              </div>
            )}

            {!costingHealth.canPrice ? (
              <div className="admin-message" style={{ marginTop: 12 }}>
                Selling-price actions are locked until all blocker items are resolved.
              </div>
            ) : null}
          </div>
        ) : null}

        <section className="final-cost-audit-panel no-print">
          <div>
            <span>Grocery ingredient audit</span>
            <b>{groceryAuditLoading ? 'Loading…' : money(groceryIngredientCost)}</b>
            <small>
              {groceryPlan
                ? `${groceryRateCoveragePercent}% ingredient rates covered`
                : 'Audit unavailable'}
            </small>
          </div>
          <div>
            <span>Equipment planning</span>
            <b>{planningAuditLoading ? 'Loading…' : money(equipmentPlannedCost)}</b>
            <small>{equipmentRows.length} planned requirement{equipmentRows.length === 1 ? '' : 's'}</small>
          </div>
          <div>
            <span>Crockery planning</span>
            <b>{planningAuditLoading ? 'Loading…' : money(crockeryPlannedCost)}</b>
            <small>{crockeryRows.length} planned requirement{crockeryRows.length === 1 ? '' : 's'}</small>
          </div>
          <p>
            Audit/planning values above are visibility only. They are not added again to the official total cost unless represented in the saved costing inputs.
          </p>
        </section>

                <div className="final-cost-desktop-kpis">
          <div>
            <span>Total covers</span>
            <strong>{pricing.totalCovers.toLocaleString('en-IN')}</strong>
            <small>Meal / function covers</small>
          </div>
          <div>
            <span>Total event cost</span>
            <strong>{money(pricing.totalCost)}</strong>
            <small>{activeCostItems} active cost groups</small>
          </div>
          <div className="is-primary">
            <span>Real cost / cover</span>
            <strong>{money(pricing.costPerCover)}</strong>
            <small>Before profit</small>
          </div>
          <div>
            <span>Selling / cover</span>
            <strong>{money(pricing.sellingPricePerCover)}</strong>
            <small>{money(profitPerCover)} profit / cover</small>
          </div>
        </div>

        <div className="final-cost-desktop-workspace">
          <div className="final-cost-desktop-main">

        <div className="final-cost-desktop-actions no-print">
          <button
            type="button"
            className="secondary-button"
            onClick={() => void downloadInternalCostingPdf()}
          >
            Internal Costing PDF
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => window.print()}
          >
            Print
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => router.push('/app/operations')}
          >
            Review Operations
          </button>
        </div>

        <div className="glass-card final-selling-card final-pricing-card">
          <div className="final-costing-section-heading">
            <div>
              <span className="section-kicker">Pricing method</span>
              <h2>Choose how to set your selling price</h2>
              <p>Markup adds a percentage to cost. Gross margin targets profit as a percentage of final selling price.</p>
            </div>
          </div>

          <div className="final-pricing-mode-switch">
            <button type="button" className={mode === 'MARKUP' ? 'is-active' : ''} onClick={() => selectMode('MARKUP')}>
              Markup on Cost
            </button>
            <button type="button" className={mode === 'MARGIN' ? 'is-active' : ''} onClick={() => selectMode('MARGIN')}>
              Gross Margin
            </button>
            <button type="button" className={mode === 'MANUAL' ? 'is-active' : ''} onClick={() => selectMode('MANUAL')}>
              Manual Rate
            </button>
          </div>

          {mode !== 'MANUAL' ? (
            <>
              <div className="final-price-presets">
                {PRICE_PRESETS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={pricingPercent === value ? 'is-active' : ''}
                    onClick={() => {
                      setPricingPercent(value);
                      setMessage('');
                    }}
                  >
                    {value}%
                  </button>
                ))}
              </div>
              <div className="final-pricing-input-grid">
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
            <div className="final-pricing-input-grid">
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

        <div className="glass-card final-cost-basis-card">
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
            <div className="final-cost-audit-row">
              <span>Grocery Ingredient Audit</span>
              <b>{money(groceryIngredientCost)}</b>
              <small>Audit only · already represented through food costing</small>
            </div>
            <div className="final-cost-audit-row">
              <span>Equipment + Crockery Plan</span>
              <b>{money(equipmentPlannedCost + crockeryPlannedCost)}</b>
              <small>Planning only · not double-counted in official total</small>
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

        <div className="glass-card final-function-cost-card final-function-cost-card-modern">
          <div className="final-costing-section-heading">
            <div>
              <span className="section-kicker">Function cost contribution</span>
              <h2>See which functions are driving the event cost</h2>
              <p>
                Shared event extras are allocated by function covers for planning visibility.
              </p>
            </div>
          </div>

          <div className="final-function-cost-table">
            <div className="is-head">
              <span>Function</span>
              <span>Covers</span>
              <span>Food</span>
              <span>Allocated extras</span>
              <span>Total</span>
              <span>Cost / cover</span>
            </div>

            {functionCostRows.map(
              (row) => (
                <div key={row.serviceKey}>
                  <span>
                    {[
                      row.dayLabel,
                      row.mealLabel,
                    ]
                      .filter(Boolean)
                      .join(' · ') ||
                      'Event Menu'}
                  </span>
                  <b>{row.pax.toLocaleString('en-IN')}</b>
                  <b>{money(row.totalCost)}</b>
                  <b>{money(row.allocatedExtras)}</b>
                  <strong>{money(row.allocatedTotal)}</strong>
                  <strong>{money(row.allocatedCostPerCover)}</strong>
                </div>
              ),
            )}
          </div>
        </div>

        {!costReady ? (
          <div className="readiness-card" role="status">
            <div><span className="section-kicker">Pricing checklist</span><h3>Complete the missing cost details</h3></div>
            <div className="readiness-list">
              <span className={work.menu.length > 0 ? 'is-complete' : ''}>Menu dishes</span>
              <span className={costing.totalCovers > 0 ? 'is-complete' : ''}>Guest counts</span>
              <span className={costingHealth?.issues.some((issue) => issue.code === 'MISSING_DISH_RATE' || issue.code === 'UNRESOLVED_DISH') ? '' : work.menu.length > 0 ? 'is-complete' : ''}>Dish costs</span>
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
            Create Quotation
          </button>
          <button className="secondary-button" type="button" disabled={!priceReady} onClick={() => { savePrice(); }}>
            Save Selling Price
          </button>
          <button className="ghost-button" type="button" onClick={() => router.push('/app/disposable')}>
            Back to Plastic & Disposable
          </button>
        </div>

          </div>

          <aside className="final-cost-desktop-summary no-print" aria-label="Final costing summary">
            <div className="final-cost-desktop-summary-head">
              <span>Real cost / cover</span>
              <strong>{money(pricing.costPerCover)}</strong>
              <small>{money(pricing.totalCost)} total event cost</small>
            </div>

            <div className="final-cost-desktop-summary-price">
              <span>Selling price / cover</span>
              <b>{money(pricing.sellingPricePerCover)}</b>
            </div>

            <div className="final-cost-desktop-summary-grid">
              <div>
                <span>Profit / cover</span>
                <b className={profitPerCover < 0 ? 'is-negative' : ''}>{money(profitPerCover)}</b>
              </div>
              <div>
                <span>Event profit</span>
                <b className={pricing.profit < 0 ? 'is-negative' : ''}>{money(pricing.profit)}</b>
              </div>
              <div>
                <span>Markup</span>
                <b>{displayPercent(pricing.markupPercent)}</b>
              </div>
              <div>
                <span>Gross margin</span>
                <b>{displayPercent(pricing.marginPercent)}</b>
              </div>
              <div>
                <span>Break-even / cover</span>
                <b>{money(breakEvenPricePerCover)}</b>
              </div>
              <div>
                <span>Readiness</span>
                <b>{finalCostReadinessPercent}%</b>
              </div>
            </div>

            <div className="final-cost-desktop-summary-list">
              <div>
                <span>Food</span>
                <b>{money(costing.menuFoodTotal)}</b>
              </div>
              <div>
                <span>Manpower</span>
                <b>{money(work.extras.staff)}</b>
              </div>
              <div>
                <span>Gas</span>
                <b>{money(gasBreakdown?.totalGasCost || 0)}</b>
              </div>
              <div>
                <span>Transport</span>
                <b>{money(work.extras.transport)}</b>
              </div>
              <div>
                <span>Disposable</span>
                <b>{money(work.extras.disposable)}</b>
              </div>
            </div>

            {!costReady ? (
              <div className="final-cost-desktop-warning">
                <b>Costing not ready</b>
                <small>{costingHealth?.blockerCount || 0} costing blocker{(costingHealth?.blockerCount || 0) === 1 ? '' : 's'} remaining, or guest/menu details are incomplete.</small>
              </div>
            ) : pricing.profit < 0 ? (
              <div className="final-cost-desktop-warning">
                <b>Selling below cost</b>
                <small>Current price creates a loss of {money(Math.abs(pricing.profit))}.</small>
              </div>
            ) : (
              <div className="final-cost-desktop-ready">
                <span aria-hidden="true">✓</span>
                <div>
                  <b>Ready for quotation</b>
                  <small>Save this selling price and create the client quote.</small>
                </div>
              </div>
            )}

            <button
              className="primary-button final-cost-desktop-next"
              type="button"
              disabled={!priceReady}
              onClick={createQuotation}
            >
              Create Quotation
              <span aria-hidden="true">→</span>
            </button>

            <button
              className="final-cost-desktop-save"
              type="button"
              disabled={!priceReady}
              onClick={() => {
                savePrice();
              }}
            >
              Save Selling Price
            </button>

            <button
              className="final-cost-desktop-back"
              type="button"
              onClick={() => router.push('/app/disposable')}
            >
              Back to Plastic & Disposable
            </button>
          </aside>
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
