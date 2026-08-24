import type { ServiceStyle } from './types';

export type CustomerPricingConfig = {
  foodMarkupPercent: number;
  serviceMarkupPercent: number;
  contingencyPercent: number;
  minimumPerPlateMargin: number;
  transportBase: number;
  gasFuelBase: number;
  equipmentSetupBase: number;
  crockeryPerGuest: Record<ServiceStyle, number>;
  manpowerRates: Record<string, number>;
};

export const customerPricingConfig: CustomerPricingConfig = {
  foodMarkupPercent: 35,
  serviceMarkupPercent: 20,
  contingencyPercent: 5,
  minimumPerPlateMargin: 8,
  transportBase: 3500,
  gasFuelBase: 2500,
  equipmentSetupBase: 4000,
  crockeryPerGuest: {
    BUFFET: 28,
    TABLE_SERVICE: 45,
    LIVE_COUNTER: 34,
    PACKED_MEAL: 22,
  },
  manpowerRates: {
    Waiter: 750,
    Captain: 1500,
    Supervisor: 2000,
    'Helper / Masi': 700,
    'Counter Attendant': 900,
  },
};
