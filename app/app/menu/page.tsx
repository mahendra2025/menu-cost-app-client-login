'use client';

import { useEffect } from 'react';

export default function LegacyDetectedMenuRedirect() {
  useEffect(() => {
    // /app/menu is the retired detected-menu workflow. Keep old links working,
    // but send users back into the single Event workflow without clearing the
    // current costing. The Event layout understands resume=1 and preserves
    // the existing event, functions, dishes and detection state.
    window.location.replace('/app/event?resume=1#menuInput');
  }, []);

  return (
    <main className="page-shell center-screen">
      <div className="loader-card">
        Opening your current menu…
      </div>
    </main>
  );
}
