'use client';

import { useEffect, useState } from 'react';
import type { WorkState } from '../../lib/types';
import type { EventFileFunction, EventFileMetadata } from '../../lib/eventFilePdf';

export default function EventFilePanel({ work, functions, disabled }: { work: WorkState; functions: EventFileFunction[]; disabled?: boolean }) {
  const [file, setFile] = useState<EventFileMetadata | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'complete' | 'manager' | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setFile(null); setError('');
    fetch(`/api/client/event-files?costingId=${encodeURIComponent(work.costingId)}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (response.status === 404) return { file: { status: 'Enquiry', phone: '', email: '', notes: '', attachments: [] } };
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load event file details.');
        return data;
      }).then(data => { if (!controller.signal.aborted) setFile(data.file); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [work.costingId, retry]);
  async function downloadComplete() {
    if (!file) return;
    setBusy('complete'); setError('');
    try {
      const { createEventFilePdf, eventFilePdfName } = await import('../../lib/eventFilePdf');
      createEventFilePdf(work, functions, file).save(eventFilePdfName(work));
    } catch { setError('Could not create the complete event PDF. Please retry.'); }
    finally { setBusy(null); }
  }

  async function downloadManager() {
    if (!file) return;
    setBusy('manager'); setError('');
    try {
      const { createManagerEventFilePdf, managerEventFilePdfName } = await import('../../lib/eventFilePdf');
      createManagerEventFilePdf(work, functions, file).save(managerEventFilePdfName(work));
    } catch { setError('Could not create the manager event PDF. Please retry.'); }
    finally { setBusy(null); }
  }
  return (
    <div className="ep-event-file-actions" aria-label="Event file PDF downloads">
      <span className="ep-event-file-label">PDF Files</span>
      <button
        type="button"
        className="ep-event-file-button"
        disabled={disabled || !!busy || !file}
        onClick={downloadComplete}
        title="Download complete event file with internal costs"
      >
        {busy === 'complete' ? 'Preparing…' : 'Event File PDF'}
      </button>
      <button
        type="button"
        className="ep-event-file-button"
        disabled={disabled || !!busy || !file}
        onClick={downloadManager}
        title="Download manager event file without rates or costs"
      >
        {busy === 'manager' ? 'Preparing…' : 'Manager File PDF'}
      </button>
      {!file && !error ? (
        <small className="ep-event-file-status">Loading…</small>
      ) : null}
      {error ? (
        <small className="ep-event-file-status error">
          {error}{' '}
          <button
            type="button"
            className="ep-event-file-retry"
            onClick={() => setRetry((n) => n + 1)}
          >
            Retry
          </button>
        </small>
      ) : null}
      <style>{`
        .ep-event-file-actions{
          display:flex;
          flex:1 1 100%;
          align-items:center;
          justify-content:flex-end;
          gap:6px;
          min-width:0;
        }
        .ep-event-file-label{
          color:#718196;
          font-size:9px;
          font-weight:900;
          letter-spacing:.08em;
          text-transform:uppercase;
        }
        .ep-event-file-button{
          min-height:32px;
          padding:6px 9px;
          border:1px solid rgba(74,156,255,.24);
          border-radius:8px;
          color:#b9d9ff;
          background:rgba(74,156,255,.07);
          font:inherit;
          font-size:9px;
          font-weight:850;
          white-space:nowrap;
          cursor:pointer;
        }
        .ep-event-file-button:hover:not(:disabled){
          border-color:rgba(74,156,255,.42);
          background:rgba(74,156,255,.12);
        }
        .ep-event-file-button:disabled{
          cursor:not-allowed;
          opacity:.55;
        }
        .ep-event-file-button:focus-visible,
        .ep-event-file-retry:focus-visible{
          outline:2px solid #78b5ff;
          outline-offset:2px;
        }
        .ep-event-file-status{
          color:#7f8da0;
          font-size:9px;
        }
        .ep-event-file-status.error{
          color:#ff9c95;
        }
        .ep-event-file-retry{
          min-height:0;
          padding:0;
          border:0;
          color:#a9d0ff;
          background:transparent;
          font:inherit;
          font-weight:850;
          cursor:pointer;
        }
        @media(max-width:720px){
          .ep-event-file-actions{
            justify-content:flex-start;
            flex-wrap:wrap;
          }
          .ep-event-file-label{
            flex-basis:100%;
          }
        }
      `}</style>
    </div>
  );
}
