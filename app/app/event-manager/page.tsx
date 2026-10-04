'use client';

import { useEffect, useRef, useState } from 'react';
import AppShell from '../../components/AppShell';
import { calculate, flushWorkSave, getSession, loadWork, saveWork } from '../../../lib/store';
import { EVENT_STATUSES, validateAttachment } from '../../../lib/eventFiles';
import type { WorkState } from '../../../lib/types';
import styles from './page.module.css';

type EventRow = { costingId: string; eventName: string; clientName: string; eventDate: string; menuCount: number; totalCost: number; totalCovers: number; kind: string; status: string };
type Attachment = { id: string; name: string; size: number };
type Plan = { status: string; phone: string; email: string; notes: string };
type Detail = { work: WorkState; file: Plan & { attachments: Attachment[] } };
const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const date = (s: string) => s ? new Date(`${s.slice(0, 10)}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date not set';
async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: 'no-store', ...init });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Could not complete this action. Please try again.');
  return body;
}
async function preserveCurrent() {
  const session = getSession();
  if (!session || session.role !== 'CLIENT') throw new Error('Please sign in to manage events.');
  const work = loadWork(session.tenantId);
  if (work.event.eventName || work.event.clientName || work.menu.length || work.event.rawMenuText || work.event.eventDate || work.event.pax > 0 || work.sellingPricePerPlate > 0 || work.manpower.some(row => Number(row.quantity) > 0) || Object.values(work.extras).some(value => Number(value) > 0)) {
    const totals = calculate(work);
    await request('/api/client/drafts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ work, ...totals }) });
  }
  return session;
}

export default function EventManager() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const detailVersion = useRef(0);

  async function refresh() {
    setLoading(true); setError('');
    try {
      await preserveCurrent();
      const [drafts, completed, plans] = await Promise.all([
        request('/api/client/drafts?limit=100'), request('/api/client/costings?limit=100'), request('/api/client/event-files'),
      ]);
      const statuses = new Map<string, string>(plans.files.map((file: { costingId: string; status: string }) => [file.costingId, file.status]));
      const rows = new Map<string, EventRow>();
      for (const row of completed.costings) rows.set(row.costingId, { ...row, kind: 'Costing saved', status: statuses.get(row.costingId) || 'Enquiry' });
      for (const row of drafts.drafts) rows.set(row.costingId, { ...row, kind: 'Draft costing', status: statuses.get(row.costingId) || 'Enquiry' });
      setEvents([...rows.values()].sort((a, b) => (a.eventDate || '9999').localeCompare(b.eventDate || '9999')));
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); const id = new URLSearchParams(window.location.search).get('costingId'); if (id) void open(id); }, []);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function open(id: string) {
    if (dirty && !window.confirm('Discard unsaved planning changes?')) return;
    const version = ++detailVersion.current;
    setSelected(id); setDetail(null); setPlan(null); setDirty(false); setError(''); setNotice('');
    try {
      const data: Detail = await request(`/api/client/event-files?costingId=${encodeURIComponent(id)}`);
      if (version !== detailVersion.current) return;
      setDetail(data);
      const { status, phone, email, notes } = data.file;
      setPlan({ status, phone, email, notes });
    } catch (e) { if (version === detailVersion.current) setError((e as Error).message); }
  }
  function change(key: keyof Plan, value: string) { setPlan(p => p && { ...p, [key]: value }); setDirty(true); setNotice(''); }
  async function save() {
    setBusy(true); setError(''); setNotice('');
    try {
      await request(`/api/client/event-files?costingId=${encodeURIComponent(selected)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(plan) });
      setEvents(rows => rows.map(row => row.costingId === selected ? { ...row, status: plan!.status } : row));
      setDirty(false); setNotice('Planning details saved.');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function navigate(path: string, fresh = false) {
    if (dirty && !window.confirm('Discard unsaved planning changes?')) return;
    setBusy(true); setError('');
    try {
      const session = await preserveCurrent();
      if (!fresh && detail) { saveWork(session.tenantId, detail.work); flushWorkSave(session.tenantId); }
      window.location.assign(path);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }
  async function upload(file: File) {
    setBusy(true); setError(''); setNotice('');
    try {
      validateAttachment(file.name, file.size);
      const result = await request(`/api/client/event-files/attachments?costingId=${encodeURIComponent(selected)}&name=${encodeURIComponent(file.name)}`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file });
      setDetail(d => d && { ...d, file: { ...d.file, attachments: [result.attachment, ...d.file.attachments] } });
      setNotice('File attached.');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); if (fileInput.current) fileInput.current.value = ''; }
  }
  async function remove(file: Attachment) {
    if (!window.confirm(`Remove ${file.name} from this event?`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await request(`/api/client/event-files/attachments?id=${encodeURIComponent(file.id)}`, { method: 'DELETE' });
      setDetail(d => d && { ...d, file: { ...d.file, attachments: d.file.attachments.filter(a => a.id !== file.id) } });
      setNotice('Attachment removed.');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const visible = events.filter(row => (filter === 'All' || row.status === filter) && `${row.eventName} ${row.clientName} ${row.eventDate}`.toLowerCase().includes(query.toLowerCase()));
  const totals = detail ? calculate(detail.work) : null;

  return <AppShell title="Event Manager" subtitle="Keep each event’s plans, menus, costs and documents together.">
    <div className={styles.manager}>
      <div className={styles.toolbar}>
        <p>{events.length} event files <span>Latest 100 drafts and 100 saved costings</span></p>
        <button className="primary-button" disabled={busy || loading} onClick={() => navigate('/app/event?new=1', true)}>Create event</button>
      </div>
      {error && <div className={styles.error} role="alert">{error} {loading ? null : <button type="button" disabled={busy} onClick={() => selected ? open(selected) : refresh()}>Retry loading</button>}</div>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      <div className={styles.workspace}>
        <section className={styles.files} aria-label="Event files">
          <label>Find an event<input type="search" placeholder="Event, client or date" value={query} onChange={e => setQuery(e.target.value)} /></label>
          <label>Planning status<select value={filter} onChange={e => setFilter(e.target.value)}><option>All</option>{EVENT_STATUSES.map(status => <option key={status}>{status}</option>)}</select></label>
          <div className={styles.list}>
            {loading ? <p role="status">Loading event files…</p> : visible.length ? visible.map(row => <button disabled={busy} className={`${styles.event} ${selected === row.costingId ? styles.selected : ''}`} key={row.costingId} onClick={() => open(row.costingId)} aria-pressed={selected === row.costingId}>
              <span className={styles.eventDate}>{date(row.eventDate)}</span><strong>{row.eventName || 'Untitled event'}</strong><span>{row.clientName || 'Client not set'}</span>
              <div><span className={styles.badge}>{row.status}</span><span>{money(row.totalCost)}</span></div>
            </button>) : <p>{events.length ? 'No events match your search.' : 'Create an event to start its file. Your saved events will appear here.'}</p>}
          </div>
        </section>
        <section className={styles.detail} aria-label="Selected event file" aria-busy={Boolean(selected && !detail && !error)}>
          {!detail || !plan ? <div className={styles.empty}><h2>{selected ? (error ? 'Event file unavailable' : 'Opening event file…') : 'Everything for your next event'}</h2><p>{selected ? (error ? 'Retry loading or select another event.' : 'Loading the menu, costs and planning details.') : 'Select an event to manage its client details, planning notes and attachments.'}</p></div> : <>
            <header className={styles.heading}><div><p>{date(detail.work.event.eventDate)}</p><h2>{detail.work.event.eventName || 'Untitled event'}</h2><p>{detail.work.event.clientName || 'Client not set'}</p></div><span className={styles.badge}>{plan.status}</span></header>
            <dl className={styles.facts}><div><dt>Venue</dt><dd>{[detail.work.event.venue, detail.work.event.city].filter(Boolean).join(', ') || 'Not set'}</dd></div><div><dt>Guests</dt><dd>{detail.work.event.pax || 'Not set'}</dd></div><div><dt>Function</dt><dd>{detail.work.event.functionType || 'Not set'}</dd></div></dl>
            <div className={styles.actions}>{[['Edit event & menu', '/app/event?resume=1'], ['Review costs', '/app/final-costing'], ['Open quotation', '/app/quotation']].map(([label, path]) => <button className="ghost-button" disabled={busy} key={path} onClick={() => navigate(path)}>{label}</button>)}</div>
            <section className={styles.section}><h3>Menu & costs</h3><dl className={styles.facts}><div><dt>Menu dishes</dt><dd>{detail.work.menu.length}</dd></div><div><dt>Total cost</dt><dd>{money(totals!.totalCost)}</dd></div><div><dt>Selling value</dt><dd>{money(totals!.totalSelling)}</dd></div></dl>
              {detail.work.menu.length ? <details><summary>View menu dishes</summary><ul className={styles.menu}>{detail.work.menu.map((dish, index) => <li key={`${dish.id}-${index}`}><span>{dish.name}</span><small>{dish.category}</small></li>)}</ul></details> : <p>No menu yet. Choose “Edit event & menu” to add dishes.</p>}
            </section>
            <form className={styles.section} onSubmit={e => { e.preventDefault(); void save(); }}><h3>Event planning</h3><fieldset disabled={busy} className={styles.fields}>
              <label>Status<select value={plan.status} onChange={e => change('status', e.target.value)}>{EVENT_STATUSES.map(status => <option key={status}>{status}</option>)}</select></label>
              <label>Client phone<input type="tel" maxLength={60} value={plan.phone} onChange={e => change('phone', e.target.value)} /></label>
              <label>Client email<input type="email" maxLength={254} value={plan.email} onChange={e => change('email', e.target.value)} /></label>
              <label className={styles.notes}>Planning notes<textarea rows={5} maxLength={10000} placeholder="Schedule, venue instructions, client requests and follow-ups" value={plan.notes} onChange={e => change('notes', e.target.value)} /></label>
            </fieldset><div className={styles.actions}><button className="primary-button" disabled={busy || !dirty} type="submit">Save planning details</button>{dirty && <span>Unsaved changes</span>}</div></form>
            <section className={styles.section}><h3>Attachments</h3><p>Menus, venue plans and client documents. Up to 5 MB per file.</p><label className={styles.upload}>Attach a file<input ref={fileInput} disabled={busy} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.csv,.txt" onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file); }} /></label>
              <ul className={styles.attachments}>{detail.file.attachments.map(file => <li key={file.id}><a href={`/api/client/event-files/attachments?id=${encodeURIComponent(file.id)}`}><strong>{file.name}</strong><small>{Math.max(1, Math.round(file.size / 1024))} KB · Download</small></a><button type="button" className="ghost-button" disabled={busy} onClick={() => remove(file)} aria-label={`Remove ${file.name}`}>Remove</button></li>)}</ul>
              {!detail.file.attachments.length && <p>No files attached yet.</p>}
            </section>
          </>}
        </section>
      </div>
    </div>
  </AppShell>;
}
