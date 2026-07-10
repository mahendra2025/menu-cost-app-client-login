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
  const [message, setMessage] = useState('');

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

  async function handleFile(file?: File) {
    if (!file || !work || !session) return;
    updateEvent('uploadFileName', file.name);
    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
      const text = await file.text();
      const next = { ...work, event: { ...work.event, uploadFileName: file.name, rawMenuText: text } };
      setWork(next);
      saveWork(session.tenantId, next);
    } else {
      setMessage('PDF/image file selected. Paste menu text below for dish detection, or add dishes manually on next page.');
    }
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
    <AppShell title="Event Details + Upload Menu" subtitle="First page: client details, pax and menu upload">
      <section className="content-grid">

        <div className="glass-card">
          <h2>Event Information</h2>
          <div className="form-grid">
            <div className="three-grid">
              <div className="field"><label>Client Name</label><input className="input" value={work.event.clientName} onChange={(e) => updateEvent('clientName', e.target.value)} placeholder="Client name" /></div>
              <div className="field"><label>Event Name</label><input className="input" value={work.event.eventName} onChange={(e) => updateEvent('eventName', e.target.value)} placeholder="Wedding / Birthday / Corporate" /></div>
              <div className="field"><label>Event Date</label><input className="input" type="date" value={work.event.eventDate} onChange={(e) => updateEvent('eventDate', e.target.value)} /></div>
            </div>
            <div className="three-grid">
              <div className="field"><label>Function Type</label><input className="input" value={work.event.functionType} onChange={(e) => updateEvent('functionType', e.target.value)} placeholder="Lunch / Dinner / Breakfast" /></div>
              <div className="field"><label>Pax / Guests</label><input className="input" type="number" value={work.event.pax || ''} onChange={(e) => updateEvent('pax', Number(e.target.value))} placeholder="300" /></div>
              <div className="field"><label>City</label><input className="input" value={work.event.city} onChange={(e) => updateEvent('city', e.target.value)} placeholder="Silvassa" /></div>
            </div>
            <div className="field"><label>Venue</label><input className="input" value={work.event.venue} onChange={(e) => updateEvent('venue', e.target.value)} placeholder="Venue / Address" /></div>
          </div>
        </div>

        <div className="glass-card">
          <h2>Upload Menu</h2>
          <div className="form-grid">
            <div className="field">
              <label>Menu File</label>
              <input className="input" type="file" accept=".txt,.csv,.pdf,image/*" onChange={(e) => handleFile(e.target.files?.[0])} />
              {work.event.uploadFileName ? <p className="muted">Selected: <b>{work.event.uploadFileName}</b></p> : null}
            </div>
            <div className="field">
              <label>Paste Menu Text</label>
              <textarea className="textarea" value={work.event.rawMenuText} onChange={(e) => updateEvent('rawMenuText', e.target.value)} placeholder="Paste menu here: Orange Juice / Manchow Soup / Paneer Tikka / Paneer Butter Masala / Naan / Dal Fry / Jeera Rice / Gulab Jamun" />
            </div>
            {message ? <p className="muted"><b>{message}</b></p> : null}
            <div className="action-row">
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
                      uploadFileName: '',
                    },
                    menu: [],
                  };
                  setWork(next);
                  saveWork(session.tenantId, next);
                  setMessage('Old event and menu data cleared.');
                }}
              >
                Clear Page Data
              </button>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
