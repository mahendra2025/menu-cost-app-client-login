'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { calculate, clearWork } from '../../lib/store';
import type { WorkState } from '../../lib/types';

type Usage = {
  hasProAccess: boolean;
  limit: number;
  used: number;
  remaining: number | null;
  currentCompleted: boolean;
  canStartNew: boolean;
};

export default function FinalCostingUsage({ tenantId, work }: { tenantId: string; work: WorkState }) {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const result = useMemo(() => calculate(work), [work]);
  const missingRateCount = work.menu.filter((item) => !(Number(item.costPerPlate) > 0)).length;
  const ready = work.menu.length > 0 && result.totalCovers > 0 && missingRateCount === 0 && work.sellingPricePerPlate > 0;

  useEffect(() => {
    void fetch(`/api/client/free-usage?costingId=${encodeURIComponent(work.costingId)}`, { cache: 'no-store' })
      .then(async (response) => { if (response.ok) setUsage(await response.json()); })
      .catch(() => {});
  }, [work.costingId]);

  async function saveToHistory() {
    if (!ready || busy) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/client/costings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          costingId: work.costingId,
          snapshot: work,
          eventName: work.event.eventName,
          clientName: work.event.clientName,
          eventDate: work.event.eventDate,
          menuCount: work.menu.length,
          totalCovers: result.totalCovers,
          totalCost: result.totalCost,
          sellingPricePerPlate: work.sellingPricePerPlate,
          totalSelling: result.totalSelling,
          totalProfit: result.totalProfit,
        }),
      });
      const data = await response.json();
      if (!response.ok) { setMessage(data.error || 'Could not save costing history.'); return; }
      setUsage(data);
      setMessage(
        data.hasProAccess
          ? 'Saved to your account history database.'
          : `Saved to your account history. ${data.remaining} free costing${data.remaining === 1 ? '' : 's'} remaining.`,
      );
      window.dispatchEvent(new Event('menu-costing-usage-updated'));
    } catch { setMessage('Database connection failed. Please try again.'); }
    finally { setBusy(false); }
  }

  function startNew() {
    if (!usage?.canStartNew) return;
    if (!confirm('Start a new costing? This completed costing is already saved in history.')) return;
    clearWork(tenantId);
    window.location.assign('/app/event');
  }

  if (!ready) return null;
  const completed = Boolean(usage?.currentCompleted);

  return (
    <div className={`mc-complete-card ${completed ? 'done' : ''}`}>
      <div>
        <span className="section-kicker">{completed ? 'Saved history' : 'Ready to save'}</span>
        <h2>{completed ? 'This costing is saved in your account.' : 'Save this costing to history'}</h2>
        <p>{completed ? 'Save again after editing to update the same database record. It will not use another free costing.' : 'Saving creates a permanent, user-specific database record. Free accounts can save 5 completed costings.'}</p>
        {usage && !usage.hasProAccess ? <b className="mc-complete-count">{usage.used} / {usage.limit} used · {usage.remaining} remaining</b> : null}
        {message ? <div className="mc-complete-message">{message}</div> : null}
      </div>
      <div className="mc-complete-actions">
        <button className="primary-button" type="button" disabled={busy} onClick={() => void saveToHistory()}>
          {busy ? 'Saving…' : completed ? 'Update Saved History' : 'Save to History'}
        </button>
        {completed && usage?.canStartNew ? (
          <button className="ghost-button" type="button" onClick={startNew}>Start New Costing</button>
        ) : completed && !usage?.canStartNew ? (
          <Link href="/app/profile?upgrade=1" className="ghost-button">Upgrade to Pro · ₹999</Link>
        ) : null}
        <Link href="/app/history" className="ghost-button">View History</Link>
      </div>
      <style>{`.mc-complete-card{display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center;padding:22px;border:1px solid rgba(74,156,255,.2);border-radius:18px;background:#10151d}.mc-complete-card.done{border-color:rgba(61,220,132,.2)}.mc-complete-card h2{margin:5px 0 6px;font-size:21px}.mc-complete-card p{margin:0;color:#8d98a7;font-size:10px;line-height:1.55}.mc-complete-count{display:block;margin-top:11px;color:#8fc2ff;font-size:9px}.mc-complete-message{margin-top:9px;color:#8fc2ff;font-size:9px}.mc-complete-actions{display:grid;min-width:190px;gap:7px}.mc-complete-actions>*{width:100%;text-align:center}@media(max-width:760px){.mc-complete-card{grid-template-columns:1fr}.mc-complete-actions{min-width:0}}`}</style>
    </div>
  );
}
