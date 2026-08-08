'use client';

import { useEffect, useState } from 'react';

type Costing = {
  id: string; eventName: string; clientName: string; eventDate: string; menuCount: number;
  totalCovers: number; totalCost: number; sellingPricePerPlate: number; totalSelling: number;
  totalProfit: number; completedAt: string;
};

const money = (value: number) => `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;

export default function CostingHistoryCard() {
  const [costings, setCostings] = useState<Costing[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/client/costings?limit=20', { cache: 'no-store' });
      if (response.ok) setCostings((await response.json()).costings || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  return (
    <div className="glass-card mc-history" id="costing-history">
      <div className="mc-history-head"><div><div className="section-kicker">Costing history</div><h2>Completed Costings</h2><p className="muted">Saved to your Menu Costing account, not only this browser.</p></div><button className="ghost-button" type="button" onClick={() => void load()} disabled={loading}>Refresh</button></div>
      {loading ? <div className="mc-history-empty">Loading history…</div> : costings.length === 0 ? <div className="mc-history-empty"><b>No completed costings yet</b><span>Complete a job from Final Costing and it will appear here.</span></div> : (
        <div className="mc-history-list">{costings.map((item) => (
          <details className="mc-history-item" key={item.id}>
            <summary><div><b>{item.eventName || item.clientName || 'Catering Costing'}</b><span>{item.clientName || 'Client not set'} · {item.eventDate || new Date(item.completedAt).toLocaleDateString('en-IN')}</span></div><div><span>{item.totalCovers.toLocaleString('en-IN')} covers</span><strong>{money(item.totalCost)}</strong></div></summary>
            <div className="mc-history-details"><div><small>Menu</small><b>{item.menuCount} dishes</b></div><div><small>Total cost</small><b>{money(item.totalCost)}</b></div><div><small>Selling / cover</small><b>{money(item.sellingPricePerPlate)}</b></div><div><small>Total selling</small><b>{money(item.totalSelling)}</b></div><div><small>Profit</small><b>{money(item.totalProfit)}</b></div><div><small>Completed</small><b>{new Date(item.completedAt).toLocaleDateString('en-IN')}</b></div></div>
          </details>
        ))}</div>
      )}
      <style>{`.mc-history-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.mc-history-list{display:grid;gap:8px;margin-top:16px}.mc-history-item{overflow:hidden;border:1px solid #29303a;border-radius:12px;background:#0e1218}.mc-history-item summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 13px;cursor:pointer;list-style:none}.mc-history-item summary::-webkit-details-marker{display:none}.mc-history-item summary b,.mc-history-item summary span{display:block}.mc-history-item summary b{color:#e8edf3;font-size:10px}.mc-history-item summary span{margin-top:3px;color:#738090;font-size:8px}.mc-history-item summary>div:last-child{text-align:right}.mc-history-item summary strong{display:block;margin-top:3px;color:#8fc2ff;font-size:11px}.mc-history-details{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;border-top:1px solid #29303a;background:#29303a}.mc-history-details>div{padding:11px;background:#11161e}.mc-history-details small,.mc-history-details b{display:block}.mc-history-details small{color:#687484;font-size:7px}.mc-history-details b{margin-top:4px;color:#cbd3dd;font-size:9px}.mc-history-empty{display:grid;min-height:120px;place-items:center;align-content:center;gap:5px;color:#748090;font-size:9px;text-align:center}@media(max-width:650px){.mc-history-details{grid-template-columns:repeat(2,1fr)}}`}</style>
    </div>
  );
}
