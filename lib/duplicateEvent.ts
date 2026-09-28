import type { WorkState } from './types';

export type DuplicateEventDetails = {
  clientName: string;
  eventName: string;
  eventDate: string;
  pax: number;
};

export function validateDuplicateDetails(value: unknown): DuplicateEventDetails {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Enter the new event details.');
  }
  const input = value as Record<string, unknown>;
  const clientName = typeof input.clientName === 'string' ? input.clientName.trim() : '';
  const eventName = typeof input.eventName === 'string' ? input.eventName.trim() : '';
  if (!clientName || clientName.length > 180 || eventName.length > 180) {
    throw new Error('Enter a client name and keep names within 180 characters.');
  }
  const eventDate = typeof input.eventDate === 'string' ? input.eventDate : '';
  if (eventDate && (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) ||
    !Number.isFinite(Date.parse(eventDate)) || new Date(eventDate).toISOString().slice(0, 10) !== eventDate)) {
    throw new Error('Enter a valid event date.');
  }
  const pax = input.pax;
  if (typeof pax !== 'number' || !Number.isSafeInteger(pax) || pax < 1 || pax > 1000000) {
    throw new Error('Enter a whole guest count between 1 and 1,000,000.');
  }
  return { clientName, eventName, eventDate, pax };
}

export function duplicateEventWork(
  source: WorkState,
  costingId: string,
  details?: DuplicateEventDetails,
): WorkState {
  const work = structuredClone(source);
  const originalPax = Number(source.event.pax) || Math.max(0, ...source.menu.map(item => Number(item.servicePax) || 0));
  const scalePax = (pax: number | undefined) => {
    if (!details || !pax || pax <= 0) return pax;
    return originalPax > 0 ? Math.max(1, Math.round(pax * details.pax / originalPax)) : details.pax;
  };
  work.costingId = costingId;
  work.event = {
    ...work.event,
    eventDate: '',
    ...details,
    uploadFileName: '',
    rawMenuText: '',
  };
  work.menu = work.menu.map(item => ({ ...item, servicePax: scalePax(item.servicePax) }));
  work.manpower = work.manpower.map(row => ({ ...row, servicePax: scalePax(row.servicePax) }));
  work.updatedAt = new Date().toISOString();
  return work;
}
