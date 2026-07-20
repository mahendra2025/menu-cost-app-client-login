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
  const [staffRows, setStaffRows] = useState([
    { role: 'Waiter', qty: 0, rate: 750 },
    { role: 'Captain', qty: 0, rate: 1500 },
    { role: 'Cook', qty: 0, rate: 2500 },
    { role: 'Helper / Masi', qty: 0, rate: 700 },
    { role: 'Cleaning', qty: 0, rate: 600 },
  ]);

  useEffect(() => {
    const current = getSession();
    setSession(current);
    if (current) setWork(loadWork(current.tenantId));
  }, []);

  if (!work || !session) return <AppShell title="Cost"><div className="content-grid"><div className="glass-card">Loading...</div></div></AppShell>;
  if (session.status === 'EXPIRED') return <AppShell title="Cost"><LockedCard /></AppShell>;

  const result = calculate(work);
  const hasWeddingServices = result.serviceSummaries.some(
    (service) => service.serviceId !== 'default',
  );

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

  function updateStaffRow(index: number, key: 'qty' | 'rate', value: number) {
    const nextRows = staffRows.map((row, rowIndex) => (
      rowIndex === index ? { ...row, [key]: value } : row
    ));
    setStaffRows(nextRows);
    const staffTotal = nextRows.reduce((sum, row) => sum + (Number(row.qty) || 0) * (Number(row.rate) || 0), 0);
    updateExtra('staff', staffTotal);
  }

  return (
    <AppShell title="Cost" subtitle="Third page: clean costing with dish cost and extra cost">
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

        <div className="glass-card">
          <h2>Dish Cost Table</h2>
          <p className="muted">If one category has multiple dishes, that category is treated as one shared portion and the dish cost is split equally.</p>
          {work.menu.length === 0 ? <p className="muted">No dishes found. Add menu items first.</p> : null}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Service</th><th>Dish</th><th>Category</th><th>Members</th><th>Base Cost / Plate</th><th>Applied Portion</th><th>Adjusted Cost / Plate</th><th>Total Cost</th></tr></thead>
              <tbody>
                {result.menuBreakdown.map((item) => (
                  <tr key={item.id}>
                    <td>{item.mealLabel ? `${item.dayLabel ? `${item.dayLabel} • ` : ''}${item.mealLabel}` : 'Event Menu'}</td>
                    <td><b>{item.name}</b></td>
                    <td>{item.category}</td>
                    <td>{item.effectivePax}</td>
                    <td>{money(item.baseCostPerPlate)}</td>
                    <td>{item.categoryCount > 1 ? `1/${item.categoryCount}` : 'Full'}</td>
                    <td>{money(item.adjustedCostPerPlate)}</td>
                    <td>{money(item.itemTotalCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card">
          <h2>Extra Cost</h2>
          <div className="three-grid">
            <div className="field"><label>Staff Cost</label><input className="input" type="number" readOnly value={work.extras.staff || ''} placeholder="0" /></div>
            <div className="field"><label>Transport</label><input className="input" type="number" min="0" inputMode="decimal" value={work.extras.transport || ''} onChange={(e) => updateExtra('transport', Math.max(0, Number(e.target.value)))} placeholder="0" /></div>
            <div className="field"><label>Gas / Fuel</label><input className="input" type="number" min="0" inputMode="decimal" value={work.extras.gasFuel || ''} onChange={(e) => updateExtra('gasFuel', Math.max(0, Number(e.target.value)))} placeholder="0" /></div>
          </div>
          <div className="two-grid" style={{ marginTop: 14 }}>
            <div className="field"><label>Disposable</label><input className="input" type="number" min="0" inputMode="decimal" value={work.extras.disposable || ''} onChange={(e) => updateExtra('disposable', Math.max(0, Number(e.target.value)))} placeholder="0" /></div>
            <div className="field"><label>Other Extra</label><input className="input" type="number" min="0" inputMode="decimal" value={work.extras.other || ''} onChange={(e) => updateExtra('other', Math.max(0, Number(e.target.value)))} placeholder="0" /></div>
          </div>
          <div className="staff-cost-panel" style={{ marginTop: 18 }}>
            <div className="section-head">
              <div>
                <h3>Advanced Staff Cost</h3>
                <p className="muted">Add staff role quantity and rate. Total auto-adds to Staff Cost.</p>
              </div>
              <strong>{money(work.extras.staff || 0)}</strong>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {staffRows.map((row, index) => (
                    <tr key={row.role}>
                      <td><b>{row.role}</b></td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          value={row.qty || ''}
                          onChange={(e) => updateStaffRow(index, 'qty', Number(e.target.value))}
                          placeholder="0"
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          value={row.rate || ''}
                          onChange={(e) => updateStaffRow(index, 'rate', Number(e.target.value))}
                          placeholder="0"
                        />
                      </td>
                      <td>{money((row.qty || 0) * (row.rate || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="action-row" style={{ marginTop: 14 }}>
              <button
                className="ghost-button"
                onClick={() => {
                  setStaffRows([
                    { role: 'Waiter', qty: 0, rate: 750 },
                    { role: 'Captain', qty: 0, rate: 1500 },
                    { role: 'Cook', qty: 0, rate: 2500 },
                    { role: 'Helper / Masi', qty: 0, rate: 700 },
                    { role: 'Cleaning', qty: 0, rate: 600 },
                  ]);
                  updateExtra('staff', 0);
                }}
              >
                Reset Staff
              </button>
            </div>
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
          <div className="action-row" style={{ marginTop: 18 }}>
            <button className="primary-button" onClick={() => router.push('/app/pdf')}>Next: Generate PDF</button>
            <button className="ghost-button" onClick={() => router.push('/app/menu')}>Back to Menu</button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
