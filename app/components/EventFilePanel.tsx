'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { WorkState } from '../../lib/types';
import type { EventFileFunction, EventFileMetadata } from '../../lib/eventFilePdf';

export default function EventFilePanel({ work, functions, disabled }: { work: WorkState; functions: EventFileFunction[]; disabled?: boolean }) {
  const [file, setFile] = useState<EventFileMetadata | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
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
  async function download() {
    if (!file) return;
    setBusy(true); setError('');
    try {
      const { createEventFilePdf, eventFilePdfName } = await import('../../lib/eventFilePdf');
      createEventFilePdf(work, functions, file).save(eventFilePdfName(work));
    } catch { setError('Could not create the PDF. Please retry.'); }
    finally { setBusy(false); }
  }
  return <section className="ep-side-card ep-event-file">
    <h3>Event File</h3>
    <p>All event details in one PDF.</p>
    <dl><div><dt>Client</dt><dd>{work.event.clientName || 'Not set'}</dd></div><div><dt>Date</dt><dd>{work.event.eventDate || 'Not set'}</dd></div><div><dt>Venue</dt><dd>{work.event.venue || work.event.city || 'Not set'}</dd></div><div><dt>Functions</dt><dd>{functions.length}</dd></div></dl>
    <p>Includes menus, vendors, staffing, supplies, transport, costs, notes and the attachment list for every function.</p>
    <button type="button" className="ep-button" disabled={disabled || busy || !file} onClick={download}>{busy ? 'Preparing PDF…' : 'Download complete event PDF'}</button>
    {!file && !error && <p role="status">Loading event file…</p>}
    {error && <p role="alert">{error} <button type="button" className="ep-button" onClick={() => setRetry(n => n + 1)}>Retry</button></p>}
    <Link className="ep-button" href={`/app/event-manager?costingId=${encodeURIComponent(work.costingId)}`}>Open event file & attachments</Link>
    <style>{`.ep-event-file p{font-size:11px;color:#a4b3c4;line-height:1.6}.ep-event-file dl{display:grid;gap:10px;font-size:11px}.ep-event-file dl div{display:flex;justify-content:space-between;gap:12px}.ep-event-file dt{color:#a4b3c4}.ep-event-file dd{margin:0;text-align:right;overflow-wrap:anywhere}.ep-event-file .ep-button{width:100%;margin-top:9px;white-space:normal;text-align:center;justify-content:center;min-height:42px}.ep-event-file .ep-button:focus-visible{outline:2px solid #78b5ff;outline-offset:3px}`}</style>
  </section>;
}
