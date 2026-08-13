'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell, { LockedCard } from '../../components/AppShell';
import StatCard from '../../components/StatCard';
import { calculate, getMenuServiceKey, getSession, loadWork, saveWork } from '../../../lib/store';
import type { Session, WorkState } from '../../../lib/types';
import {
  CATEGORIES,
  type Category,
} from '../../../lib/menuCategories';
import {
  getCostingAnalyticsKey,
  trackProductEvent,
} from '../../../lib/productAnalytics';

function money(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}


function formatMenuDate(
  value: string,
) {
  const text =
    String(
      value || '',
    ).trim();

  if (!text) {
    return '';
  }

  const iso =
    text.match(
      /\b(\d{4})-(\d{2})-(\d{2})\b/,
    );

  if (iso) {
    return (
      `${iso[3]}/` +
      `${iso[2]}/` +
      `${iso[1]}`
    );
  }

  const common =
    text.match(
      /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/,
    );

  if (!common) {
    return '';
  }

  const day =
    common[1].padStart(
      2,
      '0',
    );

  const month =
    common[2].padStart(
      2,
      '0',
    );

  const year =
    common[3].length === 2
      ? `20${common[3]}`
      : common[3];

  return (
    `${day}/${month}/${year}`
  );
}

function extractMenuDates(
  value: string,
) {
  const matches =
    String(
      value || '',
    ).match(
      /\b(?:\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g,
    ) || [];

  return Array.from(
    new Set(
      matches
        .map(
          formatMenuDate,
        )
        .filter(
          Boolean,
        ),
    ),
  );
}

export default function CostPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [work, setWork] = useState<WorkState | null>(null);
  const [dishQuery, setDishQuery] = useState('');
  const [dishServiceFilter, setDishServiceFilter] = useState('ALL');
  const [dishCategoryFilter, setDishCategoryFilter] = useState('ALL');

  const [
    showAddDish,
    setShowAddDish,
  ] =
    useState(false);

  const [
    newDishName,
    setNewDishName,
  ] =
    useState('');

  const [
    newDishCategory,
    setNewDishCategory,
  ] =
    useState<Category>(
      'Other',
    );

  const [
    newDishServiceKey,
    setNewDishServiceKey,
  ] =
    useState('');

  const [
    newDishRate,
    setNewDishRate,
  ] =
    useState('');

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

    const costingKey =
      getCostingAnalyticsKey(
        work,
      );

    void trackProductEvent(
      'cost_reviewed',
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
      },
      {
        onceKey:
          `cost_reviewed:${costingKey}`,
      },
    );
  }, [work, session]);

  if (!work || !session) return <AppShell title="Cost"><div className="content-grid"><div className="glass-card">Loading...</div></div></AppShell>;
  if (session.status === 'EXPIRED') return <AppShell title="Cost"><LockedCard /></AppShell>;

  const result = calculate(work);
  const dishCategories = Array.from(
    new Set(result.menuBreakdown.map((item) => item.category)),
  ).sort((a, b) => a.localeCompare(b));
  const dishServices = Array.from(
    new Map(
      result.menuBreakdown.map((item) => {
        const label = item.mealLabel
          ? `${item.dayLabel ? `${item.dayLabel} • ` : ''}${item.mealLabel}`
          : 'Event Menu';
        return [item.serviceKey, label];
      }),
    ).entries(),
  );
  const rawMenuDates =
    extractMenuDates(
      work.event.rawMenuText ||
      '',
    );

  const serviceDayKeys =
    Array.from(
      new Set(
        result.serviceSummaries.map(
          (service) =>
            String(
              service.dayLabel ||
              'Event',
            ).trim() ||
            'Event',
        ),
      ),
    );

  function serviceDate(
    service: {
      serviceKey: string;
      dayLabel?: string;
      mealLabel?: string;
    },
  ) {
    const explicit =
      formatMenuDate(
        service.dayLabel ||
        '',
      ) ||
      formatMenuDate(
        service.mealLabel ||
        '',
      );

    if (explicit) {
      return explicit;
    }

    const dayKey =
      String(
        service.dayLabel ||
        'Event',
      ).trim() ||
      'Event';

    const dayIndex =
      serviceDayKeys.indexOf(
        dayKey,
      );

    if (
      dayIndex >= 0 &&
      rawMenuDates[
        dayIndex
      ]
    ) {
      return rawMenuDates[
        dayIndex
      ];
    }

    if (
      serviceDayKeys.length <=
      1
    ) {
      return (
        formatMenuDate(
          work.event.eventDate ||
          '',
        ) ||
        rawMenuDates[0] ||
        ''
      );
    }

    return '';
  }

  const serviceDateByKey =
    new Map(
      result.serviceSummaries.map(
        (service) => [
          service.serviceKey,
          serviceDate(
            service,
          ),
        ],
      ),
    );

  const selectedAddServiceKey =
    newDishServiceKey ||
    result.serviceSummaries[
      0
    ]?.serviceKey ||
    '';

  const selectedAddServiceDate =
    serviceDateByKey.get(
      selectedAddServiceKey,
    ) || '';

  const normalizedDishQuery = dishQuery.trim().toLocaleLowerCase('en-IN');
  const filteredDishCosts = result.menuBreakdown.filter((item) => {
    const matchesSearch = !normalizedDishQuery ||
      item.name.toLocaleLowerCase('en-IN').includes(normalizedDishQuery) ||
      item.category.toLocaleLowerCase('en-IN').includes(normalizedDishQuery);
    const matchesService = dishServiceFilter === 'ALL' || item.serviceKey === dishServiceFilter;
    const matchesCategory = dishCategoryFilter === 'ALL' || item.category === dishCategoryFilter;
    return matchesSearch && matchesService && matchesCategory;
  });
  const missingRateCount = work.menu.filter(
    (item) => !(Number(item.costPerPlate) > 0),
  ).length;
  const hasWeddingServices =
    result.serviceSummaries.length > 1 ||
    result.serviceSummaries.some(
      (service) => service.serviceId !== 'default',
    );

  function persist(next: WorkState) {
    if (!session) return;
    setWork(next);
    saveWork(session.tenantId, next);
  }

  function addNewCostDish() {
    if (!work) {
      return;
    }

    const name =
      newDishName
        .replace(
          /\s+/g,
          ' ',
        )
        .trim();

    if (!name) {
      window.alert(
        'Enter dish name.',
      );

      return;
    }

    const targetServiceKey =
      selectedAddServiceKey ||
      'default';

    const targetService =
      result.serviceSummaries.find(
        (service) =>
          service.serviceKey ===
          targetServiceKey,
      );

    const targetTemplate =
      work.menu.find(
        (item) =>
          getMenuServiceKey(
            item,
          ) ===
          targetServiceKey,
      );

    const duplicate =
      work.menu.some(
        (item) =>
          getMenuServiceKey(
            item,
          ) ===
            targetServiceKey &&
          item.name
            .trim()
            .toLocaleLowerCase(
              'en-IN',
            ) ===
            name.toLocaleLowerCase(
              'en-IN',
            ),
      );

    if (duplicate) {
      window.alert(
        `${name} already exists in this meal.`,
      );

      return;
    }

    const rate =
      Math.max(
        0,
        Number(
          newDishRate,
        ) || 0,
      );

    const id =
      typeof crypto !==
        'undefined' &&
      typeof crypto.randomUUID ===
        'function'
        ? `dish_${crypto.randomUUID()}`
        : `dish_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)}`;

    const newItem:
      WorkState[
        'menu'
      ][number] = {
        id,

        name,

        category:
          newDishCategory,

        costPerPlate:
          rate,

        portionQuantity:
          1,

        portionUnit:
          'serving',

        portionMode:
          'AUTO',

        serviceId:
          targetTemplate
            ?.serviceId,

        dayLabel:
          targetService
            ?.dayLabel ||
          targetTemplate
            ?.dayLabel,

        mealLabel:
          targetService
            ?.mealLabel ||
          targetTemplate
            ?.mealLabel ||
          'Event Menu',

        servicePax:
          Number(
            targetService?.pax,
          ) ||
          Number(
            targetTemplate
              ?.servicePax,
          ) ||
          Number(
            work.event.pax,
          ) ||
          0,

        costSource:
          'manual',

        coverageStatus:
          rate > 0
            ? 'COSTED'
            : 'NEW_DISH_PENDING',

        costQualityStatus:
          rate > 0
            ? 'READY'
            : undefined,

        costConfidence:
          rate > 0
            ? 100
            : 0,

        rateCoveragePercent:
          rate > 0
            ? 100
            : 0,

        coverageReason:
          rate > 0
            ? 'Manual dish and rate added on Cost page'
            : 'Manual rate required',

        costApprovalStatus:
          rate > 0
            ? 'APPROVED'
            : 'PENDING',

        costApprovedAt:
          rate > 0
            ? new Date()
                .toISOString()
            : undefined,

        costApprovalReason:
          rate > 0
            ? 'User manually entered this dish rate'
            : 'Manual rate required',

        detectionSource:
          'manual',

        detectionConfidence:
          100,

        detectionReason:
          'User manually added this dish on Cost page',
      };

    persist({
      ...work,

      menu: [
        ...work.menu,
        newItem,
      ],
    });

    /*
     * New manual dish should also be
     * available for Admin learning later.
     * Failure never blocks costing.
     */
    void fetch(
      '/api/dish-suggestions',
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            sourceFileName:
              'Added from Cost page',

            candidates: [
              {
                name,

                categoryHint:
                  newDishCategory,
              },
            ],
          }),
      },
    ).catch(
      (suggestionError) =>
        console.warn(
          'New manual dish suggestion skipped:',
          suggestionError,
        ),
    );

    setDishQuery('');
    setDishServiceFilter(
      'ALL',
    );
    setDishCategoryFilter(
      'ALL',
    );

    setNewDishName('');
    setNewDishCategory(
      'Other',
    );
    setNewDishRate('');
    setShowAddDish(
      false,
    );
  }

  function updateDishCost(id: string, value: number) {
    if (!work) return;
    persist({
      ...work,
      menu: work.menu.map((item) =>
        item.id === id ? { ...item, costPerPlate: Math.max(0, value) } : item,
      ),
    });
  }

  function updateMealDetails(
    serviceKey: string,
    patch: Pick<WorkState['menu'][number], 'dayLabel' | 'mealLabel' | 'servicePax'>,
  ) {
    if (!work) return;

    persist({
      ...work,
      menu: work.menu.map((item) =>
        getMenuServiceKey(item) === serviceKey
          ? { ...item, ...patch }
          : item,
      ),
      manpower: work.manpower.map((row) =>
        row.serviceId && getMenuServiceKey(row) === serviceKey
          ? { ...row, ...patch }
          : row,
      ),
    });
  }

  function updateDishPortion(
    id: string,
    patch: Pick<WorkState['menu'][number], 'portionMode' | 'portionPercent'>,
  ) {
    if (!work) return;
    persist({
      ...work,
      menu: work.menu.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });
  }

  function removeDish(id: string) {
    if (!work) return;
    const selectedDish = work.menu.find((item) => item.id === id);

    if (
      selectedDish &&
      !window.confirm(`Remove ${selectedDish.name} from this menu?`)
    ) {
      return;
    }

    persist({
      ...work,
      menu: work.menu.filter((item) => item.id !== id),
    });
  }

  return (
    <AppShell title="Cost" subtitle="Step 4 of 6: review food, manpower and extra costs">
      <section className="content-grid">
        <div className="stat-grid">
          <StatCard label="Average Food / Cover" value={money(result.menuCostPerPlate)} note={`Food total ${money(result.menuFoodTotal)}`} />
          <StatCard label="Extra / Cover" value={money(result.extraPerPlate)} note={`Total extra ${money(result.extrasTotal)}`} />
          <StatCard label="Average Final / Cover" value={money(result.finalCostPerPlate)} note={`${result.totalCovers} total meal covers`} />
          <StatCard label="Total Wedding Cost" value={money(result.totalCost)} note={`${result.serviceSummaries.length} meal${result.serviceSummaries.length === 1 ? '' : 's'}`} />
        </div>

        {hasWeddingServices ? (
          <div className="glass-card">
            <h2>Meal-wise Cost Summary</h2>
            <p className="muted">Each meal uses its own member count. Repeated dishes are charged again in every meal where they appear.</p>
            <div className="table-wrap">
              <table className="meal-summary-table">
                <thead><tr><th>Day</th><th>Date</th><th>Meal</th><th>Members</th><th>Dishes</th><th>Food / Plate</th><th>Meal Food Total</th></tr></thead>
                <tbody>
                  {result.serviceSummaries.map((service) => (
                    <tr key={service.serviceKey}>
                      <td>
                        <input
                          className="meal-summary-input meal-summary-day"
                          defaultValue={service.dayLabel}
                          placeholder="Day"
                          aria-label={`Day for ${service.mealLabel}`}
                          onBlur={(event) => updateMealDetails(service.serviceKey, {
                            dayLabel: event.currentTarget.value.trim(),
                          })}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') event.currentTarget.blur();
                          }}
                        />
                      </td>

                      <td>
                        <span
                          className={`meal-summary-date ${
                            serviceDateByKey.get(
                              service.serviceKey,
                            )
                              ? 'has-date'
                              : 'no-date'
                          }`}
                        >
                          {serviceDateByKey.get(
                            service.serviceKey,
                          ) || '—'}
                        </span>
                      </td>

                      <td>
                        <input
                          className="meal-summary-input meal-summary-meal"
                          defaultValue={service.mealLabel}
                          placeholder="Meal name"
                          aria-label={`Meal name for ${service.dayLabel || 'event'}`}
                          onBlur={(event) => updateMealDetails(service.serviceKey, {
                            mealLabel: event.currentTarget.value.trim() || 'Event Menu',
                          })}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') event.currentTarget.blur();
                          }}
                        />
                      </td>
                      <td>
                        <input
                          className="meal-summary-input meal-summary-members"
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={service.pax}
                          aria-label={`Members for ${service.mealLabel}`}
                          onBlur={(event) => updateMealDetails(service.serviceKey, {
                            servicePax: Math.max(0, Math.round(Number(event.currentTarget.value) || 0)),
                          })}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') event.currentTarget.blur();
                          }}
                        />
                      </td>
                      <td>{service.dishCount}</td>
                      <td>{money(service.menuCostPerPlate)}</td>
                      <td><b>{money(service.totalCost)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="glass-card dish-cost-panel">
          <div className="dish-cost-heading">
            <div>
              <span className="page-eyebrow">Food costing</span>
              <h2>Dish Cost Table</h2>
              <p className="muted">Review every dish and correct its base cost without leaving this page.</p>
            </div>
            <div className="dish-cost-heading-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() =>
                  setShowAddDish(
                    (current) =>
                      !current,
                  )
                }
              >
                + Add Dish
              </button>
            </div>

            <div className="dish-cost-summary" aria-label="Dish cost summary">
              <span><b>{work.menu.length}</b> dishes</span>
              <span className={missingRateCount > 0 ? 'needs-attention' : 'is-complete'}>
                <b>{missingRateCount}</b> missing rates
              </span>
              <span><b>{money(result.menuFoodTotal)}</b> food total</span>
            </div>
          </div>
          {showAddDish ? (
            <div className="cost-add-dish-form">
              <div className="cost-add-dish-head">
                <div>
                  <span className="page-eyebrow">
                    Manual dish
                  </span>

                  <h3>
                    Add Dish to Costing
                  </h3>

                  <p className="muted">
                    Add a missed or custom dish directly to the correct wedding meal.
                  </p>
                </div>

                <button
                  className="ghost-button"
                  type="button"
                  onClick={() =>
                    setShowAddDish(
                      false,
                    )
                  }
                >
                  Close
                </button>
              </div>

              <div className="cost-add-dish-grid">
                <div className="field">
                  <label>
                    Dish Name
                  </label>

                  <input
                    className="input"
                    value={
                      newDishName
                    }
                    onChange={(event) =>
                      setNewDishName(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Example: Kaju Curry"
                    autoFocus
                  />
                </div>

                <div className="field">
                  <label>
                    Category
                  </label>

                  <select
                    className="select"
                    value={
                      newDishCategory
                    }
                    onChange={(event) =>
                      setNewDishCategory(
                        event.target
                          .value as Category,
                      )
                    }
                  >
                    {CATEGORIES.map(
                      (category) => (
                        <option
                          key={
                            category
                          }
                          value={
                            category
                          }
                        >
                          {category}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="field">
                  <label>
                    Wedding Meal
                  </label>

                  <select
                    className="select"
                    value={
                      selectedAddServiceKey
                    }
                    onChange={(event) =>
                      setNewDishServiceKey(
                        event.target
                          .value,
                      )
                    }
                  >
                    {result
                      .serviceSummaries
                      .length ? (
                      result.serviceSummaries.map(
                        (service) => {
                          const date =
                            serviceDateByKey.get(
                              service.serviceKey,
                            );

                          return (
                            <option
                              key={
                                service.serviceKey
                              }
                              value={
                                service.serviceKey
                              }
                            >
                              {date
                                ? `${date} • `
                                : ''}
                              {service.dayLabel
                                ? `${service.dayLabel} • `
                                : ''}
                              {service.mealLabel ||
                                'Event Menu'}
                            </option>
                          );
                        },
                      )
                    ) : (
                      <option value="">
                        Event Menu
                      </option>
                    )}
                  </select>

                  {selectedAddServiceDate ? (
                    <small className="cost-add-date">
                      📅 {
                        selectedAddServiceDate
                      }
                    </small>
                  ) : null}
                </div>

                <div className="field">
                  <label>
                    Manual Rate ₹ / plate
                  </label>

                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={
                      newDishRate
                    }
                    onChange={(event) =>
                      setNewDishRate(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Enter rate or leave blank"
                  />

                  <small className="muted">
                    If unknown, add the dish now and enter its rate later in the table.
                  </small>
                </div>
              </div>

              <div className="cost-add-dish-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={
                    addNewCostDish
                  }
                >
                  Add Dish
                </button>

                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setShowAddDish(
                      false,
                    );

                    setNewDishName(
                      '',
                    );

                    setNewDishRate(
                      '',
                    );
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {work.menu.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" aria-hidden="true">🍽️</div>
              <div>
                <h3>Add dishes to calculate food cost</h3>
                <p>Paste or type the event menu, review the detected dishes, then return here for the complete cost.</p>
              </div>
              <button className="primary-button" type="button" onClick={() => router.push('/app/event')}>Open Event</button>
            </div>
          ) : (
            <>
              <div className="dish-cost-toolbar">
                <div className="field">
                  <label htmlFor="dishCostSearch">Find a dish</label>
                  <input
                    id="dishCostSearch"
                    className="input"
                    type="search"
                    value={dishQuery}
                    onChange={(event) => setDishQuery(event.target.value)}
                    placeholder="Search dish or category"
                  />
                </div>
                <div className="field">
                  <label htmlFor="dishCostService">Meal</label>
                  <select id="dishCostService" className="select" value={dishServiceFilter} onChange={(event) => setDishServiceFilter(event.target.value)}>
                    <option value="ALL">All meals</option>
                    {dishServices.map(([serviceId, label]) => <option key={serviceId} value={serviceId}>{label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="dishCostCategory">Category</label>
                  <select id="dishCostCategory" className="select" value={dishCategoryFilter} onChange={(event) => setDishCategoryFilter(event.target.value)}>
                    <option value="ALL">All categories</option>
                    {dishCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>
                <button className="ghost-button" type="button" onClick={() => router.push('/app/event')}>Edit menu</button>
              </div>

              <div className="dish-portion-note">
                <b>Portion allocation:</b> automatic sharing is calculated separately inside every meal and category. You can also set a custom percentage for any dish: 50% charges half its base cost; 150% charges one-and-a-half times.
              </div>

              {filteredDishCosts.length === 0 ? (
                <div className="dish-cost-empty">
                  <b>No matching dishes</b>
                  <span>Try a different search, meal, or category.</span>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => {
                      setDishQuery('');
                      setDishServiceFilter('ALL');
                      setDishCategoryFilter('ALL');
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="table-wrap dish-cost-table-wrap">
                    <table className="dish-cost-table">
                      <thead>
                        <tr>
                          <th>Dish &amp; meal</th>
                          <th>Category</th>
                          <th>Serving quantity</th>
                          <th>Members</th>
                          <th>Base cost / plate</th>
                          <th>Portion</th>
                          <th>Adjusted / plate</th>
                          <th>Total cost</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDishCosts.map((item) => (
                          <tr key={item.id} className={item.baseCostPerPlate > 0 ? '' : 'dish-rate-missing'}>
                            <td>
                              <div className="dish-cost-name">
                                <b>{item.name}</b>
                                <small>
                                  {item.mealLabel ? `${item.dayLabel ? `${item.dayLabel} • ` : ''}${item.mealLabel}` : 'Event Menu'}
                                  {serviceDateByKey.get(item.serviceKey)
                                    ? ` • ${serviceDateByKey.get(item.serviceKey)}`
                                    : ''}
                                  {item.costSource === 'ai_recipe'
                                    ? ' • AI recipe estimate'
                                    : item.costSource === 'category_estimate'
                                      ? ' • Category estimate — review recommended'
                                      : ''}
                                </small>
                              </div>
                            </td>
                            <td><span className="dish-category-chip">{item.category}</span></td>
                            <td>
                              <span className="dish-serving-quantity">
                                {Number(item.portionQuantity) > 0
                                  ? `${item.portionQuantity} ${item.portionUnit || 'serving'}`
                                  : 'Not set'}
                              </span>
                            </td>
                            <td>{item.effectivePax.toLocaleString('en-IN')}</td>
                            <td>
                              <label className="dish-rate-input">
                                <span aria-hidden="true">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  inputMode="decimal"
                                  value={item.baseCostPerPlate || ''}
                                  placeholder="Manual rate"
                                  aria-label={`Base cost per plate for ${item.name}`}
                                  onChange={(event) => updateDishCost(item.id, Number(event.target.value))}
                                />
                              </label>
                            </td>
                            <td>
                              <div className="cost-portion-control">
                                <select
                                  className="select"
                                  aria-label={`Cost portion allocation for ${item.name}`}
                                  value={item.portionMode}
                                  onChange={(event) => {
                                    const mode = event.target.value as 'AUTO' | 'CUSTOM';
                                    updateDishPortion(item.id, {
                                      portionMode: mode,
                                      portionPercent:
                                        mode === 'CUSTOM'
                                          ? item.portionPercent
                                          : undefined,
                                    });
                                  }}
                                >
                                  <option value="AUTO">Auto</option>
                                  <option value="CUSTOM">Custom</option>
                                </select>
                                {item.portionMode === 'CUSTOM' ? (
                                  <label className="portion-percent-input compact">
                                    <input
                                      type="number"
                                      min="0"
                                      max="300"
                                      step="1"
                                      value={item.portionPercent}
                                      onChange={(event) =>
                                        updateDishPortion(item.id, {
                                          portionMode: 'CUSTOM',
                                          portionPercent: Math.min(
                                            300,
                                            Math.max(0, Number(event.target.value) || 0),
                                          ),
                                        })
                                      }
                                    />
                                    <span>%</span>
                                  </label>
                                ) : (
                                  <span className="portion-chip">{item.categoryCount > 1 ? `1/${item.categoryCount}` : 'Full'}</span>
                                )}
                              </div>
                            </td>
                            <td>{money(item.adjustedCostPerPlate)}</td>
                            <td><strong className="dish-total-cost">{money(item.itemTotalCost)}</strong></td>
                            <td>
                              <button
                                className="dish-remove-button"
                                type="button"
                                onClick={() => removeDish(item.id)}
                                aria-label={`Remove ${item.name} from menu`}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="dish-cost-cards">
                    {filteredDishCosts.map((item) => (
                      <article className={`dish-cost-card ${item.baseCostPerPlate > 0 ? '' : 'dish-rate-missing'}`} key={item.id}>
                        <div className="dish-cost-card-heading">
                          <div className="dish-cost-name">
                            <b>{item.name}</b>
                            <small>{item.mealLabel ? `${item.dayLabel ? `${item.dayLabel} • ` : ''}${item.mealLabel}` : 'Event Menu'}
                                  {serviceDateByKey.get(item.serviceKey)
                                    ? ` • ${serviceDateByKey.get(item.serviceKey)}`
                                    : ''}</small>
                          </div>
                          <span className="dish-category-chip">{item.category}</span>
                        </div>
                        <div className="dish-cost-card-grid">
                          <div><small>Members</small><b>{item.effectivePax.toLocaleString('en-IN')}</b></div>
                          <div>
                            <small>Serving quantity</small>
                            <b>
                              {Number(item.portionQuantity) > 0
                                ? `${item.portionQuantity} ${item.portionUnit || 'serving'}`
                                : 'Not set'}
                            </b>
                          </div>
                          <div><small>Portion</small><b>{Math.round(item.portionPercent * 100) / 100}%</b></div>
                          <div><small>Adjusted / plate</small><b>{money(item.adjustedCostPerPlate)}</b></div>
                          <div><small>Total cost</small><b>{money(item.itemTotalCost)}</b></div>
                        </div>
                        <div className="field">
                          <label htmlFor={`mobile-portion-mode-${item.id}`}>
                            Client portion
                          </label>

                          <div className="cost-portion-control">
                            <select
                              id={`mobile-portion-mode-${item.id}`}
                              className="select"
                              value={item.portionMode}
                              aria-label={`Portion allocation for ${item.name}`}
                              onChange={(event) => {
                                const mode = event.target.value as
                                  | 'AUTO'
                                  | 'CUSTOM';

                                updateDishPortion(item.id, {
                                  portionMode: mode,
                                  portionPercent:
                                    mode === 'CUSTOM'
                                      ? item.portionPercent
                                      : undefined,
                                });
                              }}
                            >
                              <option value="AUTO">
                                Automatic portion
                              </option>
                              <option value="CUSTOM">
                                Custom portion
                              </option>
                            </select>

                            {item.portionMode === 'CUSTOM' ? (
                              <label className="portion-percent-input compact">
                                <input
                                  type="number"
                                  min="0"
                                  max="300"
                                  step="1"
                                  inputMode="decimal"
                                  value={item.portionPercent}
                                  aria-label={`Custom portion percentage for ${item.name}`}
                                  onChange={(event) =>
                                    updateDishPortion(item.id, {
                                      portionMode: 'CUSTOM',
                                      portionPercent: Math.min(
                                        300,
                                        Math.max(
                                          0,
                                          Number(event.target.value) || 0,
                                        ),
                                      ),
                                    })
                                  }
                                />
                                <span>%</span>
                              </label>
                            ) : (
                              <span className="portion-chip">
                                {item.categoryCount > 1
                                  ? `1/${item.categoryCount}`
                                  : 'Full'}
                              </span>
                            )}
                          </div>

                          <small className="muted">
                            50% charges half cost. 100% charges full cost.
                          </small>
                        </div>

                        <div className="field dish-cost-card-rate">
                          <label htmlFor={`mobile-rate-${item.id}`}>Base cost / plate</label>
                          <label className="dish-rate-input" htmlFor={`mobile-rate-${item.id}`}>
                            <span aria-hidden="true">₹</span>
                            <input
                              id={`mobile-rate-${item.id}`}
                              type="number"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              value={item.baseCostPerPlate || ''}
                              placeholder="Manual rate"
                              onChange={(event) => updateDishCost(item.id, Number(event.target.value))}
                            />
                          </label>
                        </div>
                        <button
                          className="dish-remove-button dish-remove-button-mobile"
                          type="button"
                          onClick={() => removeDish(item.id)}
                        >
                          Remove dish
                        </button>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="action-row page-actions">
          <button className="primary-button" type="button" onClick={() => router.push('/app/final-costing')}>Next: Final Costing</button>
          <button className="ghost-button" type="button" onClick={() => router.push('/app/extra-cost')}>Back to Extra Cost</button>
        </div>
      </section>
    </AppShell>
  );
}
