'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppShell from '../../components/AppShell';
import {
  calculate,
  clearWork,
  flushWorkSave,
  getSession,
  loadWork,
  saveWork,
} from '../../../lib/store';
import type { Session, WorkState } from '../../../lib/types';

type Completed = {
  id: string;
  costingId: string;
  eventName: string;
  clientName: string;
  eventDate: string;
  menuCount: number;
  totalCovers: number;
  totalCost: number;
  sellingPricePerPlate: number;
  totalSelling: number;
  totalProfit: number;
  completedAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

type Draft = {
  id: string;
  costingId: string;
  eventName: string;
  clientName: string;
  eventDate: string;
  menuCount: number;
  totalCovers: number;
  totalCost: number;
  sellingPricePerPlate: number;
  totalSelling: number;
  totalProfit: number;
  updatedAt: string;
};

type Usage = {
  hasProAccess: boolean;
  limit: number;
  used: number;
  remaining: number | null;
  canStartNew: boolean;
};

type Item = {
  key: string;
  kind: 'DRAFT' | 'COMPLETED' | 'ARCHIVED';
  costingId: string;
  eventName: string;
  clientName: string;
  eventDate: string;
  menuCount: number;
  totalCovers: number;
  totalCost: number;
  totalProfit: number;
  timestamp: string;
};

const money = (value: number) =>
  `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;

function meaningful(work: WorkState) {
  return Boolean(
    work.menu.length ||
    work.event.rawMenuText.trim() ||
    work.event.eventName.trim() ||
    work.event.clientName.trim() ||
    work.event.eventDate.trim() ||
    work.event.pax > 0 ||
    work.sellingPricePerPlate > 0 ||
    work.manpower.some((row) => Number(row.quantity) > 0) ||
    Object.values(work.extras).some((value) => Number(value) > 0)
  );
}

function dateLabel(value: string) {
  if (!value) return 'Date not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function HistoryPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [completed, setCompleted] = useState<Completed[]>([]);
  const [archived, setArchived] = useState<Completed[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [tab, setTab] = useState<'ALL' | 'DRAFTS' | 'COMPLETED' | 'ARCHIVED'>('ALL');
  const [query, setQuery] = useState('');
  const [days, setDays] = useState('ALL');
  const [sort, setSort] = useState('RECENT');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const current = getSession();
    setSession(current);

    if (current?.role === 'CLIENT') {
      void bootstrap(current);
    } else {
      setLoading(false);
    }
  }, []);

  async function syncCurrent(current: Session) {
    const work = loadWork(current.tenantId);
    if (!meaningful(work)) return;

    try {
      const result = calculate(work);
      await fetch('/api/client/drafts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work,
          totalCovers: result.totalCovers,
          totalCost: result.totalCost,
          totalSelling: result.totalSelling,
          totalProfit: result.totalProfit,
        }),
      });
    } catch {}
  }

  async function bootstrap(current: Session) {
    setLoading(true);
    await syncCurrent(current);
    await loadAll();
    setLoading(false);
  }

  async function loadAll() {
    setError('');

    try {
      const [a, b, c, d] = await Promise.all([
        fetch('/api/client/costings?limit=100', { cache: 'no-store' }),
        fetch('/api/client/costings?limit=100&archived=1', { cache: 'no-store' }),
        fetch('/api/client/drafts?limit=100', { cache: 'no-store' }),
        fetch('/api/client/free-usage', { cache: 'no-store' }),
      ]);

      if (a.ok) setCompleted((await a.json()).costings || []);
      if (b.ok) setArchived((await b.json()).costings || []);
      if (c.ok) setDrafts((await c.json()).drafts || []);
      if (d.ok) setUsage(await d.json());

      if (!a.ok || !b.ok || !c.ok) {
        setError('Some history data could not be loaded.');
      }
    } catch {
      setError('Server connection failed while loading history.');
    }
  }

  const items = useMemo(() => {
    const draftRows: Item[] = drafts.map((x) => ({
      key: `draft:${x.id}`,
      kind: 'DRAFT',
      costingId: x.costingId,
      eventName: x.eventName,
      clientName: x.clientName,
      eventDate: x.eventDate,
      menuCount: x.menuCount,
      totalCovers: x.totalCovers,
      totalCost: x.totalCost,
      totalProfit: x.totalProfit,
      timestamp: x.updatedAt,
    }));

    const completedRows: Item[] = completed.map((x) => ({
      key: `complete:${x.id}`,
      kind: 'COMPLETED',
      costingId: x.costingId,
      eventName: x.eventName,
      clientName: x.clientName,
      eventDate: x.eventDate,
      menuCount: x.menuCount,
      totalCovers: x.totalCovers,
      totalCost: x.totalCost,
      totalProfit: x.totalProfit,
      timestamp: x.completedAt,
    }));

    const archivedRows: Item[] = archived.map((x) => ({
      key: `archive:${x.id}`,
      kind: 'ARCHIVED',
      costingId: x.costingId,
      eventName: x.eventName,
      clientName: x.clientName,
      eventDate: x.eventDate,
      menuCount: x.menuCount,
      totalCovers: x.totalCovers,
      totalCost: x.totalCost,
      totalProfit: x.totalProfit,
      timestamp: x.completedAt,
    }));

    let list =
      tab === 'DRAFTS' ? draftRows :
      tab === 'COMPLETED' ? completedRows :
      tab === 'ARCHIVED' ? archivedRows :
      [...draftRows, ...completedRows];

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((x) =>
        `${x.eventName} ${x.clientName} ${x.eventDate}`.toLowerCase().includes(q)
      );
    }

    if (days !== 'ALL') {
      const cutoff = Date.now() - Number(days) * 86_400_000;
      list = list.filter((x) => new Date(x.timestamp).getTime() >= cutoff);
    }

    return list.sort((a, b) => {
      if (sort === 'COST') return b.totalCost - a.totalCost;
      if (sort === 'CLIENT') return (a.clientName || a.eventName).localeCompare(b.clientName || b.eventName);
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [archived, completed, drafts, tab, query, days, sort]);

  async function startNew() {
    if (!session) return;
    await syncCurrent(session);

    const response = await fetch('/api/client/free-usage', { cache: 'no-store' });
    const data = await response.json();

    if (!response.ok || !data.canStartNew) {
      setUsage(data);
      setError(data.error || 'Your free costing limit is reached. Upgrade to Pro to start another costing.');
      return;
    }

    clearWork(session.tenantId);
    window.location.assign('/app/event?new=1');
  }

  async function loadIntoWorkspace(work: WorkState, path: string) {
    if (!session) return;
    saveWork(session.tenantId, work);
    flushWorkSave(session.tenantId);
    window.location.assign(path);
  }

  async function openDraft(costingId: string) {
    if (!session) return;
    setBusy(`open:${costingId}`);
    await syncCurrent(session);

    try {
      const response = await fetch(`/api/client/drafts?costingId=${encodeURIComponent(costingId)}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not open draft');
      await loadIntoWorkspace(data.draft.workData as WorkState, '/app/event?draft=1');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open draft.');
      setBusy('');
    }
  }

  async function openCompleted(costingId: string) {
    if (!session) return;
    setBusy(`open:${costingId}`);
    await syncCurrent(session);

    try {
      const response = await fetch(`/api/client/costings?costingId=${encodeURIComponent(costingId)}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not open costing');

      const work = data.costing.snapshot as WorkState;
      const result = calculate(work);

      await fetch('/api/client/drafts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work,
          totalCovers: result.totalCovers,
          totalCost: result.totalCost,
          totalSelling: result.totalSelling,
          totalProfit: result.totalProfit,
        }),
      });

      await loadIntoWorkspace(work, '/app/event?reopen=1');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open costing.');
      setBusy('');
    }
  }

  async function duplicate(costingId: string) {
    if (!session) return;
    setBusy(`dup:${costingId}`);
    await syncCurrent(session);

    try {
      const response = await fetch('/api/client/costings/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceCostingId: costingId }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not duplicate costing');
      await loadIntoWorkspace(data.work as WorkState, '/app/event?duplicated=1');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not duplicate costing.');
      setBusy('');
    }
  }

  async function pdf(costingId: string) {
    setBusy(`pdf:${costingId}`);
    try {
      const response = await fetch(`/api/client/costings?costingId=${encodeURIComponent(costingId)}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load costing');

      const work = data.costing.snapshot as WorkState;
      let recipes: unknown[] = [];

      try {
        const recipeResponse = await fetch('/api/recipe-ingredients', {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dishNames: work.menu.map((item) => item.name) }),
        });
        if (recipeResponse.ok) recipes = (await recipeResponse.json()).recipes || [];
      } catch {}

      const { downloadFinalCostingPdf } = await import('../../../lib/finalCostingPdf');
      downloadFinalCostingPdf(work, recipes);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create PDF.');
    } finally {
      setBusy('');
    }
  }

  async function archiveCosting(costingId: string, archivedValue: boolean) {
    setBusy(`archive:${costingId}`);
    try {
      const response = await fetch('/api/client/costings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ costingId, archived: archivedValue }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update costing');
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update costing.');
    } finally {
      setBusy('');
    }
  }

  async function deleteDraft(costingId: string) {
    if (!confirm('Delete this draft? Completed costings are not affected.')) return;

    setBusy(`delete:${costingId}`);
    try {
      const response = await fetch(`/api/client/drafts?costingId=${encodeURIComponent(costingId)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not delete draft');

      if (session) {
        const current = loadWork(session.tenantId);
        if (current.costingId === costingId) clearWork(session.tenantId);
      }

      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete draft.');
    } finally {
      setBusy('');
    }
  }

  const totalValue = completed.reduce((sum, item) => sum + Number(item.totalCost || 0), 0);

  return (
    <AppShell title="History" subtitle="Drafts, completed costings and reusable event records" hidePageTitle>
      <section className="hist-page">
        <style>{`
          .hist-page { display: grid; gap: 14px; }
          .hist-hero { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; padding: 18px 2px 8px; }
          .hist-kicker { color: #78b5ff; font-size: 10px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
          .hist-hero h1 { margin: 7px 0 6px; font-size: clamp(32px, 4vw, 46px); line-height: 1; letter-spacing: -.05em; }
          .hist-hero p { max-width: 700px; margin: 0; color: #929dac; font-size: 13px; line-height: 1.55; }
          .hist-new { min-height: 44px; padding: 0 16px; border: 0; border-radius: 11px; color: #fff; background: #1478f2; font: inherit; font-size: 12px; font-weight: 900; cursor: pointer; }
          .hist-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; }
          .hist-stat { padding: 15px; border: 1px solid #282f39; border-radius: 15px; background: #10151c; }
          .hist-stat small, .hist-stat strong, .hist-stat span { display: block; }
          .hist-stat small { color: #8390a0; font-size: 9px; font-weight: 850; letter-spacing: .04em; text-transform: uppercase; }
          .hist-stat strong { margin: 6px 0 3px; font-size: 22px; }
          .hist-stat span { color: #7d8998; font-size: 10px; }
          .hist-alert { display: flex; justify-content: space-between; gap: 12px; padding: 12px 13px; border: 1px solid rgba(255,173,66,.23); border-radius: 11px; color: #ffc16b; background: rgba(255,173,66,.07); font-size: 11px; line-height: 1.45; }
          .hist-alert a { color: #fff; font-weight: 900; }
          .hist-toolbar { display: grid; grid-template-columns: minmax(220px, 1fr) auto auto; gap: 8px; padding: 12px; border: 1px solid #282f39; border-radius: 15px; background: #10151c; }
          .hist-input { min-height: 42px; padding: 0 12px; border: 1px solid #303844; border-radius: 10px; outline: 0; color: #e9edf3; background: #151b23; font: inherit; font-size: 13px; color-scheme: dark; }
          .hist-input:focus { border-color: rgba(74,156,255,.58); box-shadow: 0 0 0 3px rgba(74,156,255,.1); }
          .hist-tabs { display: flex; gap: 4px; overflow: auto; padding: 4px; border: 1px solid #252c35; border-radius: 11px; background: #0d1117; }
          .hist-tabs button { min-height: 34px; padding: 0 10px; border: 0; border-radius: 8px; color: #919cab; background: transparent; font: inherit; font-size: 10px; font-weight: 850; cursor: pointer; white-space: nowrap; }
          .hist-tabs button.active { color: #eaf1f8; background: #242c36; }
          .hist-list { display: grid; gap: 8px; }
          .hist-row { display: grid; grid-template-columns: minmax(220px, 1.2fr) repeat(3, minmax(95px, .5fr)) auto; gap: 12px; align-items: center; padding: 14px; border: 1px solid #272e38; border-radius: 14px; background: #0e1319; }
          .hist-main { min-width: 0; }
          .hist-title { display: flex; align-items: center; gap: 7px; }
          .hist-main b, .hist-main span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .hist-main b { font-size: 13px; }
          .hist-main > span { margin-top: 4px; color: #8a96a5; font-size: 10px; }
          .hist-chip { padding: 4px 7px; border-radius: 999px; color: #8fc2ff; background: rgba(74,156,255,.1); font-size: 8px; font-weight: 900; }
          .hist-chip.draft { color: #ffc16b; background: rgba(255,173,66,.1); }
          .hist-chip.archived { color: #a3adba; background: #202731; }
          .hist-metric small, .hist-metric b { display: block; }
          .hist-metric small { color: #7e8a9a; font-size: 8px; letter-spacing: .04em; text-transform: uppercase; }
          .hist-metric b { margin-top: 4px; color: #d3dbe5; font-size: 12px; }
          .hist-actions { display: flex; gap: 5px; }
          .hist-action { min-height: 36px; padding: 0 10px; border: 1px solid #303844; border-radius: 8px; color: #bec7d2; background: #151b23; font: inherit; font-size: 10px; font-weight: 850; cursor: pointer; }
          .hist-action.primary { color: #8fc2ff; background: rgba(74,156,255,.08); }
          .hist-action.danger { color: #ff8d86; background: rgba(255,98,89,.06); }
          .hist-action:disabled { opacity: .5; cursor: wait; }
          .hist-empty { display: grid; min-height: 250px; place-items: center; align-content: center; gap: 6px; border: 1px dashed #303844; border-radius: 15px; color: #8793a2; background: #0d1117; font-size: 11px; text-align: center; }
          .hist-empty b { color: #d3dbe5; font-size: 14px; }
          @media (max-width: 1050px) {
            .hist-row { grid-template-columns: 1fr 1fr 1fr; }
            .hist-main { grid-column: 1 / -1; }
            .hist-actions { grid-column: 1 / -1; justify-content: flex-start; }
          }
          @media (max-width: 720px) {
            .hist-page { gap: 10px; }
            .hist-hero { align-items: stretch; flex-direction: column; gap: 12px; padding-top: 10px; }
            .hist-hero h1 { font-size: 28px; }
            .hist-hero p { font-size: 12px; }
            .hist-new { width: 100%; }
            .hist-stats { grid-template-columns: 1fr 1fr; gap: 7px; }
            .hist-stat { padding: 11px; border-radius: 12px; }
            .hist-toolbar { grid-template-columns: 1fr; padding: 9px; border-radius: 12px; }
            .hist-input { min-height: 44px; font-size: 16px; }
            .hist-row { grid-template-columns: 1fr 1fr; padding: 11px; }
            .hist-actions { display: grid; grid-template-columns: 1fr 1fr; }
            .hist-action { width: 100%; min-height: 40px; font-size: 11px; }
            .hist-alert { flex-direction: column; }
          }
        `}</style>

        <div className="hist-hero">
          <div>
            <span className="hist-kicker">Menu Costing Library</span>
            <h1>Costing History</h1>
            <p>Continue drafts, reopen completed events, duplicate repeat jobs, export PDFs and archive old records.</p>
          </div>
          <button className="hist-new" type="button" onClick={() => void startNew()}>+ New Costing</button>
        </div>

        <div className="hist-stats">
          <div className="hist-stat"><small>Drafts</small><strong>{drafts.length}</strong><span>Server auto-saved</span></div>
          <div className="hist-stat"><small>Completed</small><strong>{completed.length}</strong><span>Active records</span></div>
          <div className="hist-stat"><small>Costed value</small><strong>{money(totalValue)}</strong><span>Active completed total</span></div>
          <div className="hist-stat"><small>Free usage</small><strong>{usage?.hasProAccess ? 'Unlimited' : `${usage?.used ?? 0}/${usage?.limit ?? 5}`}</strong><span>{usage?.hasProAccess ? 'Pro account' : `${usage?.remaining ?? 5} remaining`}</span></div>
        </div>

        {error ? (
          <div className="hist-alert">
            <span>{error}</span>
            {usage && !usage.hasProAccess && !usage.canStartNew ? <Link href="/app/profile?upgrade=1">Upgrade Pro · ₹999</Link> : null}
          </div>
        ) : null}

        <div className="hist-toolbar">
          <input className="hist-input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search client, event or date" />
          <select className="hist-input" value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="ALL">All dates</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option>
          </select>
          <select className="hist-input" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="RECENT">Most recent</option><option value="COST">Highest cost</option><option value="CLIENT">Client A–Z</option>
          </select>
        </div>

        <div className="hist-tabs">
          {([
            ['ALL', `All ${drafts.length + completed.length}`],
            ['DRAFTS', `Drafts ${drafts.length}`],
            ['COMPLETED', `Completed ${completed.length}`],
            ['ARCHIVED', `Archived ${archived.length}`],
          ] as const).map(([value, label]) => (
            <button key={value} className={tab === value ? 'active' : ''} type="button" onClick={() => setTab(value)}>{label}</button>
          ))}
        </div>

        {loading ? <div className="hist-empty">Loading costing library…</div> : items.length === 0 ? (
          <div className="hist-empty"><b>No matching costings</b><span>Start a new costing or change the filters.</span></div>
        ) : (
          <div className="hist-list">
            {items.map((item) => {
              const isBusy = busy.includes(item.costingId);
              return (
                <article className="hist-row" key={item.key}>
                  <div className="hist-main">
                    <div className="hist-title">
                      <b>{item.eventName || item.clientName || 'Untitled Costing'}</b>
                      <span className={`hist-chip ${item.kind === 'DRAFT' ? 'draft' : item.kind === 'ARCHIVED' ? 'archived' : ''}`}>{item.kind}</span>
                    </div>
                    <span>{item.clientName || 'Client not set'} · {dateLabel(item.eventDate)} · {item.menuCount} dishes</span>
                  </div>

                  <div className="hist-metric"><small>Covers</small><b>{item.totalCovers.toLocaleString('en-IN')}</b></div>
                  <div className="hist-metric"><small>Total cost</small><b>{money(item.totalCost)}</b></div>
                  <div className="hist-metric"><small>Profit</small><b>{money(item.totalProfit)}</b></div>

                  <div className="hist-actions">
                    {item.kind === 'DRAFT' ? (
                      <>
                        <button className="hist-action primary" disabled={isBusy} onClick={() => void openDraft(item.costingId)}>Open</button>
                        <button className="hist-action danger" disabled={isBusy} onClick={() => void deleteDraft(item.costingId)}>Delete</button>
                      </>
                    ) : (
                      <>
                        <button className="hist-action primary" disabled={isBusy} onClick={() => void openCompleted(item.costingId)}>Open</button>
                        <button className="hist-action" disabled={isBusy} onClick={() => void duplicate(item.costingId)}>Duplicate</button>
                        <button className="hist-action" disabled={isBusy} onClick={() => void pdf(item.costingId)}>PDF</button>
                        <Link className="hist-action" href={`/app/quotation?costingId=${encodeURIComponent(item.costingId)}`}>Quotation</Link>
                        <button className="hist-action" disabled={isBusy} onClick={() => void archiveCosting(item.costingId, item.kind !== 'ARCHIVED')}>{item.kind === 'ARCHIVED' ? 'Restore' : 'Archive'}</button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
