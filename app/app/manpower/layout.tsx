'use client';

import {
  type ReactNode,
  useEffect,
  useState,
} from 'react';

export default function ManpowerGroceryGate({
  children,
}: {
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('afterGrocery') === '1') {
      setReady(true);
      return;
    }

    window.location.replace('/app/grocery');
  }, []);

  if (!ready) {
    return (
      <main className="page-shell center-screen">
        <div className="loader-card">
          Preparing grocery requirements…
        </div>
      </main>
    );
  }

  return (
    <div className="manpower-pricing-gate">
      <style>{`
        .manpower-pricing-gate .workflow-overview-button {
          display: none !important;
        }
        .manpower-next-pricing-bar {
          position: sticky;
          bottom: 16px;
          z-index: 30;
          max-width: 1120px;
          margin: 20px auto;
          padding: 14px 16px;
          border: 1px solid rgba(148, 163, 184, 0.24);
          border-radius: 18px;
          background: rgba(15, 23, 42, 0.94);
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.22);
          backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .manpower-next-pricing-copy {
          display: grid;
          gap: 3px;
          color: white;
        }
        .manpower-next-pricing-copy span {
          font-size: 12px;
          opacity: 0.72;
        }
        .manpower-next-pricing-copy strong {
          font-size: 15px;
        }
        @media (max-width: 720px) {
          .manpower-next-pricing-bar {
            bottom: 8px;
            margin: 12px;
            align-items: stretch;
            flex-direction: column;
          }
          .manpower-next-pricing-bar button {
            width: 100%;
          }
        }
      `}</style>

      {children}

      <div className="manpower-next-pricing-bar">
        <div className="manpower-next-pricing-copy">
          <span>Next step</span>
          <strong>Manpower complete → set selling price and margin</strong>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => window.location.assign('/app/final-costing')}
        >
          Next: Pricing
        </button>
      </div>
    </div>
  );
}
