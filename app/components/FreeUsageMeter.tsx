'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Usage = {
  hasProAccess: boolean;
  limit: number;
  used: number;
  remaining: number | null;
};

const USAGE_CACHE_MS = 30_000;
let cachedUsage: Usage | null = null;
let cachedAt = 0;
let usageRequest: Promise<Usage | null> | null = null;

async function fetchUsage(force = false) {
  if (
    !force &&
    cachedUsage &&
    Date.now() - cachedAt < USAGE_CACHE_MS
  ) {
    return cachedUsage;
  }

  if (!usageRequest) {
    usageRequest = fetch('/api/client/free-usage', {
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) return null;

        const usage = await response.json() as Usage;
        cachedUsage = usage;
        cachedAt = Date.now();
        return usage;
      })
      .catch(() => null)
      .finally(() => {
        usageRequest = null;
      });
  }

  return usageRequest;
}

export default function FreeUsageMeter() {
  const [usage, setUsage] = useState<Usage | null>(() => cachedUsage);

  const load = useCallback(async (force = false) => {
    const nextUsage = await fetchUsage(force);
    if (nextUsage) setUsage(nextUsage);
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => void load(true);
    window.addEventListener('menu-costing-usage-updated', refresh);
    return () => window.removeEventListener('menu-costing-usage-updated', refresh);
  }, [load]);

  if (!usage) return null;

  if (usage.hasProAccess) {
    return (
      <div className="mc-free-meter mc-free-meter-pro no-print">
        <div><b>Pro · Unlimited costings</b><span>No completed-costing limit.</span></div>
        <em>PRO</em>
        <style>{styles}</style>
      </div>
    );
  }

  const percentage = Math.min(100, (usage.used / Math.max(1, usage.limit)) * 100);
  return (
    <div className={`mc-free-meter no-print ${usage.remaining !== null && usage.remaining <= 1 ? 'urgent' : ''}`}>
      <div className="mc-free-meter-copy">
        <div>
          <b>{usage.used} of {usage.limit} free costings used</b>
          <span>{usage.remaining === 0 ? 'Free limit reached. Completed costings stay saved.' : `${usage.remaining} free costing${usage.remaining === 1 ? '' : 's'} remaining.`}</span>
        </div>
        <div className="mc-free-meter-track"><i style={{ width: `${percentage}%` }} /></div>
      </div>
      <Link href="/app/profile?upgrade=1" className="mc-free-meter-upgrade">Upgrade ₹999</Link>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
.mc-free-meter{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px;padding:11px 13px;border:1px solid rgba(74,156,255,.18);border-radius:13px;background:#10151d}.mc-free-meter-copy{display:grid;flex:1;gap:7px}.mc-free-meter b,.mc-free-meter span{display:block}.mc-free-meter b{font-size:10px;color:#eaf1f9}.mc-free-meter span{margin-top:2px;font-size:8px;color:#7f8b9b}.mc-free-meter-track{width:min(320px,100%);height:5px;overflow:hidden;border-radius:999px;background:#202731}.mc-free-meter-track i{display:block;height:100%;border-radius:inherit;background:#4a9cff}.mc-free-meter-upgrade{display:inline-flex;min-height:35px;align-items:center;padding:0 11px;border-radius:9px;background:#1478f2;color:#fff!important;font-size:8px;font-weight:900}.mc-free-meter.urgent{border-color:rgba(255,173,66,.25)}.mc-free-meter.urgent .mc-free-meter-track i{background:#ffad42}.mc-free-meter-pro{border-color:rgba(61,220,132,.18)}.mc-free-meter-pro em{padding:5px 8px;border-radius:999px;background:rgba(61,220,132,.1);color:#6de09e;font-size:7px;font-style:normal;font-weight:900}@media(max-width:640px){.mc-free-meter{align-items:stretch;flex-direction:column}.mc-free-meter-upgrade{justify-content:center}.mc-free-meter-pro{align-items:center;flex-direction:row}}
`;
