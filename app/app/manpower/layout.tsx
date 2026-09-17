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
  const [ready, setReady] =
    useState(false);

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search,
      );

    if (
      params.get(
        'afterGrocery',
      ) === '1'
    ) {
      setReady(true);
      return;
    }

    window.location.replace(
      '/app/grocery',
    );
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

  return children;
}
