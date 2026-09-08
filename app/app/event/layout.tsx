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

import FirstMenuSuccessGuide
  from './FirstMenuSuccessGuide';

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

    const savedWork = loadWork(
      session.tenantId,
    );
    const blankWork =
      createEmptyWorkState(session);

    // Start every Event-page visit as a fresh costing, while keeping the
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

    // Never allow the previous event's detected menu preview to repopulate
    // the Event page after refresh or a fresh visit.
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
      <FirstMenuSuccessGuide />
      {children}
    </>
  );
}
