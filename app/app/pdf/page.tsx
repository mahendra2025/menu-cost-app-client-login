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

function displayDate(value: string) {
  if (!value) return 'Date to be confirmed';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function quotationReference(work: WorkState) {
  const sourceDate = new Date(work.updatedAt);
  const safeDate = Number.isNaN(sourceDate.getTime())
    ? new Date()
    : sourceDate;
  const datePart = safeDate
    .toISOString()
    .slice(0, 10)
    .replaceAll('-', '');
  const clientPart = (work.event.clientName || 'CLIENT')
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 5)
    .toUpperCase();

  return `QT-${datePart}-${clientPart || 'CLIENT'}`;
}

export default function PdfPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [work, setWork] = useState<WorkState | null>(null);
  const [groceryMessage, setGroceryMessage] = useState('');
  const [copyMessage, setCopyMessage] = useState('');

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
    work.menu.length === 0
      ? { label: 'Add menu dishes', route: '/app/menu' }
      : null,
    result.totalCovers <= 0
      ? { label: 'Enter member counts', route: '/app/event' }
      : null,
    missingRateCount > 0
      ? {
        label: `Enter ${missingRateCount} missing dish rate${missingRateCount === 1 ? '' : 's'}`,
        route: '/app/menu',
      }
      : null,
    work.sellingPricePerPlate <= 0
      ? { label: 'Enter a selling price', route: '/app/cost' }
      : null,
  ].filter((issue): issue is { label: string; route: string } => Boolean(issue));
  const quotationMeals = result.serviceSummaries.map((service) => ({
    ...service,
    dishes: result.menuBreakdown.filter(
      (item) => (item.serviceId ?? 'default') === service.serviceId,
    ),
  }));
  const preparedDate = new Date(work.updatedAt);
  const preparedDateLabel = Number.isNaN(preparedDate.getTime())
    ? new Date().toLocaleDateString('en-IN')
    : preparedDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  const quoteReference = quotationReference(work);

  async function copyQuotationSummary() {
    if (!work || !session) return;

    const summary = [
      `${profile.businessName || session.businessName || 'Catering quotation'}`,
      `Quotation: ${quoteReference}`,
      `Client: ${work.event.clientName || 'Valued client'}`,
      `Event: ${work.event.eventName || work.event.functionType || 'Catering event'}`,
      `Date: ${displayDate(work.event.eventDate)}`,
      `Venue: ${work.event.venue || work.event.city || 'To be confirmed'}`,
      `Meal services: ${quotationMeals.length}`,
      `Total meal covers: ${result.totalCovers.toLocaleString('en-IN')}`,
      `Rate per cover: ${money(result.sellingPricePerPlate)}`,
      `Total quotation: ${money(result.totalSelling)}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summary);
      setCopyMessage('Quotation summary copied. It is ready to paste into WhatsApp or email.');
    } catch {
      setCopyMessage('Could not copy automatically. Please use Print / Save PDF instead.');
    }
  }

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
    <AppShell title="Quotation" subtitle="Step 5 of 6: review the client copy, then print or save as PDF">
      <section className="content-grid">
        <div className="glass-card quotation-toolbar no-print">
          <div className="quotation-toolbar-heading">
            <div>
              <span className="page-eyebrow">Final review</span>
              <h2>{quoteIssues.length ? 'Quotation needs attention' : 'Quotation is ready to share'}</h2>
              <p className="muted">
                {quoteIssues.length
                  ? 'Complete the highlighted details or print a clearly marked draft.'
                  : 'Internal food cost and profit are excluded from the customer copy.'}
              </p>
            </div>
            <span className={`quotation-status ${quoteIssues.length ? 'is-draft' : 'is-ready'}`}>
              {quoteIssues.length ? 'Draft' : 'Ready'}
            </span>
          </div>

          {quoteIssues.length > 0 ? (
            <div className="quotation-issue-list" role="status">
              {quoteIssues.map((issue) => (
                <button
                  key={`${issue.route}-${issue.label}`}
                  type="button"
                  onClick={() => router.push(issue.route)}
                >
                  {issue.label}
                  <span aria-hidden="true">Fix →</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="quotation-review-metrics">
            <div><small>Quotation value</small><b>{money(result.totalSelling)}</b></div>
            <div><small>Meal services</small><b>{quotationMeals.length}</b></div>
            <div><small>Total covers</small><b>{result.totalCovers.toLocaleString('en-IN')}</b></div>
            <div><small>Reference</small><b>{quoteReference}</b></div>
          </div>

          <div className="quotation-actions">
            <button className="primary-button" onClick={() => window.print()}>
              {quoteIssues.length ? 'Print draft' : 'Print / Save PDF'}
            </button>
            <button className="secondary-button" onClick={copyQuotationSummary}>Copy client summary</button>
            <button className="ghost-button" onClick={downloadGroceryList}>Download grocery list</button>
            <button className="ghost-button" onClick={() => router.push('/app/cost')}>Edit pricing</button>
            <button className="ghost-button" onClick={() => router.push('/app/profile')}>Edit business details</button>
          </div>
          <p className="quotation-print-help">In the print window, choose <b>Save as PDF</b> for a digital copy.</p>
          {copyMessage ? <div className="quotation-message is-success" role="status">{copyMessage}</div> : null}
          {groceryMessage ? <div className="quotation-message" role="status">{groceryMessage}</div> : null}
        </div>

        <div className="quotation-preview-shell">
          <div className="quotation-preview-bar no-print">
            <div>
              <span aria-hidden="true">●</span>
              <b>Customer preview</b>
              <small>A4 print layout</small>
            </div>
            <span>{quoteReference}</span>
          </div>

        <article className={`pdf-paper quotation-paper ${quoteIssues.length ? 'is-draft' : ''}`}>
          {quoteIssues.length ? <div className="quotation-draft-mark">Draft quotation</div> : null}

          <header className="quotation-header">
            <div className="quotation-brand">
              <div className="pdf-logo">{profile.logoText || 'MC'}</div>
              <div className="pdf-title">
                <h1>{profile.businessName || session.businessName || 'Menu Cost App'}</h1>
                <p>{profile.ownerName || 'Catering & event services'}</p>
                <small>{[profile.phone, profile.city].filter(Boolean).join(' • ')}</small>
              </div>
            </div>
            <div className="quotation-document-meta">
              <span>Quotation</span>
              <b>{work.event.eventName || 'Catering proposal'}</b>
              <small>Ref. {quoteReference}</small>
              <small>Prepared {preparedDateLabel}</small>
            </div>
          </header>

          <section className="quotation-intro">
            <div>
              <span className="quotation-kicker">Prepared for</span>
              <h2>{work.event.clientName || 'Valued client'}</h2>
              <p>{work.event.eventName || work.event.functionType || 'Catering event'}</p>
            </div>
            <div className="quotation-event-facts">
              <div><small>Event date</small><b>{displayDate(work.event.eventDate)}</b></div>
              <div><small>Venue</small><b>{work.event.venue || work.event.city || 'To be confirmed'}</b></div>
              <div><small>Meal covers</small><b>{result.totalCovers.toLocaleString('en-IN')}</b></div>
            </div>
          </section>

          <section className="print-section quotation-section">
            <div className="quotation-section-heading">
              <div><span>01</span><h3>Meal plan</h3></div>
              <small>{quotationMeals.length} meal{quotationMeals.length === 1 ? '' : 's'}</small>
            </div>
            {quotationMeals.length ? (
              <div className="quotation-meal-grid">
                {quotationMeals.map((meal) => (
                  <div className="quotation-meal-card" key={meal.serviceId}>
                    <span>{meal.dayLabel || 'Event'}</span>
                    <b>{meal.mealLabel}</b>
                    <small>{meal.pax.toLocaleString('en-IN')} members • {meal.dishCount} dishes</small>
                  </div>
                ))}
              </div>
            ) : <p className="quotation-empty-copy">No meals have been added yet.</p>}
          </section>

          <section className="print-section quotation-section">
            <div className="quotation-section-heading">
              <div><span>02</span><h3>Selected menu</h3></div>
              <small>{work.menu.length} dish{work.menu.length === 1 ? '' : 'es'}</small>
            </div>
            {quotationMeals.length ? (
              <div className="quotation-menu-groups">
                {quotationMeals.map((meal) => (
                  <div className="quotation-menu-group" key={meal.serviceId}>
                    <div className="quotation-menu-title">
                      <b>{meal.mealLabel}</b>
                      <span>{meal.dayLabel || 'Event menu'}</span>
                    </div>
                    <div className="quotation-dish-list">
                      {meal.dishes.map((dish) => (
                        <div key={dish.id}><b>{dish.name}</b><small>{dish.category}</small></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="quotation-empty-copy">No menu dishes have been added yet.</p>}
          </section>

          <section className="print-section quotation-section quotation-commercial">
            <div className="quotation-section-heading">
              <div><span>03</span><h3>Commercial summary</h3></div>
            </div>
            <div className="quotation-price-breakdown">
              <div><span>Rate per meal cover</span><b>{money(result.sellingPricePerPlate)}</b></div>
              <div><span>Meal services</span><b>{quotationMeals.length}</b></div>
              <div><span>Total meal covers</span><b>{result.totalCovers.toLocaleString('en-IN')}</b></div>
              <div className="quotation-grand-total"><span>Total quotation amount</span><b>{money(result.totalSelling)}</b></div>
            </div>
          </section>

          <section className="quotation-terms">
            <b>Important note</b>
            <p>This quotation is based on the menu, meal covers and event requirements listed above. The final amount may change if the menu, guest count, service scope, transport or venue requirements change.</p>
          </section>

          <footer className="quotation-footer">
            <div><span>Prepared by</span><b>{profile.ownerName || profile.businessName || session.businessName}</b></div>
            <div><span>Client acceptance</span><b>Signature &amp; date</b></div>
            <p>
              {[profile.phone, profile.city].filter(Boolean).join(' • ')}
              {[profile.phone, profile.city].filter(Boolean).length ? ' • ' : ''}
              {quoteReference}
            </p>
          </footer>
        </article>
        </div>
      </section>
    </AppShell>
  );
}
