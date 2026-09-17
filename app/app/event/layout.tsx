'use client';

import {
  type ReactNode,
  useEffect,
  useState,
} from 'react';

import {
  createEmptyWorkState,
  flushWorkSave,
  getSession,
  loadWork,
  saveWork,
} from '../../../lib/store';

export default function EventLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [ready, setReady] =
    useState(false);

  useEffect(() => {
    const session = getSession();

    if (!session || session.role !== 'CLIENT') {
      setReady(true);
      return;
    }

    // Resume mode is used when an in-progress costing returns from Manpower
    // or an old /app/menu link. Never clear the current event in this mode.
    const resumeCurrentCosting =
      new URLSearchParams(window.location.search).get('resume') === '1';

    if (resumeCurrentCosting) {
      setReady(true);
      return;
    }

    const savedWork = loadWork(
      session.tenantId,
    );
    const blankWork =
      createEmptyWorkState(session);

    // A normal Event-page visit starts a fresh costing, while keeping the
    // caterer's saved business/profile details intact.
    blankWork.profile = {
      ...savedWork.profile,
      businessName:
        savedWork.profile.businessName ||
        session.businessName ||
        '',
    };

    saveWork(
      session.tenantId,
      blankWork,
    );
    flushWorkSave(
      session.tenantId,
    );

    // A fresh costing should never reuse the previous event's detection cache.
    window.sessionStorage.removeItem(
      `menu-detection:${session.tenantId}`,
    );

    setReady(true);
  }, []);

  if (!ready) {
    return (
      <main className="page-shell center-screen">
        <div className="loader-card">
          Starting new event…
        </div>
      </main>
    );
  }

  return (
    <>
      <style>{`
        .first-menu-guide {
          display: none !important;
        }
      `}</style>
      {children}
    </>
  );
}
