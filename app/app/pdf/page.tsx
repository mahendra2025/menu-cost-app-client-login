'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell, { LockedCard } from '../../components/AppShell';
import { buildGroceryList, downloadGroceryListCsv } from '../../../lib/groceryList';
import { calculate, getSession, loadWork } from '../../../lib/store';
import type { Session, WorkState } from '../../../lib/types';

function money(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export default function PdfPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [work, setWork] = useState<WorkState | null>(null);
  const [groceryMessage, setGroceryMessage] = useState('');

  useEffect(() => {
    const current = getSession();
    setSession(current);
    if (current) setWork(loadWork(current.tenantId));
  }, []);

  if (!work || !session) return <AppShell title="PDF"><div className="content-grid"><div className="glass-card">Loading...</div></div></AppShell>;
  if (session.status === 'EXPIRED') return <AppShell title="PDF"><LockedCard /></AppShell>;

  const result = calculate(work);
  const profile = work.profile;
  const missingRateCount = work.menu.filter(
    (item) => !(Number(item.costPerPlate) > 0),
  ).length;
  const quoteIssues = [
    work.menu.length === 0 ? 'Add menu dishes' : '',
    result.totalCovers <= 0 ? 'Enter member counts' : '',
    missingRateCount > 0 ? `Enter ${missingRateCount} missing dish rate${missingRateCount === 1 ? '' : 's'}` : '',
    work.sellingPricePerPlate <= 0 ? 'Enter a selling price' : '',
  ].filter(Boolean);

  function downloadGroceryList() {
    if (!work) return;
    if (!work.menu.length) {
      setGroceryMessage('Add menu dishes before downloading the grocery list.');
      return;
    }
    if (!(result.totalCovers > 0)) {
      setGroceryMessage('Enter members for each meal or the event guest count before downloading the grocery list.');
      return;
    }

    const groceryList = buildGroceryList(work);
    if (!groceryList.items.length) {
      setGroceryMessage('No selected dishes have saved ingredient recipes yet.');
      return;
    }

    downloadGroceryListCsv(work, groceryList);
    setGroceryMessage(
      groceryList.unmatchedDishes.length
        ? `Downloaded ${groceryList.items.length} ingredients. ${groceryList.unmatchedDishes.length} dish${groceryList.unmatchedDishes.length === 1 ? '' : 'es'} still need recipes.`
        : `Downloaded ${groceryList.items.length} combined ingredients for ${result.totalCovers} meal covers.`,
    );
  }

  return (
    <AppShell title="PDF" subtitle="Step 5 of 6: print or save quotation as PDF">
      <section className="content-grid">
        <div className="glass-card no-print">
          {quoteIssues.length > 0 ? (
            <div className="readiness-card">
              <div>
                <span className="section-kicker">Draft quotation</span>
                <h3>{quoteIssues.join(' • ')}</h3>
                <p>You can still print a draft, or return to complete the quotation first.</p>
              </div>
              <button
                className="ghost-button"
                type="button"
                onClick={() => router.push(work.menu.length === 0 || missingRateCount > 0 ? '/app/menu' : result.totalCovers <= 0 ? '/app/event' : '/app/cost')}
              >
                Complete Details
              </button>
            </div>
          ) : (
            <div className="readiness-card is-ready">
              <div>
                <span className="section-kicker">Ready to share</span>
                <h3>Quotation details are complete</h3>
              </div>
              <span className="badge green">Ready</span>
            </div>
          )}
          <div className="action-row">
            <button className="primary-button" onClick={() => window.print()}>{quoteIssues.length ? 'Print Draft PDF' : 'Print / Save PDF'}</button>
            <button className="ghost-button" onClick={downloadGroceryList}>Download Grocery List</button>
            <span className="muted">Browser print window opens. Choose “Save as PDF”.</span>
          </div>
          {groceryMessage ? <p className="muted" role="status"><b>{groceryMessage}</b></p> : null}
        </div>

        <article className="pdf-paper">
          <header className="pdf-header">
            <div className="pdf-title">
              <h1>{profile.businessName || session.businessName || 'Menu Cost App'}</h1>
              <p>{profile.ownerName ? `${profile.ownerName} • ` : ''}{profile.phone}{profile.city ? ` • ${profile.city}` : ''}</p>
            </div>
            <div className="pdf-logo">{profile.logoText || 'MC'}</div>
          </header>

          <section className="print-section">
            <h3>Event Details</h3>
            <div className="summary-line"><span>Client Name</span><b>{work.event.clientName || '-'}</b></div>
            <div className="summary-line"><span>Event Name</span><b>{work.event.eventName || '-'}</b></div>
            <div className="summary-line"><span>Event Date</span><b>{work.event.eventDate || '-'}</b></div>
            <div className="summary-line"><span>Function Type</span><b>{work.event.functionType || '-'}</b></div>
            <div className="summary-line"><span>Venue</span><b>{work.event.venue || '-'}</b></div>
            <div className="summary-line"><span>Total Meal Covers</span><b>{result.totalCovers}</b></div>
          </section>

          {result.serviceSummaries.some((service) => service.serviceId !== 'default') ? (
            <section className="print-section">
              <h3>Meal-wise Cost Summary</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Day</th><th>Meal</th><th>Members</th><th>Food / Plate</th><th>Food Total</th></tr></thead>
                  <tbody>
                    {result.serviceSummaries.map((service) => (
                      <tr key={service.serviceId}>
                        <td>{service.dayLabel || '-'}</td>
                        <td><b>{service.mealLabel}</b></td>
                        <td>{service.pax}</td>
                        <td>{money(service.menuCostPerPlate)}</td>
                        <td><b>{money(service.totalCost)}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section className="print-section">
            <h3>Menu</h3>
            {work.menu.length === 0 ? <p>No menu items added.</p> : null}
            <div className="table-wrap">
              <table>
                <thead><tr><th>Service</th><th>Dish</th><th>Category</th><th>Members</th><th>Cost / Plate</th><th>Total</th></tr></thead>
                <tbody>
                  {result.menuBreakdown.map((item) => (
                    <tr key={item.id}>
                      <td>{item.mealLabel ? `${item.dayLabel ? `${item.dayLabel} • ` : ''}${item.mealLabel}` : 'Event Menu'}</td>
                      <td><b>{item.name}</b></td>
                      <td>{item.category}</td>
                      <td>{item.effectivePax}</td>
                      <td>{money(item.adjustedCostPerPlate)}</td>
                      <td>{money(item.itemTotalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="print-section">
            <h3>Cost Summary</h3>
            <div className="summary-line"><span>Food Cost</span><b>{money(result.menuFoodTotal)}</b></div>
            <div className="summary-line"><span>Extra Cost</span><b>{money(result.extrasTotal)}</b></div>
            <div className="summary-line"><span>Total Cost</span><b>{money(result.totalCost)}</b></div>
            <div className="summary-line"><span>Average Selling / Cover</span><b>{money(result.sellingPricePerPlate)}</b></div>
            <div className="summary-line total"><span>Total Quotation Amount</span><b>{money(result.totalSelling)}</b></div>
          </section>

          <section className="print-section">
            <p><b>Note:</b> This quotation is generated from menu costing inputs. Final amount may change if menu, pax, service, transport or venue requirements change.</p>
          </section>
        </article>
      </section>
    </AppShell>
  );
}
