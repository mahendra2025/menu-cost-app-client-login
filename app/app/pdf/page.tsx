'use client';

import { useEffect, useState } from 'react';
import AppShell, { LockedCard } from '../../components/AppShell';
import { calculate, getSession, loadWork } from '../../../lib/store';
import type { Session, WorkState } from '../../../lib/types';

function money(value: number) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export default function PdfPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [work, setWork] = useState<WorkState | null>(null);

  useEffect(() => {
    const current = getSession();
    setSession(current);
    if (current) setWork(loadWork(current.tenantId));
  }, []);

  if (!work || !session) return <AppShell title="PDF"><div className="content-grid"><div className="glass-card">Loading...</div></div></AppShell>;
  if (session.status === 'EXPIRED') return <AppShell title="PDF"><LockedCard /></AppShell>;

  const result = calculate(work);
  const profile = work.profile;

  return (
    <AppShell title="PDF" subtitle="Fourth page: print or save quotation as PDF">
      <section className="content-grid">
        <div className="glass-card no-print">
          <div className="action-row">
            <button className="primary-button" onClick={() => window.print()}>Print / Save PDF</button>
            <span className="muted">Browser print window opens. Choose “Save as PDF”.</span>
          </div>
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
            <div className="summary-line"><span>Pax</span><b>{result.pax}</b></div>
          </section>

          <section className="print-section">
            <h3>Menu</h3>
            <p>If one category has multiple dishes, that category is treated as one shared portion and dish cost is split equally.</p>
            {work.menu.length === 0 ? <p>No menu items added.</p> : null}
            <div className="table-wrap">
              <table>
                <thead><tr><th>Dish</th><th>Category</th><th>Portion</th><th>Adjusted Cost / Plate</th></tr></thead>
                <tbody>
                  {result.menuBreakdown.map((item) => (
                    <tr key={item.id}>
                      <td><b>{item.name}</b></td>
                      <td>{item.category}</td>
                      <td>{item.categoryCount > 1 ? `1/${item.categoryCount}` : 'Full'}</td>
                      <td>{money(item.adjustedCostPerPlate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="print-section">
            <h3>Cost Summary</h3>
            <div className="summary-line"><span>Menu Cost / Plate</span><b>{money(result.menuCostPerPlate)}</b></div>
            <div className="summary-line"><span>Extra Cost Total</span><b>{money(result.extrasTotal)}</b></div>
            <div className="summary-line"><span>Extra Cost / Plate</span><b>{money(result.extraPerPlate)}</b></div>
            <div className="summary-line"><span>Final Cost / Plate</span><b>{money(result.finalCostPerPlate)}</b></div>
            <div className="summary-line"><span>Selling Price / Plate</span><b>{money(result.sellingPricePerPlate)}</b></div>
            <div className="summary-line total"><span>Total Amount</span><b>{money(result.totalSelling)}</b></div>
          </section>

          <section className="print-section">
            <p><b>Note:</b> This quotation is generated from menu costing inputs. Final amount may change if menu, pax, service, transport or venue requirements change.</p>
          </section>
        </article>
      </section>
    </AppShell>
  );
}
