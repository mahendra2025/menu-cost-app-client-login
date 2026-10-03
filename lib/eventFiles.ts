export const EVENT_STATUSES = ['Enquiry', 'Confirmed', 'In progress', 'Completed', 'Cancelled'] as const;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export function validateEventPlan(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Event planning details required.');
  const body = value as Record<string, unknown>;
  const result = { status: '', phone: '', email: '', notes: '' };
  for (const [key, max] of [['status', 30], ['phone', 60], ['email', 254], ['notes', 10000]] as const) {
    if (typeof body[key] !== 'string' || body[key].length > max) throw new Error(`Invalid ${key}. Maximum ${max} characters.`);
    result[key] = body[key].trim();
  }
  if (!(EVENT_STATUSES as readonly string[]).includes(result.status)) throw new Error('Choose a valid event status.');
  if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new Error('Enter a valid email address.');
  return result;
}
export function validateAttachment(name: string, size: number) {
  if (!Number.isInteger(size) || size <= 0 || size > MAX_ATTACHMENT_BYTES) throw new Error('Choose a non-empty file up to 5 MB.');
  if (!/\.(pdf|png|jpe?g|webp|docx|xlsx|csv|txt)$/i.test(name)) throw new Error('Use PDF, PNG, JPG, WebP, DOCX, XLSX, CSV or TXT files.');
  return name.replace(/[\x00-\x1f\x7f/\\]/g, '_').slice(-180);
}
