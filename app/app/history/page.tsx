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

type DuplicateDraft = {
  sourceCostingId: string;
  eventName: string;
  clientName: string;
  eventDate: string;
  pax: string;
  menuCount: number;
  functionCount: number;
  totalCost: number;
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
  const [tab, setTab] = useState<'ALL' | 'DRAFTS' | 'COMPLETED' | 'ARCHIVED'>('ALL');
  const [query, setQuery] = useState('');
  const [days, setDays] = useState('ALL');
  const [sort, setSort] = useState('RECENT');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [duplicateDraft, setDuplicateDraft] = useState<DuplicateDraft | null>(null);
  const [duplicateError, setDuplicateError] = useState('');

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
      const [a, b, c] = await Promise.all([
        fetch('/api/client/costings?limit=100', { cache: 'no-store' }),
        fetch('/api/client/costings?limit=100&archived=1', { cache: 'no-store' }),
        fetch('/api/client/drafts?limit=100', { cache: 'no-store' }),
      ]);

      if (a.ok) setCompleted((await a.json()).costings || []);
      if (b.ok) setArchived((await b.json()).costings || []);
      if (c.ok) setDrafts((await c.json()).drafts || []);

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

  async function prepareDuplicate(item: Item) {
    if (!session) return;

    setBusy(`dup-load:${item.costingId}`);
    setDuplicateError('');
    setError('');
    await syncCurrent(session);

    try {
      const response = await fetch(
        `/api/client/costings?costingId=${encodeURIComponent(item.costingId)}`,
        { cache: 'no-store' },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load event to duplicate');

      const work = data.costing.snapshot as WorkState;
      const sourcePax = Math.max(
        Number(work.event.pax) || 0,
        ...work.menu.map((dish) => Number(dish.servicePax) || 0),
      );
      const functionKeys = new Set(
        work.menu.map((dish) =>
          dish.serviceId ||
          `${dish.dayLabel || ''}::${dish.mealLabel || 'Event Menu'}`
        ),
      );

      setDuplicateDraft({
        sourceCostingId: item.costingId,
        eventName: work.event.eventName || item.eventName || 'Event',
        clientName: work.event.clientName || item.clientName || '',
        eventDate: '',
        pax: sourcePax > 0 ? String(sourcePax) : '',
        menuCount: work.menu.length,
        functionCount: Math.max(1, functionKeys.size),
        totalCost: item.totalCost,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not prepare duplicate event.');
    } finally {
      setBusy('');
    }
  }

  async function duplicate() {
    if (!session || !duplicateDraft) return;

    const clientName = duplicateDraft.clientName.trim();
    const eventDate = duplicateDraft.eventDate.trim();
    const pax = Math.max(0, Math.round(Number(duplicateDraft.pax) || 0));

    if (!clientName) {
      setDuplicateError('Enter the client name for the new booking.');
      return;
    }
    if (!eventDate) {
      setDuplicateError('Choose the date for the new booking.');
      return;
    }
    if (pax <= 0) {
      setDuplicateError('Enter a guest count greater than 0.');
      return;
    }

    setBusy(`dup:${duplicateDraft.sourceCostingId}`);
    setDuplicateError('');
    await syncCurrent(session);

    try {
      const response = await fetch('/api/client/costings/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCostingId: duplicateDraft.sourceCostingId,
          clientName,
          eventDate,
          pax,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not duplicate costing');

      const duplicatedWork = data.work as WorkState;
      const result = calculate(duplicatedWork);

      const draftResponse = await fetch('/api/client/drafts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work: duplicatedWork,
          totalCovers: result.totalCovers,
          totalCost: result.totalCost,
          totalSelling: result.totalSelling,
          totalProfit: result.totalProfit,
        }),
      });

      if (!draftResponse.ok) {
        const draftData = await draftResponse.json().catch(() => ({}));
        throw new Error(draftData.error || 'Duplicate was created but its recalculated draft could not be saved');
      }

      setDuplicateDraft(null);
      await loadIntoWorkspace(duplicatedWork, '/app/event?duplicated=1');
    } catch (e) {
      setDuplicateError(e instanceof Error ? e.message : 'Could not duplicate costing.');
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

  const hasFilters = Boolean(query.trim() || days !== 'ALL');
  const resetFilters = () => { setQuery(''); setDays('ALL'); };
  const totalValue = completed.reduce((sum, item) => sum + Number(item.totalCost || 0), 0);

  return (
    <AppShell title="History" subtitle="Drafts, completed costings and reusable event records" hidePageTitle>
      <section className="hist-page">
        <style>{`
          .hist-page { display: grid; gap: 20px; --hist-muted: #a2adbb; }
          .hist-hero { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 24px 0 8px; }
          .hist-hero h1 { margin: 0 0 10px; font-size: clamp(28px, 4vw, 40px); line-height: 1.15; letter-spacing: -.04em; }
          .hist-hero p { max-width: 560px; margin: 0; color: var(--hist-muted); font-size: 14px; line-height: 1.6; }
          .hist-new { flex-shrink: 0; min-height: 44px; padding: 0 20px; border: 0; border-radius: 10px; color: #fff; background: #1478f2; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
          .hist-new:disabled { opacity: .5; cursor: wait; }
          .hist-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border: 1px solid #282f39; border-radius: 14px; background: #10151c; overflow: hidden; }
          .hist-stat { padding: 20px; min-width: 0; }
          .hist-stat + .hist-stat { border-left: 1px solid #282f39; }
          .hist-stat small, .hist-stat strong, .hist-stat span { display: block; }
          .hist-stat small { color: #b6c0cc; font-size: 12px; font-weight: 600; }
          .hist-stat strong { margin: 9px 0 5px; font-size: clamp(20px, 2.3vw, 28px); overflow-wrap: anywhere; font-variant-numeric: tabular-nums; letter-spacing: -.03em; }
          .hist-stat span { color: var(--hist-muted); font-size: 11px; }
          .hist-alert { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px; border: 1px solid #71552e; border-radius: 10px; color: #ffc16b; background: #241d14; font-size: 13px; }
          .hist-toolbar { display: grid; grid-template-columns: minmax(0, 1fr) 180px 160px; align-items: end; gap: 12px; }
          .hist-filter { display: grid; min-width: 0; gap: 8px; }
          .hist-filter > span { color: var(--hist-muted); font-size: 12px; }
          .hist-input { width: 100%; min-width: 0; min-height: 44px; padding: 0 12px; border: 1px solid #303844; border-radius: 9px; color: #e9edf3; background: #10151c; font: inherit; font-size: 13px; color-scheme: dark; }
          .hist-page :is(button, a, input, select):focus-visible { outline: 2px solid #8fc2ff; outline-offset: 3px; }
          .hist-tabs { display: flex; gap: 20px; overflow-x: auto; border-bottom: 1px solid #282f39; }
          .hist-tabs button { min-height: 44px; padding: 0 2px; border: 0; border-bottom: 2px solid transparent; color: var(--hist-muted); background: transparent; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
          .hist-tabs button.active { color: #8fc2ff; border-bottom-color: #4a9cff; }
          .hist-results { display: flex; align-items: center; justify-content: space-between; min-height: 24px; margin-top: -8px; color: var(--hist-muted); font-size: 12px; }
          .hist-clear { border: 0; background: transparent; color: #8fc2ff; font: inherit; cursor: pointer; min-height: 32px; }
          .hist-list { display: grid; gap: 12px; }
          .hist-row { display: grid; grid-template-columns: minmax(0, 1fr) repeat(3, minmax(85px, .23fr)); gap: 20px; align-items: center; padding: 20px; border: 1px solid #282f39; border-radius: 12px; background: #10151c; }
          .hist-main { min-width: 0; }
          .hist-title { display: flex; align-items: center; gap: 10px; min-width: 0; }
          .hist-title b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 16px; font-weight: 650; }
          .hist-main > span { display: block; margin-top: 6px; color: #bdc7d4; font-size: 13px; overflow-wrap: anywhere; }
          .hist-event-meta { display: flex; flex-wrap: wrap; gap: 6px 16px; margin-top: 9px; color: var(--hist-muted); font-size: 12px; }
          .hist-chip { flex-shrink: 0; padding: 4px 8px; border-radius: 6px; color: #8fc2ff; background: #172b42; font-size: 10px; font-weight: 600; }
          .hist-chip.draft { color: #ffc16b; background: #302618; }
          .hist-chip.archived { color: #bcc6d3; background: #252c35; }
          .hist-metric small, .hist-metric b { display: block; }
          .hist-metric small { color: var(--hist-muted); font-size: 11px; }
          .hist-metric b { margin-top: 7px; color: #e4ebf4; font-size: 16px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
          .hist-metric .hist-positive { color: #6bdea2; }
          .hist-metric .hist-negative { color: #ff9d97; }
          .hist-actions { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px; padding-top: 14px; border-top: 1px solid #252d38; }
          .hist-action { display: inline-flex; align-items: center; justify-content: center; min-height: 40px; padding: 0 14px; border: 1px solid #34404e; border-radius: 8px; color: #c8d2df; background: #151c25; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; text-decoration: none; }
          .hist-action:hover { background: #222f40; }
          .hist-action.primary { color: #b8d9ff; border-color: #345e8b; background: #172b42; }
          .hist-action.danger { color: #ff9d97; }
          .hist-action:disabled { opacity: .5; cursor: wait; }
          .hist-empty { display: grid; min-height: 260px; padding: 24px; place-items: center; align-content: center; gap: 12px; border: 1px dashed #34404e; border-radius: 14px; color: var(--hist-muted); background: #10151c; font-size: 13px; line-height: 1.6; text-align: center; }
          .hist-empty b { color: #e4ebf4; font-size: 18px; }
          .hist-modal-backdrop { position: fixed; inset: 0; z-index: 120; display: grid; place-items: center; padding: 20px; background: rgba(4,8,13,.76); backdrop-filter: blur(10px); }
          .hist-modal { width: min(620px, 100%); max-height: min(760px, calc(100vh - 32px)); overflow: auto; padding: 18px; border: 1px solid #303a47; border-radius: 18px; background: #10161e; box-shadow: 0 28px 80px rgba(0,0,0,.42); }
          .hist-modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
          .hist-modal-head small, .hist-modal-head h2, .hist-modal-head p { display: block; }
          .hist-modal-head small { color: #78b5ff; font-size: 9px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
          .hist-modal-head h2 { margin: 4px 0; color: #eef4fb; font-size: 22px; letter-spacing: -.03em; }
          .hist-modal-head p { margin: 0; color: #8492a3; font-size: 11px; line-height: 1.5; }
          .hist-modal-close { width: 34px; height: 34px; flex: 0 0 auto; border: 1px solid #303844; border-radius: 10px; color: #9ba8b7; background: #161e27; font: inherit; font-size: 19px; cursor: pointer; }
          .hist-duplicate-source { margin-top: 14px; padding: 11px 12px; border: 1px solid rgba(74,156,255,.16); border-radius: 11px; background: rgba(74,156,255,.045); }
          .hist-duplicate-source b, .hist-duplicate-source span { display: block; }
          .hist-duplicate-source b { color: #d8e9fc; font-size: 12px; }
          .hist-duplicate-source span { margin-top: 3px; color: #7e90a5; font-size: 9px; line-height: 1.45; }
          .hist-duplicate-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
          .hist-duplicate-field { display: grid; gap: 6px; }
          .hist-duplicate-field:first-child { grid-column: 1 / -1; }
          .hist-duplicate-field > span { color: #8998aa; font-size: 9px; font-weight: 850; }
          .hist-duplicate-field input { width: 100%; min-height: 44px; padding: 0 11px; border: 1px solid #34404e; border-radius: 10px; outline: 0; color: #edf3f9; background: #151d27; font: inherit; font-size: 13px; color-scheme: dark; }
          .hist-duplicate-field input:focus { border-color: rgba(74,156,255,.58); box-shadow: 0 0 0 3px rgba(74,156,255,.09); }
          .hist-duplicate-help { grid-column: 1 / -1; margin: -2px 0 0; color: #738297; font-size: 9px; line-height: 1.45; }
          .hist-duplicate-reuse { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; margin-top: 14px; }
          .hist-duplicate-reuse > div { padding: 9px; border: 1px solid rgba(148,163,184,.10); border-radius: 10px; background: rgba(255,255,255,.018); }
          .hist-duplicate-reuse b, .hist-duplicate-reuse span { display: block; }
          .hist-duplicate-reuse b { color: #dbe5f0; font-size: 10px; }
          .hist-duplicate-reuse span { margin-top: 2px; color: #718095; font-size: 8px; }
          .hist-modal-error { margin-top: 12px; padding: 9px 10px; border: 1px solid rgba(255,98,89,.18); border-radius: 9px; color: #ff9d97; background: rgba(255,98,89,.05); font-size: 10px; }
          .hist-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; padding-top: 13px; border-top: 1px solid rgba(148,163,184,.10); }
          .hist-modal-actions button { min-height: 40px; padding: 0 14px; border-radius: 10px; font: inherit; font-size: 10px; font-weight: 900; cursor: pointer; }
          .hist-modal-cancel { border: 1px solid #303844; color: #aeb9c6; background: #151b23; }
          .hist-modal-confirm { min-width: 160px; border: 0; color: #fff; background: #1478f2; }
          .hist-modal-actions button:disabled { opacity: .5; cursor: wait; }
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
            .hist-stats { grid-template-columns: 1fr 1fr; }
            .hist-stat { padding: 16px; }
            .hist-stat:nth-child(3) { border-left: 0; }
            .hist-stat:nth-child(n+3) { border-top: 1px solid #282f39; }
            .hist-toolbar { grid-template-columns: 1fr 1fr; }
            .hist-filter:first-child { grid-column: 1 / -1; }
            .hist-tabs { gap: 16px; }
            .hist-tabs button { font-size: 12px; }
            .hist-input { min-height: 44px; font-size: 16px; }
            .hist-row { grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 16px; gap: 16px 10px; }
            .hist-actions { display: grid; grid-template-columns: 1fr 1fr; }
            .hist-action { width: 100%; min-height: 40px; font-size: 11px; }
            .hist-alert { flex-direction: column; }
            .hist-modal-backdrop { padding: 8px; align-items: end; }
            .hist-modal { max-height: calc(100vh - 16px); padding: 14px; border-radius: 17px 17px 10px 10px; }
            .hist-duplicate-fields, .hist-duplicate-reuse { grid-template-columns: 1fr; }
            .hist-duplicate-field:first-child, .hist-duplicate-help { grid-column: auto; }
            .hist-duplicate-field input { font-size: 16px; }
            .hist-modal-actions { display: grid; grid-template-columns: 1fr 1.5fr; }
            .hist-modal-actions button { width: 100%; }
          }
        `}</style>

        <div className="hist-hero">
          <div>
            <h1>Costing history</h1>
            <p>Pick up where you left off, or turn a past event into your next booking.</p>
          </div>
          <button className="hist-new" type="button" disabled={loading || Boolean(busy)} onClick={() => void startNew()}>+ New costing</button>
        </div>

        <div className="hist-stats">
          <div className="hist-stat"><small>Drafts</small><strong>{loading ? '—' : drafts.length}</strong><span>Ready to continue</span></div>
          <div className="hist-stat"><small>Completed</small><strong>{loading ? '—' : completed.length}</strong><span>Saved event costings</span></div>
          <div className="hist-stat"><small>Costed value</small><strong>{loading ? '—' : money(totalValue)}</strong><span>Completed events only</span></div>
          <div className="hist-stat"><small>Archived</small><strong>{loading ? '—' : archived.length}</strong><span>Available to restore</span></div>
        </div>

        {error ? (
          <div className="hist-alert" role="alert">
            <span>{error}</span><button className="hist-action" disabled={loading || Boolean(busy)} onClick={() => session && void bootstrap(session)}>Try again</button>
          </div>
        ) : null}

        <div className="hist-toolbar">
          <label className="hist-filter"><span>Find a costing</span><input className="hist-input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search client, event or date…" /></label>
          <label className="hist-filter"><span>Saved or completed</span><select className="hist-input" value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="ALL">All dates</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option>
          </select></label>
          <label className="hist-filter"><span>Sort by</span><select className="hist-input" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="RECENT">Most recent</option><option value="COST">Highest cost</option><option value="CLIENT">Client A–Z</option>
          </select></label>
        </div>

        <div className="hist-tabs" role="group" aria-label="Costing status">
          {([
            ['ALL', `Active ${drafts.length + completed.length}`],
            ['DRAFTS', `Drafts ${drafts.length}`],
            ['COMPLETED', `Completed ${completed.length}`],
            ['ARCHIVED', `Archived ${archived.length}`],
          ] as const).map(([value, label]) => (
            <button key={value} className={tab === value ? 'active' : ''} type="button" aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</button>
          ))}
        </div>

        <div className="hist-results" role="status" aria-live="polite">
          <span>{loading ? 'Loading your costings…' : `${items.length} ${items.length === 1 ? 'costing' : 'costings'}${tab === 'ARCHIVED' ? ' in archive' : ' in view'}`}</span>
          {hasFilters && <button className="hist-clear" onClick={resetFilters}>Clear filters</button>}
        </div>
        {loading ? <div className="hist-empty" role="status">Loading costing library…</div> : items.length === 0 ? (
          <div className="hist-empty">
            <b>{error ? 'Costings could not be loaded' : hasFilters ? 'No costings match your search' : tab === 'ARCHIVED' ? 'No archived costings' : tab === 'DRAFTS' ? 'No drafts to continue' : tab === 'COMPLETED' ? 'No completed costings yet' : 'Your next event starts here'}</b>
            <span>{error ? 'Try loading your saved records again.' : hasFilters ? 'Try another client or event name, or clear your filters.' : tab === 'ARCHIVED' ? 'Events you archive will stay here until you need them again.' : 'Create an event and save its costing to find it here.'}</span>
            {hasFilters ? <button className="hist-action" onClick={resetFilters}>Clear filters</button> : !error && tab !== 'ARCHIVED' ? <button className="hist-new" disabled={Boolean(busy)} onClick={() => void startNew()}>+ New costing</button> : null}
          </div>
        ) : (
          <div className="hist-list">
            {items.map((item) => {
              const isBusy = Boolean(busy);
              return (
                <article className="hist-row" key={item.key}>
                  <div className="hist-main">
                    <div className="hist-title">
                      <b title={item.eventName || item.clientName || 'Untitled costing'}>{item.eventName || item.clientName || 'Untitled costing'}</b>
                      <span className={`hist-chip ${item.kind === 'DRAFT' ? 'draft' : item.kind === 'ARCHIVED' ? 'archived' : ''}`}>{item.kind === 'DRAFT' ? 'Draft' : item.kind === 'ARCHIVED' ? 'Archived' : 'Completed'}</span>
                    </div>
                    <span>{item.clientName || 'Client not set'}</span><div className="hist-event-meta"><span>{dateLabel(item.eventDate)}</span><span>{item.menuCount} dishes</span></div>
                  </div>

                  <div className="hist-metric"><small>Covers</small><b>{item.totalCovers.toLocaleString('en-IN')}</b></div>
                  <div className="hist-metric"><small>Total cost</small><b>{money(item.totalCost)}</b></div>
                  <div className="hist-metric"><small>{item.totalProfit < 0 ? 'Loss' : 'Profit'}</small><b className={item.totalProfit < 0 ? 'hist-negative' : item.totalProfit > 0 ? 'hist-positive' : ''}>{money(item.totalProfit)}</b></div>

                  <div className="hist-actions">
                    {item.kind === 'DRAFT' ? (
                      <>
                        <button className="hist-action primary" disabled={isBusy} onClick={() => void openDraft(item.costingId)}>Continue</button>
                        <button className="hist-action danger" disabled={isBusy} onClick={() => void deleteDraft(item.costingId)}>Delete</button>
                      </>
                    ) : (
                      <>
                        <button className="hist-action primary" disabled={isBusy} onClick={() => void openCompleted(item.costingId)}>Open</button>
                        <button className="hist-action" disabled={isBusy} onClick={() => void prepareDuplicate(item)}>{busy === `dup-load:${item.costingId}` ? 'Loading…' : 'Duplicate'}</button>
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

        {duplicateDraft ? (
          <div
            className="hist-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !busy) {
                setDuplicateDraft(null);
                setDuplicateError('');
              }
            }}
          >
            <section
              className="hist-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="duplicate-event-title"
            >
              <div className="hist-modal-head">
                <div>
                  <small>Repeat booking</small>
                  <h2 id="duplicate-event-title">Duplicate past event</h2>
                  <p>Keep the menu and costing setup. Change the booking details that are different.</p>
                </div>
                <button
                  className="hist-modal-close"
                  type="button"
                  aria-label="Close duplicate event"
                  disabled={Boolean(busy)}
                  onClick={() => {
                    setDuplicateDraft(null);
                    setDuplicateError('');
                  }}
                >
                  ×
                </button>
              </div>

              <div className="hist-duplicate-source">
                <b>{duplicateDraft.eventName}</b>
                <span>
                  Reusing {duplicateDraft.menuCount} dishes · {duplicateDraft.functionCount} function{duplicateDraft.functionCount === 1 ? '' : 's'} · previous cost {money(duplicateDraft.totalCost)}
                </span>
              </div>

              <div className="hist-duplicate-fields">
                <label className="hist-duplicate-field">
                  <span>Client name</span>
                  <input
                    autoFocus
                    value={duplicateDraft.clientName}
                    onChange={(event) => {
                      setDuplicateDraft((current) =>
                        current ? { ...current, clientName: event.target.value } : current
                      );
                      setDuplicateError('');
                    }}
                    placeholder="New client name"
                  />
                </label>

                <label className="hist-duplicate-field">
                  <span>New event date</span>
                  <input
                    type="date"
                    value={duplicateDraft.eventDate}
                    onChange={(event) => {
                      setDuplicateDraft((current) =>
                        current ? { ...current, eventDate: event.target.value } : current
                      );
                      setDuplicateError('');
                    }}
                  />
                </label>

                <label className="hist-duplicate-field">
                  <span>Guest count</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={duplicateDraft.pax}
                    onChange={(event) => {
                      setDuplicateDraft((current) =>
                        current ? { ...current, pax: event.target.value } : current
                      );
                      setDuplicateError('');
                    }}
                    placeholder="e.g. 300"
                  />
                </label>

                <p className="hist-duplicate-help">
                  The guest count is applied to every copied function. You can fine-tune individual function counts later on Event &amp; Menu.
                </p>
              </div>

              <div className="hist-duplicate-reuse">
                <div><b>Menu</b><span>Same dishes &amp; portions</span></div>
                <div><b>Manpower</b><span>Same roles, rates &amp; dish links</span></div>
                <div><b>Operations</b><span>Gas, transport &amp; disposable setup</span></div>
                <div><b>Pricing</b><span>Selling price setup retained</span></div>
              </div>

              {duplicateError ? (
                <div className="hist-modal-error" role="alert">{duplicateError}</div>
              ) : null}

              <div className="hist-modal-actions">
                <button
                  className="hist-modal-cancel"
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => {
                    setDuplicateDraft(null);
                    setDuplicateError('');
                  }}
                >
                  Cancel
                </button>
                <button
                  className="hist-modal-confirm"
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void duplicate()}
                >
                  {busy ? 'Duplicating…' : 'Duplicate & Open'}
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
