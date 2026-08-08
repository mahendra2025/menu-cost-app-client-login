'use client';

import {
  useEffect,
  useState,
} from 'react';
import Link from 'next/link';

import {
  flushWorkSave,
  getSession,
  saveWork,
} from '../../lib/store';
import type {
  WorkState,
} from '../../lib/types';

type Costing = {
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
};

function money(
  value: number,
) {
  return `₹${Math.round(
    Number(value) || 0,
  ).toLocaleString(
    'en-IN',
  )}`;
}

function date(
  value: string,
) {
  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return value || '—';
  }

  return parsed.toLocaleDateString(
    'en-IN',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
  );
}

export default function CostingHistoryCard() {
  const [
    costings,
    setCostings,
  ] = useState<Costing[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    duplicatingId,
    setDuplicatingId,
  ] = useState('');

  const [
    error,
    setError,
  ] = useState('');

  const [
    limitReached,
    setLimitReached,
  ] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');

    try {
      const response =
        await fetch(
          '/api/client/costings?limit=20',
          {
            cache:
              'no-store',
          },
        );

      if (response.ok) {
        const data =
          await response.json();

        setCostings(
          data.costings || [],
        );
      }
    } catch {
      setError(
        'Could not load costing history.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function duplicate(
    item: Costing,
  ) {
    if (duplicatingId) {
      return;
    }

    const session =
      getSession();

    if (
      !session ||
      session.role !== 'CLIENT'
    ) {
      setError(
        'Please sign in again before duplicating a costing.',
      );
      return;
    }

    if (
      !window.confirm(
        `Duplicate ${
          item.eventName ||
          item.clientName ||
          'this costing'
        } into a new job? The old completed costing will stay unchanged.`,
      )
    ) {
      return;
    }

    setDuplicatingId(
      item.costingId,
    );
    setError('');
    setLimitReached(false);

    try {
      const response =
        await fetch(
          '/api/client/costings/duplicate',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              sourceCostingId:
                item.costingId,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        if (
          data.code ===
          'FREE_LIMIT_REACHED'
        ) {
          setLimitReached(
            true,
          );
        }

        setError(
          data.error ||
            'Could not duplicate this costing.',
        );
        return;
      }

      const nextWork =
        data.work as WorkState;

      if (
        !nextWork ||
        !nextWork.costingId
      ) {
        setError(
          'The duplicated costing data was incomplete.',
        );
        return;
      }

      saveWork(
        session.tenantId,
        nextWork,
      );

      flushWorkSave(
        session.tenantId,
      );

      window.dispatchEvent(
        new Event(
          'menu-costing-usage-updated',
        ),
      );

      window.location.assign(
        '/app/event?duplicated=1',
      );
    } catch {
      setError(
        'Server connection failed. Please try again.',
      );
    } finally {
      setDuplicatingId('');
    }
  }

  return (
    <div
      className="glass-card mc-history"
      id="costing-history"
    >
      <div className="mc-history-head">
        <div>
          <div className="section-kicker">
            Costing history
          </div>

          <h2>
            Completed Costings
          </h2>

          <p className="muted">
            Reuse a past wedding or event as a new costing instead of building the menu again.
          </p>
        </div>

        <button
          className="ghost-button"
          type="button"
          onClick={() =>
            void load()
          }
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div
          className={`mc-history-message ${
            limitReached
              ? 'limit'
              : ''
          }`}
        >
          <span>
            {error}
          </span>

          {limitReached ? (
            <Link
              href="/app/profile?upgrade=1"
              className="primary-button"
            >
              Upgrade Pro · ₹999
            </Link>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div className="mc-history-empty">
          Loading history…
        </div>
      ) : costings.length ===
        0 ? (
        <div className="mc-history-empty">
          <b>
            No completed costings yet
          </b>

          <span>
            Complete a job from Final Costing and it will appear here.
          </span>
        </div>
      ) : (
        <div className="mc-history-list">
          {costings.map(
            (item) => (
              <details
                className="mc-history-item"
                key={item.id}
              >
                <summary>
                  <div>
                    <b>
                      {item.eventName ||
                        item.clientName ||
                        'Catering Costing'}
                    </b>

                    <span>
                      {item.clientName ||
                        'Client not set'}{' '}
                      ·{' '}
                      {item.eventDate ||
                        date(
                          item.completedAt,
                        )}
                    </span>
                  </div>

                  <div className="mc-history-summary">
                    <span>
                      {item.totalCovers.toLocaleString(
                        'en-IN',
                      )}{' '}
                      covers
                    </span>

                    <strong>
                      {money(
                        item.totalCost,
                      )}
                    </strong>
                  </div>
                </summary>

                <div className="mc-history-details">
                  <div>
                    <small>
                      Menu
                    </small>
                    <b>
                      {item.menuCount}{' '}
                      dishes
                    </b>
                  </div>

                  <div>
                    <small>
                      Total cost
                    </small>
                    <b>
                      {money(
                        item.totalCost,
                      )}
                    </b>
                  </div>

                  <div>
                    <small>
                      Selling / cover
                    </small>
                    <b>
                      {money(
                        item.sellingPricePerPlate,
                      )}
                    </b>
                  </div>

                  <div>
                    <small>
                      Total selling
                    </small>
                    <b>
                      {money(
                        item.totalSelling,
                      )}
                    </b>
                  </div>

                  <div>
                    <small>
                      Profit
                    </small>
                    <b>
                      {money(
                        item.totalProfit,
                      )}
                    </b>
                  </div>

                  <div>
                    <small>
                      Completed
                    </small>
                    <b>
                      {date(
                        item.completedAt,
                      )}
                    </b>
                  </div>
                </div>

                <div className="mc-history-actions">
                  <div>
                    <b>
                      Reuse this costing
                    </b>

                    <span>
                      Copies menu, manpower, extras and rates into a fresh job. Event date is cleared.
                    </span>
                  </div>

                  <button
                    className="primary-button"
                    type="button"
                    disabled={
                      Boolean(
                        duplicatingId,
                      )
                    }
                    onClick={() =>
                      void duplicate(
                        item,
                      )
                    }
                  >
                    {duplicatingId ===
                    item.costingId
                      ? 'Duplicating…'
                      : 'Duplicate as New'}
                  </button>
                </div>
              </details>
            ),
          )}
        </div>
      )}

      <style>{`
        .mc-history-head {
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:12px;
        }

        .mc-history-list {
          display:grid;
          gap:8px;
          margin-top:16px;
        }

        .mc-history-item {
          overflow:hidden;
          border:1px solid #29303a;
          border-radius:12px;
          background:#0e1218;
        }

        .mc-history-item summary {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:12px 13px;
          cursor:pointer;
          list-style:none;
        }

        .mc-history-item summary::-webkit-details-marker {
          display:none;
        }

        .mc-history-item summary b,
        .mc-history-item summary span {
          display:block;
        }

        .mc-history-item summary b {
          color:#e8edf3;
          font-size:10px;
        }

        .mc-history-item summary span {
          margin-top:3px;
          color:#738090;
          font-size:8px;
        }

        .mc-history-summary {
          min-width:95px;
          text-align:right;
        }

        .mc-history-summary strong {
          display:block;
          margin-top:3px;
          color:#8fc2ff;
          font-size:11px;
        }

        .mc-history-details {
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:1px;
          border-top:1px solid #29303a;
          background:#29303a;
        }

        .mc-history-details > div {
          padding:11px;
          background:#11161e;
        }

        .mc-history-details small,
        .mc-history-details b {
          display:block;
        }

        .mc-history-details small {
          color:#687484;
          font-size:7px;
        }

        .mc-history-details b {
          margin-top:4px;
          color:#cbd3dd;
          font-size:9px;
        }

        .mc-history-actions {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:14px;
          padding:12px 13px;
          border-top:1px solid #29303a;
          background:#0b0f14;
        }

        .mc-history-actions b,
        .mc-history-actions span {
          display:block;
        }

        .mc-history-actions b {
          color:#dbe2ea;
          font-size:9px;
        }

        .mc-history-actions span {
          max-width:550px;
          margin-top:3px;
          color:#6f7b8b;
          font-size:7px;
          line-height:1.45;
        }

        .mc-history-actions .primary-button {
          flex:0 0 auto;
          min-width:126px;
        }

        .mc-history-empty {
          display:grid;
          min-height:120px;
          place-items:center;
          align-content:center;
          gap:5px;
          color:#748090;
          font-size:9px;
          text-align:center;
        }

        .mc-history-message {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          margin-top:14px;
          padding:10px 11px;
          border:1px solid rgba(255,98,89,.22);
          border-radius:10px;
          color:#ff9a93;
          background:rgba(255,98,89,.07);
          font-size:8px;
          font-weight:750;
        }

        .mc-history-message.limit {
          border-color:rgba(255,173,66,.23);
          color:#ffc16b;
          background:rgba(255,173,66,.07);
        }

        .mc-history-message .primary-button {
          min-height:32px;
          flex:0 0 auto;
          padding:0 10px;
          font-size:8px;
        }

        @media(max-width:650px) {
          .mc-history-details {
            grid-template-columns:repeat(2,1fr);
          }

          .mc-history-actions,
          .mc-history-message {
            align-items:stretch;
            flex-direction:column;
          }

          .mc-history-actions .primary-button,
          .mc-history-message .primary-button {
            width:100%;
          }
        }
      `}</style>
    </div>
  );
}
