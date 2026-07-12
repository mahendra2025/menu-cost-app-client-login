'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell, { LockedCard } from '../../components/AppShell';
import { getSession, loadWork, parseMenuText, saveWork } from '../../../lib/store';
import type { Session, WorkState } from '../../../lib/types';

export default function EventPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [work, setWork] = useState<WorkState | null>(null);

  useEffect(() => {
    const current = getSession();
    setSession(current);
    if (current) setWork(loadWork(current.tenantId));
  }, []);

  if (!work || !session) return <AppShell title="Event Details"><div className="content-grid"><div className="glass-card">Loading...</div></div></AppShell>;
  if (session.status === 'EXPIRED') return <AppShell title="Event Details"><LockedCard /></AppShell>;

  function updateEvent(key: keyof WorkState['event'], value: string | number) {
    if (!work || !session) return;
    const next = { ...work, event: { ...work.event, [key]: value } };
    setWork(next);
    saveWork(session.tenantId, next);
  }

  function detectAndNext() {
    if (!work || !session) return;
    const detected = parseMenuText(work.event.rawMenuText);
    const next = { ...work, menu: detected.length ? detected : work.menu };
    setWork(next);
    saveWork(session.tenantId, next);
    router.push('/app/menu');
  }

  return (
    <AppShell title="Event Details + Menu" subtitle="First page: client details, pax and pasted menu text">
      <section className="content-grid">
        <div className="glass-card">
          <div className="section-kicker">Step 1 of 5</div>
          <h2>Event Information</h2>
          <div className="helper-card" style={{ marginBottom: 16 }}>
            <b>Start with the basics</b>
            <p>Fill the event details first, then paste the full menu below in one block. We will split and detect dishes for you on the next step.</p>
          </div>
          <div className="form-grid">
            <div className="three-grid">
              <div className="field"><label>Client Name</label><input className="input input-large" value={work.event.clientName} onChange={(e) => updateEvent('clientName', e.target.value)} placeholder="Client name" /></div>
              <div className="field"><label>Event Name</label><input className="input input-large" value={work.event.eventName} onChange={(e) => updateEvent('eventName', e.target.value)} placeholder="Wedding / Birthday / Corporate" /></div>
              <div className="field"><label>Event Date</label><input className="input input-large" type="date" value={work.event.eventDate} onChange={(e) => updateEvent('eventDate', e.target.value)} /></div>
            </div>
            <div className="three-grid">
              <div className="field"><label>Function Type</label><input className="input input-large" value={work.event.functionType} onChange={(e) => updateEvent('functionType', e.target.value)} placeholder="Lunch / Dinner / Breakfast" /></div>
              <div className="field"><label>Pax / Guests</label><input className="input input-large" type="number" min="1" inputMode="numeric" value={work.event.pax || ''} onChange={(e) => updateEvent('pax', Math.max(0, Number(e.target.value)))} placeholder="300" /></div>
              <div className="field"><label>City</label><input className="input input-large" value={work.event.city} onChange={(e) => updateEvent('city', e.target.value)} placeholder="Silvassa" /></div>
            </div>
            <div className="field"><label>Venue</label><input className="input input-large" value={work.event.venue} onChange={(e) => updateEvent('venue', e.target.value)} placeholder="Venue / Address" /></div>
          </div>
        </div>

        <div className="glass-card">
          <div className="section-kicker">Paste Only</div>
          <h2>Paste Menu</h2>
          <div className="helper-card" style={{ marginBottom: 16 }}>
            <b>One message is enough</b>
            <p>Paste the full menu from WhatsApp, notes, or email. Separate items with new lines, commas, or slashes.</p>
          </div>
          <div className="form-grid">
            <div className="field">
              <label>Paste Menu Text</label>
              <textarea className="textarea textarea-large" value={work.event.rawMenuText} onChange={(e) => updateEvent('rawMenuText', e.target.value)} placeholder="Paste menu here: Orange Juice / Manchow Soup / Paneer Tikka / Paneer Butter Masala / Naan / Dal Fry / Jeera Rice / Gulab Jamun" />
            </div>
            <div className="action-row page-actions">
              <button className="primary-button" onClick={detectAndNext}>Next: Check Menu</button>
              <button
                className="ghost-button"
                onClick={() => {
                  const next = {
                    ...work,
                    event: {
                      ...work.event,
                      clientName: '',
                      eventName: '',
                      eventDate: '',
                      functionType: '',
                      pax: 0,
                      city: '',
                      venue: '',
                      rawMenuText: '',
                    },
                    menu: [],
                  };
                  setWork(next);
                  saveWork(session.tenantId, next);
                }}
              >
                Clear This Page
              </button>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
