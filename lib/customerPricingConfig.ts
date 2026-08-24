import type { ServiceStyle } from './types';

export type CustomerPricingConfig = {
  foodMarkupPercent: number;
  service: Record<ServiceStyle, number>;
  operationsPerGuest: Record<ServiceStyle, number>;
  transportBase: number;
  minimumMarginPerGuest: number;
};

export const CUSTOMER_PRICING_CONFIG: CustomerPricingConfig = {
  foodMarkupPercent: 35,
  service: { BUFFET: 60, TABLE_SERVICE: 110, LIVE_COUNTER: 90, PACKED_MEAL: 30 },
  operationsPerGuest: { BUFFET: 35, TABLE_SERVICE: 55, LIVE_COUNTER: 50, PACKED_MEAL: 20 },
  transportBase: 2500,
  minimumMarginPerGuest: 50,
};

export const customerPricingConfig = CUSTOMER_PRICING_CONFIG;
