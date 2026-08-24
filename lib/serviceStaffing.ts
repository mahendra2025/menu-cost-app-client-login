import type { ServiceStyle } from './types';

export type ServiceStaffRecommendation = {
  role: string;
  quantity: number;
  rateRole: string;
};

export function serviceStyleLabel(style: ServiceStyle) {
  switch (style) {
    case 'TABLE_SERVICE': return 'Table Service';
    case 'PACKED_MEAL': return 'Packed Meal';
    case 'LIVE_COUNTER': return 'Live Counter';
    default: return 'Buffet';
  }
}

export function serviceStaffRecommendation(
  style: ServiceStyle,
  pax: number,
): ServiceStaffRecommendation[] {
  const members = Math.max(0, Number(pax) || 0);
  if (!members) return [];
  const qty = (divisor: number) => Math.max(1, Math.ceil(members / divisor));

  switch (style) {
    case 'TABLE_SERVICE':
      return [
        { role: 'Waiter', quantity: qty(12), rateRole: 'Waiter' },
        { role: 'Captain', quantity: qty(100), rateRole: 'Captain' },
        { role: 'Supervisor', quantity: qty(250), rateRole: 'Supervisor' },
      ];
    case 'PACKED_MEAL':
      return [
        { role: 'Packing Staff', quantity: qty(75), rateRole: 'Helper / Masi' },
        { role: 'Supervisor', quantity: qty(300), rateRole: 'Supervisor' },
      ];
    case 'LIVE_COUNTER':
      return [
        { role: 'Waiter', quantity: qty(30), rateRole: 'Waiter' },
        { role: 'Captain', quantity: qty(150), rateRole: 'Captain' },
        { role: 'Counter Attendant', quantity: qty(75), rateRole: 'Counter Attendant' },
      ];
    default:
      return [
        { role: 'Waiter', quantity: qty(25), rateRole: 'Waiter' },
        { role: 'Captain', quantity: qty(150), rateRole: 'Captain' },
        { role: 'Counter Attendant', quantity: qty(100), rateRole: 'Counter Attendant' },
      ];
  }
}
