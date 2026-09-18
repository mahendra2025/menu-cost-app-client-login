'use client';

import { useEffect } from 'react';

export default function LegacyMenuRedirect() {
  useEffect(() => {
    window.location.replace(
      '/app/event?resume=1#menuDetectionPreview',
    );
  }, []);

  return (
    <main className="page-shell center-screen">
      <div className="loader-card">
        Opening menu review…
      </div>
    </main>
  );
}
