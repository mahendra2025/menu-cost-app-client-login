'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell, { LockedCard } from '../../components/AppShell';
import StatCard from '../../components/StatCard';
import { calculate, getSession, loadWork, saveWork } from '../../../lib/store';
import type { ExtraCost, Session, WorkState } from '../../../lib/types';

function money(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export default function CostPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [work, setWork] = useState<WorkState | null>(null);
  const [dishQuery, setDishQuery] = useState('');
  const [dishServiceFilter, setDishServiceFilter] = useState('ALL');
  const [dishCategoryFilter, setDishCategoryFilter] = useState('ALL');

  useEffect(() => {
    const current = getSession();
    setSession(current);
    if (current) setWork(loadWork(current.tenantId));
  }, []);

  if (!work || !session) return <AppShell title="Cost"><div className="content-grid"><div className="glass-card">Loading...</div></div></AppShell>;
  if (session.status === 'EXPIRED') return <AppShell title="Cost"><LockedCard /></AppShell>;

  const result = calculate(work);
  const dishCategories = Array.from(
    new Set(result.menuBreakdown.map((item) => item.category)),
  ).sort((a, b) => a.localeCompare(b));
  const dishServices = Array.from(
    new Map(
      result.menuBreakdown.map((item) => {
        const serviceId = item.serviceId ?? 'default';
        const label = item.mealLabel
          ? `${item.dayLabel ? `${item.dayLabel} • ` : ''}${item.mealLabel}`
          : 'Event Menu';
        return [serviceId, label];
      }),
    ).entries(),
  );
  const normalizedDishQuery = dishQuery.trim().toLocaleLowerCase('en-IN');
  const filteredDishCosts = result.menuBreakdown.filter((item) => {
    const serviceId = item.serviceId ?? 'default';
    const matchesSearch = !normalizedDishQuery ||
      item.name.toLocaleLowerCase('en-IN').includes(normalizedDishQuery) ||
      item.category.toLocaleLowerCase('en-IN').includes(normalizedDishQuery);
    const matchesService = dishServiceFilter === 'ALL' || serviceId === dishServiceFilter;
    const matchesCategory = dishCategoryFilter === 'ALL' || item.category === dishCategoryFilter;
    return matchesSearch && matchesService && matchesCategory;
  });
  const missingRateCount = work.menu.filter(
    (item) => !(Number(item.costPerPlate) > 0),
  ).length;
  const quoteReady =
    work.menu.length > 0 &&
    result.totalCovers > 0 &&
    missingRateCount === 0 &&
    work.sellingPricePerPlate > 0;
  const hasWeddingServices = result.serviceSummaries.some(
    (service) => service.serviceId !== 'default',
  );
  const manpowerSummaryMap = new Map<
    string,
    {
      serviceId: string;
      dayLabel: string;
      mealLabel: string;
      people: number;
      cost: number;
    }
  >();

  work.manpower.forEach((row) => {
    const serviceId = row.serviceId ?? 'general';
    const current = manpowerSummaryMap.get(serviceId) ?? {
      serviceId,
      dayLabel: row.dayLabel ?? '',
      mealLabel: row.mealLabel ?? 'General Event Staff',
      people: 0,
      cost: 0,
    };

    current.people += Math.max(0, Number(row.quantity) || 0);
    current.cost +=
      Math.max(0, Number(row.quantity) || 0) *
      Math.max(0, Number(row.rate) || 0);
    manpowerSummaryMap.set(serviceId, current);
  });

  const manpowerSummaries = Array.from(
    manpowerSummaryMap.values(),
  ).filter((summary) => summary.people > 0 || summary.cost > 0);

  function persist(next: WorkState) {
    if (!session) return;
    setWork(next);
    saveWork(session.tenantId, next);
  }

  function updateExtra(key: keyof ExtraCost, value: number) {
    if (!work) return;
    const current = work;
    persist({ ...current, extras: { ...current.extras, [key]: value } });
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
              <table>
                <thead><tr><th>Day</th><th>Meal</th><th>Members</th><th>Dishes</th><th>Food / Plate</th><th>Meal Food Total</th></tr></thead>
                <tbody>
                  {result.serviceSummaries.map((service) => (
                    <tr key={service.serviceId}>
                      <td>{service.dayLabel || '-'}</td>
                      <td><b>{service.mealLabel}</b></td>
                      <td>{service.pax}</td>
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
            <div className="dish-cost-summary" aria-label="Dish cost summary">
              <span><b>{work.menu.length}</b> dishes</span>
              <span className={missingRateCount > 0 ? 'needs-attention' : 'is-complete'}>
                <b>{missingRateCount}</b> missing rates
              </span>
              <span><b>{money(result.menuFoodTotal)}</b> food total</span>
            </div>
          </div>
          {work.menu.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" aria-hidden="true">🍽️</div>
              <div>
                <h3>Add dishes to calculate food cost</h3>
                <p>Paste or type the event menu, review the detected dishes, then return here for the complete cost.</p>
              </div>
              <button className="primary-button" type="button" onClick={() => router.push('/app/menu')}>Open Menu</button>
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
                <button className="ghost-button" type="button" onClick={() => router.push('/app/menu')}>Edit menu</button>
              </div>

              <div className="dish-portion-note">
                <b>Shared portions:</b> when a meal has multiple dishes in one category, the category portion is divided equally between them.
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
                          <th>Members</th>
                          <th>Base cost / plate</th>
                          <th>Portion</th>
                          <th>Adjusted / plate</th>
                          <th>Total cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDishCosts.map((item) => (
                          <tr key={item.id} className={item.baseCostPerPlate > 0 ? '' : 'dish-rate-missing'}>
                            <td>
                              <div className="dish-cost-name">
                                <b>{item.name}</b>
                                <small>{item.mealLabel ? `${item.dayLabel ? `${item.dayLabel} • ` : ''}${item.mealLabel}` : 'Event Menu'}</small>
                              </div>
                            </td>
                            <td><span className="dish-category-chip">{item.category}</span></td>
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
                                  placeholder="Add rate"
                                  aria-label={`Base cost per plate for ${item.name}`}
                                  onChange={(event) => updateDishCost(item.id, Number(event.target.value))}
                                />
                              </label>
                            </td>
                            <td><span className="portion-chip">{item.categoryCount > 1 ? `1/${item.categoryCount}` : 'Full'}</span></td>
                            <td>{money(item.adjustedCostPerPlate)}</td>
                            <td><strong className="dish-total-cost">{money(item.itemTotalCost)}</strong></td>
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
                            <small>{item.mealLabel ? `${item.dayLabel ? `${item.dayLabel} • ` : ''}${item.mealLabel}` : 'Event Menu'}</small>
                          </div>
                          <span className="dish-category-chip">{item.category}</span>
                        </div>
                        <div className="dish-cost-card-grid">
                          <div><small>Members</small><b>{item.effectivePax.toLocaleString('en-IN')}</b></div>
                          <div><small>Portion</small><b>{item.categoryCount > 1 ? `1/${item.categoryCount}` : 'Full'}</b></div>
                          <div><small>Adjusted / plate</small><b>{money(item.adjustedCostPerPlate)}</b></div>
                          <div><small>Total cost</small><b>{money(item.itemTotalCost)}</b></div>
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
                              placeholder="Add rate"
                              onChange={(event) => updateDishCost(item.id, Number(event.target.value))}
                            />
                          </label>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="glass-card">
          <h2>Extra Cost</h2>
          <div className="three-grid">
            <div className="field">
              <label>Manpower Cost</label>
              <input className="input" type="number" readOnly value={work.extras.staff || ''} placeholder="0" />
              <small className="muted">Managed on the Manpower page.</small>
            </div>
            <div className="field"><label>Transport</label><input className="input" type="number" min="0" inputMode="decimal" value={work.extras.transport || ''} onChange={(e) => updateExtra('transport', Math.max(0, Number(e.target.value)))} placeholder="0" /></div>
            <div className="field"><label>Gas / Fuel</label><input className="input" type="number" min="0" inputMode="decimal" value={work.extras.gasFuel || ''} onChange={(e) => updateExtra('gasFuel', Math.max(0, Number(e.target.value)))} placeholder="0" /></div>
          </div>
          <div className="two-grid" style={{ marginTop: 14 }}>
            <div className="field"><label>Disposable</label><input className="input" type="number" min="0" inputMode="decimal" value={work.extras.disposable || ''} onChange={(e) => updateExtra('disposable', Math.max(0, Number(e.target.value)))} placeholder="0" /></div>
            <div className="field"><label>Other Extra</label><input className="input" type="number" min="0" inputMode="decimal" value={work.extras.other || ''} onChange={(e) => updateExtra('other', Math.max(0, Number(e.target.value)))} placeholder="0" /></div>
          </div>
          {manpowerSummaries.length > 0 ? (
            <div style={{ marginTop: 18 }}>
              <h3>Manpower by Function</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Function</th>
                      <th>Staff</th>
                      <th>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manpowerSummaries.map((summary) => (
                      <tr key={summary.serviceId}>
                        <td>{summary.dayLabel || '-'}</td>
                        <td><b>{summary.mealLabel}</b></td>
                        <td>{summary.people}</td>
                        <td><b>{money(summary.cost)}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          <div className="action-row" style={{ marginTop: 14 }}>
            <button
              className="ghost-button"
              type="button"
              onClick={() => router.push('/app/manpower')}
            >
              Edit Manpower
            </button>
          </div>
        </div>

        <div className="glass-card">
          <h2>Final Price</h2>
          <div className="two-grid">
            <div className="field"><label>Average Selling Price / Cover</label><input className="input" type="number" min="0" inputMode="decimal" value={work.sellingPricePerPlate || ''} onChange={(e) => persist({ ...work, sellingPricePerPlate: Math.max(0, Number(e.target.value)) })} placeholder="Example: 350" /></div>
            <div className="field"><label>Total Selling Amount</label><input className="input" readOnly value={money(result.totalSelling)} /></div>
          </div>
          <div className="stat-grid" style={{ marginTop: 16 }}>
            <StatCard label="Total Cost" value={money(result.totalCost)} />
            <StatCard label="Total Selling" value={money(result.totalSelling)} />
            <StatCard label="Total Profit" value={money(result.totalProfit)} />
            <StatCard label="Profit Margin" value={result.totalSelling > 0 ? `${Math.round((result.totalProfit / result.totalSelling) * 100)}%` : '0%'} />
          </div>
          {!quoteReady ? (
            <div className="readiness-card" role="status">
              <div>
                <span className="section-kicker">Quotation checklist</span>
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
                <span className="section-kicker">Ready</span>
                <h3>Your quotation is ready to generate</h3>
              </div>
              <span className="badge green">All details complete</span>
            </div>
          )}
          <div className="action-row" style={{ marginTop: 18 }}>
            <button className="primary-button" disabled={!quoteReady} onClick={() => router.push('/app/pdf')}>Next: Generate PDF</button>
            <button className="ghost-button" onClick={() => router.push('/app/manpower')}>Back to Manpower</button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
