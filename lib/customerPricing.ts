import { CUSTOMER_PRICING_CONFIG, type CustomerPricingConfig } from './customerPricingConfig';
import type { ServiceStyle } from './types';

export type CustomerPricingDish = { id: string; name: string; category: string; internalFoodCost: number };

export type CustomerEstimate = {
  menuItems: Array<{ id: string; name: string; category: string; customerPricePerPlate: number; totalForGuests: number }>;
  menuPricePerPlate: number;
  servicePricePerPlate: number;
  operationsPricePerPlate: number;
  finalPricePerPlate: number;
  estimatedEventTotal: number;
};

export function roundCustomerRate(value: number) {
  const safeValue = Math.max(0, Number(value) || 0);
  if (safeValue <= 20) return Math.ceil(safeValue / 2) * 2;
  if (safeValue <= 100) return Math.ceil(safeValue / 5) * 5;
  return Math.ceil(safeValue / 10) * 10;
}

export function calculateCustomerEstimate({ pax, selectedDishes, serviceStyle, config = CUSTOMER_PRICING_CONFIG }: {
  pax: number; selectedDishes: CustomerPricingDish[]; serviceStyle: ServiceStyle; config?: CustomerPricingConfig;
}): CustomerEstimate {
  const guests = Math.max(1, Math.round(Number(pax) || 1));
  const menuItems = selectedDishes.map((dish) => {
    const internalBase = Math.max(0, Number(dish.internalFoodCost) || 0);
    const customerPricePerPlate = roundCustomerRate(internalBase * (1 + config.foodMarkupPercent / 100));
    return { id: dish.id, name: dish.name, category: dish.category, customerPricePerPlate, totalForGuests: customerPricePerPlate * guests };
  });
  const internalMenuBase = selectedDishes.reduce((sum, dish) => sum + Math.max(0, Number(dish.internalFoodCost) || 0), 0);
  const initialMenuValue = menuItems.reduce((sum, item) => sum + item.customerPricePerPlate, 0);
  const minimumMenuValue = roundCustomerRate(internalMenuBase + config.minimumMarginPerGuest);
  const adjustment = Math.max(0, minimumMenuValue - initialMenuValue);
  if (adjustment && menuItems.length) {
    const target = menuItems.reduce((best, item, index, items) => item.customerPricePerPlate > items[best].customerPricePerPlate ? index : best, 0);
    menuItems[target].customerPricePerPlate += adjustment;
    menuItems[target].totalForGuests = menuItems[target].customerPricePerPlate * guests;
  }
  const menuPricePerPlate = menuItems.reduce((sum, item) => sum + item.customerPricePerPlate, 0);
  const servicePricePerPlate = config.service[serviceStyle];
  const operationsPricePerPlate = roundCustomerRate(config.operationsPerGuest[serviceStyle] + config.transportBase / guests);
  const finalPricePerPlate = menuPricePerPlate + servicePricePerPlate + operationsPricePerPlate;
  return { menuItems, menuPricePerPlate, servicePricePerPlate, operationsPricePerPlate, finalPricePerPlate, estimatedEventTotal: finalPricePerPlate * guests };
}
