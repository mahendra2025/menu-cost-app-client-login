import type { ServiceStyle } from './types';

export type ServiceStaffRecommendation = {
  role: string;
  quantity: number;
  rateRole: string;
};

export type SpecialistStaffRecommendation = ServiceStaffRecommendation & {
  stationLabel: string;
};

export function serviceStyleLabel(style: ServiceStyle) {
  switch (style) {
    case 'TABLE_SERVICE': return 'Table Service';
    case 'PACKED_MEAL': return 'Packed Meal';
    case 'LIVE_COUNTER': return 'Live Counter';
    default: return 'Buffet';
  }
}

export function specialistCookQuantity(pax: number) {
  const members = Math.max(0, Number(pax) || 0);
  return members > 0 ? Math.ceil(members / 100) : 0;
}

export function specialistForDish(dish: { name: string; category: string }): {
  role: string;
  rateRole: string;
} | null {
  const category = String(dish.category || '').trim().toLowerCase().replace(/\s*\/\s*/g, '/');
  const name = String(dish.name || '').trim().toLowerCase();

  if (category === 'welcome drink' || category === 'mocktail' || name.includes('juice')) {
    return { role: 'Juice / Mocktail Maker', rateRole: 'Bartender' };
  }
  if (category === 'soup') return { role: 'Soup Cook', rateRole: 'Cook' };
  if (category === 'starter' || category === 'starters') return { role: 'Starter Cook', rateRole: 'Cook' };
  if (category === 'chaat') return { role: 'Chaat Master', rateRole: 'Cook' };
  if (category === 'chinese') return { role: 'Chinese Cook', rateRole: 'Cook' };
  if (category === 'italian' || category === 'pizza' || category === 'pasta') return { role: 'Italian Cook', rateRole: 'Cook' };
  if (category === 'bread') return { role: 'Indian Bread / Tandoor Cook', rateRole: 'Cook' };
  if (category === 'dal/kadhi' || category === 'dal' || category === 'kadhi') return { role: 'Dal / Sabji Cook', rateRole: 'Cook' };
  if (category === 'rice') return { role: 'Rice Cook', rateRole: 'Cook' };
  if (category === 'sabji' || category === 'paneer') return { role: 'Dal / Sabji Cook', rateRole: 'Cook' };
  if (category === 'sweet' || category === 'dessert') return { role: 'Sweet / Halwai', rateRole: 'Cook' };
  if (category === 'farsan') return { role: 'Farsan Cook', rateRole: 'Cook' };
  return null;
}

export function specialistStaffRecommendations(
  dishes: Array<{ name: string; category: string }>,
  pax: number,
): SpecialistStaffRecommendation[] {
  const quantity = specialistCookQuantity(pax);
  if (!quantity) return [];

  const stations = new Map<string, SpecialistStaffRecommendation>();
  dishes.forEach((dish) => {
    const specialist = specialistForDish(dish);
    if (!specialist || stations.has(specialist.role)) return;
    stations.set(specialist.role, {
      ...specialist,
      quantity,
      stationLabel: specialist.role.replace(/\s+(?:cook|master|maker)$/i, '').trim() || specialist.role,
    });
  });
  return Array.from(stations.values());
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
        { role: 'Waiter', quantity: qty(10), rateRole: 'Waiter' },
        { role: 'Captain', quantity: qty(100), rateRole: 'Captain' },
        { role: 'Supervisor', quantity: qty(250), rateRole: 'Supervisor' },
        { role: 'Masi', quantity: qty(25), rateRole: 'Helper / Masi' },
        { role: 'Helper', quantity: qty(50), rateRole: 'Helper / Masi' },
      ];
    case 'PACKED_MEAL':
      return [
        { role: 'Packing Staff', quantity: qty(75), rateRole: 'Helper / Masi' },
        { role: 'Supervisor', quantity: qty(300), rateRole: 'Supervisor' },
        { role: 'Masi', quantity: qty(25), rateRole: 'Helper / Masi' },
        { role: 'Helper', quantity: qty(50), rateRole: 'Helper / Masi' },
      ];
    case 'LIVE_COUNTER':
      return [
        { role: 'Waiter', quantity: qty(30), rateRole: 'Waiter' },
        { role: 'Captain', quantity: qty(150), rateRole: 'Captain' },
        { role: 'Counter Attendant', quantity: qty(75), rateRole: 'Counter Attendant' },
        { role: 'Masi', quantity: qty(25), rateRole: 'Helper / Masi' },
        { role: 'Helper', quantity: qty(50), rateRole: 'Helper / Masi' },
      ];
    default:
      return [
        { role: 'Waiter', quantity: qty(25), rateRole: 'Waiter' },
        { role: 'Captain', quantity: qty(150), rateRole: 'Captain' },
        { role: 'Counter Attendant', quantity: qty(100), rateRole: 'Counter Attendant' },
        { role: 'Masi', quantity: qty(25), rateRole: 'Helper / Masi' },
        { role: 'Helper', quantity: qty(50), rateRole: 'Helper / Masi' },
      ];
  }
}
