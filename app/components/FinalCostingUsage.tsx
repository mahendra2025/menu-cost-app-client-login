'use client';

import Link from 'next/link';
import {
  useMemo,
  useState,
} from 'react';

import {
  calculate,
  clearWork,
} from '../../lib/store';
import type {
  WorkState,
} from '../../lib/types';

export default function FinalCostingUsage({
  tenantId,
  work,
}: {
  tenantId: string;
  work: WorkState;
}) {
  const [busy, setBusy] =
    useState(false);
  const [saved, setSaved] =
    useState(false);
  const [message, setMessage] =
    useState('');

  const result =
    useMemo(
      () => calculate(work),
      [work],
    );

  const missingRateCount =
    work.menu.filter(
      (item) =>
        !(
          Number(
            item.costPerPlate,
          ) > 0
        ),
    ).length;

  const ready =
    work.menu.length > 0 &&
    result.totalCovers > 0 &&
    missingRateCount === 0 &&
    work.sellingPricePerPlate > 0;

  async function saveToHistory() {
    if (!ready || busy) return;

    setBusy(true);
    setMessage('');

    try {
      const response =
        await fetch(
          '/api/client/costings',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify({
                costingId:
                  work.costingId,
                snapshot:
                  work,
                eventName:
                  work.event.eventName,
                clientName:
                  work.event.clientName,
                eventDate:
                  work.event.eventDate,
                menuCount:
                  work.menu.length,
                totalCovers:
                  result.totalCovers,
                totalCost:
                  result.totalCost,
                sellingPricePerPlate:
                  work.sellingPricePerPlate,
                totalSelling:
                  result.totalSelling,
                totalProfit:
                  result.totalProfit,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        setMessage(
          data.error ||
            'Could not save costing history.',
        );
        return;
      }

      setSaved(true);

      const syncMessage =
        data.caterersOsSync
          ?.status ===
        'synced'
          ? ` CaterersOS event ${data.caterersOsSync.created ? 'created' : 'updated'}.`
          : data.caterersOsSync
                ?.status ===
              'failed'
            ? ` Saved here, but CaterersOS sync failed: ${data.caterersOsSync.error}.`
            : '';

      setMessage(
        `Saved to business history.${syncMessage}`,
      );
    } catch {
      setMessage(
        'Database connection failed. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  function startNew() {
    if (
      !confirm(
        'Start a new costing? Save this costing first if you want it in history.',
      )
    ) {
      return;
    }

    clearWork(tenantId);
    window.location.assign(
      '/app/event',
    );
  }

  if (!ready) return null;

  return (
    <div
      className={`mc-complete-card ${saved ? 'done' : ''}`}
    >
      <div>
        <span className="section-kicker">
          {saved
            ? 'Saved history'
            : 'Ready to save'}
        </span>

        <h2>
          {saved
            ? 'This costing is saved in business history.'
            : 'Save this costing to history'}
        </h2>

        <p>
          {saved
            ? 'Save again after editing to update the same record.'
            : 'Store this event permanently in the single business workspace. There is no costing limit.'}
        </p>

        {message ? (
          <div className="mc-complete-message">
            {message}
          </div>
        ) : null}
      </div>

      <div className="mc-complete-actions">
        <button
          className="primary-button"
          type="button"
          disabled={busy}
          onClick={() =>
            void saveToHistory()
          }
        >
          {busy
            ? 'Saving…'
            : saved
              ? 'Update Saved History'
              : 'Save to History'}
        </button>

        <button
          className="ghost-button"
          type="button"
          onClick={startNew}
        >
          Start New Costing
        </button>

        <Link
          href="/app/history"
          className="ghost-button"
        >
          View History
        </Link>
      </div>

      <style>{`
        .mc-complete-card{display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center;padding:22px;border:1px solid rgba(74,156,255,.2);border-radius:18px;background:#10151d}
        .mc-complete-card.done{border-color:rgba(61,220,132,.2)}
        .mc-complete-card h2{margin:5px 0 6px;font-size:21px}
        .mc-complete-card p{margin:0;color:#8d98a7;font-size:10px;line-height:1.55}
        .mc-complete-message{margin-top:9px;color:#8fc2ff;font-size:9px}
        .mc-complete-actions{display:grid;min-width:190px;gap:7px}
        .mc-complete-actions>*{width:100%;text-align:center}
        @media(max-width:760px){.mc-complete-card{grid-template-columns:1fr}.mc-complete-actions{min-width:0}}
      `}</style>
    </div>
  );
}
